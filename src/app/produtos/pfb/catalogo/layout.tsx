import type { Metadata } from "next";

export const metadata: Metadata = {
  // O modelo do layout raiz completa com " | Orbital Revestimentos".
  title: "Catálogo do Painel Flexível em Fibra de Bambu (PFB)",
  description:
    "Modelos do Painel Flexível em Fibra de Bambu (PFB): Classic, mármore fosco; Brilliance, mármore polido; Elegance, madeira texturizada. Pronta-entrega em Manaus.",
  keywords: [
    "revestimento de parede Manaus",
    "revestimento mármore Manaus",
    "revestimento madeira Manaus",
    "painel decorativo Manaus",
    "placa de revestimento para parede",
    "revestimento fosco",
    "revestimento polido",
    "revestimento texturizado",
    "revestimento para lavabo",
    "revestimento para sala",
    "revestimento para banheiro Manaus",
    "comprar revestimento Manaus",
    "loja de revestimentos Manaus",
  ],
  // Os endereços com ?modelo= e ?linha= apontam para este.
  alternates: { canonical: "https://orbitalrevestimentos.com.br/produtos/pfb/catalogo" },
  openGraph: {
    title: "Catálogo do Painel Flexível em Fibra de Bambu (PFB) | Orbital Revestimentos",
    description:
      "Modelos do Painel Flexível em Fibra de Bambu (PFB): Classic, mármore fosco; Brilliance, mármore polido; Elegance, madeira texturizada. Pronta-entrega em Manaus.",
    url: "https://orbitalrevestimentos.com.br/produtos/pfb/catalogo",
    // Sem images, o openGraph do segmento trocaria o do pai por inteiro e o catálogo ficaria sem og:image.
    images: [
      {
        url: "/images/projetos/escada-madeira-pfb-2026-10-og.jpg",
        width: 1200,
        height: 630,
        alt: "Escada com paredes revestidas com o Painel Flexível em Fibra de Bambu em acabamento de madeira",
      },
    ],
  },
};

// Só o BreadcrumbList: os Product voltam, corrigidos, na página do produto.
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://orbitalrevestimentos.com.br" },
    { "@type": "ListItem", position: 2, name: "Produtos", item: "https://orbitalrevestimentos.com.br/produtos" },
    { "@type": "ListItem", position: 3, name: "Painel Flexível em Fibra de Bambu", item: "https://orbitalrevestimentos.com.br/produtos/pfb" },
    { "@type": "ListItem", position: 4, name: "Catálogo", item: "https://orbitalrevestimentos.com.br/produtos/pfb/catalogo" },
  ],
};

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <script
        id="ld-catalogo"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
