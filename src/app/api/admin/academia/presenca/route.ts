import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn, isMissingTable } from "@/lib/db-compat";
import { smclickConfigured } from "@/lib/smclick";
import { enviarLancamento, enviarLancamentoTeste } from "@/lib/academia-notify";
import { linkPresenca } from "@/lib/academia-status";

/**
 * POST /api/admin/academia/presenca — pedido de confirmação de presença para
 * a 1ª turma da formação (uma semana antes), por WhatsApp + e-mail, cada um
 * com o seu link pessoal Vou/Não vou.
 *
 * Body: { texto, assunto, teste?: boolean }
 *   teste: true → só para o WhatsApp e o e-mail da Orbital (link de teste).
 *   sem teste   → um LOTE de quem ainda não recebeu o pedido nem respondeu;
 *                 devolve quantos faltam e a tela chama de novo até zerar.
 *                 presenca_pedida_at marca a tentativa: ninguém recebe duas vezes.
 */

export const maxDuration = 60;

const LOTE = 15;

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { texto?: unknown; assunto?: unknown; teste?: unknown } | null;
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  const assunto = typeof body?.assunto === "string" && body.assunto.trim() ? body.assunto.trim() : "Confirme sua presença — Academia Orbital";
  if (!texto.includes("{link}")) {
    return NextResponse.json({ error: "A mensagem precisa ter {link} — é por ele que a pessoa confirma." }, { status: 400 });
  }
  // [data], [horário], [local] esquecidos iriam para todo mundo.
  if (/\[[^\]]*\]/.test(texto)) {
    return NextResponse.json({ error: "Troque os [colchetes] pela data, o horário e o local antes de enviar." }, { status: 400 });
  }

  if (body?.teste === true) {
    const r = await enviarLancamentoTeste(texto, assunto, linkPresenca("teste"));
    return NextResponse.json({ teste: true, ...r, smclick: smclickConfigured() });
  }

  const db = supabaseAdmin();
  const { data: lote, error } = await db
    .from("academy_waitlist")
    .select("id, name, phone, email")
    .eq("turma", 1)
    .is("presenca", null)
    .is("presenca_pedida_at", null)
    .order("created_at", { ascending: true })
    .limit(LOTE);

  if (error) {
    if (isMissingTable(error) || isMissingColumn(error)) {
      return NextResponse.json({ error: "Rode a migration 065 no Supabase antes de pedir a confirmação." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let whatsapp = 0;
  let email = 0;
  let semEntrega = 0;
  for (const p of lote ?? []) {
    // Marca ANTES de enviar: se a função cair no meio, ninguém recebe duas vezes.
    await db.from("academy_waitlist").update({ presenca_pedida_at: new Date().toISOString() }).eq("id", p.id);
    const r = await enviarLancamento(p as { name: string; phone: string; email: string | null }, texto, assunto, linkPresenca(p.id));
    if (r.whatsapp) whatsapp++;
    if (r.email) email++;
    if (!r.whatsapp && !r.email) semEntrega++;
  }

  const { count } = await db
    .from("academy_waitlist")
    .select("id", { count: "exact", head: true })
    .eq("turma", 1)
    .is("presenca", null)
    .is("presenca_pedida_at", null);

  return NextResponse.json({ processados: lote?.length ?? 0, whatsapp, email, semEntrega, faltam: count ?? 0 });
}
