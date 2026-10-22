import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import { parseTipo, sessionUserId } from "@/lib/passkeys";

/**
 * Passkeys de quem está logado.
 * GET    ?tipo=admin|partner|rep  → lista (aparelho, criada, último uso)
 * DELETE { tipo, id }             → remove uma
 */

export async function GET(req: NextRequest) {
  const tipo = parseTipo(req.nextUrl.searchParams.get("tipo"));
  if (!tipo) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  const userId = sessionUserId(req, tipo);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin()
    .from("passkeys")
    .select("id, credential_id, device_name, created_at, last_used_at")
    .eq("user_type", tipo).eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ passkeys: [], disponivel: false });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ passkeys: data ?? [], disponivel: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tipo = parseTipo(body?.tipo);
  if (!tipo || typeof body?.id !== "string") return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  const userId = sessionUserId(req, tipo);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await supabaseAdmin()
    .from("passkeys").delete().eq("id", body.id).eq("user_type", tipo).eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
