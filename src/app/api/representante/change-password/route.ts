import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword, verifyPassword } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const { referral_code, current_password, new_password } = await req.json();

  if (!referral_code || !current_password || !new_password) {
    return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
  }
  if (new_password.length < 8) {
    return NextResponse.json({ error: "A nova senha deve ter pelo menos 8 caracteres." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: rep } = await db
    .from("sales_reps")
    .select("id, portal_password")
    .eq("referral_code", (referral_code as string).toUpperCase())
    .maybeSingle();

  if (!rep || !rep.portal_password || !verifyPassword(current_password, rep.portal_password)) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 });
  }

  const { error } = await db
    .from("sales_reps")
    .update({ portal_password: hashPassword(new_password) })
    .eq("id", rep.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
