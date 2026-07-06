import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn } from "@/lib/db-compat";
import { computeImportCosts, type Currency } from "@/lib/import-costs";

// One purchase order: PATCH updates fields/items/status; the ?action=receive
// path (or status→received) gives the shipment into stock — writing manual_in
// rows to the existing ledger (backtraceable, reversible like orders) and,
// optionally, updating each product's cost_price to the landed unit cost.

export const dynamic = "force-dynamic";

const PO_FIELDS = new Set([
  "supplier_id", "reference", "status", "fx_usd_brl", "fx_cny_brl", "freight_usd",
  "storage_cost", "broker_cost", "transport_cost", "other_cost", "icms_rate",
  "fti_rate", "expected_arrival", "notes", "ordered_at",
]);

interface POItemInput { id?: string; product_id?: string | null; product_name?: string | null; qty?: number; unit_price?: number | null; unit_currency?: string }

async function replaceItems(db: ReturnType<typeof supabaseAdmin>, poId: string, raw: unknown) {
  if (!Array.isArray(raw)) return;
  const items = (raw as POItemInput[])
    .map((it) => ({
      purchase_order_id: poId,
      product_id: it.product_id ?? null,
      product_name: it.product_name ?? null,
      qty: Math.max(0, Math.round(Number(it.qty)) || 0),
      unit_price: it.unit_price != null && Number.isFinite(Number(it.unit_price)) ? Number(it.unit_price) : null,
      unit_currency: it.unit_currency === "CNY" || it.unit_currency === "BRL" ? it.unit_currency : "USD",
    }))
    .filter((it) => it.qty > 0 || it.product_id || it.product_name);
  await db.from("purchase_order_items").delete().eq("purchase_order_id", poId);
  if (items.length > 0) await db.from("purchase_order_items").insert(items);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: po, error } = await db.from("purchase_orders").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!po) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  const { data: items } = await db.from("purchase_order_items").select("*").eq("purchase_order_id", id);
  return NextResponse.json({ ...po, items: items ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin();

  if (action === "receive") return receivePO(db, id, body);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (!PO_FIELDS.has(k)) continue;
    if (k === "status" && typeof v === "string") {
      patch[k] = v;
      if (v === "ordered" && !("ordered_at" in body)) patch.ordered_at = new Date().toISOString();
    } else if (["fx_usd_brl", "fx_cny_brl", "freight_usd", "storage_cost", "broker_cost", "transport_cost", "other_cost", "icms_rate", "fti_rate"].includes(k)) {
      patch[k] = v == null || v === "" ? null : Number(v);
    } else {
      patch[k] = v === "" ? null : v;
    }
  }
  const { data, error } = await db.from("purchase_orders").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if ("items" in body) await replaceItems(db, id, body.items);
  const { data: items } = await db.from("purchase_order_items").select("*").eq("purchase_order_id", id);
  return NextResponse.json({ ...data, items: items ?? [] });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from("purchase_orders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ── Receive: give the shipment into stock ────────────────────────────────────
async function receivePO(db: ReturnType<typeof supabaseAdmin>, id: string, body: Record<string, unknown>) {
  const { data: po } = await db.from("purchase_orders").select("*").eq("id", id).maybeSingle();
  if (!po) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  // Idempotency guard, mirroring transitionOrderStock's status-driven approach.
  if (po.status === "received") return NextResponse.json({ error: "Este pedido já foi recebido." }, { status: 409 });

  const { data: items } = await db.from("purchase_order_items").select("*").eq("purchase_order_id", id);
  const rows = items ?? [];

  const result = computeImportCosts({
    fx: { usd_brl: Number(po.fx_usd_brl) || 0, cny_brl: Number(po.fx_cny_brl) || 0 },
    items: rows.map((it) => ({ qty: Number(it.qty) || 0, unit_price: Number(it.unit_price) || 0, unit_currency: (it.unit_currency as Currency) || "USD" })),
    freight_usd: po.freight_usd, storage_cost: po.storage_cost, broker_cost: po.broker_cost,
    transport_cost: po.transport_cost, other_cost: po.other_cost, icms_rate: po.icms_rate, fti_rate: po.fti_rate,
  });

  const updateCosts = body.updateCosts !== false; // default: yes
  const ref = (po.reference as string | null) || (po.id as string).slice(0, 8);

  for (let i = 0; i < rows.length; i++) {
    const it = rows[i];
    const qty = Number(it.qty) || 0;
    const landedUnit = result.lines[i]?.landedUnitBRL ?? 0;

    // Snapshot the landed cost on the PO line regardless.
    await db.from("purchase_order_items").update({ landed_unit_cost: landedUnit }).eq("id", it.id);

    if (!it.product_id || qty <= 0) continue;

    // 1) Ledger row (manual_in) + on-hand bump. Written directly (not via
    //    applyStockMovement) so it can carry purchase_order_id for traceability;
    //    falls back gracefully if that column isn't there yet.
    const { data: prod } = await db.from("products").select("stock_on_hand").eq("id", it.product_id).maybeSingle();
    const nextOnHand = Math.max(0, (Number(prod?.stock_on_hand) || 0) + qty);
    const ledger: Record<string, unknown> = {
      product_id: it.product_id,
      kind: "manual_in",
      on_hand_delta: qty,
      reserved_delta: 0,
      reason: `Recebimento importação — PO ${ref}`,
      purchase_order_id: id,
    };
    let { error: ledgerErr } = await db.from("stock_movements").insert(ledger);
    if (ledgerErr && isMissingColumn(ledgerErr)) {
      delete ledger.purchase_order_id;
      ({ error: ledgerErr } = await db.from("stock_movements").insert(ledger));
    }

    // 2) Update on-hand and (optionally) the landed cost breakdown + cost_price.
    const prodPatch: Record<string, unknown> = { stock_on_hand: nextOnHand };
    if (updateCosts && landedUnit > 0) {
      prodPatch.cost_price = landedUnit;
    }
    let { error: updErr } = await db.from("products").update(prodPatch).eq("id", it.product_id);
    if (updErr && isMissingColumn(updErr)) {
      ({ error: updErr } = await db.from("products").update({ stock_on_hand: nextOnHand }).eq("id", it.product_id));
    }
  }

  const { data: updated, error } = await db
    .from("purchase_orders")
    .update({ status: "received", received_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: finalItems } = await db.from("purchase_order_items").select("*").eq("purchase_order_id", id);
  return NextResponse.json({ ...updated, items: finalItems ?? [] });
}
