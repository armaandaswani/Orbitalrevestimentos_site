/**
 * As linhas de produto da Orbital. A vitrine (/produtos) e o menu do
 * cabeçalho leem daqui, então uma linha nova entra num lugar só.
 *
 * `href` vazio = a linha ainda não tem página (aparece como "Em breve", sem link).
 */
export interface LinhaOrbital {
  slug: "pfb" | "techstone" | "carbon";
  nome: string;
  /** Artigo do nome, para frases ("Conhecer a TechStone", "o PFB Carbon"). */
  artigo: "a" | "o";
  /** Nome curto para o menu. */
  curto: string;
  situacao: "pronta-entrega" | "em-breve";
  resumo: string;
  href: string;
  imagem: { src: string; alt: string } | null;
  /** A imagem é gerada por IA: o card avisa isso embaixo dela. */
  imagemGerada?: boolean;
}

export const LINHAS: LinhaOrbital[] = [
  {
    slug: "pfb",
    nome: "Painel Flexível em Fibra de Bambu",
    artigo: "o",
    curto: "PFB",
    situacao: "pronta-entrega",
    resumo: "Paredes e forros internos com acabamento de mármore e madeira, em pronta-entrega.",
    href: "/produtos/pfb",
    imagem: { src: "/images/academia/escadaria-residencial.jpg", alt: "Escadaria residencial com paredes em Painel Flexível em Fibra de Bambu" },
  },
  {
    slug: "techstone",
    nome: "TechStone",
    artigo: "a",
    curto: "TechStone",
    situacao: "em-breve",
    resumo: "Pedra flexível de 3,5 mm para fachadas e interiores, desenvolvida para a Amazônia.",
    href: "/techstone",
    imagem: { src: "/images/techstone/cenas/curva-v3-mobile.webp", alt: "Parede curva em travertino, gerada por IA a partir da textura TechStone Travertino Navona Clássico" },
    imagemGerada: true,
  },
  {
    slug: "carbon",
    nome: "PFB Carbon",
    artigo: "o",
    curto: "PFB Carbon",
    situacao: "em-breve",
    resumo: "A linha de luxo do Painel Flexível em Fibra de Bambu. Detalhes em breve.",
    href: "",
    imagem: null,
  },
];

export const SITUACAO_ROTULO: Record<LinhaOrbital["situacao"], string> = {
  "pronta-entrega": "Pronta-entrega em Manaus",
  "em-breve": "Chega em breve",
};
