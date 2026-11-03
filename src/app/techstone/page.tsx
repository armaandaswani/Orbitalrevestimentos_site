import type { Metadata } from "next";
import TechStone from "@/components/techstone/TechStone";

export const metadata: Metadata = {
  title: "TechStone: pedra flexível de 3,5 mm em Manaus",
  description:
    "TechStone, a nova linha da Orbital: pedra flexível de 3,5 mm com composição pensada para o sol, a chuva e a umidade de Manaus. Fachadas, interiores e curvas, em 1200 × 600 e 2400 × 1200 mm. Entre na lista de espera.",
  keywords: [
    "pedra flexível Manaus",
    "revestimento de fachada Manaus",
    "pedra flexível fachada",
    "travertino flexível",
    "revestimento curvo",
    "TechStone",
  ],
  alternates: { canonical: "https://orbitalrevestimentos.com.br/techstone" },
  openGraph: {
    title: "TechStone: pedra flexível de 3,5 mm, feita para o sol do Equador",
    description: "Fachadas, interiores e curvas. Chega em breve a Manaus: entre na lista de espera.",
    url: "https://orbitalrevestimentos.com.br/techstone",
    images: [{ url: "/images/techstone/cenas/curva-v3-desktop.webp", width: 1678, height: 944 }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://orbitalrevestimentos.com.br" },
    { "@type": "ListItem", position: 2, name: "Produtos", item: "https://orbitalrevestimentos.com.br/produtos" },
    { "@type": "ListItem", position: 3, name: "TechStone", item: "https://orbitalrevestimentos.com.br/techstone" },
  ],
};

export default function TechStonePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <TechStone />
    </>
  );
}
