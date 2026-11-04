/**
 * Inclinação dos botões principais: dentro de `raio` do centro, o botão se
 * desloca até `maximo` px na direção do ponteiro. A função é pura e sem
 * importações para o teste de Node rodar direto.
 */

/** Alcance da atração, em px a partir do centro do botão. */
export const INCLINACAO_RAIO = 80;
/** Deslocamento máximo, em px: sutil o bastante para parecer peso, não brincadeira. */
export const INCLINACAO_MAXIMO = 6;

export interface Ponto {
  x: number;
  y: number;
}

/**
 * Deslocamento do botão para o lado do ponteiro. Zero a `raio` ou mais (e com
 * entradas inválidas); dentro, proporcional à distância, com comprimento
 * limitado a `maximo`.
 */
export function inclinacao(
  ponteiro: Ponto,
  centro: Ponto,
  raio: number = INCLINACAO_RAIO,
  maximo: number = INCLINACAO_MAXIMO,
): Ponto {
  const dx = ponteiro.x - centro.x;
  const dy = ponteiro.y - centro.y;
  const distancia = Math.hypot(dx, dy);
  if (!Number.isFinite(distancia) || raio <= 0 || distancia >= raio) return { x: 0, y: 0 };
  const fator = maximo / raio;
  // Dentro do raio o comprimento já é <= maximo; o teto cobre erro de ponto flutuante.
  const comprimento = distancia * fator;
  const ajuste = comprimento > maximo ? maximo / distancia : fator;
  return { x: dx * ajuste || 0, y: dy * ajuste || 0 };
}
