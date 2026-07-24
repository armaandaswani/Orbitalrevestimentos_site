import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn } from "@/lib/db-compat";
import { transitionOrderStock } from "@/lib/stock";

type PartnerLite = { id: string; name: string; coupon_code: string };
type SalesRepLite = { id: string; name: string; referral_code: string };

const OPTIONAL_DOCUMENT_COLUMNS = [
  "client_zip",
  "client_address",
  "client_address_complement",
  "client_city",
  "client_state",
  "discount_amount",
  "freight_amount",
  "freight_is_revenue",
  "other_costs",
  "payment_methods",
  "payment_terms",
  "quote_valid_until",
  "warranty_terms",
  "document_notes",
  "show_legal_terms",
  "partner_id",
  "sales_rep_id",
  "partner_commission_pct",
  "partner_commission_amount",
  "sales_rep_commission_pct",
  "sales_rep_commission_amount",
  "coupon_use_id",
  "partner_commission_paid_at",
  "sales_rep_commission_paid_at",
  "price_tier",
];

function cleanMoney(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function cleanText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function cleanOtherCosts(v: unknown): Array<{ label: string; amount: number }> {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => ({ label: cleanText((x as { label?: unknown })?.label) || "Despesa", amount: cleanMoney((x as { amount?: unknown })?.amount) }))
    .filter((x) => x.amount > 0);
}

async function syncPedidoPortalAttribution(db: ReturnType<typeof supabaseAdmin>, pedido: Record<string, unknown>) {
  const partnerId = (pedido.partner_id as string | null) ?? null;
  const salesRepId = (pedido.sales_rep_id as string | null) ?? null;
  if (!partnerId && !salesRepId) return;

  const total = Number(pedido.total) || 0;
  const discount = cleanMoney(pedido.discount_amount);
  const gross = Math.max(total, total + discount - cleanMoney(pedido.freight_amount));
  const partnerCommission = cleanMoney(pedido.partner_commission_amount);
  const repCommission = cleanMoney(pedido.sales_rep_commission_amount);

  let partner: PartnerLite | null = null;
  if (partnerId) {
    const { data } = await db.from("partners").select("id, name, coupon_code").eq("id", partnerId).maybeSingle();
    partner = data as PartnerLite | null;
  }
  let rep: SalesRepLite | null = null;
  if (salesRepId) {
    const { data } = await db.from("sales_reps").select("id, name, referral_code").eq("id", salesRepId).maybeSingle();
    rep = data as SalesRepLite | null;
  }

  const status = pedido.status === "entregue" ? "concluido" : pedido.status === "cancelado" ? "cancelado" : "em_orcamento";
  const couponPayload: Record<string, unknown> = {
    source: "pedido_admin",
    source_pedido_id: pedido.id,
    partner_id: partner?.id ?? null,
    coupon_code: partner?.coupon_code ?? rep?.referral_code ?? "PEDIDO",
    space: pedido.space ?? null,
    product_name: pedido.product_name ?? null,
    product_code: null,
    area_m2: pedido.area_m2 ?? null,
    plates: null,
    material_total: gross,
    material_discounted: total,
    discount_applied: discount,
    commission_owed: partner ? partnerCommission : 0,
    architect_name: pedido.client_name ?? "Cliente",
    client_email: pedido.client_email ?? null,
    client_phone: pedido.client_phone ?? null,
    sales_rep_referral_code: rep?.referral_code ?? null,
    sales_rep_commission_owed: rep ? repCommission : null,
    sale_status: status,
  };

  const existingId = (pedido.coupon_use_id as string | null) ?? null;
  let couponUseId = existingId;
  try {
    if (existingId) {
      const { data, error } = await db.from("coupon_uses").update(couponPayload).eq("id", existingId).select("id").maybeSingle();
      if (!error && data?.id) couponUseId = data.id as string;
    } else {
      // Partial unique index on source_pedido_id → ON CONFLICT upsert fails to
      // match it. Resolve any existing row explicitly, then update or insert.
      const { data: found } = await db.from("coupon_uses").select("id").eq("source_pedido_id", pedido.id as string).maybeSingle();
      if (found?.id) {
        await db.from("coupon_uses").update(couponPayload).eq("id", found.id as string);
        couponUseId = found.id as string;
      } else {
        const { data, error } = await db.from("coupon_uses").insert(couponPayload).select("id").single();
        if (error) return;
        couponUseId = data.id as string;
      }
      await db.from("pedidos").update({ coupon_use_id: couponUseId }).eq("id", pedido.id as string);
    }
  } catch {
    return;
  }

  if (couponUseId) {
    try {
      await db.from("coupon_use_commissions").delete().eq("coupon_use_id", couponUseId);
      if (rep && repCommission > 0) {
        await db.from("coupon_use_commissions").insert({
          coupon_use_id: couponUseId,
          sales_rep_id: rep.id,
          sales_rep_referral_code: rep.referral_code,
          commission_owed: repCommission,
        });
      }
    } catch { /* non-fatal */ }
  }
}

interface ItemInput { product_id?: string; plates?: number; unit_price?: number | null }

