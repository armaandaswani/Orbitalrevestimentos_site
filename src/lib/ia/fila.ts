import type { SupabaseClient } from "@supabase/supabase-js";
import type { UsoModelo } from "@/lib/ia/modelo";

/**
 * Fila de tarefas do runtime de IA (tabela ai_tasks) e trilha de auditoria.
 *
 * Estados: fila → executando → aguardando_aprovacao → aprovada → concluida,
 * com recusada e falhou como saídas. A chave_dedupe é única: enfileirar a
 * mesma coisa duas vezes não cria duas tarefas.
 */

export type StatusTarefa = "fila" | "executando" | "aguardando_aprovacao" | "aprovada" | "recusada" | "concluida" | "falhou";

export interface Tarefa {
  id: string;
  tipo: string;
  empresa: string;
  departamento: string;
  agente: string | null;
  pai_id: string | null;
  chave_dedupe: string | null;
  status: StatusTarefa;
  autonomia: number;
  entrada: Record<string, unknown>;
  saida: Record<string, unknown> | null;
  tentativas: number;
  max_tentativas: number;
  orcamento_tokens: number;
  modelo: string | null;
  tokens_entrada: number;
  tokens_saida: number;
  tokens_cache_leitura: number;
  tokens_cache_escrita: number;
  custo_usd: number;
  latencia_ms: number;
  erro: string | null;
  decidido_por: string | null;
  decidido_em: string | null;
  criado_em: string;
}

export interface NovaTarefa {
  tipo: string;
  departamento: string;
  agente?: string;
  empresa?: string;
  pai_id?: string;
  chave_dedupe?: string;
  autonomia?: number;
  entrada: Record<string, unknown>;
  status?: StatusTarefa;
  orcamento_tokens?: number;
}

/** Enfileira; com chave_dedupe repetida, não faz nada. Devolve se criou. */
export async function enfileirar(db: SupabaseClient, t: NovaTarefa): Promise<boolean> {
  const linha = {
    tipo: t.tipo, departamento: t.departamento, agente: t.agente ?? null, empresa: t.empresa ?? "orbital",
    pai_id: t.pai_id ?? null, chave_dedupe: t.chave_dedupe ?? null, autonomia: t.autonomia ?? 2,
    entrada: t.entrada, status: t.status ?? "fila", orcamento_tokens: t.orcamento_tokens ?? 4000,
  };
  if (!t.chave_dedupe) {
    const { error } = await db.from("ai_tasks").insert(linha);
    if (error) throw new Error(error.message);
    return true;
  }
  const { data, error } = await db.from("ai_tasks").upsert(linha, { onConflict: "chave_dedupe", ignoreDuplicates: true }).select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

/** Tarefas presas em "executando" há mais de `minutos` voltam para a fila. */
export async function liberarPresas(db: SupabaseClient, minutos = 15): Promise<void> {
  const limite = new Date(Date.now() - minutos * 60_000).toISOString();
  await db.from("ai_tasks").update({ status: "fila", erro: "Retomada: ficou presa em execução." })
    .eq("status", "executando").lt("iniciado_em", limite);
}

/**
 * Pega a próxima tarefa da fila e marca como executando. O update condicional
 * (status ainda "fila") impede dois workers de pegarem a mesma.
 */
export async function pegarProxima(db: SupabaseClient): Promise<Tarefa | null> {
  const { data } = await db.from("ai_tasks").select("*").eq("status", "fila").order("criado_em", { ascending: true }).limit(1);
  const t = (data ?? [])[0] as Tarefa | undefined;
  if (!t) return null;
  const { data: marcada } = await db.from("ai_tasks")
    .update({ status: "executando", tentativas: t.tentativas + 1, iniciado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
    .eq("id", t.id).eq("status", "fila").select("*");
  return ((marcada ?? [])[0] as Tarefa | undefined) ?? null;
}

/** Soma o uso de mais uma chamada de modelo à tarefa (uma tarefa pode chamar mais de um nível). */
export function somarUso(t: Pick<Tarefa, "tokens_entrada" | "tokens_saida" | "tokens_cache_leitura" | "tokens_cache_escrita" | "custo_usd" | "latencia_ms" | "modelo">, u: UsoModelo) {
  return {
    modelo: t.modelo ? (t.modelo.includes(u.modelo) ? t.modelo : `${t.modelo} + ${u.modelo}`) : u.modelo,
    tokens_entrada: t.tokens_entrada + u.tokens_entrada,
    tokens_saida: t.tokens_saida + u.tokens_saida,
    tokens_cache_leitura: t.tokens_cache_leitura + u.tokens_cache_leitura,
    tokens_cache_escrita: t.tokens_cache_escrita + u.tokens_cache_escrita,
    custo_usd: Number(t.custo_usd) + u.custo_usd,
    latencia_ms: t.latencia_ms + u.latencia_ms,
  };
}

export async function atualizar(db: SupabaseClient, id: string, campos: Record<string, unknown>): Promise<void> {
  const { error } = await db.from("ai_tasks").update({ ...campos, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function auditar(db: SupabaseClient, ator: string, acao: string, taskId: string | null, detalhe: Record<string, unknown> = {}): Promise<void> {
  await db.from("ai_audit_log").insert({ ator, acao, task_id: taskId, detalhe });
}
