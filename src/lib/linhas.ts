import { cena } from "./techstone";

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
  /** Onde a linha vai, em etiquetas curtas (só o que a Orbital já afirma). */
  usos: UsoLinha[];
  href: string;
  imagem: { src: string; alt: string } | null;
  /** A imagem é gerada por IA: o card avisa isso embaixo dela. */
  imagemGerada?: boolean;
}

/**
 * Um lugar onde a linha vai, com a foto que mostra esse uso. No seletor a
 * etiqueta vira botão: tocar troca a foto do painel (tocar de novo volta à
 * foto da linha).
 */
export interface UsoLinha {
  rotulo: string;
  /** posicao: object-position do recorte, quando o centro não mostra o uso. */
  imagem: { src: string; alt: string; posicao?: string };
  /** A imagem é gerada por IA (o aviso único da linha vale para ela também). */
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
    // Fotos de obras reais.
    usos: [
      { rotulo: "Paredes internas", imagem: { src: "/images/academia/escadaria-residencial.jpg", alt: "Escadaria residencial com paredes em Painel Flexível em Fibra de Bambu" } },
      { rotulo: "Forros", imagem: { src: "/images/projetos/forro-marmore-pfb.webp", alt: "Forro em Painel Flexível em Fibra de Bambu com acabamento de mármore, ao lado de ripas douradas e de um lustre", posicao: "50% 8%" } },
      { rotulo: "Áreas úmidas", imagem: { src: "/images/projetos/lavabo-areas-umidas-pfb.webp", alt: "Lavabo com paredes em Painel Flexível em Fibra de Bambu com acabamento de mármore", posicao: "50% 65%" } },
    ],
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
    // A caixa da foto é paisagem em toda largura de tela (16:10, 4:3 ou a
    // altura da tela no computador), então vai sempre o arquivo de computador
    // (1678 × 944): o de celular é retrato e seria ampliado na caixa larga.
    usos: [
      { rotulo: "Fachadas", imagemGerada: true, imagem: { src: cena("fachada").desktop, alt: "Fachada de edifício em travertino bege, gerada por IA a partir da textura TechStone Travertino Romano Clássico" } },
      { rotulo: "Interiores", imagemGerada: true, imagem: { src: cena("interior").desktop, alt: "Sala com parede de canto curvo, gerada por IA a partir da textura TechStone Taj Mahal" } },
      { rotulo: "Colunas e curvas", imagemGerada: true, imagem: { src: cena("coluna").desktop, alt: "Coluna redonda em travertino claro, gerada por IA a partir da textura TechStone Travertino Bianco Trevi" } },
    ],
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
    usos: [],
    href: "",
    imagem: null,
  },
];

export const SITUACAO_ROTULO: Record<LinhaOrbital["situacao"], string> = {
  "pronta-entrega": "Pronta-entrega em Manaus",
  "em-breve": "Chega em breve",
};
