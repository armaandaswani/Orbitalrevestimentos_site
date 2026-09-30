import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ETAPA_ROTULO, PERFIL_ROTULO, areaContato, digitosContato, type SiteContato } from "@/lib/site-contatos";

/**
 * Exporta os contatos do site em CSV pronto para o Excel em português:
 * separador ";", BOM UTF-8 e células que começam com = + - @ neutralizadas
 * (o conteúdo vem de um formulário público e abre no Excel da Orbital).
 * Mesmo formato da exportação da Academia.
 */

function celula(v: string | null | undefined): string {
  let s = (v ?? "").replace(/\r?\n/g, " ").trim();
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[;"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function dataBR(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Manaus", dateStyle: "short", timeStyle: "short" });
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("site_contatos")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const linhas = ((data as SiteContato[]) ?? []).map((c) => [
    dataBR(c.created_at),
    c.name,
    c.phone,
    `55${digitosContato(c.phone)}`,
    PERFIL_ROTULO[c.perfil] ?? c.perfil,
    ETAPA_ROTULO[c.etapa] ?? c.etapa,
    c.cidade,
    c.produtos,
    areaContato(c),
    c.pagina,
  ].map(celula).join(";"));

  const cabecalho = [
    "Data", "Nome", "WhatsApp", "WhatsApp (só números)", "Perfil", "Estágio da obra",
    "Cidade", "Revestimento", "Área", "Página de origem",
  ].join(";");

  const csv = "﻿" + [cabecalho, ...linhas].join("\r\n");
  const hoje = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orbital-contatos-do-site-${hoje}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
