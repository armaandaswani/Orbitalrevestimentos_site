/**
 * Geometria e cores da figura em SVG das cinco camadas do PFB, que já saiu da
 * página (o components/pfb/CamadasPfb de hoje usa lib/pfb-anatomia), em
 * unidades do viewBox. Módulo puro, sem import e sem texto (os nomes das
 * camadas ficam em lib/pfb-textos): camadas.test.mjs roda em Node.
 *
 * A placa é desenhada em perspectiva oblíqua a partir da face de cima do
 * substrato (BASE). Índice 0 é a camada de cima; a figura desenha na ordem
 * 4, 3, 2, 1, 0 para a de cima ficar por cima. Cada grupo fica em d = 0 com o
 * `translate(0 d(i))` da pilha fechada; quem abre a pilha é o CSS (globals.css,
 * bloco "PFB: a placa por dentro"), subindo cada camada (4 − i) × VAO e
 * deslizando a ativa DESLOCA_ATIVA para a direita.
 *
 * O CSS repete PASSO_INICIO e PASSO (os tempos de cada camada), VAO e
 * DESLOCA_ATIVA como literais: camadas.test.mjs confere que batem. Se um
 * mudar, mude as duas pontas.
 */

type Ponto = readonly [number, number];

/** Face de cima do substrato: frente-esquerda, frente-direita, fundo-direita, fundo-esquerda. */
export const BASE: { FL: Ponto; FR: Ponto; BR: Ponto; BL: Ponto } = {
  FL: [80, 420],
  FR: [400, 420],
  BR: [560, 340],
  BL: [240, 340],
};

/** Subida de cada camada na figura aberta (camada i sobe (4 − i) × VAO). */
export const VAO = 64;

/** Deslize da camada da vez para a direita. */
export const DESLOCA_ATIVA = 24;

/** Caixa da figura: aberta e com o deslize, tudo cabe aqui. */
export const VIEWBOX = "56 56 552 400";

/** Fração de --p em que começa o passo da camada 0 (fim da abertura, 0,05 + 0,3). */
export const PASSO_INICIO = 0.35;

/** Duração do passo de cada camada, em fração de --p. */
export const PASSO = 0.1;

type Face = { cor: string; opacidade: number };

export type CamadaDesenho = {
  espessura: number;
  topo: Face;
  frente: Face;
  lado: Face;
  /** Contorno da face de cima (só a película protetora). */
  bordaTopo: { cor: string; opacidade: number; largura: number } | null;
  extras: "veios" | "fibras" | null;
};

/** As cinco camadas, de cima (0) para baixo (4). Espessura desenhada total: 29 (fora de escala). */
export const CAMADAS_DESENHO: readonly CamadaDesenho[] = [
  {
    espessura: 2,
    topo: { cor: "#FFFFFF", opacidade: 0.14 },
    frente: { cor: "#FFFFFF", opacidade: 0.3 },
    lado: { cor: "#FFFFFF", opacidade: 0.22 },
    bordaTopo: { cor: "#FFFFFF", opacidade: 0.7, largura: 1.25 },
    extras: null,
  },
  {
    espessura: 3,
    topo: { cor: "#ECE8E1", opacidade: 1 },
    frente: { cor: "#CFC9BF", opacidade: 1 },
    lado: { cor: "#BDB6AA", opacidade: 1 },
    bordaTopo: null,
    extras: "veios",
  },
  {
    espessura: 2,
    topo: { cor: "#E9DDB8", opacidade: 1 },
    frente: { cor: "#D4C597", opacidade: 1 },
    lado: { cor: "#C3B282", opacidade: 1 },
    bordaTopo: null,
    extras: null,
  },
  {
    espessura: 6,
    topo: { cor: "#D9DDE3", opacidade: 1 },
    frente: { cor: "#B9BFC9", opacidade: 1 },
    lado: { cor: "#A3AAB6", opacidade: 1 },
    bordaTopo: null,
    extras: null,
  },
  {
    espessura: 16,
    topo: { cor: "#C6A574", opacidade: 1 },
    frente: { cor: "#A5844F", opacidade: 1 },
    lado: { cor: "#8E6F3F", opacidade: 1 },
    bordaTopo: null,
    extras: "fibras",
  },
];

/** Os três veios da impressão (camada 1), sem preenchimento. */
export const VEIOS: readonly string[] = [
  "M150 410 C230 380 300 390 380 352",
  "M260 415 C330 390 420 380 520 350",
  "M200 372 C260 360 330 366 430 344",
];
export const TRACO_VEIOS = { cor: "#8C8C8C", opacidade: 0.55, largura: 1.2 };

/** As cinco fibras do substrato (camada 4): pares de pontos. */
export const FIBRAS: readonly (readonly [Ponto, Ponto])[] = [
  [[216, 352], [536, 352]],
  [[192, 364], [512, 364]],
  [[168, 376], [488, 376]],
  [[144, 388], [464, 388]],
  [[120, 400], [440, 400]],
];
export const TRACO_FIBRAS = { cor: "#8E6F3F", opacidade: 0.45, largura: 1 };

/** Contorno verde da camada da vez (a opacidade vem do CSS). */
export const CONTORNO = { cor: "#36A35C", largura: 2.5 };

/** Pilha fechada: d(i) = −(soma das espessuras de i até 3); o substrato fica em 0. */
export function deslocamentoFechado(i: number): number {
  let d = 0;
  for (let j = i; j <= 3; j++) d -= CAMADAS_DESENHO[j].espessura;
  return d;
}

/** Quanto a camada i sobe na figura aberta: (4 − i) × VAO. */
export function elevacao(i: number): number {
  return (4 - i) * VAO;
}

/** Fração de --p em que começa o passo da camada i (vai para --a). Arredondada para o HTML não levar 0,44999…. */
export function inicioDoPasso(i: number): number {
  return Math.round((PASSO_INICIO + i * PASSO) * 1e6) / 1e6;
}

const fmt = (pts: Ponto[]) => pts.map(([x, y]) => `${x},${y}`).join(" ");
const mais = ([x, y]: Ponto, dy: number): Ponto => [x, y + dy];

/** Topo, frente e lado da camada i, com os pontos somados a (0, d). */
export function poligonos(i: number, d = 0): { topo: string; frente: string; lado: string } {
  const t = CAMADAS_DESENHO[i].espessura;
  const FL = mais(BASE.FL, d);
  const FR = mais(BASE.FR, d);
  const BR = mais(BASE.BR, d);
  const BL = mais(BASE.BL, d);
  return {
    topo: fmt([FL, FR, BR, BL]),
    frente: fmt([FL, FR, mais(FR, t), mais(FL, t)]),
    lado: fmt([FR, BR, mais(BR, t), mais(FR, t)]),
  };
}
