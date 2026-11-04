/**
 * Inclinação da luz sobre o material (`.mv-brilho`). O ponteiro, de um lado a
 * outro da superfície, empurra a faixa de luz até um deslocamento máximo para
 * o mesmo lado. É só a conta; quem a aplica é o Movimento, pelo relógio.
 */

/** Deslocamento máximo da faixa, em % da largura da superfície, para cada lado. */
export const LUZ_ALCANCE_PCT = 16;

/** Posição do ponteiro na superfície, de -1 (borda esquerda) a 1 (borda direita). */
export function posicaoNaSuperficie(x: number, esquerda: number, largura: number): number {
  if (largura <= 0) return 0;
  const p = ((x - esquerda) / largura) * 2 - 1;
  return Math.min(Math.max(p, -1), 1);
}
