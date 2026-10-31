import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { auditar } from "@/lib/ia/fila";

/**
 * POST /api/admin/ia/permissoes — grava como podemos falar com uma pessoa.
 * { pessoa_ref, pode_whatsapp, pode_email, pode_story_publica, origem }
 * Story pública é uma permissão à parte: contato privado não a autoriza.
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const ref = typeof b?.pessoa_ref === "string" ? b.pessoa_ref : "";
  if (!/^(profissional|parceiro|representante):[\w-]+$/.test(ref)) return NextResponse.json({ error: "Pessoa inválida." }, { status: 400 });
  const linha = {
    pessoa_ref: ref,
    pode_whatsapp: b?.pode_whatsapp === true,
    pode_email: b?.pode_email === true,
    pode_story_publica: b?.pode_story_publica === true,
    origem: typeof b?.origem === "string" ? b.origem.slice(0, 200) : "painel",
    atualizado_em: new Date().toISOString(),
  };
  const db = supabaseAdmin();
  const { error } = await db.from("relacionamento_permissoes").upsert(linha, { onConflict: "pessoa_ref" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await auditar(db, "admin", "alterou_permissao", null, linha);
  return NextResponse.json({ ok: true });
}
