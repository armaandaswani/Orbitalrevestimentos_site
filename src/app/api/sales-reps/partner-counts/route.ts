import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

// Returns { [sales_rep_id]: count } from the partner_sales_reps junction table
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("partner_sales_reps")
    .select("sales_rep_id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row.sales_rep_id as string;
    counts[id] = (counts[id] || 0) + 1;
  }
  return NextResponse.json(counts);
}
