import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import { normalizarInstagram, type AniversarioDados } from "@/lib/aniversarios";

/**
 * Aniversários de profissionais (migração 072).
 * GET    → todos os ativos, por mês e dia
 * POST   { ...dados }        → cadastra uma pessoa
 * PATCH  { id, ...campos }   → corrige (Instagram, WhatsApp, data…)
 * DELETE { id }              → tira da lista (fica guardado, inativo)
 */

const SEM_TABELA = { error: "Rode a migração 072 (aniversarios) no Supabase." };

function limpar(body: Record<string, unknown>): Partial<AniversarioDados> | { erro: string } {
  const out: Partial<AniversarioDados> = {};
  const txt = (k: string, max = 120) => {
    if (!(k in body)) return undefined;
    const v = typeof body[k] === "string" ? (body[k] as string).trim().slice(0, max) : "";
    return v || null;
  };
  const nome = txt("nome");
  if (nome !== undefined) { if (!nome) return { erro: "Informe o nome." }; out.nome = nome; }
  for (const k of ["profissao", "escritorio", "whatsapp", "email", "fonte", "observacoes"] as const) {
    const v = txt(k, k === "observacoes" ? 500 : 120);
    if (v !== undefined) out[k] = v;
  }
  if ("instagram" in body) out.instagram = normalizarInstagram(String(body.instagram ?? ""));
  if ("instagram_confirmado" in body) out.instagram_confirmado = body.instagram_confirmado === true;
  if ("dia" in body || "mes" in body) {
    const dia = Number(body.dia), mes = Number(body.mes);
    if (!(dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12)) return { erro: "Data de aniversário inválida." };
    out.dia = dia; out.mes = mes;
  }
  if ("ano" in body) {
    const ano = Number(body.ano);
    out.ano = ano >= 1900 && ano <= 2100 ? ano : null;
  }
  return out;
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin()
    .from("aniversarios").select("*").eq("ativo", true)
    .order("mes", { ascending: true }).order("dia", { ascending: true }).order("nome", { ascending: true });
  if (error) return NextResponse.json(isMissingTable(error) ? SEM_TABELA : { error: error.message }, { status: isMissingTable(error) ? 503 : 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  const dados = limpar(body);
  if ("erro" in dados) return NextResponse.json({ error: dados.erro }, { status: 400 });
  if (!dados.nome || !dados.dia || !dados.mes) return NextResponse.json({ error: "Nome e data de aniversário são obrigatórios." }, { status: 400 });
  const { data, error } = await supabaseAdmin().from("aniversarios").insert({ ...dados, fonte: dados.fonte ?? "Admin" }).select().single();
  if (error) return NextResponse.json(isMissingTable(error) ? SEM_TABELA : { error: error.message }, { status: isMissingTable(error) ? 503 : 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string") return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  const dados = limpar(body);
  if ("erro" in dados) return NextResponse.json({ error: dados.erro }, { status: 400 });
  const { data, error } = await supabaseAdmin()
    .from("aniversarios").update({ ...dados, updated_at: new Date().toISOString() }).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  const { error } = await supabaseAdmin().from("aniversarios").update({ ativo: false, updated_at: new Date().toISOString() }).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
