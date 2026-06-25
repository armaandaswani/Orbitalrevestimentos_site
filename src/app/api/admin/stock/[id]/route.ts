import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

/** GET /api/admin/stock/[id] — the movement ledger for one product (newest first). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("stock_movements")
    .select("id, kind, on_hand_delta, reserved_delta, reason, created_by, created_at, pedido_id")
    .eq("product_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("does not exist") || m.includes("stock_movements")) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

/** PATCH /api/admin/stock/[id] — update a product's cost_price / reorder_point. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.cost_price !== undefined) {
    const c = Number(body.cost_price);
    patch.cost_price = Number.isFinite(c) && c >= 0 ? c : null;
  }
  if (body.reorder_point !== undefined) {
    const r = Number(body.reorder_point);
    patch.reorder_point = Number.isFinite(r) && r >= 0 ? Math.round(r) : 0;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

  const sb = supabaseAdmin();
  const { data, error } = await sb.from("products").update(patch).eq("id", id).select("id, cost_price, reorder_point").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
