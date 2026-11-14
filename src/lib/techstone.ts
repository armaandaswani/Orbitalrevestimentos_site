/**
 * TechStone — modelos que estão chegando, por formato.
 *
 * As texturas ficam em /public/images/techstone: `texturas/` (miniatura webp
 * da página) e `download/` (arquivo para o arquiteto usar em render). Arquivo
 * novo = nome novo (cache de 1 ano): troque o sufixo -v1.
 */
export type FormatoTechStone = "1200x600" | "2400x1200";

export interface ModeloTechStone {
  slug: string;
  nome: string;
  formato: FormatoTechStone;
  aparencia: "pedra" | "madeira";
  /** Tom da textura, para a cor do texto escrito sobre a placa: claro leva tinta escura, escuro leva branco. */
  tom: "claro" | "escuro";
}

export const FORMATOS: { value: FormatoTechStone; rotulo: string; medida: string }[] = [
  { value: "1200x600", rotulo: "1200 × 600 mm", medida: "0,72 m² por placa" },
  { value: "2400x1200", rotulo: "2400 × 1200 mm", medida: "2,88 m² por placa" },
];

export const MODELOS_TECHSTONE: ModeloTechStone[] = [
  { slug: "travertino-romano-classico", nome: "Travertino Romano Clássico", formato: "1200x600", aparencia: "pedra", tom: "claro" },
  { slug: "travertino-alabastrino", nome: "Travertino Alabastrino", formato: "1200x600", aparencia: "pedra", tom: "claro" },
  { slug: "travertino-silver", nome: "Travertino Silver", formato: "1200x600", aparencia: "pedra", tom: "claro" },
  { slug: "taj-mahal", nome: "Taj Mahal", formato: "1200x600", aparencia: "pedra", tom: "claro" },
  { slug: "branco-pitaya", nome: "Branco Pitaya", formato: "1200x600", aparencia: "pedra", tom: "claro" },
  { slug: "travertino-navona-classico", nome: "Travertino Navona Clássico", formato: "2400x1200", aparencia: "pedra", tom: "claro" },
  { slug: "travertino-bianco-trevi", nome: "Travertino Bianco Trevi", formato: "2400x1200", aparencia: "pedra", tom: "claro" },
  { slug: "nogueira-americana", nome: "Nogueira Americana", formato: "2400x1200", aparencia: "madeira", tom: "escuro" },
  { slug: "imbuia", nome: "Imbuia", formato: "2400x1200", aparencia: "madeira", tom: "escuro" },
];

export const ESPESSURA_MM = "3,5";

/** Para que serve cada tamanho (texto aprovado pelo dono). */
export const USO_TAMANHO: Record<FormatoTechStone, string> = {
  "1200x600": "Para detalhes, nichos e paginações.",
  "2400x1200": "Para panos contínuos, com menos juntas.",
};

export const DO_TAMANHO: Record<FormatoTechStone, ModeloTechStone[]> = {
  "1200x600": MODELOS_TECHSTONE.filter((m) => m.formato === "1200x600"),
  "2400x1200": MODELOS_TECHSTONE.filter((m) => m.formato === "2400x1200"),
};

/** Modelos como a lista de espera mostra: textura e formato. */
export const CATALOGO_ESPERA: { nome: string; imagem: string; detalhe?: string }[] = MODELOS_TECHSTONE.map((m) => ({
  nome: m.nome,
  imagem: texturaMiniatura(m),
  detalhe: FORMATOS.find((f) => f.value === m.formato)?.rotulo,
}));

/** Catálogo dos modelos; `?tamanho=` abre num dos formatos. */
export const CATALOGO_TECHSTONE = "/techstone/catalogo";
export function catalogoTechStone(tamanho?: FormatoTechStone): string {
  return tamanho ? `${CATALOGO_TECHSTONE}?tamanho=${tamanho}` : CATALOGO_TECHSTONE;
}

export function texturaMiniatura(m: ModeloTechStone): string {
  return `/images/techstone/texturas/${m.slug}-${m.formato}-v1.webp`;
}

export function texturaDownload(m: ModeloTechStone): string {
  return `/images/techstone/download/techstone-${m.slug}-${m.formato}.jpg`;
}

/**
 * Versão das cenas (arquivo novo = versão nova). v3 = imagens geradas por IA
 * no Canva a partir dos renders 3D e do scan de cada modelo: a pedra segue a
 * textura, mas não é foto do material. Um aviso único, perto das perguntas, diz
 * isso (decisão do dono, 03/11/2026: sem selo em cada imagem da página).
 */
const VERSAO_CENAS = "v3";

export const AVISO_CENAS = "Ambientes ilustrativos criados a partir das texturas dos modelos. O material real pode variar.";

/** Cena da página; uma versão por orientação de tela. */
export function cena(nome: string): { desktop: string; mobile: string } {
  const v = VERSAO_CENAS;
  return {
    desktop: `/images/techstone/cenas/${nome}-${v}-desktop.webp`,
    mobile: `/images/techstone/cenas/${nome}-${v}-mobile.webp`,
  };
}
