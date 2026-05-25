import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("client_email_sequences")
    .select(
      "id, client_name, client_email, space, model, plates, area_m2, total, partner_name, current_step, status, next_email_at, created_at, coupon_use_id"
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
