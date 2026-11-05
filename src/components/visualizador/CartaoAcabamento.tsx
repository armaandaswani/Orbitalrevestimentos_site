"use client";

// Um acabamento no Acabamento: a foto real do painel, grande (object-cover, sem
// o zoom de recorte dos quadradinhos antigos), o nome e o código. Escolhido, o
// cartão ganha a moldura azul de 2 px, o selo de confirmação e cresce para 1.02
// (sem escala com movimento reduzido; globals.css › Visualizador).
import React from "react";
import type { VizProduct } from "../VisualizadorWizard";

export default function CartaoAcabamento({
  produto,
  selecionado,
  onEscolher,
}: {
  produto: VizProduct;
  selecionado: boolean;
  onEscolher: () => void;
}) {
  return (
    <button
      type="button"
      data-cartao
      aria-pressed={selecionado}
      aria-label={`${produto.name}, ${produto.code}`}
      onClick={onEscolher}
      className="viz-cartao group relative block w-[70vw] max-w-[320px] shrink-0 snap-start text-left outline-none lg:w-[220px]"
    >
      <span
        className={`relative block overflow-hidden rounded-sm bg-[#eef0f2] ${
          selecionado
            ? "shadow-[0_0_0_2px_#0B1F45,0_10px_24px_-12px_rgba(11,31,69,0.45)]"
            : "shadow-[0_0_0_1px_#e2e4e8] group-hover:shadow-[0_0_0_1px_#B4BBC8]"
        } group-focus-visible:shadow-[0_0_0_2px_#0B1F45,0_0_0_5px_rgba(47,95,208,0.35)]`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={produto.image_path}
          alt=""
          draggable={false}
          decoding="async"
          className="viz-cartao-foto block w-full object-cover"
        />
        {selecionado && (
          <span
            aria-hidden
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#0B1F45] text-white shadow-[0_2px_8px_rgba(11,31,69,0.35)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        )}
      </span>
      <span className="block px-0.5 pt-2">
        <span className="block truncate text-sm font-semibold leading-[18px] text-[#0B1F45]">{produto.name}</span>
        <span className="block text-[11px] leading-[16px] tracking-[0.08em] text-[#5b5f66] tabular-nums">{produto.code}</span>
      </span>
    </button>
  );
}
