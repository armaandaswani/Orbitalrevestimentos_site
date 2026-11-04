/**
 * Geometria e tempo da jornada "Da fábrica até a sua obra" (Jornada.tsx). É
 * puro e sem importações para o teste de Node carregar o arquivo direto
 * (node --test com o .ts).
 *
 * Rota sobre o mapa real (mapaPontos.ts: Natural Earth, projeção
 * equirretangular, viewBox 880 × 512). Partida e paradas 1 a 3 são um trecho
 * curto sobre terra (Yunnan, Guangxi, Guangdong), de oeste para leste até a fábrica
 * (23° N, 113° L); dali o arco sobe e passa por cima da África e do Atlântico
 * até Manaus (3,1° S, 60° O, parada 4). Estoque (parada 5) e obra (parada 6)
 * ficam colados em Manaus, a ~14 unidades uma da outra, para continuarem
 * distintas. Os lugares vão em graus e passam por projetar(), a mesma conta de
 * mapaPontos.ts (o teste confere); os controles das cúbicas vão em unidades.
 */

export const TOTAL_ETAPAS = 6;

export type Pt = [number, number];

/** A mesma projeção de mapaPontos.ts, repetida aqui para o arquivo não ter importações. */
export function projetar(lon: number, lat: number): Pt {
  return [(lon + 85) * 4, (72 - lat) * 4];
}

/** Partida e as seis paradas, em graus [longitude, latitude] (oeste e sul negativos). */
export const LUGARES: Pt[] = [
  [102, 25.5], // partida, Yunnan
  [106, 23.75], // pesquisa, Guangxi
  [109.5, 24.5], // adaptação, Guangxi
  [113, 23], // fabricação: a fábrica, Guangdong
  [-60, -3.1], // importação: chegada a Manaus
  [-62.25, -5.75], // estoque, colado em Manaus
  [-64, -8.75], // a obra
];
const P = LUGARES.map(([lon, lat]) => projetar(lon, lat));

/** Controles de cada trecho (do lugar k ao k + 1). */
const CONTROLES: [Pt, Pt][] = [
  [[753, 191], [759, 193]],
  [[769, 193], [773, 190]],
  [[783, 190], [788, 193]],
  [[740, 70], [292, 98]], // o arco longo: sobe íngreme e desce sobre Manaus
  [[97, 304], [94, 308]],
  [[88, 315], [85, 319]],
];

export const TRECHOS: [Pt, Pt, Pt, Pt][] = CONTROLES.map(([a, b], k) => [P[k], a, b, P[k + 1]]);

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
/** Fusão do texto em cada ponta da batida (globals.css › .jr-etapa usa o mesmo número). */
export const FUSAO = 0.018;

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
