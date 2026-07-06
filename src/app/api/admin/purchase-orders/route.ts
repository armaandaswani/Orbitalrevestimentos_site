import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

// Purchase orders (Compras & Importação). Migration 039.
// GET returns each PO with its items nested. POST creates a draft PO (+items).

export const dynamic = "force-dynamic";

interface POItemInput { product_id?: string | null; product_name?: string | null; qty?: number; unit_price?: number | null; unit_currency?: string }

function cleanItems(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return (raw as POItemInput[])
    .map((it) => ({
      product_id: it.product_id ?? null,
      product_name: it.product_name ?? null,
      qty: Math.max(0, Math.round(Number(it.qty)) || 0),
      unit_price: it.unit_price != null && Number.isFinite(Number(it.unit_price)) ? Number(it.unit_price) : null,
      unit_currency: it.unit_currency === "CNY" || it.unit_currency === "BRL" ? it.unit_currency : "USD",
    }))
    .filter((it) => it.qty > 0 || it.product_id || it.product_name);
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();

  const { data: pos, error } = await db.from("purchase_orders").select("*").order("created_at", { ascending: false });
  if (error) {
    if (isMissingTable(error)) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const ids = (pos ?? []).map((p) => p.id as string);
  let itemsByPo: Record<string, unknown[]> = {};
  if (ids.length > 0) {
    const { data: items } = await db.from("purchase_order_items").select("*").in("purchase_order_id", ids);
    itemsByPo = (items ?? []).reduce((acc: Record<string, unknown[]>, it) => {
      const k = it.purchase_order_id as string;
      (acc[k] ||= []).push(it);
      return acc;
    }, {});
  }
  // Supplier names in one lookup.
  const supIds = [...new Set((pos ?? []).map((p) => p.supplier_id).filter(Boolean) as string[])];
  let supName: Record<string, string> = {};
  if (supIds.length > 0) {
    const { data: sups } = await db.from("suppliers").select("id, name").in("id", supIds);
    supName = (sups ?? []).reduce((a: Record<string, string>, s) => { a[s.id as string] = s.name as string; return a; }, {});
  }

  return NextResponse.json(
    (pos ?? []).map((p) => ({
      ...p,
      supplier_name: p.supplier_id ? supName[p.supplier_id as string] ?? null : null,
      items: itemsByPo[p.id as string] ?? [],
    }))
  );
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const db = supabaseAdmin();
  const poPayload = {
    supplier_id: body.supplier_id ?? null,
    reference: typeof body.reference === "string" && body.reference.trim() ? body.reference.trim() : null,
    status: "draft",
    fx_usd_brl: body.fx_usd_brl != null ? Number(body.fx_usd_brl) || null : null,
    fx_cny_brl: body.fx_cny_brl != null ? Number(body.fx_cny_brl) || null : null,
    freight_usd: body.freight_usd != null ? Number(body.freight_usd) || null : null,
    storage_cost: body.storage_cost != null ? Number(body.storage_cost) || null : null,
    broker_cost: body.broker_cost != null ? Number(body.broker_cost) || null : null,
    transport_cost: body.transport_cost != null ? Number(body.transport_cost) || null : null,
    other_cost: body.other_cost != null ? Number(body.other_cost) || null : null,
    icms_rate: body.icms_rate != null ? Number(body.icms_rate) : 0.07,
    fti_rate: body.fti_rate != null ? Number(body.fti_rate) : 0.01,
    expected_arrival: body.expected_arrival ?? null,
    notes: body.notes ?? null,
  };

  const { data: po, error } = await db.from("purchase_orders").insert(poPayload).select().single();
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: "Rode a migração 039 (compras/importação) no Supabase." }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = cleanItems(body.items);
  if (items.length > 0) {
    await db.from("purchase_order_items").insert(items.map((it) => ({ ...it, purchase_order_id: po.id })));
  }
  const { data: savedItems } = await db.from("purchase_order_items").select("*").eq("purchase_order_id", po.id);
  return NextResponse.json({ ...po, items: savedItems ?? [] }, { status: 201 });
}
