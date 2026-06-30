import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { transitionOrderStock } from "@/lib/stock";

// POST /api/admin/stock/release-reservation — { pedido_id }
// Cancels a pedido's CURRENT stock reservation (frees the held quantity back
// to "available"), from the Estoque tab's movement list rather than editing
// the order itself. The order's line items and other fields are untouched —
// later editing its items, or moving its status forward again, re-reserves
// from the same items list. Guarded server-side: only acts when the order's
// stock is actually still "reserved" (not yet consumed/delivered), so this
// can never double-release or touch stock that's already shipped.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const pedidoId = body?.pedido_id;
  if (!pedidoId || typeof pedidoId !== "string") {
    return NextResponse.json({ error: "pedido_id obrigatório." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: pedido, error: readErr } = await db
    .from("pedidos")
    .select("id, stock_state")
    .eq("id", pedidoId)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!pedido) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

  const stockState = (pedido as { stock_state?: string }).stock_state ?? "none";
  if (stockState !== "reserved") {
    return NextResponse.json(
      { error: "Esta reserva já foi liberada ou baixada — nada para cancelar." },
      { status: 409 }
    );
  }

  const r = await transitionOrderStock(db, pedidoId, "reserved", "released", "admin");
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });

  await db.from("pedidos").update({ stock_state: "none" }).eq("id", pedidoId);

  return NextResponse.json({ ok: true });
}
