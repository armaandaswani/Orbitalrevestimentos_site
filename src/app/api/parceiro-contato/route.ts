import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { PERFIS_PARCEIRO, cidadeTexto, linhasRespostas, validarParceiro } from "@/lib/parceiro-contato";

/**
 * POST /api/parceiro-contato — registra um envio do pré-contato de parceiros
 * (lojista, marceneiro, engenheiro, construtor, aplicador, corretor).
 *
 * O formulário abre o WhatsApp na hora e chama esta rota em paralelo
 * (keepalive): o profissional nunca espera o banco. O envio vira um contato no
 * CRM do representante do site (ATENDENTE_MEETING_REP_EMAIL, o mesmo da Ste):
 * rep_partner_crm na etapa "novo_contato", com nome, telefone e profissão, e
 * uma nota com as respostas e o link do WhatsApp. Quem já está no CRM pelo
 * telefone não duplica: ganha só a nota nova. Telefone que já é parceiro liga
 * a linha ao parceiro. Sem migração: só as colunas que /api/atendente/lead já usa.
 *
 * Sem as variáveis do Supabase (dev local), responde 503: o formulário segue,
 * a pessoa já foi para o WhatsApp.
 *
 *   POST { perfil, respostas, cidade, cidadeOutra?, nome, whatsapp, pagina?, website? }
 *        → 201 { crm_id, created } | 400 { error } | 503 { error }
 */

const REP_EMAIL = process.env.ATENDENTE_MEETING_REP_EMAIL || "armaandaswani@icloud.com";

const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");
// Números do Brasil vêm com ou sem 55 e o nono dígito: compara os últimos 8.
const samePhone = (a: unknown, b: unknown) => {
  const x = digits(a), y = digits(b);
  return x.length >= 8 && y.length >= 8 && x.slice(-8) === y.slice(-8);
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  // Campo-isca: só robô preenche. Responde sucesso e não grava.
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true });

  const v = validarParceiro(body.perfil, body);
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 });
  const { perfil, r } = v;
  const def = PERFIS_PARCEIRO[perfil];
  // Com o 55 do Brasil, como chega das conversas do WhatsApp.
  const phone = `55${r.whatsapp}`;
  const name = r.nome!;

  let db: SupabaseClient;
  try {
    db = supabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });
  }

  const { data: rep } = await db.from("sales_reps").select("id").ilike("email", REP_EMAIL).maybeSingle();
  const salesRepId = (rep as { id: string } | null)?.id;
  if (!salesRepId) return NextResponse.json({ error: `Representante não encontrado (${REP_EMAIL}).` }, { status: 500 });

  const { data: partners } = await db.from("partners").select("id, phone");
  const partnerId = (partners ?? []).find((p) => samePhone(p.phone, phone))?.id ?? null;
  const { data: rows } = await db.from("rep_partner_crm").select("id, partner_id, prospect_phone").eq("sales_rep_id", salesRepId);
  const found = (rows ?? []).find((x) => (partnerId && x.partner_id === partnerId) || (!x.partner_id && samePhone(x.prospect_phone, phone)));

  let crmId = found?.id as string | undefined;
  if (!crmId) {
    const insert: Record<string, unknown> = { sales_rep_id: salesRepId, stage: "novo_contato", first_contact_at: new Date().toISOString() };
    if (partnerId) insert.partner_id = partnerId;
    else Object.assign(insert, { prospect_name: name, prospect_phone: phone, prospect_profession: def.rotulo });
    const { data: crm, error } = await db.from("rep_partner_crm").insert(insert).select("id").single();
    if (error || !crm) return NextResponse.json({ error: error?.message ?? "Não deu para gravar." }, { status: 500 });
    crmId = crm.id as string;
  }

  const pagina = typeof body.pagina === "string" ? body.pagina.replace(/[^\w\-/.#?=&%]/g, "").slice(0, 120) : "";
  const { error: erroNota } = await db.from("rep_partner_notes").insert({
    crm_id: crmId, kind: "system", author: "Site",
    body: [
      `${def.rotulo} pelo pré-contato de parceiros do site${pagina ? ` (${pagina})` : ""}.`,
      `Nome: ${name}`,
      `Cidade: ${cidadeTexto(r)}`,
      ...linhasRespostas(perfil, r),
      `WhatsApp: https://wa.me/${phone}`,
    ].join("\n"),
  });
  if (erroNota) return NextResponse.json({ error: erroNota.message, crm_id: crmId }, { status: 500 });

  return NextResponse.json({ crm_id: crmId, created: !found }, { status: found ? 200 : 201 });
}
