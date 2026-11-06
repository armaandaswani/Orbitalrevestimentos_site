import type { Metadata } from "next";

export const metadata: Metadata = {
  // O modelo do layout raiz completa com " | Orbital Revestimentos".
  title: "Projetos em Manaus com o Painel Flexível em Fibra de Bambu (PFB)",
  description:
    "Obras entregues em Manaus com o Painel Flexível em Fibra de Bambu (PFB): residências, espaços comerciais, barcos e forros.",
  keywords: [
    "projetos revestimento Manaus",
    "antes e depois revestimento",
    "revestimento lavabo Manaus",
    "revestimento banheiro antes depois",
    "revestimento restaurante Manaus",
    "revestimento escritório Manaus",
    "revestimento náutico Manaus",
    "reforma sem obra Manaus",
    "transformação ambiente revestimento",
    "revestimento residencial Manaus",
    "revestimento comercial Manaus",
  ],
  alternates: { canonical: "https://orbitalrevestimentos.com.br/projetos" },
  openGraph: {
    title: "Projetos em Manaus com o Painel Flexível em Fibra de Bambu (PFB) | Orbital Revestimentos",
    description:
      "Obras entregues em Manaus com o Painel Flexível em Fibra de Bambu (PFB): residências, espaços comerciais, barcos e forros.",
    url: "https://orbitalrevestimentos.com.br/projetos",
    images: [
      {
        url: "/images/projetos/escada-madeira-pfb-2026-10-og.jpg",
        width: 1200,
        height: 630,
        alt: "Escada com paredes revestidas em PFB Orbital acabamento madeira",
      },
    ],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://orbitalrevestimentos.com.br" },
    { "@type": "ListItem", position: 2, name: "Projetos", item: "https://orbitalrevestimentos.com.br/projetos" },
  ],
};

export default function ProjetosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
