import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ATUACOES, EXPERIENCIAS, FOCOS, digitos, rotulo, type Inscricao } from "@/lib/academia-waitlist";

/**
 * Exporta a lista de espera em CSV pronto para o Excel em português.
 *
 * Três cuidados que o export de clientes não tem:
 * - separador ";" — com "," o Excel pt-BR abre tudo numa coluna só;
 * - BOM UTF-8 — sem ele o Excel lê "Construção" como "ConstruÃ§Ã£o";
 * - neutraliza fórmulas — o conteúdo vem de um formulário PÚBLICO e é aberto
 *   no Excel do dono; uma célula começando com "=" seria executada.
 */

function celula(v: string | null | undefined): string {
  let s = (v ?? "").replace(/\r?\n/g, " ").trim();
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // injeção de fórmula
  return /[;"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function dataBR(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Manaus", dateStyle: "short", timeStyle: "short" });
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("academy_waitlist")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const linhas = (data as Inscricao[] ?? []).map((r) => [
    dataBR(r.created_at),
    r.name,
    r.phone,
    // Número limpo com DDI: cola direto no WhatsApp ou em ferramenta de disparo.
    `55${digitos(r.phone)}`,
    r.email,
    r.city,
    r.role === "outro" && r.role_other ? `Outro: ${r.role_other}` : rotulo(ATUACOES, r.role),
    r.main_focus === "outro" && r.main_focus_other ? `Outro: ${r.main_focus_other}` : rotulo(FOCOS, r.main_focus),
    rotulo(EXPERIENCIAS, r.years_experience),
    r.source,
  ].map(celula).join(";"));

  const cabecalho = [
    "Data de cadastro", "Nome", "WhatsApp", "WhatsApp (só números)", "E-mail", "Cidade",
    "Atuação", "Principal foco hoje", "Tempo de profissão", "Origem",
  ].join(";");

  const csv = "﻿" + [cabecalho, ...linhas].join("\r\n");
  const hoje = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="academia-orbital-lista-de-espera-${hoje}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