// Replaces a pedido's line items (model + plate qty) and reconciles the stock
// ledger for the swap: releases/returns whatever was held for the OLD items
// (read from pedido_items before we touch them), swaps the rows, then
// re-reserves or re-consumes for the NEW items according to the order's final
// status. Used when the admin edits quantities on an existing order — not just
// at creation. Returns the resulting stock_state to persist on the pedido.
async function reconcileItemsAndStock(
  db: ReturnType<typeof supabaseAdmin>,
  pedidoId: string,
  rawItems: ItemInput[],
  priorStockState: string,
  finalStatus: string
): Promise<string> {
  const clean = rawItems
    .filter((it) => it.product_id && Number(it.plates) > 0)
    .map((it) => ({
      product_id: it.product_id as string,
      plates: Math.round(Number(it.plates)),
      unit_price: it.unit_price != null && Number.isFinite(Number(it.unit_price)) ? Number(it.unit_price) : null,
    }));

  // Free whatever the OLD items held, before we replace the rows they're read from.
  if (priorStockState === "reserved") {
    await transitionOrderStock(db, pedidoId, "reserved", "released", "admin");
  } else if (priorStockState === "consumed") {
    await transitionOrderStock(db, pedidoId, "consumed", "returned", "admin");
  }

  await db.from("pedido_items").delete().eq("pedido_id", pedidoId);
  if (clean.length > 0) {
    const ids = [...new Set(clean.map((c) => c.product_id))];
    const { data: prods } = await db.from("products").select("id, name, cost_price, price, sale_unit").in("id", ids);
    const byId = new Map((prods ?? []).map((p) => [p.id as string, p]));
    const rows = clean.map((c) => {
      const p = byId.get(c.product_id);
      return {
        pedido_id: pedidoId,
        product_id: c.product_id,
        product_name: (p?.name as string) ?? null,
        plates: c.plates,
        unit_cost: p?.cost_price ?? null,
        unit_price: c.unit_price ?? p?.price ?? null,
        unit_label: (p?.sale_unit as string) ?? "placa",
      };
    });
    await db.from("pedido_items").insert(rows);
  }

  let newState = "none";
  if (clean.length > 0) {
    if (finalStatus === "em_producao" || finalStatus === "pronto") {
      const r = await transitionOrderStock(db, pedidoId, "none", "reserved", "admin");
      if (r.ok) newState = "reserved";
    } else if (finalStatus === "entregue") {
      const r = await transitionOrderStock(db, pedidoId, "none", "consumed", "admin");
      if (r.ok) newState = "consumed";
    }
  }
  await db.from("pedidos").update({ stock_state: newState }).eq("id", pedidoId);
  return newState;
}

// Maps an order's NEW production status (+ what stock phase it's already in) to
// the stock action to apply. Returns null when nothing should change.
function stockTargetFor(
  newStatus: string | undefined,
  stockState: string
): "reserved" | "consumed" | "released" | "returned" | null {
  if (!newStatus) return null;
  if (newStatus === "entregue") return stockState === "consumed" ? null : "consumed";
  if (newStatus === "cancelado") {
    if (stockState === "consumed") return "returned"; // delivered then cancelled → back to shelf
    if (stockState === "reserved") return "released"; // cancelled before delivery → free the hold
    return null;
  }
  // Active production states hold a reservation. Re-reserve if a previously
  // cancelled order is reactivated (or it never reserved on creation).
  if ((newStatus === "em_producao" || newStatus === "pronto") && stockState !== "reserved" && stockState !== "consumed") {
    return "reserved";
  }
  return null;
}

// Columns the admin is allowed to edit on a pedido.
const EDITABLE = new Set([
  "client_name",
  "client_email",
  "client_phone",
  "partner_id",
  "sales_rep_id",
  "partner_name",
  "space",
  "product_name",
  "area_m2",
  "total",
  "status",
  "payment_status",
  "notes",
  "expected_delivery_at",
  "delivered_at",
  "client_zip",
  "client_address",
  "client_address_complement",
  "client_city",
  "client_state",
  "discount_amount",
  "freight_amount",
  "freight_is_revenue",
  "other_costs",
  "payment_methods",
  "payment_terms",
  "quote_valid_until",
  "warranty_terms",
  "document_notes",
  "show_legal_terms",
  "partner_commission_pct",
  "partner_commission_amount",
  "sales_rep_commission_pct",
  "sales_rep_commission_amount",
  "coupon_use_id",
  "lead_id",
  "partner_commission_paid_at",
  "sales_rep_commission_paid_at",
  "partner_commission_cancelled_at",
  "partner_commission_cancel_reason",
  "sales_rep_commission_cancelled_at",
  "sales_rep_commission_cancel_reason",
  "price_tier",
]);

