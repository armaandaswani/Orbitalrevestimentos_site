import type { Metadata } from "next";
import { SCRIPT_NIVEL } from "@/lib/movimento/nivel";
import AberturaPfb from "@/components/pfb/AberturaPfb";
import OQueEPfb from "@/components/pfb/OQueEPfb";
import CamadasPfb from "@/components/pfb/CamadasPfb";
import FichaPfb from "@/components/pfb/FichaPfb";
import AguaPfb from "@/components/pfb/AguaPfb";
import ManausPfb from "@/components/pfb/ManausPfb";
import BambuPfb from "@/components/pfb/BambuPfb";

/**
 * /produtos/pfb: a página do produto, em capítulos de tela cheia (spec
 * 2026-11-07-pfb-experiencia). Republica a cada 5 min, o mesmo prazo de
 * /projetos.
 */
export const revalidate = 300;

const SITE = "https://orbitalrevestimentos.com.br";
const DESCRICAO =
  "Revestimento decorativo para paredes e tetos, em mármores e madeiras, sem quebradeira. Camadas, ficha técnica, ART e onde usar. Pronta-entrega em Manaus.";
const IMAGEM_OG = {
  url: "/images/projetos/escada-madeira-pfb-2026-10-og.jpg",
  width: 1200,
  height: 630,
  alt: "Escada com paredes revestidas com o Painel Flexível em Fibra de Bambu em acabamento de madeira",
};

export const metadata: Metadata = {
  // O modelo do layout raiz completa com " | Orbital Revestimentos".
  title: "Painel Flexível em Fibra de Bambu (PFB) em Manaus",
  description: DESCRICAO,
  keywords: [
    "Painel Flexível em Fibra de Bambu",
    "PFB ficha técnica",
    "PFB Orbital",
    "revestimento sem obra Manaus",
    "revestimento parede Manaus",
    "revestimento teto Manaus",
    "revestimento resistente a mofo Manaus",
    "revestimento com ART",
    "revestimento mármore Manaus",
    "revestimento madeira Manaus",
    "revestimento bambu Manaus",
  ],
  alternates: { canonical: `${SITE}/produtos/pfb` },
  openGraph: {
    title: "Painel Flexível em Fibra de Bambu (PFB) | Orbital Revestimentos",
    description: DESCRICAO,
    url: `${SITE}/produtos/pfb`,
    images: [IMAGEM_OG],
  },
  // O bloco twitter do layout raiz não vale aqui (o objeto é trocado inteiro): o mesmo do OG.
  twitter: {
    card: "summary_large_image",
    title: "Painel Flexível em Fibra de Bambu (PFB) | Orbital Revestimentos",
    description: DESCRICAO,
    images: [IMAGEM_OG.url],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Produtos", item: `${SITE}/produtos` },
    { "@type": "ListItem", position: 3, name: "Painel Flexível em Fibra de Bambu", item: `${SITE}/produtos/pfb` },
  ],
};

// Sem `offers`: o site não mostra preço.
function produto(linha: string, cor: string, acabamento: string, imagem: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Painel Flexível em Fibra de Bambu (PFB), linha ${linha}`,
    brand: { "@type": "Brand", name: "Orbital Revestimentos" },
    material: "Fibra de bambu",
    size: "1,20 × 2,90 m × 5 mm",
    color: cor,
    description: `Revestimento decorativo para paredes e tetos internos, com ${acabamento}. Placa de 1,20 × 2,90 m × 5 mm. Resistente a mofo e cupim e sem formaldeído. Não propaga chamas.`,
    url: `${SITE}/produtos/pfb/catalogo?linha=${linha.toLowerCase()}`,
    image: `${SITE}/images/catalogue/${imagem}`,
  };
}

const schemas = [
  { chave: "ld-breadcrumb", dados: breadcrumbSchema },
  { chave: "ld-classic", dados: produto("Classic", "Mármore fosco", "acabamento de mármore fosco", "classic-branco-calacatta-orb006.jpeg") },
  { chave: "ld-brilliance", dados: produto("Brilliance", "Mármore polido", "acabamento de mármore polido, de alto brilho", "brilliance-calacatta-michelangelo-orb014.jpeg") },
  { chave: "ld-elegance", dados: produto("Elegance", "Madeira texturizada", "textura de madeira", "elegance-carvalho-natural-orb010.jpeg") },
];

export default function PfbPage() {
  return (
    <main className="escala-contida pt-20">
      <script id="pfb-nivel" dangerouslySetInnerHTML={{ __html: SCRIPT_NIVEL }} />
      {schemas.map(({ chave, dados }) => (
        <script
          key={chave}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }}
        />
      ))}
      <AberturaPfb />
      <OQueEPfb />
      <CamadasPfb />
      <FichaPfb />
      <AguaPfb />
      <ManausPfb />
      <BambuPfb />
    </main>
  );
}
