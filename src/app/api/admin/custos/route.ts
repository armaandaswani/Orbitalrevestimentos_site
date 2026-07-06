import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn } from "@/lib/db-compat";

// Custos & Margens — one round-trip for the tab: every active product with its
// price/cost/landed-cost breakdown, plus the per-linha rate card (varejo =
// public_price, atacado = special_price) the margin table computes against.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();

  const [productsRes, pricingRes] = await Promise.all([
    // select("*") on purpose: the 038 landed-cost columns may not exist yet
    // (migration not run) — with * they're simply absent instead of erroring.
    db.from("products").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    db.from("line_pricing").select("linha, special_price, public_price").order("linha"),
  ]);

  if (productsRes.error) return NextResponse.json({ error: productsRes.error.message }, { status: 500 });

  const products = (productsRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code ?? null,
    linha: p.linha ?? null,
    sale_unit: p.sale_unit ?? "placa",
    price: p.price ?? null,
    cost_price: p.cost_price ?? null,
    supplier_name: p.supplier_name ?? null,
    fob_cost: p.fob_cost ?? null,
    freight_cost: p.freight_cost ?? null,
    duty_cost: p.duty_cost ?? null,
    other_import_cost: p.other_import_cost ?? null,
    stock_on_hand: p.stock_on_hand ?? 0,
  }));

  return NextResponse.json({ products, pricing: pricingRes.data ?? [] });
}

const EDITABLE = new Set(["supplier_name", "fob_cost", "freight_cost", "duty_cost", "other_import_cost", "cost_price"]);

/** PATCH — update one product's cost fields. Body: { id, ...fields }. */
export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (!EDITABLE.has(k)) continue;
    if (k === "supplier_name") patch[k] = typeof v === "string" && v.trim() ? v.trim() : null;
    else {
      const n = Number(v);
      patch[k] = Number.isFinite(n) && n >= 0 ? n : null;
    }
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

  const db = supabaseAdmin();
  let { data, error } = await db.from("products").update(patch).eq("id", body.id).select().single();

  // Migration 038 not run yet — retry with only the pre-existing column so the
  // admin can still set cost_price, and say what's missing.
  if (error && isMissingColumn(error)) {
    const fallback: Record<string, unknown> = {};
    if ("cost_price" in patch) fallback.cost_price = patch.cost_price;
    if (Object.keys(fallback).length > 0) {
      ({ data, error } = await db.from("products").update(fallback).eq("id", body.id).select().single());
      if (!error) return NextResponse.json({ ...data, _migrationMissing: true });
    }
    return NextResponse.json({ error: "Rode a migração 038 (custos de importação) no Supabase." }, { status: 503 });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
