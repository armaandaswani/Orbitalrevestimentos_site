import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parcerias — Arquitetos, Marceneiros e Designers em Manaus",
  description:
    "Programa de parcerias da Orbital Revestimentos para arquitetos, designers de interiores, marceneiros, engenheiros e revendedores em Manaus. Amostras grátis, fichas técnicas com ART/CREA e condições exclusivas.",
  keywords: [
    "parceria arquiteto Manaus",
    "arquitetos em Manaus revestimento",
    "designer de interiores Manaus",
    "revestimento para arquiteto",
    "especificar revestimento PFB",
    "marceneiro Manaus revestimento",
    "engenheiro civil revestimento Manaus",
    "revender revestimento Manaus",
    "revestimento com ART CREA Manaus",
  ],
  alternates: { canonical: "https://orbitalrevestimentos.com.br/parcerias" },
  openGraph: {
    title: "Parcerias — Arquitetos, Marceneiros e Designers em Manaus",
    description:
      "Condições exclusivas para arquitetos, designers e marceneiros em Manaus. Amostras grátis, ART/CREA e suporte técnico da Orbital Revestimentos.",
    url: "https://orbitalrevestimentos.com.br/parcerias",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://orbitalrevestimentos.com.br" },
    { "@type": "ListItem", position: 2, name: "Parcerias", item: "https://orbitalrevestimentos.com.br/parcerias" },
  ],
};

export default function ParceriasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
