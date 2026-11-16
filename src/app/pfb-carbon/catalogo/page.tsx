import type { Metadata } from "next";
import CatalogoCarbon from "@/components/pfb-carbon/CatalogoCarbon";

export const metadata: Metadata = {
  title: "Catálogo PFB Carbon: cinco madeiras em placas de 2,80 × 1,20 m",
  description:
    "Os modelos do PFB Carbon, a linha de luxo do Painel Flexível em Fibra de Bambu: Louro Freijó, Carvalho Natural, Imbuia, Jatobá e Pau Ferro. Baixe as texturas e entre na lista de espera.",
  alternates: { canonical: "https://orbitalrevestimentos.com.br/pfb-carbon/catalogo" },
  openGraph: {
    title: "Catálogo PFB Carbon",
    description: "Cinco madeiras em placas de 2,80 × 1,20 m. Baixe as texturas e entre na lista de espera.",
    url: "https://orbitalrevestimentos.com.br/pfb-carbon/catalogo",
    images: [{ url: "/images/og/pfb-carbon.jpg", width: 1200, height: 630, alt: "Placa do PFB Carbon vista pela borda, com o miolo de fibra de bambu carbonizado" }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://orbitalrevestimentos.com.br" },
    { "@type": "ListItem", position: 2, name: "Produtos", item: "https://orbitalrevestimentos.com.br/produtos" },
    { "@type": "ListItem", position: 3, name: "PFB Carbon", item: "https://orbitalrevestimentos.com.br/pfb-carbon" },
    { "@type": "ListItem", position: 4, name: "Catálogo", item: "https://orbitalrevestimentos.com.br/pfb-carbon/catalogo" },
  ],
};

export default function CatalogoCarbonPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <CatalogoCarbon />
    </>
  );
}
