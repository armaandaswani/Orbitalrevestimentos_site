import type { SupabaseClient } from "@supabase/supabase-js";
import { aniversariantes } from "@/lib/aniversarios-server";
import { primeiroNome } from "@/lib/aniversarios";
import { normalizePhone, sendText } from "@/lib/smclick";
import { chamarModelo, lerNivel } from "@/lib/ia/modelo";
import { atualizar, auditar, enfileirar, somarUso, type Tarefa } from "@/lib/ia/fila";

/**
 * Fluxo 1 — aniversários (departamento de Relacionamento).
 *
 *   detecção (código) → rascunho (modelo nível "executor") → QA (regras fixas
 *   + checagem de tom no nível "leve", se cadastrado) → aprovação humana →
 *   envio pelo WhatsApp (só com permissão) → registro do resultado real.
 *
 * As instruções do redator vêm de ai_agents ("relacoes-redator"), sincronizadas
 * do repositório privado. O texto abaixo é só a reserva mínima.
 */

const DEPTO = "relacionamento";
const AGENTE_REDATOR = "relacoes-redator";
const INSTRUCOES_RESERVA =
  "Você escreve mensagens curtas de aniversário em português do Brasil, em nome da equipe de uma empresa, " +
  "para parceiros profissionais. Use só os dados recebidos; nunca invente detalhes pessoais. 1 a 3 frases, " +
  "tom caloroso e profissional, sem venda, sem links, sem descontos, no máximo um emoji. Assine como a equipe.";

// ── QA determinístico ────────────────────────────────────────────────────────

const PROIBIDAS = [
  /estamos ansiosos/i, /ficamos [àa] disposi[cç][aã]o/i, /cupom/i, /desconto/i, /promo[cç][aã]o/i,
  /r\$\s*\d/i, /https?:\/\//i, /www\./i, /or[cç]amento/i, /compre/i, /mais caro/i,
  /\b\d{1,3}\s+anos\b/i, // idade: nunca
];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Problemas objetivos de uma mensagem de parabéns (lista vazia = passou). */
export function verificarParabens(texto: string, nome: string, limite = 320): string[] {
  const p: string[] = [];
  const t = (texto ?? "").trim();
  if (!t) return ["Mensagem vazia."];
  const primeiro = primeiroNome(nome);
  if (primeiro && !semAcento(t).includes(semAcento(primeiro))) p.push(`Não usa o primeiro nome (${primeiro}).`);
  if (t.length > limite) p.push(`Longa demais (${t.length} caracteres; máximo ${limite}).`);
  for (const r of PROIBIDAS) if (r.test(t)) p.push(`Contém trecho proibido: ${r.source}.`);
  const emojis = t.match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
  if (emojis > 1) p.push(`Emojis demais (${emojis}).`);
  return p;
}

// ── Detecção ─────────────────────────────────────────────────────────────────

/** Enfileira um rascunho por aniversariante de hoje (Manaus). Repetir no mesmo dia não duplica. */
export async function detectarAniversarios(db: SupabaseClient, agora = new Date()): Promise<number> {
  const { deHoje, hoje } = await aniversariantes(db, agora);
  let novos = 0;
  for (const a of deHoje) {
    const criou = await enfileirar(db, {
      tipo: "aniversario.rascunho", departamento: DEPTO, agente: AGENTE_REDATOR, autonomia: 2,
      chave_dedupe: `aniversario.rascunho:${a.ref}:${hoje.ano}`,
      entrada: { ref: a.ref, nome: a.nome, tipo: a.tipo, detalhe: a.detalhe, whatsapp: a.whatsapp, email: a.email, ano: hoje.ano, data: `${hoje.dia}/${hoje.mes}` },
      orcamento_tokens: 3000,
    });
    if (criou) novos++;
  }
  return novos;
}

// ── Rascunho ─────────────────────────────────────────────────────────────────

const SCHEMA_RASCUNHO = {
  type: "object",
  properties: {
    curta: { type: "string" },
    media: { type: "string" },
    recomendada: { type: "string", enum: ["curta", "media"] },
    motivo: { type: "string" },
  },
  required: ["curta", "media", "recomendada", "motivo"],
  additionalProperties: false,
};
const SCHEMA_TOM = {
  type: "object",
  properties: { natural: { type: "boolean" }, problema: { type: "string" } },
  required: ["natural", "problema"],
  additionalProperties: false,
};

interface Rascunho { curta: string; media: string; recomendada: "curta" | "media"; motivo: string }

