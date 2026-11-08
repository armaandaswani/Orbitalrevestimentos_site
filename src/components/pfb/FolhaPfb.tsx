"use client";

import { useRef } from "react";
import { FOLHA } from "@/lib/pfb-textos";

/**
 * A linha que abre uma folha (v2, 08/11/2026): o detalhe da página do PFB mora
 * atrás de um toque, nunca em parágrafo aberto. A linha é um botão de 1 px de
 * linha embaixo, com o nome e um "+"; o toque sobe a folha do rodapé no
 * celular e abre o painel da direita no computador (globals.css, "PFB: folhas").
 *
 * A folha é um `<dialog>` nativo (`showModal`): foco preso, Esc fecha e o foco
 * volta para a linha ao fechar. O conteúdo é renderizado no servidor (fica no
 * HTML, para os números da ficha valerem para quem lê a página sem abrir).
 * Toque fora da folha fecha; no celular, arrastar a alça para baixo também.
 * `largura="larga"` dá 56rem no computador (a ficha detalhada, em colunas).
 */
export default function FolhaPfb({
  id,
  rotulo,
  titulo,
  tom = "claro",
  largura = "normal",
  children,
}: {
  id: string;
  rotulo: string;
  titulo: string;
  /** Tom da linha: "claro" sobre o creme, "noite" sobre o azul-noite. A folha é sempre creme. */
  tom?: "claro" | "noite";
  largura?: "normal" | "larga";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const arraste = useRef<{ y: number; dy: number } | null>(null);

  const fechar = () => ref.current?.close();

  const aoTocar = (e: React.TouchEvent) => {
    arraste.current = { y: e.touches[0].clientY, dy: 0 };
  };
  const aoArrastar = (e: React.TouchEvent) => {
    const a = arraste.current;
    const caixa = ref.current;
    if (!a || !caixa) return;
    a.dy = Math.max(0, e.touches[0].clientY - a.y);
    caixa.style.transform = `translate3d(0, ${a.dy}px, 0)`;
  };
  const aoSoltar = () => {
    const a = arraste.current;
    const caixa = ref.current;
    arraste.current = null;
    if (!caixa) return;
    caixa.style.transform = "";
    if (a && a.dy > 80) fechar();
  };

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-controls={id}
        data-folha-abre={id}
        onClick={() => ref.current?.showModal()}
        className={`pfb-linha group ${tom === "noite" ? "pfb-linha-noite" : ""}`}
      >
        <span className="min-w-0 text-left">{rotulo}</span>
        <span aria-hidden="true" className="pfb-mais text-[1.375rem] leading-none">
          +
        </span>
      </button>
      <dialog
        ref={ref}
        id={id}
        aria-labelledby={`${id}-titulo`}
        data-folha={id}
        className={`pfb-folha ${largura === "larga" ? "pfb-folha-larga" : ""}`}
        onClick={(e) => {
          // Toque fora da folha fecha. O link do manual também fecha a folha: o diálogo do
          // manual é um portal no body e ficaria embaixo da camada de cima do <dialog>.
          const alvo = e.target instanceof Element ? e.target : null;
          if (e.target === e.currentTarget || alvo?.closest("[data-solicitar-manual]")) fechar();
        }}
      >
        <div
          className="pfb-folha-topo"
          onTouchStart={aoTocar}
          onTouchMove={aoArrastar}
          onTouchEnd={aoSoltar}
          onTouchCancel={aoSoltar}
        >
          <span aria-hidden="true" className="pfb-folha-alca" />
          <h2 id={`${id}-titulo`} className="font-serif pfb-t2 text-[#0B1F45] pr-12">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={fechar}
            aria-label={FOLHA.fechar}
            className="absolute right-2 top-3 grid h-11 w-11 place-items-center text-[1.5rem] leading-none text-[#0B1F45] hover:text-[#2347A0] lg:right-4 lg:top-5"
          >
            ×
          </button>
        </div>
        <div className="pfb-folha-corpo ds-folha-rola">{children}</div>
      </dialog>
    </>
  );
}
