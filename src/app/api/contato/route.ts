import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import { isMissingColumn } from "@/lib/db-compat";
import {
  CAMPOS_NOVOS, CIDADES, CONHECE, ESPERA, ESPERA_DETALHE_MAX, MAX_ESPERA, PERFIS, PRAZOS, VALORIZA, VALORIZA_LEGADO,
  areaTexto, detalheEspera, nomeProduto, numero, pendenciasContato, rotuloValoriza, rotulosEspera,
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

/** Texto de uma linha, sem caracteres de controle (o Postgres recusa \0), no limite. */
function limpo(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max) : "";
}

function rotulo(lista: ReadonlyArray<{ value: string; label: string }>, v?: string): string {
  return lista.find((o) => o.value === v)?.label ?? "";
}

/** Junta pedaços de texto não vazios com "; " (null se não sobrar nada). */
function juntar(...partes: unknown[]): string | null {
  const t = partes.filter((p) => typeof p === "string" && p).join("; ");
  return t || null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { respostas?: RespostasContato; produtos?: ProdutoContato[]; pagina?: string; website?: string }
    | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  // Campo-isca: só robô preenche. Responde sucesso e não grava.
  if (limpo(body.website, 200)) return NextResponse.json({ ok: true });

  const raw = (body.respostas && typeof body.respostas === "object" ? body.respostas : {}) as RespostasContato;
  // "espera" chega como lista de valores; qualquer outra forma é inválida.
  const esperaBruta: unknown = raw.espera;
  if (esperaBruta != null && !Array.isArray(esperaBruta)) {
    return NextResponse.json({ error: "Opção inválida." }, { status: 400 });
  }
  const espera = [...new Set((Array.isArray(esperaBruta) ? esperaBruta : []).slice(0, 20).map((v) => limpo(v, 40)).filter(Boolean))];

  const r: RespostasContato = {
    conhece: limpo(raw.conhece, 10),
    perfil: limpo(raw.perfil, 20),
    valoriza: limpo(raw.valoriza, 40),
    espera,
    esperaDetalhe: limpo(raw.esperaDetalhe, ESPERA_DETALHE_MAX),
    prazo: limpo(raw.prazo, 30),
    nome: limpo(raw.nome, 80),
    largura: limpo(raw.largura, 10),
    altura: limpo(raw.altura, 10),
    cidade: limpo(raw.cidade, 20),
    cidadeOutra: limpo(raw.cidadeOutra, 60),
    areasDetalhe: Array.isArray(raw.areasDetalhe) ? raw.areasDetalhe.map((a) => limpo(a, 80)).filter(Boolean).slice(0, 10) : [],
  };
  // Conhece / espera são exigidos pelo formulário, mas uma aba aberta antes da
  // troca (out/2026) ainda manda sem eles: o servidor aceita.
  if (pendenciasContato(r).some((c) => !CAMPOS_NOVOS.includes(c))) {
    return NextResponse.json({ error: "Preencha perfil, o que valoriza, quando e cidade." }, { status: 400 });
  }
  if (
    !PERFIS.some((o) => o.value === r.perfil) ||
    !(VALORIZA.some((o) => o.value === r.valoriza) || VALORIZA_LEGADO.some((o) => o.value === r.valoriza)) ||
    !PRAZOS.some((o) => o.value === r.prazo) ||
    !CIDADES.some((o) => o.value === r.cidade) ||
    (!!r.conhece && !CONHECE.some((o) => o.value === r.conhece)) ||
    espera.length > MAX_ESPERA ||
    espera.some((v) => !ESPERA.some((o) => o.value === v))
  ) {
    return NextResponse.json({ error: "Opção inválida." }, { status: 400 });
  }

  const produtos = (Array.isArray(body.produtos) ? body.produtos : [])
    .slice(0, 10)
    .map((p) => ({ code: limpo(p?.code, 40), name: limpo(p?.name, 80), linha: limpo(p?.linha, 30) }));
  const produtosTxt = produtos.map(nomeProduto).filter(Boolean).join("; ");
  const cidade = r.cidade === "outra" ? r.cidadeOutra! : rotulo(CIDADES, r.cidade);
  const area = areaTexto(r);
  const esperaRotulos = rotulosEspera(espera);
  const detalhe = detalheEspera(r);
  const conhecePfb = r.conhece === "sim" ? true : r.conhece === "nao" ? false : null;

  const db = supabaseAdmin();
  const linha: Record<string, unknown> = {
    name: r.nome || null,
    phone: null,
    perfil: r.perfil,
    valoriza: rotuloValoriza(r.valoriza),
    prazo: rotulo(PRAZOS, r.prazo),
    largura_m: numero(r.largura),
    altura_m: numero(r.altura),
    areas_detalhe: r.areasDetalhe?.length ? r.areasDetalhe.join("; ") : null,
    cidade,
    produtos: produtosTxt || null,
    pagina: limpo(body.pagina, 120) || null,
    // Migração 074.
    conhece_pfb: conhecePfb,
    espera: esperaRotulos.length ? esperaRotulos : null,
    espera_detalhe: detalhe || null,
  };
  let { error } = await db.from("site_contatos").insert(linha);
  if (error && isMissingColumn(error)) {
    // Migração 074 ainda não rodou: as respostas novas vão no campo de áreas
    // para não perder o envio.
    const sem074: Record<string, unknown> = { ...linha };
    delete sem074.conhece_pfb;
    delete sem074.espera;
    delete sem074.espera_detalhe;
    sem074.areas_detalhe = juntar(
      sem074.areas_detalhe,
      conhecePfb === null ? "" : `Conhece o PFB: ${conhecePfb ? "Sim" : "Não"}`,
      esperaRotulos.length ? `Espera: ${esperaRotulos.join(", ")}` : "",
      detalhe && `Problema: ${detalhe}`,
    );
    ({ error } = await db.from("site_contatos").insert(sem074));
    if (error && isMissingColumn(error)) {
      // Nem a 071 rodou: o que valoriza e o prazo também vão no campo de áreas
      // (e a coluna de telefone ainda exige valor).
      const sem071: Record<string, unknown> = { ...sem074 };
      delete sem071.valoriza;
      delete sem071.prazo;
      ({ error } = await db.from("site_contatos").insert({
        ...sem071,
        phone: "",
        etapa: "ideacao",
        areas_detalhe: juntar(sem074.areas_detalhe, `Valoriza: ${linha.valoriza}`, `Quando: ${linha.prazo}`, area && `Área: ${area}`),
      }));
    }
  }
  if (error) {
    if (isMissingTable(error)) console.error("[contato] tabela site_contatos ausente — rodar a migration 059");
    else console.error("[contato]", error.message);
  }

  return NextResponse.json({ ok: true });
}
