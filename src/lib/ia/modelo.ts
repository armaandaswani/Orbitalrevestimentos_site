import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Chamada de modelo do runtime de IA, com telemetria.
 *
 * O modelo NÃO fica no código: cada tarefa pede um nível ("executor", "leve")
 * e a tabela ai_modelos diz qual modelo e quanto custa. Assim trocar de modelo
 * ou de preço é um UPDATE, e o custo de cada tarefa sai do uso real devolvido
 * pela API (entrada, saída, leitura e escrita de cache).
 *
 * Saída sempre em JSON validado por schema (output_config.format), para o
 * worker nunca depender de texto solto.
 */

export interface ModeloNivel {
  nivel: string;
  modelo: string;
  preco_entrada: number;
  preco_saida: number;
  preco_cache_leitura: number;
  preco_cache_escrita: number;
}

export interface UsoModelo {
  modelo: string;
  tokens_entrada: number;
  tokens_saida: number;
  tokens_cache_leitura: number;
  tokens_cache_escrita: number;
  custo_usd: number;
  latencia_ms: number;
}

export type ResultadoModelo<T> =
  | { ok: true; dados: T; uso: UsoModelo }
  | { ok: false; erro: string; repetir: boolean; uso?: UsoModelo };

/** Erro de configuração: sem chave ou sem modelo para o nível. Não adianta repetir. */
export function modeloConfigurado(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function lerNivel(db: SupabaseClient, nivel: string): Promise<ModeloNivel | null> {
  const { data } = await db.from("ai_modelos").select("*").eq("nivel", nivel).maybeSingle();
  if (!data?.modelo) return null;
  const n = (v: unknown) => Number(v ?? 0) || 0;
  return {
    nivel, modelo: String(data.modelo),
    preco_entrada: n(data.preco_entrada), preco_saida: n(data.preco_saida),
    preco_cache_leitura: n(data.preco_cache_leitura), preco_cache_escrita: n(data.preco_cache_escrita),
  };
}

export function custoUsd(m: ModeloNivel, u: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }): number {
  const milhao = 1_000_000;
  return (
    (u.input_tokens * m.preco_entrada +
      u.output_tokens * m.preco_saida +
      (u.cache_read_input_tokens ?? 0) * m.preco_cache_leitura +
      (u.cache_creation_input_tokens ?? 0) * m.preco_cache_escrita) / milhao
  );
}

let cliente: Anthropic | null = null;
function anthropic(): Anthropic {
  // maxRetries baixo: as novas tentativas são da fila (com registro), não escondidas aqui.
  if (!cliente) cliente = new Anthropic({ maxRetries: 1, timeout: 45_000 });
  return cliente;
}

/**
 * Uma chamada com saída JSON. `sistema` é o bloco estável (instruções do
 * agente + regras) e vai com cache; `entrada` é o que muda a cada tarefa.
 */
export async function chamarModelo<T>(
  db: SupabaseClient,
  opcoes: {
    nivel: string;
    sistema: string;
    entrada: string;
    schema: Record<string, unknown>;
    maxTokens: number;
    esforco?: "low" | "medium" | "high";
  },
): Promise<ResultadoModelo<T>> {
  if (!modeloConfigurado()) return { ok: false, erro: "ANTHROPIC_API_KEY não configurada.", repetir: false };
  const m = await lerNivel(db, opcoes.nivel);
  if (!m) return { ok: false, erro: `Nenhum modelo cadastrado para o nível "${opcoes.nivel}" (ai_modelos).`, repetir: false };

  const inicio = Date.now();
  try {
    const resp = await anthropic().messages.create({
      model: m.modelo,
      max_tokens: opcoes.maxTokens,
      system: [{ type: "text", text: opcoes.sistema, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: opcoes.entrada }],
      output_config: {
        effort: opcoes.esforco ?? "low",
        format: { type: "json_schema", schema: opcoes.schema },
      },
    });
    const u = resp.usage;
    const uso: UsoModelo = {
      modelo: resp.model,
      tokens_entrada: u.input_tokens,
      tokens_saida: u.output_tokens,
      tokens_cache_leitura: u.cache_read_input_tokens ?? 0,
      tokens_cache_escrita: u.cache_creation_input_tokens ?? 0,
      custo_usd: custoUsd(m, u),
      latencia_ms: Date.now() - inicio,
    };
    if (resp.stop_reason === "refusal") return { ok: false, erro: "O modelo recusou a tarefa.", repetir: false, uso };
    if (resp.stop_reason === "max_tokens") return { ok: false, erro: "Resposta cortada (limite de tokens).", repetir: true, uso };
    const texto = resp.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    try {
      return { ok: true, dados: JSON.parse(texto) as T, uso };
    } catch {
      return { ok: false, erro: "Resposta fora do formato JSON.", repetir: true, uso };
    }
  } catch (e) {
    const latencia_ms = Date.now() - inicio;
    if (e instanceof Anthropic.RateLimitError) return { ok: false, erro: "Limite de uso da API (429).", repetir: true };
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, erro: "Chave da API inválida.", repetir: false };
    if (e instanceof Anthropic.BadRequestError) return { ok: false, erro: `Pedido inválido: ${e.message}`, repetir: false };
    if (e instanceof Anthropic.APIError) return { ok: false, erro: `API ${e.status ?? ""}: ${e.message}`, repetir: (e.status ?? 500) >= 500 };
    return { ok: false, erro: `Falha de rede (${latencia_ms} ms): ${e instanceof Error ? e.message : String(e)}`, repetir: true };
  }
}
