import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const couponCode = searchParams.get("coupon_code");

  const db = supabaseAdmin();
  let query = db.from("coupon_uses").select("*").order("created_at", { ascending: false });

  if (couponCode) {
    query = query.eq("coupon_code", couponCode.toUpperCase());
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("coupon_uses")
    .insert({
      partner_id: body.partner_id,
      coupon_code: body.coupon_code,
      space: body.space,
      product_name: body.product_name,
      product_code: body.product_code,
      area_m2: body.area_m2,
      plates: body.plates,
      material_total: body.material_total,
      material_discounted: body.material_discounted,
      discount_applied: body.discount_applied,
      commission_owed: body.commission_owed,
      architect_name: body.architect_name,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
