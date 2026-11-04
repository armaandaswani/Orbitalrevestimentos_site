"use client";

import { useEffect, useRef, useState } from "react";

/** Os três jeitos de entrar: o texto sobe, a foto se desvela, a lista surge. */
export type EfeitoRevelar = "sobe" | "desvela" | "surge";

/**
 * Entrada suave ao rolar. Três jeitos, para a página nunca repetir a mesma
 * entrada em toda seção:
 *
 * - `sobe` (padrão): o bloco sobe e aparece. Para títulos e listas de texto.
 * - `desvela`: o recorte abre de baixo para cima (12% do topo) enquanto a foto
 *   se acomoda de 1,06 a 1. Para quadros de foto; quanto mais baixo o nível
 *   de movimento, menos ela se acomoda.
 * - `surge`: só a opacidade. Para o que vem em volta e não deve chamar a vez.
 *
 * - Caminho principal só em CSS (`.mv-revelar*`, animation-timeline: view()):
 *   a animação segue a rolagem no compositor, sem JavaScript.
 * - Navegador sem animation-timeline: um IntersectionObserver faz o mesmo
 *   (classes `.mv-io-*`). O que já está na tela ao carregar não anima.
 * - Sem JavaScript, ou com movimento reduzido, nada fica escondido.
 * - Só opacidade, transform e clip-path: não mexe no layout (CLS 0).
 * - `ordem` escalona vizinhos (0, 1, 2…), como os cartões de uma linha.
 *   `atraso` (ms) continua aceito e vira uma ordem equivalente.
 */
export default function Revelar({
  children, ordem, atraso = 0, className = "", como: Tag = "div", id, efeito = "sobe",
}: {
  children: React.ReactNode;
  ordem?: number;
  atraso?: number;
  className?: string;
  como?: "div" | "li" | "section" | "article" | "figure" | "header";
  id?: string;
  efeito?: EfeitoRevelar;
}) {
  const ref = useRef<HTMLElement>(null);
  const [estado, setEstado] = useState<"css" | "espera" | "entrou" | "feito">("css");
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

  // O recorte do `desvela` fica preso depois de entrar e cortaria o contorno de
  // foco e as sombras de quem está dentro: terminada a transição, a classe sai
  // (o visual é o mesmo) e o bloco volta a ser um bloco comum.
  useEffect(() => {
    if (estado !== "entrou" || efeito !== "desvela") return;
    const t = setTimeout(() => setEstado("feito"), 900 + i * 70 + 150);
    return () => clearTimeout(t);
  }, [estado, efeito, i]);

  const sufixo = efeito === "sobe" ? "" : `-${efeito}`;
  const classe =
    estado === "css" ? `mv-revelar${sufixo}`
    : estado === "espera" ? `mv-io-espera${sufixo}`
    : estado === "entrou" ? `mv-io-entrou${sufixo}`
    : "";
  return (
    <Tag
      ref={ref as React.Ref<never>}
      id={id}
      className={`${classe} ${className}`.trim()}
      style={i ? ({ "--mv-i": i } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