export async function rascunhoParabens(db: SupabaseClient, t: Tarefa): Promise<void> {
  const e = t.entrada as { nome: string; tipo: string; detalhe?: string; data?: string };
  const { data: agente } = await db.from("ai_agents").select("instrucoes, ativo").eq("id", AGENTE_REDATOR).maybeSingle();
  const sistema = (agente?.ativo !== false && agente?.instrucoes) || INSTRUCOES_RESERVA;
  const feedback = t.erro ? `\nA versão anterior foi reprovada na checagem: ${t.erro}. Corrija isso.` : "";
  const entrada =
    `Pessoa: ${e.nome} (primeiro nome: ${primeiroNome(e.nome)})\nRelação: ${e.tipo}${e.detalhe ? ` — ${e.detalhe}` : ""}\n` +
    `Ocasião: aniversário hoje (${e.data ?? ""}).\nEscreva duas versões (curta e média) e diga qual recomenda.${feedback}`;

  let uso = { modelo: t.modelo, tokens_entrada: t.tokens_entrada, tokens_saida: t.tokens_saida, tokens_cache_leitura: t.tokens_cache_leitura, tokens_cache_escrita: t.tokens_cache_escrita, custo_usd: Number(t.custo_usd), latencia_ms: t.latencia_ms };
  const r = await chamarModelo<Rascunho>(db, { nivel: "executor", sistema, entrada, schema: SCHEMA_RASCUNHO, maxTokens: 800, esforco: "low" });
  if (r.uso) uso = somarUso(uso, r.uso);
  if (!r.ok) {
    const repetir = r.repetir && t.tentativas < t.max_tentativas;
    await atualizar(db, t.id, { ...uso, status: repetir ? "fila" : "falhou", erro: r.erro });
    return;
  }

  const qa = { curta: verificarParabens(r.dados.curta, e.nome), media: verificarParabens(r.dados.media, e.nome) };
  const escolhida = qa[r.dados.recomendada].length === 0 ? r.dados.recomendada : qa.curta.length === 0 ? "curta" : qa.media.length === 0 ? "media" : null;
  if (!escolhida) {
    const erro = [...qa.curta, ...qa.media].join(" ");
    const repetir = t.tentativas < t.max_tentativas;
    await atualizar(db, t.id, { ...uso, status: repetir ? "fila" : "falhou", erro, saida: { ...r.dados, qa } });
    return;
  }

  // Tom (opcional): só se houver um modelo "leve" cadastrado. Não bloqueia: informa quem aprova.
  let tom: { natural: boolean; problema: string } | null = null;
  if (await lerNivel(db, "leve")) {
    const rt = await chamarModelo<{ natural: boolean; problema: string }>(db, {
      nivel: "leve",
      sistema: "Você confere se uma mensagem curta em português do Brasil soa natural e humana (não robótica, não exagerada). Responda só o JSON.",
      entrada: r.dados[escolhida], schema: SCHEMA_TOM, maxTokens: 200, esforco: "low",
    });
    if (rt.uso) uso = somarUso(uso, rt.uso);
    if (rt.ok) tom = rt.dados;
  }

  const total = uso.tokens_entrada + uso.tokens_saida + uso.tokens_cache_leitura + uso.tokens_cache_escrita;
  await atualizar(db, t.id, {
    ...uso, status: "aguardando_aprovacao", erro: null,
    saida: { ...r.dados, recomendada: escolhida, qa, tom, acima_do_orcamento: total > t.orcamento_tokens },
  });
}

// ── Decisão humana ───────────────────────────────────────────────────────────

export type Canal = "whatsapp" | "manual";

