import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("partners")
    .select("id, name, coupon_code, discount_type, discount_value, commission_type, commission_value")
    .eq("coupon_code", (code as string).toUpperCase())
    .eq("status", "active")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Cupom inválido ou inativo." }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    partner_name: data.name,
    coupon_code: data.coupon_code,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    commission_type: data.commission_type,
    commission_value: data.commission_value,
  });
}
