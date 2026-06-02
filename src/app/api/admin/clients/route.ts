import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();

  // Try full select (including sale_status which requires migration 004)
  const { data, error } = await db
    .from("client_email_sequences")
    .select(
      "id, client_name, client_email, client_phone, space, model, plates, area_m2, total, partner_name, current_step, status, next_email_at, created_at, coupon_use_id, sale_status"
    )
    .order("created_at", { ascending: false });

  if (!error) return NextResponse.json(data ?? []);

  // Fallback: sale_status column may not exist yet — retry without it
  const { data: data2, error: error2 } = await db
    .from("client_email_sequences")
    .select(
      "id, client_name, client_email, client_phone, space, model, plates, area_m2, total, partner_name, current_step, status, next_email_at, created_at, coupon_use_id"
    )
    .order("created_at", { ascending: false });

  if (error2) return NextResponse.json({ error: error2.message }, { status: 500 });
  // Inject null sale_status so the admin page gets consistent shape
  return NextResponse.json((data2 ?? []).map((r) => ({ ...r, sale_status: null })));
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("client_email_sequences")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
