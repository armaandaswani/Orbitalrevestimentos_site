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
  "mostruario_received",
  "mostruario_received_at",
  "has_specified",
  "last_specified_at",
  "specified_count",
  "project_added",
  "project_added_at",
  "project_added_count",
  "last_followup_at",
  "next_reminder_at",
  "reminder_note",
  "reminder_recur",
  "auto_followup_enabled",
  "auto_followup_message",
  "auto_followup_sent_at",
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
    .select("sales_rep_id, stage, next_reminder_at")
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
  if (patch.mostruario_received === true && !("mostruario_received_at" in patch)) {
    patch.mostruario_received_at = new Date().toISOString();
  }
  if (typeof patch.specified_count === "number" && patch.specified_count > 0 && !("has_specified" in patch)) {
    patch.has_specified = true;
  }
  if (patch.has_specified === true && !("last_specified_at" in patch)) {
    patch.last_specified_at = new Date().toISOString();
  }
  if (typeof patch.project_added_count === "number" && patch.project_added_count > 0 && !("project_added" in patch)) {
    patch.project_added = true;
  }
  if (patch.project_added === true && !("project_added_at" in patch)) {
    patch.project_added_at = new Date().toISOString();
  }

  // Digest hygiene: when the rep registers progress on a contact (advances the
  // stage or logs a milestone) and DIDN'T set a fresh reminder, an overdue
  // reminder left behind would keep nagging in the daily/weekly digest for a
  // task that's already done ("Beatriz já avançou mas ainda pede resultado").
  // Clear the stale overdue reminder so the contact drops out of the next
  // digest; an explicit next_reminder_at from the caller is always respected.
  const stageChanged = "stage" in patch && patch.stage !== (existing as { stage?: string }).stage;
  const milestoneRegistered =
    patch.meeting_happened_at != null ||
    patch.mostruario_received === true ||
    patch.has_specified === true ||
    (typeof patch.specified_count === "number" && patch.specified_count > 0) ||
    patch.project_added === true ||
    (typeof patch.project_added_count === "number" && patch.project_added_count > 0);
  const existingReminder = (existing as { next_reminder_at?: string | null }).next_reminder_at;
  const reminderOverdue = !!existingReminder && new Date(existingReminder).getTime() <= Date.now();
  if ((stageChanged || milestoneRegistered) && !("next_reminder_at" in patch) && reminderOverdue) {
    patch.next_reminder_at = null;
    patch.reminder_note = null;
    patch.reminder_sent_at = null;
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
