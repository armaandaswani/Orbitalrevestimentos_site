import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "orbital2025";

function checkAuth(req: NextRequest) {
  return req.headers.get("x-admin-auth") === ADMIN_PW;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = supabaseAdmin();
  const { data } = await sb.from("site_settings").select("value").eq("key", "chat_system_prompt").single();
  return NextResponse.json({ prompt: data?.value ?? null });
}

export async function PUT(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { prompt } = await req.json();
  if (!prompt?.trim()) return NextResponse.json({ error: "prompt obrigatório" }, { status: 400 });
  const sb = supabaseAdmin();
  const { error } = await sb.from("site_settings").upsert({ key: "chat_system_prompt", value: prompt.trim(), updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
