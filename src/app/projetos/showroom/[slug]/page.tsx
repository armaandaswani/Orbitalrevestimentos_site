import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContatoCta from "@/components/ContatoCta";
import { COVER_ASPECT } from "@/lib/cover-crop";
import { carregarShowroom } from "@/lib/projetos-dados";
import { contaAmbientes } from "@/lib/projetos-tipos";
import { Sobretitulo } from "@/components/projetos/SecaoCabecalho";
import AmbientesShowroom from "./AmbientesShowroom";

/**
 * Página de um showroom parceiro (ou ponto de revenda com projetos): montada no
 * servidor com só os dados deste lugar, para chegar completa — sem o
 * "Carregando…" que fazia o layout pular. Republica a cada 5 min.
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
      || `Conheça os ambientes revestidos com PFB Orbital no showroom ${s.name}${s.address ? ` — ${s.address}` : ""}.`,
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

  const { lugar: sr, ambientes } = dados;
  const imagem = sr.logo_url || sr.display_cover;
  const botao = "inline-flex items-center justify-center gap-2 min-h-11 px-5 text-xs tracking-[0.12em] uppercase font-bold transition-colors";

  return (
    <div className="pt-20 bg-background">
      <section className="max-w-[1280px] mx-auto px-4 lg:px-16 pt-8 pb-10 lg:py-14">
        <Link href="/projetos" className="inline-flex items-center gap-1.5 min-h-11 text-xs tracking-[0.14em] uppercase font-bold text-on-surface-variant hover:text-primary transition-colors mb-4">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
          Projetos
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,320px)_1fr] lg:grid-cols-[minmax(0,380px)_1fr] gap-6 md:gap-10 lg:gap-14 items-start">
          {imagem && (
            <div className="relative w-full max-w-[420px] overflow-hidden bg-surface-container" style={{ aspectRatio: sr.logo_url ? "16 / 9" : COVER_ASPECT }}>
              <Image src={imagem} alt={sr.name} fill priority sizes="(max-width: 767px) 92vw, 380px"
                className={sr.logo_url ? "object-contain" : "object-cover"} />
            </div>
          )}
          <div className="min-w-0">
            <Sobretitulo>{sr.kind === "revenda" ? "Ponto de revenda" : "Showroom parceiro"}</Sobretitulo>
            <h1 className="font-serif text-primary text-4xl lg:text-5xl font-normal leading-tight mt-3">{sr.name}</h1>
            {sr.description && <p className="text-on-surface-variant text-base mt-4 max-w-2xl leading-relaxed">{sr.description}</p>}
            {sr.address && <p className="text-on-surface text-sm mt-5">{sr.address}</p>}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-6">
              {sr.maps_url && (
                <a href={sr.maps_url} target="_blank" rel="noopener noreferrer" className={`${botao} bg-primary text-white hover:bg-[#2347A0]`}>
                  Ver no mapa
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </a>
              )}
              {/* Todo caminho comercial passa pelo pré-contato (sem produto: abre o catálogo visual). */}
              <ContatoCta className={`${botao} border border-primary text-primary hover:bg-primary hover:text-white`}>
                Falar com um consultor
              </ContatoCta>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="ambientes-titulo" className="max-w-[1280px] mx-auto px-4 lg:px-16 pb-20 lg:pb-24">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 mb-5 pb-3 border-b border-surface-variant">
          <h2 id="ambientes-titulo" className="font-serif text-primary text-2xl font-normal">Ambientes com Orbital</h2>
          <p className="text-on-surface-variant text-sm">{contaAmbientes(ambientes.length)} neste {sr.kind === "revenda" ? "ponto" : "showroom"}</p>
        </div>
        {ambientes.length === 0
          ? <p className="text-on-surface-variant text-base py-12 text-center">Nenhum ambiente publicado aqui ainda.</p>
          : <AmbientesShowroom ambientes={ambientes} />}
      </section>
    </div>
  );
}
