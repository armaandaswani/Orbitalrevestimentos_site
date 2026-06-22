import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

/** GET /api/admin/rep-meetings — all reps' meetings, joined with rep name. Oversight only. */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const db = supabaseAdmin();
  let query = db.from("rep_meetings").select("*").order("scheduled_at", { ascending: true });
  if (from) query = query.gte("scheduled_at", from);
  if (to) query = query.lte("scheduled_at", to);

  const { data: meetings, error } = await query;
  if (error && isMissingTable(error)) return NextResponse.json([]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!meetings || meetings.length === 0) return NextResponse.json([]);

  const repIds = [...new Set(meetings.map((m) => m.sales_rep_id as string))];
  const { data: reps } = await db.from("sales_reps").select("id, name").in("id", repIds);
  const repNameById = new Map((reps ?? []).map((r) => [r.id as string, r.name as string]));

  return NextResponse.json(
    meetings.map((m) => ({ ...m, sales_rep_name: repNameById.get(m.sales_rep_id as string) ?? null }))
  );
}
