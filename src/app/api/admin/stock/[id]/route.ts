import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { isMissingColumn } from "@/lib/db-compat";
import { supabaseAdmin } from "@/lib/supabase";

/** GET /api/admin/stock/[id] — the movement ledger for one product (newest first). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sb = supabaseAdmin();
  const primary = await sb
    .from("stock_movements")
    .select("id, kind, on_hand_delta, reserved_delta, reason, created_by, created_at, pedido_id, manual_exit_type, sale_amount")
    .eq("product_id", id)
    .order("created_at", { ascending: false })
    .limit(200);
  let data: unknown = primary.data;
  let error = primary.error;

  if (error && isMissingColumn(error)) {
    const fallback = await sb
      .from("stock_movements")
      .select("id, kind, on_hand_delta, reserved_delta, reason, created_by, created_at, pedido_id")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(200);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("does not exist") || m.includes("stock_movements")) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

/** PATCH /api/admin/stock/[id] — update a product's sale price / cost / reorder point. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.price !== undefined) {
    const p = Number(body.price);
    patch.price = body.price === null || body.price === "" ? null : Number.isFinite(p) && p >= 0 ? p : null;
  }
  if (body.cost_price !== undefined) {
    const c = Number(body.cost_price);
    patch.cost_price = body.cost_price === null || body.cost_price === "" ? null : Number.isFinite(c) && c >= 0 ? c : null;
  }
  if (body.reorder_point !== undefined) {
    const r = Number(body.reorder_point);
    patch.reorder_point = Number.isFinite(r) && r >= 0 ? Math.round(r) : 0;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

  const sb = supabaseAdmin();
  const { data, error } = await sb.from("products").update(patch).eq("id", id).select("id, price, cost_price, reorder_point").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
