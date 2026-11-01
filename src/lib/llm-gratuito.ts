/**
 * IA de texto gratuita do site (chat, CRM, campanhas, textos do admin).
 *
 * Fala com qualquer endpoint compatível com OpenAI (`FREE_LLM_API_URL`,
 * `FREE_LLM_API_KEY`). `FREE_LLM_MODEL` aceita uma lista separada por vírgula:
 * tenta o primeiro e, se ele estiver no limite do plano gratuito (429), fora do
 * ar (5xx), lento demais ou voltar vazio, passa para o próximo. Cada modelo tem
 * a própria cota, então a lista multiplica a capacidade e o chat não cai.
 */

export type MensagemLLM = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

export type ResultadoLLM =
  | { ok: true; texto: string; modelo: string; tokens?: number }
  | { ok: false; status: number; erro: string };

const PADRAO = "gemini-2.0-flash-lite";

/** Modelos configurados, na ordem de preferência. */
export function modelosGratuitos(): string[] {
  const lista = (process.env.FREE_LLM_MODEL || PADRAO).split(",").map((m) => m.trim()).filter(Boolean);
  return lista.length ? lista : [PADRAO];
}

export function llmGratuitoConfigurado(): boolean {
  return !!process.env.FREE_LLM_API_URL;
}

/**
 * Modelos que "pensam" antes de responder gastam o limite de tokens nisso e
 * podem voltar vazios. Para respostas curtas, o raciocínio fica no mínimo.
 */
function ajustesDoModelo(modelo: string): Record<string, unknown> {
  if (/gpt-oss/i.test(modelo)) return { reasoning_effort: "low" };
  if (/qwen3/i.test(modelo)) return { reasoning_effort: "none" };
  return {};
}

export async function completarGratuito(opcoes: {
  mensagens: MensagemLLM[];
  maxTokens: number;
  /** Pede JSON puro (response_format json_object). */
  json?: boolean;
  /** Troca a lista de modelos (ex.: rota que precisa de visão). */
  modelos?: string[];
  /** Limite por tentativa, em ms. */
  timeoutMs?: number;
}): Promise<ResultadoLLM> {
  const base = process.env.FREE_LLM_API_URL;
  if (!base) return { ok: false, status: 503, erro: "IA indisponível (FREE_LLM_API_URL não configurada)." };
  const chave = process.env.FREE_LLM_API_KEY || "";
  const modelos = opcoes.modelos?.length ? opcoes.modelos : modelosGratuitos();

  let ultimo: ResultadoLLM = { ok: false, status: 502, erro: "Erro no servidor de IA." };
  for (const modelo of modelos) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${chave}` },
        body: JSON.stringify({
          model: modelo,
          messages: opcoes.mensagens,
          max_tokens: opcoes.maxTokens,
          stream: false,
          ...(opcoes.json ? { response_format: { type: "json_object" } } : {}),
          ...ajustesDoModelo(modelo),
        }),
        signal: AbortSignal.timeout(opcoes.timeoutMs ?? 25_000),
      });
      if (!res.ok) {
        ultimo = { ok: false, status: res.status === 429 ? 429 : 502, erro: `Modelo ${modelo}: HTTP ${res.status}` };
        // 401/403: chave errada — os outros modelos usam a mesma chave.
        if (res.status === 401 || res.status === 403) return ultimo;
        continue;
      }
      const j = await res.json();
      const texto: string = j.choices?.[0]?.message?.content?.trim() ?? "";
      if (!texto) {
        ultimo = { ok: false, status: 502, erro: `Modelo ${modelo}: resposta vazia` };
        continue;
      }
      return { ok: true, texto, modelo, tokens: j.usage?.total_tokens };
    } catch (e) {
      ultimo = { ok: false, status: 504, erro: `Modelo ${modelo}: ${e instanceof Error ? e.name : "falha"}` };
    }
  }
  return ultimo;
}
