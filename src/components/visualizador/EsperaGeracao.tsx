"use client";

// Espera do Resultado: a foto do próprio cliente com o trabalho acontecendo
// por cima. As etapas (espera.ts) andam com o tempo e com os sinais reais da
// geração (prévias, imagem final) e nunca terminam antes da imagem; parada
// além do previsto, a etapa troca um texto vivo e a barra segue subindo
// devagar. Cada etapa acende um efeito sutil na foto (varredura, grade de
// medição, luz passando, placas). Só transform e opacity; com movimento
// reduzido, os efeitos ficam parados e as trocas acontecem no lugar
// (globals.css › Espera do Visualizador). Quando tudo se completa, avisa o
// Resultado com onConcluida.
import React, { useEffect, useRef, useState } from "react";
import {
  ETAPAS_ESPERA,
  TOTAL_ETAPAS,
  etapaAlvo,
  fracaoBarra,
  proximoPasso,
  textoDaEtapa,
  textoVivo,
  type SinaisGeracao,
} from "./espera";

const TICK_MS = 200;

export default function EsperaGeracao({
  foto,
  previa,
  borrarPrevia,
  sinais,
  modelos,
  proporcao,
  onConcluida,
}: {
  foto: string;
  previa: string | null;
  /** Contato ainda não enviado: a prévia aparece borrada, como o resultado. */
  borrarPrevia: boolean;
  sinais: SinaisGeracao;
  modelos: readonly string[];
  /** Proporção do quadro (largura/altura). */
  proporcao: number;
  onConcluida: () => void;
}) {
  // A cada tick, no máximo um passo: a etapa mostrada persegue a etapa alvo.
  const [passo, setPasso] = useState(() => ({ agora: Date.now(), mostrada: 0, trocaEm: sinais.inicio }));
  const sinaisRef = useRef(sinais);
  useEffect(() => { sinaisRef.current = sinais; }, [sinais]);
  useEffect(() => {
    const id = window.setInterval(() => {
      const agora = Date.now();
      setPasso((p) => {
        const proxima = proximoPasso(p.mostrada, etapaAlvo(sinaisRef.current, agora), agora - p.trocaEm);
        return proxima === p.mostrada ? { ...p, agora } : { agora, mostrada: proxima, trocaEm: agora };
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);
  const { mostrada } = passo;
  const desdeTroca = passo.agora - passo.trocaEm;

  const concluida = mostrada >= TOTAL_ETAPAS;
  useEffect(() => {
    if (!concluida) return;
    // Deixa a barra cheia e o último check aparecerem antes de revelar.
    const t = window.setTimeout(onConcluida, 420);
    return () => window.clearTimeout(t);
  }, [concluida, onConcluida]);

  const indice = Math.min(mostrada, TOTAL_ETAPAS - 1);
  const etapa = ETAPAS_ESPERA[indice];
  const vivo = textoVivo(mostrada, desdeTroca);
  const texto = vivo ?? textoDaEtapa(etapa, modelos);
  const fracao = fracaoBarra(mostrada, desdeTroca);
  const verPrevia = !!previa && mostrada >= 5;

  return (
    <div data-viz-espera>
      <div
        className="viz-espera viz-res-quadro relative mx-auto overflow-hidden rounded-[6px] bg-[#0b1220]"
        data-etapa={indice}
        data-concluida={concluida ? "" : undefined}
        style={{ "--proporcao": proporcao, aspectRatio: proporcao } as React.CSSProperties}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto} alt="Sua foto" className="viz-espera-foto absolute inset-0 h-full w-full object-cover" />
        {previa && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previa}
            alt=""
            aria-hidden
            data-ver={verPrevia ? "" : undefined}
            className="viz-espera-previa absolute inset-0 h-full w-full object-cover"
            style={borrarPrevia ? { filter: "blur(14px)", transform: "scale(1.06)" } : undefined}
          />
        )}

        {/* Efeitos por etapa: cada um aparece quando a etapa dele está na tela. */}
        <span aria-hidden className="viz-fx viz-fx-escurece absolute inset-0" />
        <span aria-hidden className="viz-fx viz-fx-varredura absolute inset-0 overflow-hidden"><span /></span>
        <span aria-hidden className="viz-fx viz-fx-grade absolute inset-0">
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((v) => (
              <React.Fragment key={v}>
                <line x1={v} y1="0" x2={v} y2="100" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1={v} x2="100" y2={v} vectorEffect="non-scaling-stroke" />
              </React.Fragment>
            ))}
          </svg>
          <span className="viz-fx-canto left-3 top-3 border-l border-t" />
          <span className="viz-fx-canto right-3 top-3 border-r border-t" />
          <span className="viz-fx-canto bottom-3 left-3 border-b border-l" />
          <span className="viz-fx-canto bottom-3 right-3 border-b border-r" />
        </span>
        <span aria-hidden className="viz-fx viz-fx-luz absolute inset-0 overflow-hidden"><span /></span>
        <span aria-hidden className="viz-fx viz-fx-placas absolute inset-0">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} style={{ left: `${(i + 1) * 12.5}%`, "--i": i } as React.CSSProperties} />
          ))}
        </span>

        {/* Texto da etapa sobre a foto, com um degradê embaixo para ler. */}
        <div className="viz-espera-legenda pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4 pt-16 sm:px-6 sm:pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Simulação por IA
          </p>
          <div key={indice} className="viz-espera-texto">
            <p className="mt-1 font-serif text-[1.15rem] leading-snug text-white sm:text-[1.4rem] [text-wrap:balance]">
              {etapa.titulo}
            </p>
          </div>
          <p key={texto} className="viz-espera-vivo mt-1 text-[13px] leading-snug text-white/80 sm:text-sm">
            {texto}
          </p>
        </div>
      </div>

      {/* Barra e etapas, na largura do quadro. */}
      <div
        className="viz-res-nota mx-auto mt-3"
        style={{ "--proporcao": proporcao } as React.CSSProperties}
      >
        <span aria-hidden className="relative block h-[3px] overflow-hidden rounded-full bg-[#e4e6ea]">
          <span
            className="viz-espera-barra absolute inset-0 origin-left rounded-full bg-[#0B1F45]"
            style={{ transform: `scaleX(${fracao})` }}
          >
            <span className="viz-espera-brilho absolute inset-y-0 left-0 w-1/4" />
          </span>
        </span>
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <p className="text-[12px] tabular-nums text-[#5b5f66]">
            {concluida ? "Pronto" : `Etapa ${indice + 1} de ${TOTAL_ETAPAS}`}
          </p>
          <ol aria-hidden className="flex items-center gap-1.5">
            {ETAPAS_ESPERA.map((e, i) => {
              const feita = i < mostrada;
              const atual = i === mostrada;
              return (
                <li
                  key={e.titulo}
                  data-estado={feita ? "feita" : atual ? "atual" : "falta"}
                  className="viz-espera-check relative grid h-[18px] w-[18px] place-items-center rounded-full"
                >
                  {feita ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : atual ? (
                    <span className="viz-espera-giro absolute inset-0 rounded-full" />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Só os títulos das etapas são anunciados; o texto vivo não. */}
      <p role="status" aria-live="polite" className="sr-only">
        {concluida ? "Simulação pronta." : `${etapa.titulo}.`}
      </p>
    </div>
  );
}
