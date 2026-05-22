import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { coupon_code, current_password, new_password } = body as {
    coupon_code: string;
    current_password: string;
    new_password: string;
  };

  if (!coupon_code || !current_password || !new_password) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: partner, error } = await db
    .from("partners")
    .select("id, portal_password")
    .eq("coupon_code", coupon_code.toUpperCase())
    .eq("status", "active")
    .single();

  if (error || !partner) {
    return NextResponse.json({ error: "Parceiro não encontrado." }, { status: 404 });
  }

  if (partner.portal_password !== current_password) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 });
  }

  const { error: updateError } = await db
    .from("partners")
    .update({ portal_password: new_password })
    .eq("id", partner.id);

  if (updateError) {
    return NextResponse.json({ error: "Erro ao atualizar senha." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
