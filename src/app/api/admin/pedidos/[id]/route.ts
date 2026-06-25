import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn } from "@/lib/db-compat";
import { transitionOrderStock } from "@/lib/stock";

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
      .select("id, product_id, product_name, plates, unit_cost, unit_price")
      .eq("pedido_id", id);
    items = data ?? [];
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
    ({ data, error } = await db.from("pedidos").update(patch).eq("id", id).select().single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Drive inventory off the new status (non-fatal — never block the edit).
  if (typeof patch.status === "string") {
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
