import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  PERFIL_ESPERA_ROTULO, prioridadePrazo, rotuloLinha, rotuloPrazo, whatsappLegivel, type SiteListaEspera,
} from "@/lib/lista-espera";

/**
 * Exporta a lista de espera em CSV para o Excel em português, no mesmo
 * formato dos contatos do site: ";", BOM UTF-8 e células que começam com
 * = + - @ neutralizadas (o conteúdo vem de um formulário público).
 * Ordem de aviso: quem já está em obra primeiro, depois quem chegou antes.
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
    .from("site_lista_espera")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lista = ((data as SiteListaEspera[]) ?? [])
    .slice()
    .sort((a, b) => prioridadePrazo(a.prazo) - prioridadePrazo(b.prazo));

  const linhas = lista.map((c) => [
    rotuloLinha(c.linha),
    dataBR(c.created_at),
    c.nome,
    whatsappLegivel(c.whatsapp),
    c.whatsapp,
    c.email,
    PERFIL_ESPERA_ROTULO[c.perfil] ?? c.perfil,
    c.perfil_outro ?? "",
    rotuloPrazo(c.prazo),
    (c.modelos ?? []).join(", "),
    c.avisado_em ? dataBR(c.avisado_em) : "",
  ].map(celula).join(";"));

  const cabecalho = [
    "Linha", "Inscrição", "Nome", "WhatsApp", "WhatsApp (só números)", "E-mail", "Perfil", "Quem é (outro)",
    "Obra", "Modelos de interesse", "Avisado em",
  ].join(";");

  const csv = "﻿" + [cabecalho, ...linhas].join("\r\n");
  const hoje = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orbital-lista-de-espera-${hoje}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
