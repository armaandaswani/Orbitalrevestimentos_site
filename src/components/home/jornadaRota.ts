/**
 * Geometria e tempo da jornada "Da fábrica até a sua obra" (Jornada.tsx). É
 * puro e sem importações para o teste de Node carregar o arquivo direto
 * (node --test com o .ts).
 *
 * Rota sobre o mapa real (mapaPontos.ts: Natural Earth, projeção
 * equirretangular, viewBox 880 × 512, x = (lon + 85) × 4, y = (72 − lat) × 4).
 * A fábrica fica em 23° N, 113° L (x 792, y 196) e Manaus em
 * 3,1° S, 60° O (x 100, y 300). Partida e paradas 1 a 3 perto da fábrica; o
 * arco longo passa por cima da África e do Atlântico até Manaus (parada 4); um
 * passo curto dentro de Manaus (parada 5, o estoque) e a última perna até a
 * obra (parada 6). Cada trecho é uma cúbica [início, controle 1, controle 2, fim].
 */

export const TOTAL_ETAPAS = 6;

export type Pt = [number, number];

export const TRECHOS: [Pt, Pt, Pt, Pt][] = [
  [[826, 116], [842, 122], [853, 136], [852, 150]], // partida → pesquisa
  [[852, 150], [851, 164], [844, 176], [830, 182]], // → adaptação
  [[830, 182], [816, 188], [804, 193], [792, 196]], // → fabricação, a fábrica
  [[792, 196], [610, 88], [292, 98], [100, 300]], // → importação, chegada a Manaus
  [[100, 300], [94, 308], [87, 313], [80, 316]], // → estoque em Manaus
  [[80, 316], [72, 322], [68, 332], [68, 342]], // → a obra
];

/** A rota inteira num path só (traço, fio previsto e offset-path do ponto). */
export const ROTA =
  `M${TRECHOS[0][0].join(" ")}` + TRECHOS.map(([, a, b, c]) => `C${a.join(" ")} ${b.join(" ")} ${c.join(" ")}`).join("");

/** Onde cada etapa acende: o fim do seu trecho. */
export const PARADAS: Pt[] = TRECHOS.map((t) => t[3]);

/** Comprimento de uma cúbica por soma de cordas (precisão de sobra para frações). */
export function comprimento([p0, p1, p2, p3]: [Pt, Pt, Pt, Pt]): number {
  let total = 0;
  let [x0, y0] = p0;
  for (let i = 1; i <= 64; i++) {
    const t = i / 64;
    const u = 1 - t;
    const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
    const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
    total += Math.hypot(x - x0, y - y0);
    x0 = x;
    y0 = y;
  }
  return total;
}

const COMPRIMENTOS = TRECHOS.map(comprimento);
const COMPRIMENTO_TOTAL = COMPRIMENTOS.reduce((a, b) => a + b, 0);
/** Fração da rota que cada trecho ocupa (soma 1). Vai para o CSS como --jr-l0 a --jr-l5. */
export const FRACOES = COMPRIMENTOS.map((c) => c / COMPRIMENTO_TOTAL);

/*
 * Tempo da rolagem: seis batidas iguais de --p (1/6 cada). Em cada batida o
 * texto da etapa entra logo no começo, o ponto sai da parada anterior em
 * INICIO_VIAGEM e chega à parada da etapa VIAGEM depois (com suavização na
 * saída e na chegada), e o resto da batida fica para ler com a parada acesa.
 * Os mesmos números estão em globals.css (Home: jornada, --jr-t0 a --jr-t5),
 * e o teste confere que continuam iguais.
 */
export const INICIO_VIAGEM = 0.012;
export const VIAGEM = 0.09;

/** Hora (em --p) em que o ponto chega à parada da etapa k. */
export function chegada(k: number): number {
  return k / TOTAL_ETAPAS + INICIO_VIAGEM + VIAGEM;
}

/**
 * Fração da rota percorrida (0 a 1) para um --p: a mesma conta do calc() do
 * CSS (smoothstep por trecho). Usada pelo ponto de reserva, sem offset-path.
 */
export function distancia(p: number): number {
  let d = 0;
  for (let k = 0; k < TOTAL_ETAPAS; k++) {
    const t = Math.min(Math.max((p - k / TOTAL_ETAPAS - INICIO_VIAGEM) / VIAGEM, 0), 1);
    d += FRACOES[k] * t * t * (3 - 2 * t);
  }
  return d;
}
