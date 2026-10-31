"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Entrada suave ao rolar: o bloco sobe 16 px e aparece quando chega na tela.
 *
 * - Sem JavaScript, ou com movimento reduzido, nada fica escondido.
 * - O que já está na tela ao carregar não anima (nada pisca no topo).
 * - Só opacidade e transform: não mexe no layout (CLS 0).
 * - `atraso` (ms) escalona itens vizinhos, como os cartões de uma linha.
 */
export default function Revelar({
  children, atraso = 0, className = "", como: Tag = "div",
}: {
  children: React.ReactNode;
  atraso?: number;
  className?: string;
  como?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  const [estado, setEstado] = useState<"visivel" | "espera" | "entrou">("visivel");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`${className} ${estado === "espera" ? "opacity-0 translate-y-4 pointer-events-none" : ""} ${estado === "entrou" ? "opacity-100 translate-y-0 transition-[opacity,transform] duration-700 ease-out" : ""}`}
      style={estado === "entrou" && atraso ? { transitionDelay: `${atraso}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
