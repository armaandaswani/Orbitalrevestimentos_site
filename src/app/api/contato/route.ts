import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import { isMissingColumn } from "@/lib/db-compat";
import {
  CIDADES, PERFIS, PRAZOS, VALORIZA, areaTexto, nomeProduto, numero, pendenciasContato,
  type ProdutoContato, type RespostasContato,
} from "@/lib/contato";

/**
 * POST /api/contato — registra um envio do pré-contato.
 *
 * O formulário abre o WhatsApp na hora e chama esta rota em paralelo
 * (keepalive): o cliente nunca espera o banco. O envio vira uma linha em
 * site_contatos (tela "Contatos do site" + Excel). O pré-contato não pede mais
 * o WhatsApp do cliente — a conversa já traz o número —, então o lead no CRM
 * nasce da própria conversa no WhatsApp, não daqui.
 */

function limpo(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function rotulo(lista: ReadonlyArray<{ value: string; label: string }>, v?: string): string {
  return lista.find((o) => o.value === v)?.label ?? "";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { respostas?: RespostasContato; produtos?: ProdutoContato[]; pagina?: string; website?: string }
    | null;
  if (!body) return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  // Campo-isca: só robô preenche. Responde sucesso e não grava.
  if (limpo(body.website, 200)) return NextResponse.json({ ok: true });

  const raw = body.respostas ?? {};
  const r: RespostasContato = {
    perfil: limpo(raw.perfil, 20),
    valoriza: limpo(raw.valoriza, 30),
    prazo: limpo(raw.prazo, 30),
    nome: limpo(raw.nome, 80),
    largura: limpo(raw.largura, 10),
    altura: limpo(raw.altura, 10),
    cidade: limpo(raw.cidade, 20),
    cidadeOutra: limpo(raw.cidadeOutra, 60),
    areasDetalhe: Array.isArray(raw.areasDetalhe) ? raw.areasDetalhe.map((a) => limpo(a, 80)).filter(Boolean).slice(0, 10) : [],
  };
  if (pendenciasContato(r).length) {
    return NextResponse.json({ error: "Preencha perfil, o que valoriza, quando e cidade." }, { status: 400 });
  }
  if (
    !PERFIS.some((o) => o.value === r.perfil) ||
    !VALORIZA.some((o) => o.value === r.valoriza) ||
    !PRAZOS.some((o) => o.value === r.prazo) ||
    !CIDADES.some((o) => o.value === r.cidade)
  ) {
    return NextResponse.json({ error: "Opção inválida." }, { status: 400 });
  }

  const produtos = (Array.isArray(body.produtos) ? body.produtos : [])
    .slice(0, 10)
    .map((p) => ({ code: limpo(p?.code, 40), name: limpo(p?.name, 80), linha: limpo(p?.linha, 30) }));
  const produtosTxt = produtos.map(nomeProduto).filter(Boolean).join("; ");
  const cidade = r.cidade === "outra" ? r.cidadeOutra! : rotulo(CIDADES, r.cidade);
  const area = areaTexto(r);

  const db = supabaseAdmin();
  const linha: Record<string, unknown> = {
    name: r.nome || null,
    phone: null,
    perfil: r.perfil,
    valoriza: rotulo(VALORIZA, r.valoriza),
    prazo: rotulo(PRAZOS, r.prazo),
    largura_m: numero(r.largura),
    altura_m: numero(r.altura),
    areas_detalhe: r.areasDetalhe?.length ? r.areasDetalhe.join("; ") : null,
    cidade,
    produtos: produtosTxt || null,
    pagina: limpo(body.pagina, 120) || null,
  };
  let { error } = await db.from("site_contatos").insert(linha);
  if (error && isMissingColumn(error)) {
    // Migração 071 ainda não rodou: guarda as respostas novas no campo de áreas
    // para não perder o envio (a coluna de telefone ainda exige valor).
    const { valoriza, prazo, ...resto } = linha;
    ({ error } = await db.from("site_contatos").insert({
      ...resto,
      phone: "",
      etapa: "ideacao",
      areas_detalhe: [resto.areas_detalhe, `Valoriza: ${valoriza}`, `Quando: ${prazo}`, area && `Área: ${area}`].filter(Boolean).join("; "),
    }));
  }
  if (error) {
    if (isMissingTable(error)) console.error("[contato] tabela site_contatos ausente — rodar a migration 059");
    else console.error("[contato]", error.message);
  }

  return NextResponse.json({ ok: true });
}
