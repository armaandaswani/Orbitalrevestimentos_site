import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, repIdFromRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

const EDITABLE = new Set([
  "stage",
  "first_contact_at",
  "meeting_id",
  "meeting_happened_at",
  "mostruario_sent",
  "mostruario_sent_at",
  "has_specified",
  "last_specified_at",
  "last_followup_at",
  "next_reminder_at",
  "reminder_note",
  "reminder_recur",
  // Inline-prospect fields + linking a prospect to a registered partner later.
  "partner_id",
  "prospect_name",
  "prospect_phone",
  "prospect_email",
  "prospect_profession",
]);

/** PATCH /api/representante/crm/[id] — update pipeline/stage/reminder fields. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: existing, error: fetchErr } = await db
    .from("rep_partner_crm")
    .select("sales_rep_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isAdminRequest(req) && repIdFromRequest(req) !== existing.sales_rep_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(body)) {
    if (EDITABLE.has(k)) patch[k] = v;
  }

  // Toggling mostruario/specified on stamps the date automatically when the
  // caller didn't already supply one — same convenience as the reminder snooze UI.
  if (patch.mostruario_sent === true && !("mostruario_sent_at" in patch)) {
    patch.mostruario_sent_at = new Date().toISOString();
  }
  if (patch.has_specified === true && !("last_specified_at" in patch)) {
    patch.last_specified_at = new Date().toISOString();
  }

  const { data, error } = await db.from("rep_partner_crm").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** DELETE /api/representante/crm/[id] — stop tracking (cascades notes). */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: existing, error: fetchErr } = await db
    .from("rep_partner_crm")
    .select("sales_rep_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: true }); // already gone

  if (!isAdminRequest(req) && repIdFromRequest(req) !== existing.sales_rep_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await db.from("rep_partner_crm").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
