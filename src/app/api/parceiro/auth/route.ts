import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { coupon_code, portal_password } = await req.json();

  if (!coupon_code || !portal_password) {
    return NextResponse.json({ error: "Código e senha obrigatórios." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("partners")
    .select("id, name, coupon_code, discount_type, discount_value, commission_type, commission_value, portal_password, status")
    .eq("coupon_code", (coupon_code as string).toUpperCase())
    .eq("status", "active")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Cupom inválido ou inativo." }, { status: 401 });
  }

  if (!data.portal_password || data.portal_password !== portal_password) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    coupon_code: data.coupon_code,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    commission_type: data.commission_type,
    commission_value: data.commission_value,
  });
}
