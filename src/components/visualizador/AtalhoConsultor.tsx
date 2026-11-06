"use client";

// Com um ambiente já salvo, as etapas Foto, Marcar e Acabamento do próximo
// ambiente mantêm um atalho discreto para o consultor ou, quando o orçamento
// instantâneo está visível, só para o orçamento (nunca os dois). Fica no fim do
// conteúdo da etapa, acima da barra de ação, sem cobrir nada. O Resultado tem
// o próprio botão e não usa este.
import React from "react";

const LINK =
  "inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-[#0B1F45] underline decoration-[#0B1F45]/25 underline-offset-4 hover:text-[#2347A0] hover:decoration-[#2347A0]/40 disabled:cursor-not-allowed disabled:text-[#8c9098] disabled:no-underline";

export default function AtalhoConsultor({
  onConsultor,
  orcamento,
}: {
  /** Sem ele (orçamento instantâneo visível), o atalho mostra só o orçamento. */
  onConsultor?: () => void;
  orcamento: null | { pronto: boolean; preparando: boolean; resumo: string; onContinuar: () => void };
}) {
  if (!onConsultor && !orcamento) return null;
  return (
    <div data-viz-atalho-consultor className="mt-8 border-t border-[#ececea] pt-3">
      {onConsultor && (
        <div className="flex flex-col gap-x-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="pt-2 text-[13px] text-[#74777f] sm:pt-0">O consultor já recebe os acabamentos dos ambientes salvos.</p>
          <button type="button" onClick={onConsultor} className={`${LINK} shrink-0 self-start sm:self-auto`}>
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.4 8.4 0 01-12.3 7.5L3 21l2-5.5A8.5 8.5 0 1121 11.5z" />
            </svg>
            Falar com um consultor
          </button>
        </div>
      )}
      {orcamento && (
        <div className={`flex flex-col gap-x-6 sm:flex-row sm:items-center sm:justify-between ${onConsultor ? "border-t border-[#ececea]" : ""}`}>
          <p className="pt-2 text-[13px] text-[#74777f] sm:pt-0">{orcamento.resumo}</p>
          <button
            type="button"
            onClick={orcamento.onContinuar}
            disabled={!orcamento.pronto || orcamento.preparando}
            className={`${LINK} shrink-0 self-start sm:self-auto`}
          >
            {orcamento.preparando ? "Preparando…" : "Continuar para o orçamento"}
          </button>
        </div>
      )}
    </div>
  );
}
