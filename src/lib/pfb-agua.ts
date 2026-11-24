/**
 * Teste de água da página do PFB tocando sozinho (dono, 24/11/2026): ao chegar
 * na seção, a foto vai de 0h a 24h e a 48h, parando um pouco em cada hora.
 * Sem imports com "@/" para rodar no node --test.
 */

/** Duração do teste inteiro. */
export const DURACAO_AGUA_MS = 7000;

// Trechos do tempo (0..1): parado em 0h, troca, parado em 24h, troca, parado em 48h.
const TRECHOS: ReadonlyArray<[inicio: number, fim: number, de: number, para: number]> = [
  [0, 0.16, 0, 0],
  [0.16, 0.4, 0, 1],
  [0.4, 0.6, 1, 1],
  [0.6, 0.84, 1, 2],
  [0.84, 1, 2, 2],
];

const suave = (t: number) => t * t * (3 - 2 * t);

/** Progresso do toque (0..1) → hora na escala do controle (0 = 0h, 1 = 24h, 2 = 48h). */
export function horaDoTeste(p: number): number {
  const x = Math.min(1, Math.max(0, p));
  for (const [inicio, fim, de, para] of TRECHOS) {
    if (x <= fim) return de === para ? de : de + (para - de) * suave((x - inicio) / (fim - inicio));
  }
  return 2;
}
