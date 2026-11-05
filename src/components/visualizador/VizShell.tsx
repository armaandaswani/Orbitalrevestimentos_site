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

export default function VizShell({
  etapa,
  embutido,
  onVoltar,
  acao,
  lateral,
  children,
}: {
  etapa: EtapaVisivel;
  embutido: boolean;
  onVoltar?: () => void;
  acao?: AcaoShell;
  lateral?: React.ReactNode;
  children: React.ReactNode;
}) {
  const raiz = useRef<HTMLElement | null>(null);
  const conteudo = useRef<HTMLDivElement | null>(null);
  // Sentido da última troca: decide de que lado a etapa nova entra. Nada na
  // primeira pintura (a página abre parada). Ajustado durante o render.
  const [vista, setVista] = useState<{ etapa: EtapaVisivel; direcao: "avanca" | "volta" | null }>({ etapa, direcao: null });
  if (vista.etapa !== etapa) setVista({ etapa, direcao: etapa > vista.etapa ? "avanca" : "volta" });

  // Troca de etapa: o topo do shell volta para baixo do cabeçalho e o foco vai
  // para o título da etapa (ou para o próprio shell, se a etapa não tiver h2).
  const anterior = useRef<EtapaVisivel>(etapa);
  useEffect(() => {
    if (anterior.current === etapa) return;
    anterior.current = etapa;
    const el = raiz.current;
    if (!el) return;
    rolarParaTopo(el);
    const titulo = conteudo.current?.querySelector<HTMLElement>("h2");
    const alvo = titulo ?? el;
    if (titulo && !titulo.hasAttribute("tabindex")) titulo.setAttribute("tabindex", "-1");
    alvo.focus({ preventScroll: true });
  }, [etapa]);

  // Barra de ação no celular: o balão do chat sobe para não cobrir o botão.
  const barraPresa = !!acao && !embutido;
  useEffect(() => {
    if (!barraPresa) return;
    const html = document.documentElement;
    html.setAttribute("data-viz-barra-presa", "");
    return () => html.removeAttribute("data-viz-barra-presa");
  }, [barraPresa]);

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
      className={`viz-shell outline-none overflow-x-clip ${
        embutido ? "" : "px-4 sm:px-6 min-h-dvh lg:min-h-0 flex flex-col lg:pb-16"
      }`}
    >
      <div className={`mx-auto w-full flex-1 flex flex-col ${lateral ? "max-w-[1280px]" : "max-w-2xl"}`}>
        <div className="flex items-center gap-2 pt-3 pb-4 sm:pt-5 sm:pb-6">
          {onVoltar && (
            <button
              type="button"
              data-viz-voltar
              onClick={onVoltar}
              className="-ml-2 inline-flex min-h-11 shrink-0 items-center gap-1 px-2 text-[13px] font-medium text-[#0B1F45] hover:text-[#2347A0] transition-colors"
            >
              <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5l-7 7 7 7" />
              </svg>
              Voltar
            </button>
          )}
          <nav aria-label="Etapas do visualizador" className="min-w-0 flex-1">
            <ol className="grid grid-cols-4 gap-1.5">
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
              ref={conteudo}
              data-etapa={etapa}
              data-direcao={vista.direcao ?? undefined}
              className="viz-etapa flex-1"
            >
              {children}
            </div>

            {acao && (
              <div
                data-viz-barra
                className={
                  embutido
                    ? "mt-6"
                    : "viz-barra sticky bottom-0 z-40 -mx-4 mt-6 border-t border-[#e8e8e8] bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-0 lg:backdrop-blur-none"
                }
              >
                <button
                  type="button"
                  onClick={acao.onClick}
                  disabled={acao.desabilitada}
                  className={`inline-flex min-h-12 w-full items-center justify-center gap-2 px-6 text-xs font-bold uppercase tracking-[0.12em] transition-colors lg:w-auto lg:min-w-[280px] ${botao}`}
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
