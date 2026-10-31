import type { SupabaseClient } from "@supabase/supabase-js";
import { atualizar, auditar, liberarPresas, pegarProxima, type Tarefa } from "@/lib/ia/fila";
import { detectarAniversarios, envioParabens, rascunhoParabens } from "@/lib/ia/parabens";

/**
 * Worker do runtime de IA: roda em lotes curtos (cabe no limite de tempo da
 * Vercel), primeiro as detecções baratas por código, depois as tarefas da fila.
 * Nada aqui fica "sempre ligado": quem acorda o worker é o cron ou o botão
 * "Rodar agora" do painel.
 */

type Executor = (db: SupabaseClient, t: Tarefa) => Promise<void>;

/** Tipo de tarefa → quem executa. Tipo sem executor falha com motivo claro. */
const EXECUTORES: Record<string, Executor> = {
  "aniversario.rascunho": rascunhoParabens,
  "aniversario.envio": envioParabens,
};

export interface ResumoWorker {
  detectados: number;
  processadas: number;
  falhas: number;
  parou_por_tempo: boolean;
}

export async function rodarWorker(db: SupabaseClient, opcoes: { limiteMs?: number; maxTarefas?: number; detectar?: boolean } = {}): Promise<ResumoWorker> {
  const inicio = Date.now();
  const limiteMs = opcoes.limiteMs ?? 40_000;
  const maxTarefas = opcoes.maxTarefas ?? 10;
  const resumo: ResumoWorker = { detectados: 0, processadas: 0, falhas: 0, parou_por_tempo: false };

  await liberarPresas(db);
  if (opcoes.detectar !== false) resumo.detectados = await detectarAniversarios(db);

  while (resumo.processadas < maxTarefas) {
    if (Date.now() - inicio > limiteMs) { resumo.parou_por_tempo = true; break; }
    const t = await pegarProxima(db);
    if (!t) break;
    resumo.processadas++;
    const executar = EXECUTORES[t.tipo];
    try {
      if (!executar) throw new Error(`Sem executor para o tipo "${t.tipo}".`);
      await executar(db, t);
    } catch (e) {
      resumo.falhas++;
      const erro = e instanceof Error ? e.message : String(e);
      const repetir = !!executar && t.tentativas < t.max_tentativas;
      await atualizar(db, t.id, { status: repetir ? "fila" : "falhou", erro });
      await auditar(db, "sistema", "erro_execucao", t.id, { erro, repetir });
    }
  }
  return resumo;
}
