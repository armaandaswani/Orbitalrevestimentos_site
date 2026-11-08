/**
 * Geometria das seis lâminas da placa para o capítulo "Tecnologia" do PFB.
 * Origem: `pfb-anatomia-recortes.json` (seis polígonos em % da imagem, de cima
 * para baixo, e `fechadoY`, em % da altura da imagem, de quanto cada lâmina
 * parte acima do lugar). Decisão do controlador sobre o encaixe: cada cópia
 * parte em translateY(-fechadoY%) com opacity 0 e termina em translateY(0) com
 * opacity 1; a película só esmaece. O quadro final é a imagem original composta.
 * Módulo puro, sem `import`: roda em `node --test`.
 */

export const ANATOMIA = {
  src: "/images/pfb/pfb-anatomia-sem-rotulos.webp",
  largura: 591,
  altura: 1410,
} as const;

/** Índice em `CAMADAS.nomes` (os cinco nomes; pvc-1 e pvc-2 dividem o 3). */
export type IndiceNome = 0 | 1 | 2 | 3 | 4;

export interface Lamina {
  chave: "pelicula" | "pvc-impressao" | "adesivo" | "pvc-1" | "pvc-2" | "substrato";
  /** Vértices [x, y] em % da imagem. */
  poligono: ReadonlyArray<readonly [number, number]>;
  /** % da altura da imagem; 0 na película. */
  fechadoY: number;
  nome: IndiceNome;
}

export const LAMINAS: readonly Lamina[] = [
  {
    chave: "pelicula",
    poligono: [
      [0.0, 0.0],
      [100.0, 0.0],
      [100.0, 14.07],
      [71.78, 13.94],
      [71.45, 13.65],
      [12.96, 13.38],
      [6.71, 4.43],
      [0.0, 4.29],
    ],
    fechadoY: 0,
    nome: 0,
  },
  {
    chave: "pvc-impressao",
    poligono: [
      [0.0, 4.15],
      [6.44, 4.28],
      [6.59, 4.5],
      [7.12, 4.51],
      [13.21, 13.24],
      [71.47, 13.51],
      [72.05, 14.01],
      [100.0, 14.14],
      [100.0, 36.1],
      [79.54, 36.21],
      [79.21, 35.93],
      [24.01, 36.22],
      [19.06, 28.62],
      [0.0, 28.76],
    ],
    fechadoY: 11.42,
    nome: 1,
  },
  {
    chave: "adesivo",
    poligono: [
      [0.0, 28.62],
      [18.79, 28.48],
      [18.93, 28.69],
      [19.45, 28.69],
      [24.26, 36.07],
      [79.23, 35.78],
      [79.81, 36.28],
      [100.0, 36.17],
      [100.0, 48.32],
      [81.36, 48.71],
      [81.04, 48.43],
      [28.11, 49.52],
      [21.97, 42.75],
      [0.0, 43.3],
    ],
    fechadoY: 15.25,
    nome: 2,
  },
  {
    chave: "pvc-1",
    poligono: [
      [0.0, 43.16],
      [21.67, 42.62],
      [21.86, 42.82],
      [22.39, 42.81],
      [28.34, 49.37],
      [81.06, 48.29],
      [81.63, 48.77],
      [100.0, 48.39],
      [100.0, 61.84],
      [82.52, 62.88],
      [82.23, 62.61],
      [29.86, 65.72],
      [21.85, 55.5],
      [0.0, 56.63],
    ],
    fechadoY: 13.4,
    nome: 3,
  },
  {
    chave: "pvc-2",
    poligono: [
      [0.0, 56.49],
      [21.57, 55.37],
      [21.73, 55.58],
      [22.25, 55.55],
      [30.1, 65.57],
      [82.25, 62.46],
      [82.77, 62.93],
      [100.0, 61.91],
      [100.0, 75.08],
      [83.69, 76.69],
      [83.43, 76.42],
      [32.04, 81.49],
      [22.2, 69.03],
      [0.0, 70.89],
    ],
    fechadoY: 14.61,
    nome: 3,
  },
  {
    chave: "substrato",
    poligono: [
      [0.0, 70.74],
      [21.93, 68.91],
      [22.09, 69.11],
      [22.59, 69.07],
      [32.26, 81.32],
      [83.47, 76.27],
      [83.93, 76.74],
      [100.0, 75.15],
      [100.0, 100.0],
      [0.0, 100.0],
    ],
    fechadoY: 15.67,
    nome: 4,
  },
];

/** % da largura onde a linha do nome toca a lâmina. */
export const X_ANCORA = 25;

export function clipPath(l: Lamina): string {
  return `polygon(${l.poligono.map(([x, y]) => `${x}% ${y}%`).join(", ")})`;
}

/** Faixa [menor y, maior y] em que a vertical x = xv cruza as arestas do polígono. */
function faixaEmX(
  poligono: ReadonlyArray<readonly [number, number]>,
  xv: number,
): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < poligono.length; i++) {
    const [x1, y1] = poligono[i];
    const [x2, y2] = poligono[(i + 1) % poligono.length];
    if (x1 === x2) continue;
    if (xv < Math.min(x1, x2) || xv > Math.max(x1, x2)) continue;
    const y = y1 + ((y2 - y1) * (xv - x1)) / (x2 - x1);
    if (y < min) min = y;
    if (y > max) max = y;
  }
  return [min, max];
}

/**
 * Altura (% da imagem) de cada um dos cinco nomes: o ponto médio entre o menor
 * e o maior y em que a vertical x = X_ANCORA cruza a lâmina. No nome 3, do menor
 * y do pvc-1 ao maior y do pvc-2.
 */
export function ancoraDosNomes(): readonly number[] {
  const alturas: number[] = [];
  for (let n = 0; n < 5; n++) {
    let min = Infinity;
    let max = -Infinity;
    for (const l of LAMINAS) {
      if (l.nome !== n) continue;
      const [a, b] = faixaEmX(l.poligono, X_ANCORA);
      if (a < min) min = a;
      if (b > max) max = b;
    }
    alturas.push((min + max) / 2);
  }
  return alturas;
}