export async function decidirParabens(
  db: SupabaseClient,
  t: Tarefa,
  d: { aprovar: boolean; texto?: string; canal?: Canal; ator: string },
): Promise<{ ok: boolean; erro?: string }> {
  if (t.tipo !== "aniversario.rascunho" || t.status !== "aguardando_aprovacao") return { ok: false, erro: "Esta tarefa não está aguardando aprovação." };
  const e = t.entrada as { ref: string; nome: string; whatsapp?: string | null; ano: number };
  const agora = new Date().toISOString();
  if (!d.aprovar) {
    await atualizar(db, t.id, { status: "recusada", decidido_por: d.ator, decidido_em: agora });
    await auditar(db, d.ator, "recusou_rascunho", t.id);
    return { ok: true };
  }
  const s = (t.saida ?? {}) as Partial<Rascunho>;
  const texto = (d.texto ?? (s.recomendada ? s[s.recomendada] : "") ?? "").trim();
  const problemas = verificarParabens(texto, e.nome);
  if (problemas.length) return { ok: false, erro: problemas.join(" ") };
  const canal: Canal = d.canal ?? "manual";

  if (canal === "manual") {
    // O dono manda pelo próprio celular: registramos para não repetir.
    const { error } = await db.from("relacionamento_envios").insert({ pessoa_ref: e.ref, ano: e.ano, canal: "manual", status: "manual", task_id: t.id, detalhe: texto });
    if (error && !/duplicate|unique/i.test(error.message)) return { ok: false, erro: error.message };
    await atualizar(db, t.id, { status: "concluida", decidido_por: d.ator, decidido_em: agora, concluido_em: agora, saida: { ...s, texto_final: texto, canal } });
    await auditar(db, d.ator, "aprovou_envio_manual", t.id, { canal });
    return { ok: true };
  }

  await atualizar(db, t.id, { status: "aprovada", decidido_por: d.ator, decidido_em: agora, saida: { ...s, texto_final: texto, canal } });
  await enfileirar(db, {
    tipo: "aniversario.envio", departamento: DEPTO, autonomia: 4, pai_id: t.id,
    chave_dedupe: `aniversario.envio:${e.ref}:${e.ano}:whatsapp`,
    entrada: { ref: e.ref, nome: e.nome, ano: e.ano, telefone: e.whatsapp ?? null, texto, aprovado_por: d.ator },
    orcamento_tokens: 0,
  });
  await auditar(db, d.ator, "aprovou_envio_whatsapp", t.id, { canal });
  return { ok: true };
}

// ── Envio ────────────────────────────────────────────────────────────────────

/** Envia pelo WhatsApp o texto aprovado. Sem permissão, sem número válido ou já enviado: não envia. */
export async function envioParabens(db: SupabaseClient, t: Tarefa): Promise<void> {
  const e = t.entrada as { ref: string; ano: number; telefone: string | null; texto: string };
  const fim = async (status: "concluida" | "falhou", erro: string | null, saida: Record<string, unknown>) => {
    const agora = new Date().toISOString();
    await atualizar(db, t.id, { status, erro, saida, concluido_em: agora });
    if (t.pai_id) await atualizar(db, t.pai_id, { status: status === "concluida" ? "concluida" : "aprovada", concluido_em: status === "concluida" ? agora : null });
    await auditar(db, "sistema", status === "concluida" ? "envio_whatsapp_ok" : "envio_whatsapp_falhou", t.id, { erro });
  };

  const { data: perm } = await db.from("relacionamento_permissoes").select("pode_whatsapp").eq("pessoa_ref", e.ref).maybeSingle();
  if (!perm?.pode_whatsapp) return fim("falhou", "Sem permissão de WhatsApp para esta pessoa.", { enviado: false });
  const tel = normalizePhone(e.telefone);
  if (!tel) return fim("falhou", "Sem número de WhatsApp válido.", { enviado: false });

  // Trava contra envio repetido: o índice único (pessoa, ano, canal) decide.
  const { data: anterior } = await db.from("relacionamento_envios").select("id, status").eq("pessoa_ref", e.ref).eq("ano", e.ano).eq("canal", "whatsapp").maybeSingle();
  if (anterior && anterior.status !== "falhou") return fim("concluida", null, { enviado: false, motivo: "Já enviado antes (não repetimos)." });
  if (anterior) await db.from("relacionamento_envios").delete().eq("id", anterior.id);
  const { error: trava } = await db.from("relacionamento_envios").insert({ pessoa_ref: e.ref, ano: e.ano, canal: "whatsapp", status: "enviando", task_id: t.id });
  if (trava) return fim("concluida", null, { enviado: false, motivo: "Outro envio já em andamento." });

  const r = await sendText(tel, e.texto);
  await db.from("relacionamento_envios").update({ status: r.ok ? "enviado" : "falhou", detalhe: r.ok ? null : (r.error ?? `HTTP ${r.status}`) })
    .eq("pessoa_ref", e.ref).eq("ano", e.ano).eq("canal", "whatsapp");
  if (r.ok) return fim("concluida", null, { enviado: true });
  const bruto = `${r.error ?? ""} ${typeof r.data === "string" ? r.data : JSON.stringify(r.data ?? "")}`;
  const erro = /no session|not connected|disconnected|desconectad/i.test(bruto)
    ? "WhatsApp da Orbital desconectado do SM Click (\"no session\"): reconecte lendo o QR Code e use \"Tentar de novo\"."
    : `SM Click recusou (${r.status || "sem resposta"}): ${r.error ?? "erro desconhecido"}`;
  return fim("falhou", erro, { enviado: false });
}
