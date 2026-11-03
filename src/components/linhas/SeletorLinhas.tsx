"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { LINHAS, SITUACAO_ROTULO, type LinhaOrbital } from "@/lib/linhas";

/**
 * Seletor das linhas da Orbital: abas em cima e um painel por linha, lado a
 * lado numa pista com encaixe. No celular o visitante arrasta de lado (ou toca
 * na aba) e vê uma linha por vez, sem descer a página; no computador as abas
 * trocam o painel. A aba ativa acompanha a pista nos dois sentidos.
 *
 * Usado na home (Nossas soluções) e em /produtos.
 */
export default function SeletorLinhas({ titulo = "h3" }: {
  /** Nível do nome da linha dentro do painel (h2 em /produtos, h3 na home). */
  titulo?: "h2" | "h3";
}) {
  const pista = useRef<HTMLDivElement>(null);
  const abas = useRef<(HTMLButtonElement | null)[]>([]);
  const [ativo, setAtivo] = useState(0);

  // A pista manda na aba: rolou de lado, a aba acompanha.
  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    let raf = 0;
    const medir = () => {
      raf = 0;
      const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      setAtivo((v) => (v === i ? v : Math.min(LINHAS.length - 1, Math.max(0, i))));
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(medir); };
    el.addEventListener("scroll", pedir, { passive: true });
    return () => { cancelAnimationFrame(raf); el.removeEventListener("scroll", pedir); };
  }, []);

  const ir = useCallback((i: number) => {
    const el = pista.current;
    if (!el) return;
    setAtivo(i);
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduzir ? "auto" : "smooth" });
  }, []);

  const teclado = (e: KeyboardEvent<HTMLDivElement>) => {
    const passo = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const i = (ativo + passo + LINHAS.length) % LINHAS.length;
    ir(i);
    abas.current[i]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Linhas da Orbital" onKeyDown={teclado}
        className="grid grid-cols-3 border-b border-[#0B1F45]/12">
        {LINHAS.map((l, i) => (
          <button key={l.slug} ref={(b) => { abas.current[i] = b; }} id={`linha-aba-${l.slug}`} type="button" role="tab"
            aria-selected={ativo === i} aria-controls={`linha-painel-${l.slug}`} tabIndex={ativo === i ? 0 : -1}
            onClick={() => ir(i)}
            className={`relative min-h-14 px-2 pb-3 pt-2 text-left sm:text-center transition-colors duration-300 ${ativo === i ? "text-[#0B1F45]" : "text-[#0B1F45]/45 hover:text-[#0B1F45]/75"}`}>
            <span className="block font-serif text-[1.0625rem] sm:text-t3 leading-tight">{l.curto}</span>
            <span className="mt-1 flex items-center gap-1.5 sm:justify-center text-[11px] sm:text-legenda">
              <span aria-hidden className={`inline-block w-1.5 h-1.5 rounded-full ${l.situacao === "pronta-entrega" ? "bg-[#36A35C]" : "bg-[#B79B6C]"}`} />
              {l.situacao === "pronta-entrega" ? "Pronta-entrega" : "Em breve"}
            </span>
            <span aria-hidden className={`absolute inset-x-0 -bottom-px h-0.5 bg-[#0B1F45] origin-left transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${ativo === i ? "scale-x-100" : "scale-x-0"}`} />
          </button>
        ))}
      </div>

      <div ref={pista} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none overscroll-x-contain">
        {LINHAS.map((l, i) => (
          <div key={l.slug} id={`linha-painel-${l.slug}`} role="tabpanel" aria-labelledby={`linha-aba-${l.slug}`}
            aria-hidden={ativo !== i} inert={ativo !== i}
            className="w-full shrink-0 snap-center pt-6 sm:pt-10">
            <Painel linha={l} Titulo={titulo} prioridade={i === 0} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Painel({ linha, Titulo, prioridade }: { linha: LinhaOrbital; Titulo: "h2" | "h3"; prioridade: boolean }) {
  const prontaEntrega = linha.situacao === "pronta-entrega";
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-12 md:items-center">
      <div className="relative aspect-[16/10] md:aspect-[4/5] overflow-hidden bg-[#141A26]">
        {linha.imagem ? (
          <>
            <Image src={linha.imagem.src} alt={linha.imagem.alt} fill priority={prioridade}
              sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            {linha.imagemGerada && (
              <span className="absolute left-3 bottom-3 bg-black/55 text-white text-[11px] tracking-[0.02em] px-2 py-1">Imagem gerada por IA</span>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 bg-[radial-gradient(ellipse_at_30%_20%,#2A3142,#0E121A_70%)]">
            <p className="font-serif text-white/90 text-t2">{linha.nome}</p>
            <p className="mt-1 text-white/55 text-legenda">Em preparação</p>
          </div>
        )}
      </div>
      <div>
        <p className="flex items-center gap-2 text-legenda text-[#43474e]">
          <span aria-hidden className={`inline-block w-1.5 h-1.5 rounded-full ${prontaEntrega ? "bg-[#36A35C]" : "bg-[#B79B6C]"}`} />
          {SITUACAO_ROTULO[linha.situacao]}
        </p>
        <Titulo className="mt-2 font-serif text-t2 text-[#0B1F45] text-balance">{linha.nome}</Titulo>
        <p className="mt-3 text-corpo text-[#43474e] max-w-[42ch] text-pretty">{linha.resumo}</p>
        {linha.usos.length > 0 && (
          <ul aria-label="Onde vai" className="mt-5 flex flex-wrap gap-2">
            {linha.usos.map((u) => (
              <li key={u} className="px-3 py-1.5 rounded-full border border-[#0B1F45]/15 text-legenda text-[#0B1F45]">{u}</li>
            ))}
          </ul>
        )}
        {linha.href ? (
          <Link href={linha.href} className="mt-7 ds-botao ds-botao-cheio min-h-12">
            {prontaEntrega ? "Ver o catálogo" : `Conhecer ${linha.artigo} ${linha.nome}`}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="mv-seta"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
        ) : (
          <p className="mt-7 text-legenda text-[#74777f]">Os detalhes chegam em breve.</p>
        )}
      </div>
    </div>
  );
}
