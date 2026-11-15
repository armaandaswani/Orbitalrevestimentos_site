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

/** Tempo de cada item quando o trilho passa sozinho. */
const PASSO_MS = 2400;

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

  // Passa sozinho (15/11/2026): com o trilho na tela, avança um item a cada PASSO_MS
  // até o último, para ninguém ficar só no primeiro número. Qualquer gesto no trilho
  // (dedo, teclado, roda) devolve o comando ao visitante. Só onde ele é trilho
  // (abaixo de lg) e sem movimento reduzido.
  useEffect(() => {
    const el = ref.current;
    if (!el || n < 2 || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(min-width: 64rem)").matches) return;
    let relogio = 0;
    let solto = false;
    const parar = () => {
      solto = true;
      window.clearInterval(relogio);
    };
    const passo = () => {
      const w = el.clientWidth;
      const i = w > 0 ? Math.round(el.scrollLeft / w) : n;
      if (i >= n - 1) return parar();
      el.scrollTo({ left: (i + 1) * w, behavior: "smooth" });
    };
    const io = new IntersectionObserver((entradas) => {
      window.clearInterval(relogio);
      if (!solto && entradas.some((e) => e.isIntersecting)) relogio = window.setInterval(passo, PASSO_MS);
    }, { threshold: 0.6 });
    io.observe(el);
    const gestos = ["pointerdown", "touchstart", "keydown", "wheel"] as const;
    gestos.forEach((g) => el.addEventListener(g, parar, { passive: true }));
    return () => {
      window.clearInterval(relogio);
      io.disconnect();
      gestos.forEach((g) => el.removeEventListener(g, parar));
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
