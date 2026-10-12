import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { tokenPresencaValido } from "@/lib/academia-status";

/**
 * POST /api/academia/presenca — resposta ao pedido de confirmação de presença
 * do workshop, pelo link pessoal enviado no WhatsApp/e-mail.
 *
 * Body: { i: id da inscrição, t: assinatura do link, resposta: "sim" | "nao" }
 * "nao" libera a vaga na 1ª turma. A pessoa pode mudar a resposta pelo mesmo
 * link. O id "teste" é o do envio de teste do admin: responde ok sem gravar.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { i?: unknown; t?: unknown; resposta?: unknown } | null;
  const id = typeof body?.i === "string" ? body.i : "";
  const token = typeof body?.t === "string" ? body.t : "";
  const resposta = body?.resposta;
  if (resposta !== "sim" && resposta !== "nao") {
    return NextResponse.json({ error: "Resposta inválida." }, { status: 400 });
  }
  if (!tokenPresencaValido(id, token)) {
    return NextResponse.json({ error: "Link inválido. Fale com a Orbital pelo WhatsApp." }, { status: 403 });
  }
  if (id === "teste") return NextResponse.json({ ok: true, resposta });

  const { error } = await supabaseAdmin()
    .from("academy_waitlist")
    .update({ presenca: resposta, presenca_respondida_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[academia/presenca]", error.message);
    return NextResponse.json({ error: "Não foi possível registrar agora. Tente de novo em instantes." }, { status: 500 });
  }
  // "Não vou" libera vaga: o contador da página muda.
  revalidatePath("/academia");
  return NextResponse.json({ ok: true, resposta });
}
