/**
 * Geometria da lupa de textura. Tudo em pixels de tela (o mesmo espaço do
 * ponteiro e do getBoundingClientRect), sem tocar no DOM, para testar em Node.
 */

/** Diâmetro da lente. */
export const LENTE_TAMANHO = 160;
/** Aumento da textura dentro da lente. */
export const LENTE_ZOOM = 2.5;
/** No toque, o centro da lente fica acima do dedo para ele não tapar o que se vê. */
export const LENTE_ALTURA_TOQUE = 90;
/** Tempo de dedo parado até a lente abrir (antes disso é toque ou rolagem). */
export const LENTE_SEGURAR_MS = 250;

export interface PontoLente { x: number; y: number }
export interface CaixaLente { left: number; top: number; width: number; height: number }
export interface OpcoesLente { tamanho?: number; zoom?: number; toque?: boolean }
export interface ResultadoLente {
  /** Canto da lente na tela. */
  left: number;
  top: number;
  /** background-position da lente, em px, para o ponto aparecer no centro dela. */
  fundoX: number;
  fundoY: number;
}

function travar(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/**
 * Onde a lente fica e que parte da textura ela mostra para um ponto sobre a
 * imagem. `caixa` é o retângulo que a imagem ocupa na tela (a textura ampliada
 * tem `zoom` vezes essas medidas). O ponto trava na caixa: arrastar para fora
 * mantém a lente na borda em vez de mostrar o vazio.
 */
export function posicaoLente(
  p: PontoLente,
  caixa: CaixaLente,
  opcoes: OpcoesLente = {},
): ResultadoLente {
  const tamanho = opcoes.tamanho ?? LENTE_TAMANHO;
  const zoom = opcoes.zoom ?? LENTE_ZOOM;
  const x = travar(p.x, caixa.left, caixa.left + caixa.width);
  const y = travar(p.y, caixa.top, caixa.top + caixa.height);
  const meio = tamanho / 2;
  const acima = opcoes.toque ? LENTE_ALTURA_TOQUE : 0;
  return {
    left: x - meio,
    top: y - acima - meio,
    fundoX: meio - (x - caixa.left) * zoom,
    fundoY: meio - (y - caixa.top) * zoom,
  };
}

/**
 * Retângulo que uma imagem de `largura`×`altura` ocupa dentro de `caixa`, como
 * `object-fit: cover` (preenche e corta) ou `contain` (cabe inteira). A lente
 * usa o arquivo grande, e ele pode ter proporção diferente da miniatura, então
 * o encaixe é refeito com as medidas dele.
 */
export function retanguloAjustado(
  caixa: CaixaLente,
  largura: number,
  altura: number,
  modo: "cobrir" | "conter",
): CaixaLente {
  if (!(largura > 0) || !(altura > 0)) return caixa;
  const escalaL = caixa.width / largura;
  const escalaA = caixa.height / altura;
  const escala = modo === "cobrir" ? Math.max(escalaL, escalaA) : Math.min(escalaL, escalaA);
  const w = largura * escala;
  const h = altura * escala;
  return {
    left: caixa.left + (caixa.width - w) / 2,
    top: caixa.top + (caixa.height - h) / 2,
    width: w,
    height: h,
  };
}

/**
 * Endereço da versão otimizada (WebP/JPEG redimensionado) que o `next/image`
 * serve para um original remoto. A lupa usa 1920 px, a maior das larguras
 * configuradas, em vez do arquivo cru de vários MB. A qualidade tem de estar
 * entre as permitidas pelo Next (só 75 por padrão: 80 dá erro 400).
 */
export function urlOtimizada(original: string, largura = 1920, qualidade = 75): string {
  return `/_next/image?url=${encodeURIComponent(original)}&w=${largura}&q=${qualidade}`;
}
