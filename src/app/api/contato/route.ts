import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import { syncLeadToSmClick } from "@/lib/leads";
import {
  CIDADES, ETAPAS, PERFIS, areaTexto, mascaraWhatsapp, nomeProduto, numero, pendenciasContato,
  type ProdutoContato, type RespostasContato,
} from "@/lib/contato";

/**
 * POST /api/contato — registra um envio da aba "Solicitar atendimento".
 *
 * A aba abre o WhatsApp na hora e chama esta rota em paralelo (keepalive): o
 * cliente nunca espera o banco. Aqui o envio vira:
 *   1. uma linha em site_contatos (tela "Contatos do site" + Excel);
 *   2. um lead no CRM (source "website"), reaproveitando o lead do mesmo
 *      WhatsApp, com perfil/estágio/cidade/área como dados do lead e uma nota.
 * Falha no CRM não derruba o registro em site_contatos.
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
    whatsapp: limpo(raw.whatsapp, 30),
    nome: limpo(raw.nome, 80),
    etapa: limpo(raw.etapa, 20),
    largura: limpo(raw.largura, 10),
    altura: limpo(raw.altura, 10),
    cidade: limpo(raw.cidade, 20),
    cidadeOutra: limpo(raw.cidadeOutra, 60),
    areasDetalhe: Array.isArray(raw.areasDetalhe) ? raw.areasDetalhe.map((a) => limpo(a, 80)).filter(Boolean).slice(0, 10) : [],
  };
  if (pendenciasContato(r).length) {
    return NextResponse.json({ error: "Preencha perfil, WhatsApp, estágio da obra e cidade." }, { status: 400 });
  }
  if (!PERFIS.some((o) => o.value === r.perfil) || !ETAPAS.some((o) => o.value === r.etapa) || !CIDADES.some((o) => o.value === r.cidade)) {
    return NextResponse.json({ error: "Opção inválida." }, { status: 400 });
  }

  const produtos = (Array.isArray(body.produtos) ? body.produtos : [])
    .slice(0, 10)
    .map((p) => ({ code: limpo(p?.code, 40), name: limpo(p?.name, 80), linha: limpo(p?.linha, 30) }));
  const produtosTxt = produtos.map(nomeProduto).filter(Boolean).join("; ");
  const phone = mascaraWhatsapp(r.whatsapp ?? "");
  const cidade = r.cidade === "outra" ? r.cidadeOutra! : rotulo(CIDADES, r.cidade);
  const area = areaTexto(r);

  const db = supabaseAdmin();
  const { data: contato, error } = await db
    .from("site_contatos")
    .insert({
      name: r.nome || null,
      phone,
      perfil: r.perfil,
      etapa: r.etapa,
      largura_m: numero(r.largura),
      altura_m: numero(r.altura),
      areas_detalhe: r.areasDetalhe?.length ? r.areasDetalhe.join("; ") : null,
      cidade,
      produtos: produtosTxt || null,
      pagina: limpo(body.pagina, 120) || null,
    })
    .select("id")
    .single();

  if (error) {
    if (isMissingTable(error)) {
      console.error("[contato] tabela site_contatos ausente — rodar a migration 059");
    } else {
      console.error("[contato]", error.message);
    }
    // Segue para o CRM mesmo assim: o contato não pode se perder.
  }

  // ── Lead no CRM ────────────────────────────────────────────────────────────
  try {
    const perfil = r.perfil === "arquiteto" ? "Arquiteto(a)" : "Proprietário(a)";
    const etapa = rotulo(ETAPAS, r.etapa);
    const { data: existente } = await db.from("leads").select("id").eq("phone", phone).limit(1).maybeSingle();
    let leadId = existente?.id as string | undefined;
    if (leadId) {
      await db.from("leads").update({
        ...(produtosTxt ? { product_name: produtosTxt.slice(0, 200) } : {}),
        ...(area ? { space: area } : {}),
        updated_at: new Date().toISOString(),
      }).eq("id", leadId);
    } else {
      const { data: novo } = await db.from("leads").insert({
        name: r.nome || "Contato do site",
        phone,
        source: "website",
        product_name: produtosTxt ? produtosTxt.slice(0, 200) : null,
        space: area || null,
      }).select("id").single();
      leadId = novo?.id as string | undefined;
    }

    if (leadId) {
      const pontos = [
        { label: "Perfil", value: perfil },
        { label: "Estágio da obra", value: etapa },
        { label: "Cidade", value: cidade },
        ...(area ? [{ label: "Área", value: area }] : []),
      ].map((p) => ({ lead_id: leadId, ...p, updated_at: new Date().toISOString() }));
      await db.from("lead_data_points").upsert(pontos, { onConflict: "lead_id,label" });
      await db.from("lead_notes").insert({
        lead_id: leadId,
        kind: "system",
        author: "site",
        body: [
          "Pediu atendimento pelo site e foi ao WhatsApp.",
          produtosTxt && `Revestimento: ${produtosTxt}`,
          `${perfil} · Estágio: ${etapa} · Cidade: ${cidade}`,
          area && `Área: ${area}`,
          r.areasDetalhe?.length && `Áreas simuladas: ${r.areasDetalhe.join("; ")}`,
        ].filter(Boolean).join("\n"),
      });
      if (contato?.id) await db.from("site_contatos").update({ lead_id: leadId }).eq("id", contato.id);
      await syncLeadToSmClick(leadId);
    }
  } catch (e) {
    console.error("[contato] CRM:", e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ ok: true });
}
