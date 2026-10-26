import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn, isMissingTable } from "@/lib/db-compat";
import { smclickConfigured } from "@/lib/smclick";
import { enviarLancamento, enviarLancamentoTeste } from "@/lib/academia-notify";

/**
 * POST /api/admin/academia/lancamento — aviso geral para os inscritos
 * (WhatsApp + e-mail).
 *
 * Body: { texto, assunto, teste?: boolean, turma?: 1 | 2 }
 *   turma       → só para a 1ª turma ou só para a fila da 2ª (sem: todos).
 *   teste: true → manda só para o WhatsApp e o e-mail da Orbital.
 *   sem teste   → manda para um LOTE de quem ainda não foi avisado e devolve
 *                 quantos faltam; a tela chama de novo até zerar. Lotes curtos
 *                 cabem no tempo da função e, se algo cair no meio, ninguém
 *                 recebe duas vezes (launch_notified_at marca a tentativa).
 */

export const maxDuration = 60;

const LOTE = 15;

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { texto?: unknown; assunto?: unknown; teste?: unknown; telefone_teste?: unknown; turma?: unknown } | null;
  const turma = body?.turma === 1 || body?.turma === 2 ? body.turma : null;
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  const assunto = typeof body?.assunto === "string" && body.assunto.trim() ? body.assunto.trim() : "Academia Orbital";
  if (texto.length < 10) return NextResponse.json({ error: "Escreva a mensagem do aviso." }, { status: 400 });

  if (body?.teste === true) {
    const r = await enviarLancamentoTeste(texto, assunto, undefined, typeof body?.telefone_teste === "string" ? body.telefone_teste : null);
    return NextResponse.json({ teste: true, ...r, smclick: smclickConfigured() });
  }

  const db = supabaseAdmin();
  let consulta = db
    .from("academy_waitlist")
    .select("id, name, phone, email")
    .is("launch_notified_at", null);
  if (turma) consulta = consulta.eq("turma", turma);
  const { data: lote, error } = await consulta
    .order("created_at", { ascending: true })
    .limit(LOTE);

  if (error) {
    if (isMissingTable(error) || isMissingColumn(error)) {
      return NextResponse.json({ error: `Rode a migration ${turma ? "065" : "058"} no Supabase antes de enviar o aviso.` }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let whatsapp = 0;
  let email = 0;
  let semEntrega = 0;
  for (const p of lote ?? []) {
    // Marca a tentativa ANTES de enviar: se a função cair no meio, a pessoa não
    // recebe duas vezes no próximo lote.
    const agora = new Date().toISOString();
    await db.from("academy_waitlist").update({ launch_notified_at: agora }).eq("id", p.id);
    const r = await enviarLancamento(p as { name: string; phone: string; email: string | null }, texto, assunto);
    const marcas: Record<string, string> = {};
    if (r.whatsapp) { whatsapp++; marcas.launch_whatsapp_at = new Date().toISOString(); }
    if (r.email) { email++; marcas.launch_email_at = new Date().toISOString(); }
    if (!r.whatsapp && !r.email) semEntrega++;
    if (Object.keys(marcas).length) await db.from("academy_waitlist").update(marcas).eq("id", p.id);
  }

  let restantes = db
    .from("academy_waitlist")
    .select("id", { count: "exact", head: true })
    .is("launch_notified_at", null);
  if (turma) restantes = restantes.eq("turma", turma);
  const { count } = await restantes;

  return NextResponse.json({ processados: lote?.length ?? 0, whatsapp, email, semEntrega, faltam: count ?? 0 });
}
