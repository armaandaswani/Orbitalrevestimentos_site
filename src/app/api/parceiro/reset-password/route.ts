import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, new_password } = body as { token: string; new_password: string };

  if (!token || !new_password) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: partner, error } = await db
    .from("partners")
    .select("id")
    .eq("reset_token", token)
    .gt("reset_token_expires_at", new Date().toISOString())
    .single();

  if (error || !partner) {
    return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });
  }

  const { error: updateError } = await db
    .from("partners")
    .update({
      portal_password: new_password,
      reset_token: null,
      reset_token_expires_at: null,
    })
    .eq("id", partner.id);

  if (updateError) {
    return NextResponse.json({ error: "Erro ao redefinir senha." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
