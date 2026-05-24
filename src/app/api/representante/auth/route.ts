import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { referral_code, email, portal_password } = await req.json();

  if ((!referral_code && !email) || !portal_password) {
    return NextResponse.json(
      { error: "E-mail (ou código) e senha são obrigatórios." },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  let query = db
    .from("sales_reps")
    .select("id, name, referral_code, commission_type, commission_value, portal_password, status, birthday")
    .eq("status", "active");

  if (email) {
    query = query.ilike("email", (email as string).trim());
  } else {
    query = query.eq("referral_code", (referral_code as string).toUpperCase());
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Credenciais inválidas ou conta inativa." },
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
    birthday: data.birthday ?? null,
  });
}
