import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn, isMissingTable } from "@/lib/db-compat";
import { transitionOrderStock } from "@/lib/stock";

interface OrderItemInput { product_id?: string; plates?: number }
type PartnerLite = { id: string; name: string; coupon_code: string };
type SalesRepLite = { id: string; name: string; referral_code: string };

const DOCUMENT_COLUMNS = [
  "client_zip",
  "client_address",
  "client_address_complement",
  "client_city",
  "client_state",
  "discount_amount",
  "freight_amount",
  "payment_methods",
  "payment_terms",
  "quote_valid_until",
  "warranty_terms",
  "document_notes",
  "partner_id",
  "sales_rep_id",
  "partner_commission_pct",
  "partner_commission_amount",
  "sales_rep_commission_pct",
  "sales_rep_commission_amount",
  "coupon_use_id",
];

function cleanText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function cleanMoney(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function cleanPaymentMethods(v: unknown): string[] {
  if (!Array.isArray(v)) return ["Pix"];
  const methods = v.map((x) => String(x).trim()).filter(Boolean);
  return methods.length ? methods : ["Pix"];
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
      const { data, error } = await db
        .from("coupon_uses")
        .upsert(couponPayload, { onConflict: "source_pedido_id" })
        .select("id")
        .single();
      if (error) return;
      couponUseId = data.id as string;
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
    } catch { /* commission split table missing — legacy field still covers direct rep portal */ }
  }
}

// Pedidos / Produção — what happens AFTER a lead is won: the order is cut,
// finished and delivered. Backed by the `pedidos` table (migration 017). If
// that migration hasn't run yet, GET returns an empty list (so the tab shows a
// clean empty state instead of an error) and POST reports a clear message.

/** GET /api/admin/pedidos?status=em_producao&search=foo */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const db = supabaseAdmin();
  let query = db.from("pedidos").select("*").order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (search && search.trim()) {
    const s = search.trim();
    query = query.or(
      `client_name.ilike.%${s}%,client_email.ilike.%${s}%,client_phone.ilike.%${s}%,product_name.ilike.%${s}%`
    );
  }

  const { data, error } = await query;

  // Migration 017 may not have run yet — degrade to an empty list.
  if (error) {
    if (isMissingTable(error)) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/** POST /api/admin/pedidos — create an order (manually or from a won lead). */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  if (!body.client_name || typeof body.client_name !== "string" || !body.client_name.trim()) {
    return NextResponse.json({ error: "Nome do cliente é obrigatório." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const payload: Record<string, unknown> = {
    lead_id: body.lead_id ?? null,
    client_name: body.client_name.trim(),
    client_email: body.client_email ? String(body.client_email).trim().toLowerCase() : null,
    client_phone: body.client_phone ? String(body.client_phone).trim() : null,
    partner_id: body.partner_id ?? null,
    sales_rep_id: body.sales_rep_id ?? null,
    partner_name: body.partner_name ?? null,
    space: body.space ?? null,
    product_name: body.product_name ?? null,
    area_m2: body.area_m2 ?? null,
    total: body.total ?? null,
    status: body.status ?? "em_producao",
    payment_status: body.payment_status ?? "pendente",
    notes: body.notes ?? null,
    expected_delivery_at: body.expected_delivery_at ?? null,
    client_zip: cleanText(body.client_zip),
    client_address: cleanText(body.client_address),
    client_address_complement: cleanText(body.client_address_complement),
    client_city: cleanText(body.client_city),
    client_state: cleanText(body.client_state),
    discount_amount: cleanMoney(body.discount_amount),
    freight_amount: cleanMoney(body.freight_amount),
    payment_methods: cleanPaymentMethods(body.payment_methods),
    payment_terms: cleanText(body.payment_terms),
    quote_valid_until: cleanText(body.quote_valid_until),
    warranty_terms: cleanText(body.warranty_terms),
    document_notes: cleanText(body.document_notes),
    partner_commission_pct: cleanMoney(body.partner_commission_pct),
    partner_commission_amount: cleanMoney(body.partner_commission_amount),
    sales_rep_commission_pct: cleanMoney(body.sales_rep_commission_pct),
    sales_rep_commission_amount: cleanMoney(body.sales_rep_commission_amount),
  };

  let { data, error } = await db.from("pedidos").insert(payload).select().single();
  if (error && isMissingColumn(error)) {
    for (const col of DOCUMENT_COLUMNS) delete payload[col];
    ({ data, error } = await db.from("pedidos").insert(payload).select().single());
  }

  // Structured line items (model + plate qty) → enables stock + profit. Created
  // alongside the order; reserve stock immediately for active orders. All
  // best-effort: a missing migration 023 must never block order creation.
  if (data && Array.isArray(body.items) && body.items.length > 0) {
    const rawItems = (body.items as OrderItemInput[])
      .filter((it) => it && it.product_id && Number(it.plates) > 0)
      .map((it) => ({ product_id: it.product_id as string, plates: Math.round(Number(it.plates)) }));
    if (rawItems.length > 0) {
      try {
        // Snapshot cost/price per model at order time.
        const ids = [...new Set(rawItems.map((i) => i.product_id))];
        const { data: prods } = await db.from("products").select("id, name, cost_price, price, sale_unit").in("id", ids);
        const byId = new Map((prods ?? []).map((p) => [p.id as string, p]));
        const itemRows = rawItems.map((i) => {
          const p = byId.get(i.product_id);
          return {
            pedido_id: data.id,
            product_id: i.product_id,
            product_name: (p?.name as string) ?? null,
            plates: i.plates,
            unit_cost: p?.cost_price ?? null,
            unit_price: p?.price ?? null,
            unit_label: (p?.sale_unit as string) ?? "placa",
          };
        });
        await db.from("pedido_items").insert(itemRows);

        const status = (payload.status as string) || "em_producao";
        if (status === "em_producao" || status === "pronto") {
          const r = await transitionOrderStock(db, data.id, "none", "reserved", "admin");
          if (r.ok && r.newState) {
            await db.from("pedidos").update({ stock_state: r.newState }).eq("id", data.id);
          }
        }
      } catch { /* stock/items tables missing — order still created */ }
    }
  }

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json(
        { error: "Tabela de pedidos ainda não existe. Rode a migração 017." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data) await syncPedidoPortalAttribution(db, data as Record<string, unknown>);

  return NextResponse.json(data, { status: 201 });
}
