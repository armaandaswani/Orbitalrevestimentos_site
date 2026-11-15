import type { Metadata } from "next";
import PfbCarbon from "@/components/pfb-carbon/PfbCarbon";

export const metadata: Metadata = {
  title: "PFB Carbon: a linha de luxo do Painel Flexível em Fibra de Bambu",
  description:
    "PFB Carbon, a Luxury Line da Orbital: Painel Flexível em Fibra de Bambu com substrato em fibra de bambu carbonizado e SPC dos dois lados, feito para o clima da Amazônia. Para paredes e tetos internos, em placas de 2,80 × 1,20 m. Entre na lista de espera.",
  keywords: [
    "PFB Carbon",
    "painel de bambu carbonizado",
    "revestimento de parede Manaus",
    "revestimento de teto Manaus",
    "painel flexível em fibra de bambu",
    "revestimento amadeirado Manaus",
  ],
  alternates: { canonical: "https://orbitalrevestimentos.com.br/pfb-carbon" },
  openGraph: {
    title: "PFB Carbon: bambu carbonizado, feito para o clima da Amazônia",
    description: "A linha de luxo do Painel Flexível em Fibra de Bambu. Chega em breve a Manaus: entre na lista de espera.",
    url: "https://orbitalrevestimentos.com.br/pfb-carbon",
    images: [{ url: "/images/pfb-carbon/miolo-mao-v1.webp", width: 1400, height: 1050 }],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://orbitalrevestimentos.com.br" },
    { "@type": "ListItem", position: 2, name: "Produtos", item: "https://orbitalrevestimentos.com.br/produtos" },
    { "@type": "ListItem", position: 3, name: "PFB Carbon", item: "https://orbitalrevestimentos.com.br/pfb-carbon" },
  ],
};

export default function PfbCarbonPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {/* Sem JavaScript o --p nunca anda: cada tela mostra o quadro final. O
          bloco `@media (scripting: none)` do globals.css faz o mesmo; este
          <noscript> cobre os motores que ainda não conhecem `scripting`. */}
      <noscript><style>{".cbn-toca{--p:1}"}</style></noscript>
      <PfbCarbon />
    </>
  );
}
