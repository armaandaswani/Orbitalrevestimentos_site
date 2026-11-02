"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Progresso da apresentação. Lê os capítulos do próprio DOM
 * (<section data-capitulo data-numero>, ver Capitulo.tsx) e mostra:
 *
 * - uma linha fina no topo, que enche com a rolagem da página inteira
 *   (CSS animation-timeline: scroll(root); sem suporte, um rAF escreve o
 *   mesmo transform);
 * - no computador, uma régua vertical à direita: um traço por capítulo, o
 *   atual mais longo; o nome aparece ao passar o mouse ou focar;
 * - no celular e tablet, um botão discreto no canto inferior esquerdo
 *   ("03/05 Projetos") que abre a lista de capítulos para pular direto.
 *
 * Os itens são âncoras (#id): sem JavaScript a régua ainda funciona. Só
 * transform e opacity; nada empurra o conteúdo.
 */
interface Item { id: string; rotulo: string; numero: string; escuro: boolean }

export default function ProgressoCapitulos({ rotulo = "Capítulos desta página" }: { rotulo?: string }) {
  const [itens, setItens] = useState<Item[]>([]);
  const [ativo, setAtivo] = useState(-1);
  const [aberto, setAberto] = useState(false);
  const [noFim, setNoFim] = useState(false);
  const barra = useRef<HTMLSpanElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);

  // Capítulos e capítulo atual (a linha no meio da tela decide).
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("section[data-capitulo]")];
    const t = setTimeout(() => setItens(els.map((el) => ({ id: el.id, rotulo: el.dataset.capitulo ?? "", numero: el.dataset.numero ?? "", escuro: el.classList.contains("ds-escuro") }))), 0);
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return () => clearTimeout(t);
    const visiveis = new Set<Element>();
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) { if (e.isIntersecting) visiveis.add(e.target); else visiveis.delete(e.target); }
      const idx = els.findIndex((el) => visiveis.has(el));
      setAtivo(idx);
    }, { rootMargin: "-45% 0px -54% 0px" });
    els.forEach((el) => obs.observe(el));
    // Rodapé à vista: o botão flutuante sai do caminho.
    const rodape = document.querySelector("footer");
    const obsFim = rodape ? new IntersectionObserver(([e]) => setNoFim(e.isIntersecting)) : null;
    if (rodape && obsFim) obsFim.observe(rodape);
    return () => { clearTimeout(t); obs.disconnect(); obsFim?.disconnect(); };
  }, []);

  // Reserva da linha de progresso sem animation-timeline.
  useEffect(() => {
    if (typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: scroll()")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const medir = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (barra.current) barra.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(medir); };
    medir();
    window.addEventListener("scroll", pedir, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", pedir); };
  }, []);

  // Lista aberta: Esc fecha, clique fora fecha, foco entra na lista.
  useEffect(() => {
    if (!aberto) return;
    lista.current?.querySelector<HTMLElement>("a")?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { setAberto(false); botao.current?.focus(); } };
    const fora = (e: PointerEvent) => { if (!lista.current?.contains(e.target as Node) && !botao.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("keydown", tecla);
    document.addEventListener("pointerdown", fora);
    return () => { document.removeEventListener("keydown", tecla); document.removeEventListener("pointerdown", fora); };
  }, [aberto]);

  const atual = ativo >= 0 ? itens[ativo] : null;
  // Antes do 1º capítulo a página está na abertura (foto escura); depois, segue o fundo do capítulo.
  const claro = atual ? atual.escuro : true;
  const total = String(itens.length).padStart(2, "0");

  return (
    <>
      {/* Linha de progresso da página, colada no topo (decorativa). */}
      <span aria-hidden className="fixed inset-x-0 top-0 z-[55] h-0.5 pointer-events-none">
        <span ref={barra} className="mv-progresso-pagina block h-full bg-secondary origin-left" style={{ transform: "scaleX(0)" }} />
      </span>

      {itens.length > 1 && (
        <>
          {/* Computador: régua vertical à direita. */}
          <nav aria-label={rotulo} className="hidden lg:block fixed right-[clamp(0.25rem,1vw,1.5rem)] top-1/2 -translate-y-1/2 z-40">
            <ol className="flex flex-col py-1">
              {itens.map((it, i) => (
                <li key={it.id} className="relative group">
                  <a href={`#${it.id}`} aria-current={i === ativo ? "step" : undefined}
                    className="flex items-center justify-end w-11 h-11 pr-2.5 focus-visible:outline-offset-[-2px]">
                    <span className="sr-only">{it.numero} {it.rotulo}</span>
                    <span aria-hidden className={`block h-px w-6 origin-right transition-[transform,background-color] duration-300 ${claro ? (i === ativo ? "bg-white" : "bg-white/45 scale-x-50") : (i === ativo ? "bg-primary" : "bg-primary/35 scale-x-50")}`} />
                  </a>
                  {/* Nome do capítulo: aparece ao lado, por cima da página (não empurra nada). */}
                  <span aria-hidden className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2 whitespace-nowrap bg-primary text-white text-sobre tracking-[0.14em] uppercase font-semibold px-2.5 py-1.5 opacity-0 translate-x-1 transition-[opacity,transform] duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:translate-x-0">
                    {it.numero} · {it.rotulo}
                  </span>
                </li>
              ))}
            </ol>
          </nav>

          {/* Celular e tablet: botão no canto com o capítulo atual. */}
          <div className={`lg:hidden fixed left-[max(0.75rem,env(safe-area-inset-left))] bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 transition-[opacity,transform] duration-300 ${
            atual && !noFim ? "opacity-100" : "opacity-0 translate-y-2 pointer-events-none"
          }`} inert={!atual || noFim ? true : undefined}>
            {aberto && (
              <div ref={lista} id="capitulos-lista" className="mv-folha absolute bottom-full left-0 mb-2 w-[min(17rem,calc(100vw-1.5rem))] bg-white border border-primary/15 shadow-xl">
                <p className="px-4 pt-3 pb-1 text-sobre tracking-[0.16em] uppercase font-semibold text-on-surface-variant">{rotulo}</p>
                <ol>
                  {itens.map((it, i) => (
                    <li key={it.id}>
                      <a href={`#${it.id}`} onClick={() => setAberto(false)} aria-current={i === ativo ? "step" : undefined}
                        className={`flex items-center gap-3 min-h-11 px-4 text-sm ${i === ativo ? "text-primary font-semibold bg-background" : "text-on-surface-variant"}`}>
                        <span className="font-serif text-primary/60 w-6">{it.numero}</span>{it.rotulo}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <button ref={botao} type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} aria-controls="capitulos-lista"
              className="flex items-center gap-2.5 min-h-11 pl-3 pr-3.5 bg-primary/95 text-white shadow-lg backdrop-blur-sm">
              <span className="font-serif text-sm tabular-nums">{atual?.numero ?? "01"}<span className="text-white/60">/{total}</span></span>
              <span aria-hidden className="w-px h-4 bg-white/30" />
              <span className="text-sobre tracking-[0.14em] uppercase font-semibold max-w-[9rem] truncate">{atual?.rotulo ?? itens[0]?.rotulo}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className={aberto ? "rotate-180" : ""}><path d="M6 15l6-6 6 6" /></svg>
              <span className="sr-only">: abrir a lista de capítulos</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
