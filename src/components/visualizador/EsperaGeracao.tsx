"use client";

// Espera do Resultado: a foto do próprio cliente com o trabalho acontecendo
// por cima. As etapas (espera.ts) andam com o tempo e com os sinais reais da
// geração (prévias, imagem final) e nunca terminam antes da imagem; parada
// além do previsto, a etapa troca um texto vivo e a barra segue subindo
// devagar. Cada etapa acende um efeito sutil na foto (varredura, grade de
// medição, luz passando, placas) e tem a sua cor. Embaixo, a órbita: só a
// etapa atual e as duas anteriores; na atual um ponto orbita o núcleo, e ao
// fechar ela pousa num check colorido e a trilha anda para a esquerda. O
// total de etapas nunca aparece. A barra é sólida, na cor da etapa (o manual
// da marca não usa degradê). Só transform e opacity; com movimento reduzido, nada gira nem
// pulsa e as trocas acontecem no lugar (globals.css › Espera do
// Visualizador). Quando tudo se completa, avisa o Resultado com onConcluida.
import React, { useEffect, useRef, useState } from "react";
import {
  CORES_ETAPA,
  TOTAL_ETAPAS,
  etapaAlvo,
  etapaEscolhida,
  fracaoBarra,
  proximoPasso,
  textoDaEtapa,
  textoVivo,
  type SinaisGeracao,
} from "./espera";

/** Uma camada por cor na barra; a da etapa atual aparece por opacidade. */
const CORES_BARRA = [...new Set(CORES_ETAPA)];

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
  const etapa = etapaEscolhida(indice, sinais.variantes);
  const vivo = textoVivo(mostrada, desdeTroca, sinais.variantes[0] ?? 0);
  const texto = vivo ?? textoDaEtapa(etapa, modelos);
  const fracao = fracaoBarra(mostrada, desdeTroca);
  const verPrevia = !!previa && mostrada >= 5;
  const cor = CORES_ETAPA[indice];

  // Órbita: a etapa atual e as duas anteriores (e a que acabou de sair, para
  // ela deslizar para fora). Concluída, as três últimas viram checks.
  const referencia = concluida ? TOTAL_ETAPAS - 1 : mostrada;
  const trilha: number[] = [];
  for (let i = Math.max(0, referencia - 3); i <= Math.min(referencia, TOTAL_ETAPAS - 1); i++) trilha.push(i);

  return (
    <div data-viz-espera style={{ "--cor": cor } as React.CSSProperties}>
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

        {/* Selo de honestidade no canto: é uma simulação; o ponto tem a cor da etapa. */}
        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B1F45]">
          <span aria-hidden className="viz-espera-selo-ponto h-1.5 w-1.5 rounded-full" />
          Simulação por IA
        </span>

        {/* Texto da etapa sobre a foto, com um degradê embaixo para ler. */}
        <div className="viz-espera-legenda pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4 pt-16 sm:px-6 sm:pb-5">
          <div key={indice} className="viz-espera-texto">
            <p className="font-serif text-[1.2rem] leading-snug text-white sm:text-[1.45rem] [text-wrap:balance]">
              {etapa.titulo}
            </p>
          </div>
          <p key={texto} className="viz-espera-vivo mt-1 text-[13px] leading-snug text-white/85 sm:text-sm">
            {texto}
          </p>
        </div>
      </div>

      {/* A órbita das etapas e a barra, numa linha na largura do quadro. */}
      <div
        className="viz-res-nota mx-auto mt-3 flex items-center gap-3"
        style={{ "--proporcao": proporcao } as React.CSSProperties}
      >
        <ol aria-hidden className="viz-trilha relative h-[40px] w-[110px] shrink-0">
          {trilha.map((i) => {
            const feita = i < mostrada;
            const vaga = i - referencia + 2;
            return (
              <li
                key={i}
                data-vaga={vaga}
                className="viz-trilha-item absolute left-0 top-[7px] h-[26px] w-[26px]"
                style={{ "--vaga": vaga, color: CORES_ETAPA[i] } as React.CSSProperties}
              >
                {feita ? (
                  <span key="feita" className="viz-feita absolute inset-0 grid place-items-center rounded-full">
                    <span className="viz-feita-onda absolute inset-0 rounded-full" />
                    <svg className="relative" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                ) : (
                  <span key="orbita" className="viz-orbita absolute inset-0">
                    <span className="viz-orbita-onda absolute inset-0 rounded-full" />
                    <span className="viz-orbita-anel absolute inset-0 rounded-full" />
                    <span className="viz-orbita-giro absolute inset-0">
                      <span className="viz-orbita-lua absolute left-1/2 top-0 h-[7px] w-[7px] rounded-full" />
                    </span>
                    <span className="viz-orbita-nucleo absolute left-1/2 top-1/2 h-[10px] w-[10px] rounded-full" />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <span aria-hidden className="relative block h-[4px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#e9ebee]">
          {/* O preenchimento anda para a direita; a cor troca com a etapa, por opacidade. */}
          <span className="viz-espera-barra absolute inset-0 overflow-hidden rounded-full" style={{ transform: `translate3d(${(fracao - 1) * 100}%, 0, 0)` }}>
            {CORES_BARRA.map((c) => (
              <span key={c} className="viz-espera-barra-cor absolute inset-0" data-ver={c === cor ? "" : undefined} style={{ background: c }} />
            ))}
            <span className="viz-espera-brilho absolute inset-y-0 right-0 w-1/4" />
          </span>
        </span>
      </div>

      {/* Só os títulos das etapas são anunciados; o texto vivo não. */}
      <p role="status" aria-live="polite" className="sr-only">
        {concluida ? "Simulação pronta." : `${etapa.titulo}.`}
      </p>
    </div>
  );
}
