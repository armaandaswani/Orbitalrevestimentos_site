import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { referral_code, portal_password } = await req.json();

  if (!referral_code || !portal_password) {
    return NextResponse.json(
      { error: "Código e senha obrigatórios." },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("sales_reps")
    .select("id, name, referral_code, commission_type, commission_value, portal_password, status")
    .eq("referral_code", (referral_code as string).toUpperCase())
    .eq("status", "active")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Código de indicação inválido ou inativo." },
      { status: 401 }
    );
  }

  if (!data.portal_password || data.portal_password !== portal_password) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    referral_code: data.referral_code,
    commission_type: data.commission_type,
    commission_value: data.commission_value,
  });
}
