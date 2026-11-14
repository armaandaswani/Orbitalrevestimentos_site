import type { Metadata } from "next";
import CatalogoTechStone, { type FiltroCatalogo } from "@/components/techstone/CatalogoTechStone";
import { FORMATOS } from "@/lib/techstone";

export const metadata: Metadata = {
  title: "Catálogo TechStone: pedra flexível de 3,5 mm",
  description:
    "Os modelos da TechStone, pedra flexível de 3,5 mm, em 1200 × 600 e 2400 × 1200 mm. Baixe as texturas e entre na lista de espera.",
  // Os endereços com ?tamanho= apontam para este.
  alternates: { canonical: "https://orbitalrevestimentos.com.br/techstone/catalogo" },
  openGraph: {
    title: "Catálogo TechStone: pedra flexível de 3,5 mm",
    description: "Pedra e madeira em placas de 3,5 mm. Baixe as texturas e entre na lista de espera.",
    url: "https://orbitalrevestimentos.com.br/techstone/catalogo",
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
    { "@type": "ListItem", position: 4, name: "Catálogo", item: "https://orbitalrevestimentos.com.br/techstone/catalogo" },
  ],
};

export default async function CatalogoTechStonePage({ searchParams }: { searchParams: Promise<{ tamanho?: string | string[] }> }) {
  const { tamanho } = await searchParams;
  const pedido = Array.isArray(tamanho) ? tamanho[0] : tamanho;
  const inicial: FiltroCatalogo = FORMATOS.find((f) => f.value === pedido)?.value ?? "todos";
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {/* key: trocar de ?tamanho= pelo link volta a montar com o filtro novo. */}
      <CatalogoTechStone key={inicial} inicial={inicial} />
    </>
  );
}