/** GET /api/admin/pedidos/[id] — the order plus its line items. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: pedido, error } = await db.from("pedidos").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pedido) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let items: unknown[] = [];
  try {
    const { data } = await db
      .from("pedido_items")
      .select("id, product_id, product_name, plates, unit_cost, unit_price, unit_label")
      .eq("pedido_id", id);
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const productIds = rows.map((row) => row.product_id).filter(Boolean) as string[];
    let productById = new Map<string, Record<string, unknown>>();
    if (productIds.length > 0) {
      const { data: products } = await db
        .from("products")
        .select("id, code, description, image_path, render_panel_width_m, render_panel_height_m, product_images(image_path, sort_order)")
        .in("id", productIds);
      productById = new Map((products ?? []).map((p) => [p.id as string, p as Record<string, unknown>]));
    }
    items = rows.map((row) => {
      const product = row.product_id ? productById.get(row.product_id as string) : null;
      const images = (product?.product_images as Array<{ image_path?: string; sort_order?: number }> | undefined) ?? [];
      const sortedImages = images
        .filter((img) => img.image_path)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      return {
        ...row,
        product_code: product?.code ?? null,
        panel_w: product?.render_panel_width_m ?? null,
        panel_h: product?.render_panel_height_m ?? null,
        product_description: product?.description ?? null,
        product_image_path: sortedImages[0]?.image_path ?? product?.image_path ?? null,
      };
    });
  } catch { /* table missing — no items */ }

  return NextResponse.json({ ...pedido, items });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(body)) {
    if (!EDITABLE.has(k)) continue;
    if (k === "client_email" && typeof v === "string") patch[k] = v.trim().toLowerCase() || null;
    else if (k === "discount_amount" || k === "freight_amount" || k === "partner_commission_pct" || k === "partner_commission_amount" || k === "sales_rep_commission_pct" || k === "sales_rep_commission_amount") patch[k] = cleanMoney(v);
    else if (k === "freight_is_revenue") patch[k] = v === true;
    else if (k === "show_legal_terms") patch[k] = v !== false;
    else if (k === "other_costs") patch[k] = cleanOtherCosts(v);
    else patch[k] = v;
  }

  // Stamp delivered_at automatically when the order is marked delivered (and
  // clear it if it's moved back out of "entregue"), unless the caller set it.
  if (patch.status === "entregue" && !("delivered_at" in patch)) {
    patch.delivered_at = new Date().toISOString();
  } else if (
    typeof patch.status === "string" &&
    patch.status !== "entregue" &&
    !("delivered_at" in patch)
  ) {
    patch.delivered_at = null;
  }

  const db = supabaseAdmin();

  // Read the current stock phase before updating, so a status change can move
  // stock correctly (reserve → consume → return). Best-effort: if the column
  // isn't there yet (migration 023 not run), we just skip stock automation.
  let priorStockState = "none";
  try {
    const { data: cur } = await db.from("pedidos").select("stock_state").eq("id", id).maybeSingle();
    priorStockState = (cur as { stock_state?: string } | null)?.stock_state ?? "none";
  } catch { /* column missing — skip */ }

  let { data, error } = await db.from("pedidos").update(patch).eq("id", id).select().single();

  // delivered_at / payment_status may be from a newer schema than what ran —
  // retry without the optional columns rather than failing the edit.
  if (error && isMissingColumn(error)) {
    delete patch.delivered_at;
    delete patch.payment_status;
    for (const col of OPTIONAL_DOCUMENT_COLUMNS) delete patch[col];
    // Colunas de cancelamento de comissão (migração 050) podem não existir ainda.
    for (const col of ["partner_commission_cancelled_at", "partner_commission_cancel_reason", "sales_rep_commission_cancelled_at", "sales_rep_commission_cancel_reason"]) delete patch[col];
    ({ data, error } = await db.from("pedidos").update(patch).eq("id", id).select().single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Editing the quantity of panels: when `items` is present, replace the
  // pedido's line items and reconcile the stock ledger for the swap. This is
  // the only path that touches stock_state when items are involved — it
  // supersedes the status-driven block below for this request.
  const itemsInput = Array.isArray(body.items) ? (body.items as ItemInput[]) : null;
  let itemsHandledStock = false;
  if (itemsInput) {
    try {
      const finalStatus =
        (typeof patch.status === "string" ? patch.status : (data as Record<string, unknown>)?.status as string) ?? "em_producao";
      const newState = await reconcileItemsAndStock(db, id, itemsInput, priorStockState, finalStatus);
      (data as Record<string, unknown>).stock_state = newState;
      itemsHandledStock = true;
    } catch { /* stock tables missing or transient — items/stock left as-is */ }
  }

  // Drive inventory off the new status (non-fatal — never block the edit).
  if (!itemsHandledStock && typeof patch.status === "string") {
    const target = stockTargetFor(patch.status, priorStockState);
    if (target) {
      try {
        const r = await transitionOrderStock(db, id, priorStockState, target, "admin");
        if (r.ok && r.newState) {
          await db.from("pedidos").update({ stock_state: r.newState }).eq("id", id);
          (data as Record<string, unknown>).stock_state = r.newState;
        }
      } catch { /* stock tables missing or transient — leave order as-is */ }
    }
  }

  if (data) await syncPedidoPortalAttribution(db, data as Record<string, unknown>);

  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db.from("pedidos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
