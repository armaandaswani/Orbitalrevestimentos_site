/**
 * Suavização por tempo, não por quadro. O jeito antigo (somar 16% da distância
 * a cada quadro) chegava em tempos diferentes em telas de 60, 120 e 144 Hz.
 * Aqui o passo depende de quantos milissegundos passaram, então a chegada leva
 * o mesmo tempo em qualquer taxa de atualização.
 */

/** Constante de tempo padrão: perto do que a animação antiga entregava a 60 Hz. */
export const TAU_PADRAO_MS = 110;

/** Teto do intervalo entre quadros: trocar de aba ou travar não vira salto. */
export const DT_MAX_MS = 50;

/** Fração da distância que o valor anda em `dtMs`, para a constante `tauMs`. */
export function fatorSuavizacao(dtMs: number, tauMs: number): number {
  if (tauMs <= 0) return 1;
  const dt = Math.min(Math.max(dtMs, 0), DT_MAX_MS);
  return 1 - Math.exp(-dt / tauMs);
}

/**
 * Aproxima `atual` de `alvo`. Dentro de `epsilon` devolve o alvo exato, para o
 * laço poder parar em vez de andar para sempre em passos minúsculos.
 */
export function aproximar(
  atual: number,
  alvo: number,
  dtMs: number,
  tauMs: number,
  epsilon = 0.0004,
): number {
  const proximo = atual + (alvo - atual) * fatorSuavizacao(dtMs, tauMs);
  return Math.abs(alvo - proximo) < epsilon ? alvo : proximo;
}
