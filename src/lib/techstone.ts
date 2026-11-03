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
}

export const FORMATOS: { value: FormatoTechStone; rotulo: string; medida: string }[] = [
  { value: "1200x600", rotulo: "1200 × 600 mm", medida: "0,72 m² por placa" },
  { value: "2400x1200", rotulo: "2400 × 1200 mm", medida: "2,88 m² por placa" },
];

export const MODELOS_TECHSTONE: ModeloTechStone[] = [
  { slug: "travertino-romano-classico", nome: "Travertino Romano Clássico", formato: "1200x600", aparencia: "pedra" },
  { slug: "travertino-alabastrino", nome: "Travertino Alabastrino", formato: "1200x600", aparencia: "pedra" },
  { slug: "travertino-silver", nome: "Travertino Silver", formato: "1200x600", aparencia: "pedra" },
  { slug: "taj-mahal", nome: "Taj Mahal", formato: "1200x600", aparencia: "pedra" },
  { slug: "branco-pitaya", nome: "Branco Pitaya", formato: "1200x600", aparencia: "pedra" },
  { slug: "travertino-navona-classico", nome: "Travertino Navona Clássico", formato: "2400x1200", aparencia: "pedra" },
  { slug: "travertino-bianco-trevi", nome: "Travertino Bianco Trevi", formato: "2400x1200", aparencia: "pedra" },
  { slug: "nogueira-americana", nome: "Nogueira Americana", formato: "2400x1200", aparencia: "madeira" },
  { slug: "imbuia", nome: "Imbuia", formato: "2400x1200", aparencia: "madeira" },
];

export const ESPESSURA_MM = "3,5";

export function texturaMiniatura(m: ModeloTechStone): string {
  return `/images/techstone/texturas/${m.slug}-${m.formato}-v1.webp`;
}

export function texturaDownload(m: ModeloTechStone): string {
  return `/images/techstone/download/techstone-${m.slug}-${m.formato}.jpg`;
}

/**
 * Versão das cenas (arquivo novo = versão nova). v3 = imagens geradas por IA
 * no Canva a partir dos renders 3D e do scan de cada modelo: a pedra segue a
 * textura, mas não é foto do material. A abertura da página avisa isso.
 */
const VERSAO_CENAS = "v3";

export const AVISO_CENAS = "Imagens geradas por IA a partir das texturas dos modelos. O material real pode variar.";

/** Cena da página; uma versão por orientação de tela. */
export function cena(nome: string): { desktop: string; mobile: string } {
  const v = VERSAO_CENAS;
  return {
    desktop: `/images/techstone/cenas/${nome}-${v}-desktop.webp`,
    mobile: `/images/techstone/cenas/${nome}-${v}-mobile.webp`,
  };
}
