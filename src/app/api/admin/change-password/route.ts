import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getStoredPassword,
  hashPassword,
  isAdminRequest,
  verifyPassword,
} from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { current_password, new_password } = await req.json();

  if (!current_password || !new_password) {
    return NextResponse.json(
      { error: "Todos os campos são obrigatórios." },
      { status: 400 }
    );
  }
  if (new_password.length < 8) {
    return NextResponse.json(
      { error: "A nova senha deve ter pelo menos 8 caracteres." },
      { status: 400 }
    );
  }

  const stored = await getStoredPassword();
  if (!stored || !verifyPassword(current_password, stored)) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("admin_settings")
    .upsert(
      { key: "admin_password_hash", value: hashPassword(new_password) },
      { onConflict: "key" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Remove any legacy plaintext password so the hash is authoritative.
  await db.from("admin_settings").delete().eq("key", "admin_password");

  return NextResponse.json({ ok: true });
}
