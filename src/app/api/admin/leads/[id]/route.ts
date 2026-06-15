import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { applyLeadStatusAutomation } from "@/lib/leads";

// Columns the admin is allowed to edit on a lead.
const EDITABLE = new Set([
  "name",
  "email",
  "phone",
  "status",
  "partner_id",
  "partner_name",
  "space",
  "product_name",
  "estimated_value",
  "next_reminder_at",
  "reminder_note",
  "reminder_recur",
  "notes",
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
    if (k === "email" && typeof v === "string") patch[k] = v.trim().toLowerCase() || null;
    else patch[k] = v;
  }

  const db = supabaseAdmin();

  // Read the prior status so we only fire automations on an actual transition.
  let prevStatus: string | null = null;
  if (typeof patch.status === "string") {
    const { data: before } = await db.from("leads").select("status").eq("id", id).maybeSingle();
    prevStatus = (before?.status as string | null) ?? null;
  }

  const { data, error } = await db.from("leads").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Feature 5 — status-change automations (tag the SM Click contact + send a
  // thank-you / next-steps WhatsApp). Non-fatal, only on a real transition.
  if (typeof patch.status === "string" && patch.status !== prevStatus) {
    await applyLeadStatusAutomation(id, patch.status);
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
  const { error } = await db.from("leads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
