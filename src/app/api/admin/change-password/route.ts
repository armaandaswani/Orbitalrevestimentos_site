import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "orbital2025";

export async function POST(req: NextRequest) {
  const { current_password, new_password } = await req.json();

  if (!current_password || !new_password) {
    return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
  }
  if (new_password.length < 6) {
    return NextResponse.json({ error: "A nova senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  // Verify current password against env var or DB override
  const db = supabaseAdmin();
  const { data: setting } = await db
    .from("admin_settings")
    .select("value")
    .eq("key", "admin_password")
    .maybeSingle();

  const effectivePassword = setting?.value ?? ADMIN_PW;

  if (current_password !== effectivePassword) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 });
  }

  // Upsert new password into admin_settings
  const { error } = await db
    .from("admin_settings")
    .upsert({ key: "admin_password", value: new_password }, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, new_password });
}
