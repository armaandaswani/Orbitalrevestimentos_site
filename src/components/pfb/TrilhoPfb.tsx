"use client";

import { Children, useEffect, useRef, useState } from "react";

/**
 * Trilho que desliza um item por vez em largura cheia, com encaixe e marcador
 * de posição (v2, 08/11/2026; o dono não quer cartão cortado na borda). A
 * rolagem lateral é do trilho, nunca do documento: o trilho tem a largura da
 * coluna e `overflow-x: auto`. Cada filho direto ocupa 100% da largura
 * (`.pfb-trilho > *`, globals.css, "PFB: trilhos").
 *
 * A partir de `lg` o trilho vira grade (`colunas`) e os pontos somem. Os
 * pontos são só marcador (aria-hidden): o trilho é focável e anda com as setas,
 * e o leitor de tela lê os itens em ordem. Sem JavaScript, o trilho rola e o
 * primeiro ponto fica aceso.
 */
export default function TrilhoPfb({
  rotulo,
  como: Tag = "div",
  className = "",
  tom = "claro",
  children,
}: {
  /** aria-label do trilho. */
  rotulo: string;
  como?: "div" | "ol" | "dl" | "ul";
  /** Classes do trilho a partir de lg (a grade), e o que mais for do lugar. */
  className?: string;
  tom?: "claro" | "noite";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const n = Children.count(children);
  const [ativo, setAtivo] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let quadro = 0;
    const ler = () => {
      quadro = 0;
      const w = el.clientWidth;
      if (w > 0) setAtivo(Math.min(n - 1, Math.max(0, Math.round(el.scrollLeft / w))));
    };
    const aoRolar = () => {
      if (!quadro) quadro = requestAnimationFrame(ler);
    };
    el.addEventListener("scroll", aoRolar, { passive: true });
    return () => {
      el.removeEventListener("scroll", aoRolar);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [n]);

  const Trilho = Tag as React.ElementType;
  return (
    <div className="pfb-trilho-caixa">
      <Trilho ref={ref} role={Tag === "div" ? "group" : undefined} aria-label={rotulo} tabIndex={0} className={`pfb-trilho ${className}`}>
        {children}
      </Trilho>
      <div aria-hidden="true" className={`pfb-pontos lg:hidden ${tom === "noite" ? "pfb-pontos-noite" : ""}`}>
        {Array.from({ length: n }, (_, i) => (
          <span key={i} data-ativo={i === ativo ? "" : undefined} />
        ))}
      </div>
    </div>
  );
}
