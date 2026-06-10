import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visualizador — Veja o Revestimento na Sua Parede | Orbital",
  description:
    "Envie uma foto da sua parede e veja como ficam os acabamentos PFB Orbital — mármore fosco, polido e madeira — antes de comprar. Ferramenta gratuita de simulação visual em Manaus.",
  keywords: [
    "simular revestimento na parede",
    "ver revestimento antes de comprar",
    "visualizador de revestimento",
    "como fica o revestimento na minha parede",
    "testar acabamento parede",
    "revestimento Manaus",
    "mármore na parede simulação",
    "madeira na parede simulação",
  ],
  // De-listed until the AI image-generation backend (paid Gemini key) is in place.
  robots: { index: false, follow: false },
  alternates: { canonical: "https://orbitalrevestimentos.com.br/visualizador" },
  openGraph: {
    title: "Visualizador — Veja o Revestimento na Sua Parede",
    description:
      "Envie uma foto e veja como ficam os acabamentos PFB Orbital na sua parede antes de comprar. Grátis.",
    url: "https://orbitalrevestimentos.com.br/visualizador",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://orbitalrevestimentos.com.br" },
    { "@type": "ListItem", position: 2, name: "Visualizador", item: "https://orbitalrevestimentos.com.br/visualizador" },
  ],
};

export default function VisualizadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
