"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Entrada suave ao rolar: o bloco sobe 1,5rem e aparece quando chega na tela.
 *
 * - Caminho principal só em CSS (`.mv-revelar`, animation-timeline: view()):
 *   a animação segue a rolagem no compositor, sem JavaScript.
 * - Navegador sem animation-timeline: um IntersectionObserver faz o mesmo
 *   (classes `.mv-io-*`). O que já está na tela ao carregar não anima.
 * - Sem JavaScript, ou com movimento reduzido, nada fica escondido.
 * - Só opacidade e transform: não mexe no layout (CLS 0).
 * - `ordem` escalona vizinhos (0, 1, 2…), como os cartões de uma linha.
 *   `atraso` (ms) continua aceito e vira uma ordem equivalente.
 */
export default function Revelar({
  children, ordem, atraso = 0, className = "", como: Tag = "div", id,
}: {
  children: React.ReactNode;
  ordem?: number;
  atraso?: number;
  className?: string;
  como?: "div" | "li" | "section" | "article" | "figure" | "header";
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [estado, setEstado] = useState<"css" | "espera" | "entrou">("css");
  const i = ordem ?? Math.round(atraso / 80);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: view()")) return;
    const r = el.getBoundingClientRect();
    // Já visível ao carregar (ou acima, ao voltar na página): fica como está.
    if (r.top < window.innerHeight && r.bottom > 0) return;
    if (r.bottom <= 0) return;
    const obs = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) { setEstado("entrou"); obs.disconnect(); }
    }, { rootMargin: "0px 0px -8% 0px" });
    // Esconde só agora, já fora da tela: o visitante nunca vê o "sumir".
    const t = setTimeout(() => { setEstado("espera"); obs.observe(el); }, 0);
    return () => { clearTimeout(t); obs.disconnect(); };
  }, []);

  const classe = estado === "css" ? "mv-revelar" : estado === "espera" ? "mv-io-espera" : "mv-io-entrou";
  return (
    <Tag
      ref={ref as React.Ref<never>}
      id={id}
      className={`${classe} ${className}`}
      style={i ? ({ "--mv-i": i } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
