import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/admin/reminders — every lead with a scheduled follow-up, soonest
 * first. Powers the in-app reminders inbox; bucketing (overdue / today /
 * upcoming) is done client-side off next_reminder_at. Snooze and complete are
 * plain PATCHes on /api/admin/leads/[id] (move or clear next_reminder_at).
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("leads")
    .select(
      "id, name, email, phone, source, status, partner_name, space, product_name, estimated_value, next_reminder_at, reminder_note, reminder_recur, reminder_sent_at, last_contacted_at"
    )
    .not("next_reminder_at", "is", null)
    .order("next_reminder_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
