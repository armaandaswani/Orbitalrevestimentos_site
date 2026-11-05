"use client";

// Um acabamento no Acabamento: o acabamento em si ocupando o cartão, o nome e o
// código. Usa a textura plana de frente (render_texture_path) quando existe; se
// não, a foto do catálogo (o painel de pé contra uma parede clara) com zoom
// centrado de 1.8, para o cartão mostrar a pedra e não o fundo branco.
// Escolhido, o cartão ganha a moldura azul de 2 px, o selo de confirmação e
// cresce para 1.02 (sem escala com movimento reduzido; globals.css ›
// Visualizador), e desliza para o começo da fileira.
import React from "react";
import type { VizProduct } from "../VisualizadorWizard";

function prefereMenosMovimento(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function CartaoAcabamento({
  produto,
  selecionado,
  onEscolher,
}: {
  produto: VizProduct;
  selecionado: boolean;
  onEscolher: () => void;
}) {
  const textura = produto.render_texture_path?.trim() || null;
  return (
    <button
      type="button"
      data-cartao
      aria-pressed={selecionado}
      aria-label={`${produto.name}, ${produto.code}`}
      onClick={(e) => {
        onEscolher();
        // Tocar no cartão que aparece pela metade traz ele inteiro para o começo.
        e.currentTarget.scrollIntoView({ inline: "start", block: "nearest", behavior: prefereMenosMovimento() ? "instant" : "smooth" });
      }}
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
          src={textura ?? produto.image_path}
          alt=""
          draggable={false}
          decoding="async"
          data-textura={textura ? "" : undefined}
          className={`viz-cartao-foto block w-full object-cover ${textura ? "" : "scale-[1.8]"}`}
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
      {/* Nome e código numa linha só: a altura vai para a foto. */}
      <span className="flex items-baseline gap-2 px-0.5 pt-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-5 text-[#0B1F45]">{produto.name}</span>
        <span className="shrink-0 text-[11px] leading-5 tracking-[0.08em] text-[#5b5f66] tabular-nums">{produto.code}</span>
      </span>
    </button>
  );
}
