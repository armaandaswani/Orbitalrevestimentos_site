import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { COOKIE_CONTATO, lerTokenContato } from "@/lib/aniversario-link";
import { normalizarInstagram } from "@/lib/aniversarios";

/**
 * POST /api/aniversario/contato — { instagram?, instagram_confirmado?, whatsapp? }
 * O formulário de /aniversario/contato. A pessoa vem do cookie do link
 * assinado; só o Instagram e o WhatsApp dela mudam, e só os campos enviados.
 */
export async function POST(req: NextRequest) {
  const id = lerTokenContato(req.cookies.get(COOKIE_CONTATO)?.value);
  if (!id) return NextResponse.json({ error: "Link vencido. Abra de novo pelo e-mail ou use Admin → Aniversários." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

  const dados: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("instagram" in body) {
    const insta = String(body.instagram ?? "").trim();
    const instagram = normalizarInstagram(insta);
    if (insta && !instagram) return NextResponse.json({ error: "Instagram inválido. Use só o @ (letras, números, ponto e _)." }, { status: 400 });
    dados.instagram = instagram;
    dados.instagram_confirmado = !!instagram && body.instagram_confirmado === true;
  }
  if ("whatsapp" in body) dados.whatsapp = String(body.whatsapp ?? "").trim().slice(0, 40) || null;

  const { data, error } = await supabaseAdmin().from("aniversarios").update(dados).eq("id", id).eq("ativo", true).select("id");
  if (error) {
    console.error("[aniversario/contato]", error.message);
    return NextResponse.json({ error: "Não foi possível salvar. Tente de novo." }, { status: 500 });
  }
  if (!data?.length) return NextResponse.json({ error: "Pessoa não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
