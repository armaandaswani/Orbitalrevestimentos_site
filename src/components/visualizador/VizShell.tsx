"use client";

// Moldura de app do Visualizador: barra de etapas no alto, conteúdo no meio e a
// ação principal embaixo. Só apresentação; o estado e o motor ficam no wizard.
import React, { useEffect, useRef, useState } from "react";
import { ETAPAS, type EtapaVisivel } from "./fluxo";

export type AcaoShell = {
  rotulo: string;
  onClick: () => void;
  desabilitada?: boolean;
  tom?: "primaria" | "verde";
  /** Linha curta acima do botão dizendo o que falta; toda ela é um botão. */
  aviso?: { texto: string; onClick: () => void };
};

function prefereMenosMovimento(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Rola a janela até o topo de `el` ficar logo abaixo do cabeçalho do site.
 * O cabeçalho se recolhe quando a página desce além de 160 px e volta quando
 * ela sobe (Navbar); a conta prevê isso para o topo não ficar escondido nem
 * com uma faixa vazia por cima. Suave, ou instantâneo com movimento reduzido.
 */
export function rolarParaTopo(el: HTMLElement): void {
  if (typeof window === "undefined") return;
  const cabecalho = document.querySelector<HTMLElement>("header[data-site]");
  const altura = cabecalho ? cabecalho.offsetHeight : 0;
  const atual = window.scrollY;
  const topo = el.getBoundingClientRect().top + atual;
  let destino = topo - altura;
  // Descendo além de 160 px o cabeçalho se recolhe: o topo pode encostar em 0.
  if (destino > atual + 4 && destino > 160) destino = topo;
  destino = Math.max(0, Math.round(destino));
  if (Math.abs(destino - atual) < 2) return;
  window.scrollTo({ top: destino, behavior: prefereMenosMovimento() ? "instant" : "smooth" });
}

/**
 * Leva o foco para o título (h2) da etapa mostrada no shell, sem rolar; sem
 * h2, o foco fica no próprio shell. Usado na troca de etapa e, pelo wizard,
 * nas trocas de fase dentro da mesma etapa.
 */
export function focarEtapa(shell: HTMLElement): void {
  const titulo = shell.querySelector<HTMLElement>(".viz-etapa h2");
  if (titulo && !titulo.hasAttribute("tabindex")) titulo.setAttribute("tabindex", "-1");
  (titulo ?? shell).focus({ preventScroll: true });
}

export default function VizShell({
  etapa,
  onVoltar,
  acao,
  lateral,
  children,
}: {
  etapa: EtapaVisivel;
  onVoltar?: () => void;
  acao?: AcaoShell;
  lateral?: React.ReactNode;
  children: React.ReactNode;
}) {
  const raiz = useRef<HTMLElement | null>(null);
  // Sentido da última troca: decide de que lado a etapa nova entra. Nada na
  // primeira pintura (a página abre parada). Ajustado durante o render.
  const [vista, setVista] = useState<{ etapa: EtapaVisivel; direcao: "avanca" | "volta" | null }>({ etapa, direcao: null });
  if (vista.etapa !== etapa) setVista({ etapa, direcao: etapa > vista.etapa ? "avanca" : "volta" });

  // Troca de etapa: o topo do shell volta para baixo do cabeçalho e o foco vai
  // para o título da etapa (ou para o próprio shell, se a etapa não tiver h2).
  // Se a etapa nova já abriu uma folha modal e o foco já está nela (o contato
  // que libera o resultado), a página rola, mas o foco fica na folha. Só a
  // presença do diálogo não basta: o editor de marcação do celular abre junto
  // com Marcar e pega o foco depois deste efeito; ele precisa achar o foco no
  // título para devolvê-lo ali ao fechar.
  const anterior = useRef<EtapaVisivel>(etapa);
  useEffect(() => {
    if (anterior.current === etapa) return;
    anterior.current = etapa;
    const el = raiz.current;
    if (!el) return;
    rolarParaTopo(el);
    if (!document.activeElement?.closest('[role="dialog"][aria-modal="true"]')) focarEtapa(el);
  }, [etapa]);

  // Barra de ação no celular: o balão do chat sobe para não cobrir o botão.
  const barraPresa = !!acao;
  useEffect(() => {
    if (!barraPresa) return;
    const html = document.documentElement;
    html.setAttribute("data-viz-barra-presa", "");
    return () => html.removeAttribute("data-viz-barra-presa");
  }, [barraPresa]);
  // Com a linha de aviso a barra fica mais alta: o balão sobe pela altura medida
  // da barra (--viz-barra-h, com a margem do iPhone), não por um valor fixo.
  const barraComAviso = barraPresa && !!acao?.aviso;
  const barraRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!barraComAviso) return;
    const html = document.documentElement;
    html.setAttribute("data-viz-barra-aviso", "");
    const barra = barraRef.current;
    const medir = () => { if (barra) html.style.setProperty("--viz-barra-h", `${barra.offsetHeight}px`); };
    medir();
    const ro = barra ? new ResizeObserver(medir) : null;
    if (barra) ro?.observe(barra);
    return () => {
      ro?.disconnect();
      html.removeAttribute("data-viz-barra-aviso");
      html.style.removeProperty("--viz-barra-h");
    };
  }, [barraComAviso]);

  const tom = acao?.tom ?? "primaria";
  const botao = acao?.desabilitada
    ? "bg-[#e8e8e6] text-[#8c9098] cursor-not-allowed"
    : tom === "verde"
      ? "bg-[#36A35C] text-[#0B1F45] hover:bg-[#4BB571]"
      : "bg-[#0B1F45] text-white hover:bg-[#2347A0]";

  return (
    <section
      ref={raiz}
      data-viz-shell
      tabIndex={-1}
      aria-label="Visualizador"
      className={`viz-shell outline-none overflow-x-clip flex flex-col px-4 sm:px-6 pb-8 lg:pb-16 ${
        barraPresa ? "min-h-[calc(100dvh-5rem)] lg:min-h-0" : ""
      }`}
    >
      <div className={`mx-auto w-full flex-1 flex flex-col ${lateral ? "max-w-[1280px]" : "max-w-2xl"}`}>
        <div className="pb-4 sm:pb-6">
          {/* Linha própria do Voltar, com altura reservada: a barra de etapas não pula quando ele aparece. */}
          <div className="flex h-11 items-center">
            {onVoltar && (
              <button
                type="button"
                data-viz-voltar
                onClick={onVoltar}
                className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-[13px] font-medium text-[#0B1F45] hover:text-[#2347A0]"
              >
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
                Voltar
              </button>
            )}
          </div>
          <nav aria-label="Etapas do visualizador">
            <ol className="grid grid-cols-4 gap-2">
              {ETAPAS.map((rotulo, i) => {
                const feita = i < etapa;
                const atual = i === etapa;
                return (
                  <li key={rotulo} aria-current={atual ? "step" : undefined} className="min-w-0">
                    <span className="viz-segmento relative block h-[3px] overflow-hidden rounded-full bg-[#e4e6ea]">
                      <span
                        aria-hidden
                        data-cheio={feita || atual ? "" : undefined}
                        className={`absolute inset-0 origin-left rounded-full ${atual ? "bg-[#0B1F45]" : "bg-[#36A35C]"}`}
                      />
                    </span>
                    <span
                      className={`mt-1.5 block truncate text-[11px] sm:text-xs leading-4 ${
                        atual ? "font-semibold text-[#0B1F45]" : feita ? "text-[#43474e]" : "text-[#8c9098]"
                      }`}
                    >
                      {rotulo}
                      {feita && <span className="sr-only"> (concluída)</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        <div className={`flex-1 ${lateral ? "lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-12" : "flex flex-col"}`}>
          {lateral && <aside className="mb-5 lg:mb-0 lg:sticky lg:top-24">{lateral}</aside>}
          <div className="flex min-w-0 flex-1 flex-col self-stretch">
            <div
              key={etapa}
              data-etapa={etapa}
              data-direcao={vista.direcao ?? undefined}
              className="viz-etapa flex-1"
            >
              {children}
            </div>

            {acao && (
              <div
                ref={barraRef}
                data-viz-barra
                className="viz-barra sticky bottom-0 z-40 -mx-4 mt-6 border-t border-[#e8e8e8] bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-0 lg:backdrop-blur-none"
              >
                {/* Por que a ação está parada, logo acima dela (no fluxo da barra,
                    sem cobrir o botão); a linha inteira leva ao que falta. */}
                {acao.aviso && (
                  <button
                    type="button"
                    data-viz-aviso-acao
                    onClick={acao.aviso.onClick}
                    className="mb-2 flex min-h-11 w-full items-center gap-2 text-left text-[13px] font-semibold text-[#8a5a12] lg:mb-3"
                  >
                    <span className="min-w-0 flex-1 truncate underline decoration-[#8a5a12]/30 underline-offset-4">{acao.aviso.texto}</span>
                    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={acao.onClick}
                  disabled={acao.desabilitada}
                  className={`inline-flex min-h-12 w-full items-center justify-center gap-2 px-6 text-xs font-bold uppercase tracking-[0.12em] lg:w-auto lg:min-w-[280px] ${botao}`}
                >
                  {acao.rotulo}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
