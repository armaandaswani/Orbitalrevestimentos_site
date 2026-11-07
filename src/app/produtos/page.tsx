import type { Metadata } from "next";
import SeletorLinhas from "@/components/linhas/SeletorLinhas";

export const metadata: Metadata = {
  title: "Produtos — Linhas de Revestimento Orbital em Manaus",
  description:
    "As linhas da Orbital Revestimentos: Painel Flexível em Fibra de Bambu (PFB) em pronta-entrega em Manaus, TechStone, pedra flexível para fachadas e interiores, e PFB Carbon, a linha de luxo.",
  alternates: { canonical: "https://orbitalrevestimentos.com.br/produtos" },
  openGraph: {
    title: "Produtos — Linhas de Revestimento Orbital em Manaus",
    description: "Painel Flexível em Fibra de Bambu em pronta-entrega. TechStone e PFB Carbon chegam em breve a Manaus.",
    url: "https://orbitalrevestimentos.com.br/produtos",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://orbitalrevestimentos.com.br" },
    { "@type": "ListItem", position: 2, name: "Produtos", item: "https://orbitalrevestimentos.com.br/produtos" },
  ],
};

/**
 * Vitrine das linhas. A Orbital deixou de ser um material só: cada linha tem
 * a própria página (o catálogo do PFB foi para /produtos/pfb/catalogo). Links antigos
 * com ?modelo= são redirecionados no next.config.
 *
 * Uma linha por vez num seletor (abas + painel que arrasta de lado): no
 * celular a vitrine inteira cabe numa tela, sem lista longa para descer.
 */
export default function ProdutosPage() {
  return (
    <div className="escala-contida pt-20 bg-[#F6F5F2] min-h-[100svh]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="ds-wrap pt-8 pb-16 sm:pt-16 sm:pb-24 lg:pt-10 lg:pb-10">
        <h1 className="font-serif text-t1 text-[#0B1F45] max-w-[20ch] lg:max-w-none">Materiais pensados para o clima de Manaus.</h1>
        <p className="mt-3 mb-8 sm:mb-12 lg:mb-6 text-lead text-[#43474e] max-w-[52ch]">
          Três linhas, cada uma com o seu papel no projeto: das paredes internas à fachada.
        </p>
        <SeletorLinhas titulo="h2" />
      </div>
    </div>
  );
}
