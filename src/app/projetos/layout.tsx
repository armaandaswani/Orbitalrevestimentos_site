import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projetos em Manaus — Antes e Depois com Revestimento PFB",
  description:
    "Galeria de projetos reais executados com PFB Orbital em Manaus: lavabos, escritórios, restaurantes, cozinhas e embarcações náuticas. Transformação antes e depois sem obra.",
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
    title: "Projetos em Manaus — Antes e Depois com Revestimento PFB",
    description:
      "Galeria real de projetos com PFB Orbital em Manaus: lavabos, restaurantes, escritórios e náutico. Transformações antes e depois sem obra.",
    url: "https://orbitalrevestimentos.com.br/projetos",
    images: [
      {
        url: "/images/projetos/restaurante-depois.jpeg",
        width: 1200,
        height: 800,
        alt: "Restaurante revestido com PFB Orbital — Imbuia Elegance",
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
