import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LINHAS, SITUACAO_ROTULO, type LinhaOrbital } from "@/lib/linhas";

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
 * a própria página (o catálogo do PFB foi para /produtos/pfb). Links antigos
 * com ?modelo= são redirecionados no next.config.
 */
export default function ProdutosPage() {
  return (
    <div className="escala-contida pt-20 bg-[#F6F5F2]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <header className="ds-wrap pt-10 pb-8 sm:pt-20 sm:pb-14">
        <h1 className="font-serif text-t1 text-[#0B1F45] max-w-[18ch]">Materiais pensados para o clima de Manaus.</h1>
        <p className="mt-4 text-lead text-[#43474e] max-w-[52ch]">
          Três linhas, cada uma com o seu papel no projeto: das paredes internas à fachada.
        </p>
      </header>

      <ul className="ds-wrap grid gap-x-6 gap-y-12 pb-20 md:grid-cols-3 md:gap-y-14 md:pb-24">
        {LINHAS.map((linha) => (
          <li key={linha.slug}>
            <CartaoLinha linha={linha} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CartaoLinha({ linha }: { linha: LinhaOrbital }) {
  const prontaEntrega = linha.situacao === "pronta-entrega";
  const corpo = (
    <>
      <div className="relative aspect-[3/2] md:aspect-[4/5] overflow-hidden bg-[#1F1D1A]">
        {linha.imagem ? (
          <Image
            src={linha.imagem.src}
            alt={linha.imagem.alt}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-end p-6">
            <p className="font-serif text-t3 text-white/80">Em preparação</p>
          </div>
        )}
      </div>
      {linha.imagem && linha.imagemGerada && (
        <p className="mt-2 text-sobre text-[#74777f]">Imagem gerada por IA.</p>
      )}
      <p className="mt-4 md:mt-5 flex items-center gap-2 text-legenda text-[#43474e]">
        <span aria-hidden className={`inline-block w-1.5 h-1.5 rounded-full ${prontaEntrega ? "bg-[#36A35C]" : "bg-[#B79B6C]"}`} />
        {SITUACAO_ROTULO[linha.situacao]}
      </p>
      <h2 className="mt-2 font-serif text-t2 text-[#0B1F45]">{linha.nome}</h2>
      <p className="mt-3 text-corpo text-[#43474e] max-w-[40ch]">{linha.resumo}</p>
      {linha.href && (
        <span className="mt-5 inline-flex min-h-11 items-center text-[#0B1F45] font-semibold border-b border-[#0B1F45]/30 group-hover:border-[#0B1F45]">
          {prontaEntrega ? "Ver o catálogo" : `Conhecer ${linha.artigo} ${linha.nome}`}
        </span>
      )}
    </>
  );
  return linha.href ? (
    <Link href={linha.href} className="group block">{corpo}</Link>
  ) : (
    <div>{corpo}</div>
  );
}
