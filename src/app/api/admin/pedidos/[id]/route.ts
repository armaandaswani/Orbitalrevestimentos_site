import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn } from "@/lib/db-compat";

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
  let { data, error } = await db.from("pedidos").update(patch).eq("id", id).select().single();

  // delivered_at / payment_status may be from a newer schema than what ran —
  // retry without the optional columns rather than failing the edit.
  if (error && isMissingColumn(error)) {
    delete patch.delivered_at;
    delete patch.payment_status;
    ({ data, error } = await db.from("pedidos").update(patch).eq("id", id).select().single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
