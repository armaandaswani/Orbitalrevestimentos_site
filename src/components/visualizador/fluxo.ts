// Regras puras do fluxo do Visualizador (sem React), testáveis com o runner do Node.
import type { Zone, VizStep } from "../VisualizadorWizard";

export type ProductLine = "Classic" | "Brilliance" | "Elegance";

/** Ordem das linhas (abas do Acabamento e ordenação do catálogo). */
export const LINE_ORDER: ProductLine[] = ["Classic", "Brilliance", "Elegance"];

/** Tipos de superfície (mantidos iguais aos do Simulador). */
export const VIZ_SPACES: { id: string; label: string }[] = [
  { id: "parede", label: "Parede" },
  { id: "teto", label: "Teto" },
  { id: "sala", label: "Sala" },
  { id: "quarto", label: "Quarto" },
  { id: "escritorio", label: "Escritório" },
  { id: "corredor", label: "Corredor" },
  { id: "banheiro", label: "Banheiro" },
  { id: "lavabo", label: "Lavabo" },
  { id: "cozinha", label: "Cozinha" },
  { id: "movel", label: "Móvel / Marcenaria" },
  { id: "porta", label: "Porta" },
  { id: "box", label: "Box / Ducha" },
];

export type EtapaVisivel = 0 | 1 | 2 | 3;
export const ETAPAS = ["Foto", "Marcar", "Acabamento", "Resultado"] as const;

export function etapaVisivel(
  step: VizStep,
  phase: "mark" | "confirm" | "model",
): EtapaVisivel {
  if (step === "upload") return 0;
  if (step === "result") return 3;
  return phase === "mark" ? 1 : 2;
}

export function podeConcluirMarcacao(zones: Pick<Zone, "detecting">[]): boolean {
  return zones.length > 0 && zones.every((z) => !z.detecting);
}

export function areaPronta(
  z: Pick<Zone, "productChosen" | "instruction">,
): boolean {
  return Boolean(z.productChosen) && z.instruction.trim().length > 0;
}

export function podeGerar(
  zones: Pick<Zone, "productChosen" | "instruction">[],
  base: { canGenerate: boolean },
): boolean {
  return base.canGenerate && zones.length > 0 && zones.every(areaPronta);
}

/**
 * "Próxima área" no Acabamento: basta o acabamento escolhido na área atual. A
 * descrição de onde aplicar pode vir depois; quem exige descrição em todas as
 * áreas é `podeGerar`.
 */
export function podeIrParaProximaArea(z: Pick<Zone, "productChosen">): boolean {
  return Boolean(z.productChosen);
}

export function areaSeguinte(atual: number, total: number): number | null {
  return atual + 1 < total ? atual + 1 : null;
}

export function ajustarAreaAtual(atual: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(atual, 0), total - 1);
}

/**
 * Índice da área atual, guardada pelo id da zona (e pelo último índice em que
 * ela estava). A zona ainda existe: o índice dela, mesmo que outra área antes
 * dela tenha saído. A zona saiu: a seguinte, que passou a ocupar o mesmo
 * índice (regra de `areaSeguinte`); se ela era a última, a nova última. Sem
 * áreas, 0.
 */
export function indiceDaArea(ids: readonly string[], pedida: { id: string | null; indice: number }): number {
  const i = pedida.id === null ? -1 : ids.indexOf(pedida.id);
  return i >= 0 ? i : ajustarAreaAtual(pedida.indice, ids.length);
}

export function limitarDivisor(v: number): number {
  return Math.min(Math.max(v, 0), 100);
}

export function passoTeclado(
  v: number,
  tecla: "ArrowLeft" | "ArrowRight" | "Home" | "End",
): number {
  if (tecla === "Home") return 0;
  if (tecla === "End") return 100;
  return limitarDivisor(v + (tecla === "ArrowRight" ? 5 : -5));
}

/** Cor de cada área, pela ordem (contorno na foto, chip e cartão). */
export const ZONE_COLORS = ["#36A35C", "#b4791e", "#2F5FD0", "#a83279", "#2a9d8f", "#9b2226"];

/**
 * Nome de uma área para o cliente. Até ele escolher o tipo de superfície, o
 * nome padrão da zona ("Área N"). Depois, o tipo com a ordem dela entre as do
 * mesmo tipo já escolhidas ("Parede 1", "Teto 1"), ou o local próprio que ele
 * descreveu ("Outro…"). Se ele renomeou a área, vale o nome dele. Só exibição:
 * o `label` da zona é o que vai para a análise e o render.
 */
export function rotuloZona(
  zones: Pick<Zone, "id" | "label" | "surface" | "customLabel">[],
  i: number,
  espacos: { id: string; label: string }[],
  tiposEscolhidos: ReadonlySet<string>,
): string {
  const z = zones[i];
  if (!z) return "";
  if (!/^Área \d+$/.test(z.label)) return z.label;
  if (!tiposEscolhidos.has(z.id)) return z.label;
  if (z.surface === "__custom__" && z.customLabel.trim()) return z.customLabel.trim();
  const espaco = espacos.find((s) => s.id === z.surface);
  if (!espaco) return z.label;
  const ordem = zones.slice(0, i + 1).filter((o) => o.surface === z.surface && tiposEscolhidos.has(o.id)).length;
  return `${espaco.label.split(" / ")[0]} ${ordem}`;
}
