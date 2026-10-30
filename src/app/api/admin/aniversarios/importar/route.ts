import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import { lerCsv, linhasParaAniversarios, type Aniversario } from "@/lib/aniversarios";

/**
 * POST /api/admin/aniversarios/importar — { csv } da planilha "Profissionais"
 * (Arquivo → Fazer download → CSV). Atualiza quem já existe pelo ID da
 * planilha e cadastra os novos. Campo vazio na planilha NÃO apaga o que foi
 * completado no admin (um WhatsApp achado depois continua lá).
 */

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { csv?: unknown } | null;
  const csv = typeof body?.csv === "string" ? body.csv : "";
  if (!csv.trim() || csv.length > 3_000_000) return NextResponse.json({ error: "Envie o CSV da planilha." }, { status: 400 });

  const { registros, ignoradas } = linhasParaAniversarios(lerCsv(csv));
  if (!registros.length) {
    return NextResponse.json({ error: "Nenhuma linha válida. A planilha precisa das colunas Nome e Aniversário (dd/mm)." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: atuais, error } = await db.from("aniversarios").select("*");
  if (error) {
    return NextResponse.json(
      isMissingTable(error) ? { error: "Rode a migração 072 (aniversarios) no Supabase antes de importar." } : { error: error.message },
      { status: isMissingTable(error) ? 503 : 500 },
    );
  }
  const porRef = new Map(((atuais ?? []) as Aniversario[]).filter((a) => a.ref).map((a) => [a.ref!, a]));

  const agora = new Date().toISOString();
  let novos = 0;
  let atualizados = 0;
  const linhas = registros.map((r) => {
    const ja = r.ref ? porRef.get(r.ref) : undefined;
    if (!ja) { novos++; return { ...r, ativo: true, updated_at: agora }; }
    atualizados++;
    // Só o que a planilha traz preenchido substitui; Instagram confirmado no
    // admin não volta a ser o "sugerido" da planilha.
    const manterInsta = ja.instagram_confirmado && !r.instagram_confirmado;
    return {
      ...ja,
      nome: r.nome,
      profissao: r.profissao ?? ja.profissao,
      escritorio: r.escritorio ?? ja.escritorio,
      instagram: manterInsta ? ja.instagram : (r.instagram ?? ja.instagram),
      instagram_confirmado: manterInsta ? true : (r.instagram ? r.instagram_confirmado : ja.instagram_confirmado),
      whatsapp: r.whatsapp ?? ja.whatsapp,
      email: r.email ?? ja.email,
      dia: r.dia,
      mes: r.mes,
      ano: r.ano ?? ja.ano,
      fonte: r.fonte ?? ja.fonte,
      observacoes: r.observacoes ?? ja.observacoes,
      updated_at: agora,
    };
  });

  const comRef = linhas.filter((l) => l.ref);
  const semRef = linhas.filter((l) => !l.ref);
  for (let i = 0; i < comRef.length; i += 500) {
    const { error: e } = await db.from("aniversarios").upsert(comRef.slice(i, i + 500), { onConflict: "ref", defaultToNull: false });
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  }
  if (semRef.length) {
    const { error: e } = await db.from("aniversarios").insert(semRef);
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ novos, atualizados, ignoradas, total: registros.length });
}
