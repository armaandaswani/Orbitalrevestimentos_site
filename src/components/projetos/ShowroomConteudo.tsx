"use client";

import Image from "next/image";
import Link from "next/link";
import ContatoCta from "@/components/ContatoCta";
import { COVER_ASPECT } from "@/lib/cover-crop";
import { contaAmbientes, linkComoChegar, type Projeto, type Showroom } from "@/lib/projetos-tipos";
import GradeProjetos from "./GradeProjetos";
import { Sobretitulo } from "./SecaoCabecalho";

/**
 * O conteúdo de um showroom parceiro (ou ponto de revenda): quem é, onde fica
 * e os ambientes com o Painel Flexível em Fibra de Bambu. É a MESMA peça na
 * página indexável /projetos/showroom/<slug> (nivel "pagina", título h1) e na
 * folha que abre por cima de /projetos (nivel "folha", título h2).
 *
 * Os ambientes já aparecem aqui, em grade: as fotos de um showroom ficam a um
 * toque do cartão. Tocar numa foto abre a galeria (onAbrirProjeto); sem
 * JavaScript, cada cartão é um link (hrefProjeto).
 *
 * "Outros parceiros": na página são links para as outras páginas; na folha,
 * `onIr` troca o showroom no lugar.
 */
const botao = "inline-flex items-center justify-center gap-2 min-h-11 px-5 text-xs tracking-[0.12em] uppercase font-bold transition-colors";
const seta = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M5 12h14M12 5l7 7-7 7" /></svg>;

export default function ShowroomConteudo({
  lugar: sr, ambientes, todos, nivel, onAbrirProjeto, hrefProjeto, onIr,
}: {
  lugar: Showroom;
  ambientes: Projeto[];
  todos: Showroom[];
  nivel: "pagina" | "folha";
  onAbrirProjeto?: (p: Projeto) => void;
  hrefProjeto: (p: Projeto) => string;
  onIr?: (s: Showroom) => void;
}) {
  const imagem = sr.logo_url || sr.display_cover;
  const revenda = sr.kind === "revenda";
  const Titulo = nivel === "pagina" ? "h1" : "h2";
  const outros = todos.filter((s) => s.id !== sr.id && (s.kind !== "revenda" || s.ambient_count > 0));
  const idx = todos.findIndex((s) => s.id === sr.id);
  const anterior = idx > 0 ? todos[idx - 1] : null;
  const proximo = idx >= 0 && idx < todos.length - 1 ? todos[idx + 1] : null;
  const chip = "inline-flex items-center min-h-11 px-3 text-xs tracking-[0.1em] uppercase font-bold border border-surface-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors whitespace-nowrap";

  return (
    <div className="ds-wrap">
      <section className="pt-6 pb-10 lg:pt-10 lg:pb-14">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,300px)_1fr] lg:grid-cols-[minmax(0,360px)_1fr] gap-6 md:gap-10 lg:gap-14 items-start">
          {imagem && (
            /* Na folha (celular), a capa vira uma faixa 16:9: os ambientes ficam logo abaixo, sem rolar uma tela inteira. */
            <div className={`relative w-full overflow-hidden bg-surface-container ${nivel === "folha" ? "aspect-video md:aspect-[4/5] md:max-w-[420px]" : "max-w-[420px]"}`}
              style={nivel === "pagina" ? { aspectRatio: sr.logo_url ? "16 / 9" : COVER_ASPECT } : sr.logo_url ? { aspectRatio: "16 / 9" } : undefined}>
              <Image src={imagem} alt={sr.name} fill priority={nivel === "pagina"} sizes="(max-width: 767px) 92vw, 360px"
                className={sr.logo_url ? "object-contain" : "object-cover"} />
            </div>
          )}
          <div className="min-w-0">
            <Sobretitulo>{revenda ? "Ponto de revenda" : "Showroom parceiro"}</Sobretitulo>
            <Titulo className="font-serif text-primary text-t1 font-normal tracking-[-0.02em] mt-3 text-balance">{sr.name}</Titulo>
            {sr.description && <p className={`text-on-surface-variant text-corpo mt-4 max-w-2xl text-pretty ${nivel === "folha" ? "line-clamp-4 md:line-clamp-none" : ""}`}>{sr.description}</p>}
            {sr.address && <p className="text-on-surface text-corpo mt-5">{sr.address}</p>}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-6">
              <a href={linkComoChegar(sr)} target="_blank" rel="noopener noreferrer" className={`${botao} bg-primary text-white hover:bg-[#2347A0]`}>
                Como chegar {seta}
              </a>
              {/* Todo caminho comercial passa pelo pré-contato. */}
              <ContatoCta className={`${botao} border border-primary text-primary hover:bg-primary hover:text-white`}>
                Falar com um consultor
              </ContatoCta>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby={`ambientes-${sr.slug}`} className="pb-10 lg:pb-14">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 mb-5 pb-3 border-b border-surface-variant">
          <h2 id={`ambientes-${sr.slug}`} className="font-serif text-primary text-t3 font-normal">Ambientes com Orbital</h2>
          <p className="text-on-surface-variant text-legenda">{contaAmbientes(ambientes.length)} neste {revenda ? "ponto" : "showroom"}</p>
        </div>
        {ambientes.length === 0
          ? <p className="text-on-surface-variant text-corpo py-10 text-center">{revenda ? "Todos os modelos em display, no tamanho real." : "Nenhum ambiente publicado aqui ainda."}</p>
          : <GradeProjetos projetos={ambientes} onAbrir={onAbrirProjeto} href={hrefProjeto} />}
      </section>

      {outros.length > 0 && (
        <nav aria-label="Outros parceiros" className="pb-12 lg:pb-16 border-t border-surface-variant pt-6">
          <p className="text-sobre tracking-[0.16em] uppercase font-semibold text-on-surface-variant mb-3">Outros parceiros</p>
          <ul className="flex gap-2 overflow-x-auto scrollbar-none -mx-[clamp(1rem,4.2vw,4rem)] px-[clamp(1rem,4.2vw,4rem)] sm:mx-0 sm:px-0 sm:flex-wrap">
            {outros.map((s) => (
              <li key={s.id} className="flex-shrink-0">
                {onIr
                  ? <button type="button" onClick={() => onIr(s)} className={chip}>{s.name}</button>
                  : <Link href={`/projetos/showroom/${s.slug}`} className={chip}>{s.name}</Link>}
              </li>
            ))}
          </ul>
          {nivel === "pagina" && (anterior || proximo) && (
            <div className="flex justify-between gap-4 mt-6">
              {anterior ? (
                <Link href={`/projetos/showroom/${anterior.slug}`} className="inline-flex items-center gap-2 min-h-11 text-primary text-xs tracking-[0.12em] uppercase font-bold">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
                  {anterior.name}
                </Link>
              ) : <span />}
              {proximo && (
                <Link href={`/projetos/showroom/${proximo.slug}`} className="inline-flex items-center gap-2 min-h-11 text-primary text-xs tracking-[0.12em] uppercase font-bold text-right">
                  {proximo.name}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
                </Link>
              )}
            </div>
          )}
        </nav>
      )}
    </div>
  );
}
