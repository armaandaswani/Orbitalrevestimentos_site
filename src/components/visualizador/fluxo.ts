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
