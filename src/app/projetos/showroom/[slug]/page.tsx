import type { Metadata } from "next";
import Link from "next/link";
import { carregarShowroom } from "@/lib/projetos-dados";
import ShowroomVitrine from "./ShowroomVitrine";

/**
 * Página de um showroom parceiro (ou ponto de revenda com projetos): montada no
 * servidor com só os dados deste lugar, para chegar completa. É a mesma peça
 * (ShowroomConteudo) que abre por cima de /projetos — aqui como página
 * própria, indexável. Republica a cada 5 min.
 */
export const revalidate = 300;

// Nenhum showroom no build: cada um é gerado na primeira visita e guardado (ISR).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dados = await carregarShowroom(slug);
  if (!dados) return { title: "Showroom | Orbital Revestimentos" };
  const s = dados.lugar;
  return {
    title: `${s.name} — Showroom parceiro | Orbital Revestimentos`,
    description: s.description
      || `Conheça os ambientes revestidos com o Painel Flexível em Fibra de Bambu (PFB) no showroom ${s.name}${s.address ? ` — ${s.address}` : ""}.`,
    alternates: { canonical: `https://orbitalrevestimentos.com.br/projetos/showroom/${s.slug}` },
  };
}

export default async function ShowroomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await carregarShowroom(slug);

  if (!dados) {
    return (
      <div className="pt-32 pb-32 max-w-4xl mx-auto px-4 text-center">
        <h1 className="font-serif text-primary text-3xl mb-4">Showroom não encontrado</h1>
        <Link href="/projetos" className="inline-flex items-center min-h-11 px-4 text-primary underline text-sm">Ver todos os projetos</Link>
      </div>
    );
  }

  return (
    <div className="pt-20 bg-background">
      <div className="ds-wrap pt-6">
        <Link href="/projetos#parceiros" className="inline-flex items-center gap-1.5 min-h-11 text-xs tracking-[0.14em] uppercase font-bold text-on-surface-variant hover:text-primary transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
          Projetos e parceiros
        </Link>
      </div>
      <ShowroomVitrine lugar={dados.lugar} ambientes={dados.ambientes} todos={dados.todos} />
    </div>
  );
}
