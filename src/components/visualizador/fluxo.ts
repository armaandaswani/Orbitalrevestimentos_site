// Regras puras do fluxo do Visualizador (sem React), testáveis com o runner do Node.
import type { Zone, VizStep } from "../VisualizadorWizard";

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

export function areaSeguinte(atual: number, total: number): number | null {
  return atual + 1 < total ? atual + 1 : null;
}

export function ajustarAreaAtual(atual: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(atual, 0), total - 1);
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
 * Nome de uma área para o cliente: o tipo de superfície com a ordem dela entre
 * as do mesmo tipo ("Parede 1", "Teto 1"). Se o cliente deu um nome à área, ou
 * descreveu um local próprio ("Outro…"), vale o que ele escreveu. O `label` da
 * zona ("Área N") continua sendo o que vai para a análise e o render.
 */
export function rotuloZona(
  zones: Pick<Zone, "label" | "surface" | "customLabel">[],
  i: number,
  espacos: { id: string; label: string }[],
): string {
  const z = zones[i];
  if (!z) return "";
  if (!/^Área \d+$/.test(z.label)) return z.label;
  if (z.surface === "__custom__" && z.customLabel.trim()) return z.customLabel.trim();
  const espaco = espacos.find((s) => s.id === z.surface);
  if (!espaco) return z.label;
  const ordem = zones.slice(0, i + 1).filter((o) => o.surface === z.surface).length;
  return `${espaco.label.split(" / ")[0]} ${ordem}`;
}
