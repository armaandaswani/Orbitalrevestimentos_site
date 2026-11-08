"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Invólucro dos momentos especiais da página do PFB (capítulos 3 e 7) para o
 * caminho por tempo: nos navegadores sem `animation-timeline`, a entrada roda uma
 * vez, por tempo, quando o bloco chega à tela (spec 2026-11-07-pfb-experiencia,
 * "Movimento: como é feito").
 *
 * Só põe classe quando tudo vale: há `IntersectionObserver`, o CSS do JS diz que
 * não há `animation-timeline: view()`, não há movimento reduzido, o nível é
 * `completo` e o bloco está abaixo da tela ao montar. Aí `pfb-espera` (estado de
 * partida) entra num `setTimeout(0)`, já fora da tela, e `pfb-entrou` (a animação
 * por tempo) entra uma vez, quando o bloco cruza 10% acima do fim da tela. Nos
 * outros casos não há classe: o CSS cuida (rolagem) ou tudo fica no estado final.
 * O mesmo padrão de estado do `Revelar`.
 */
export default function EntradaPfb({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"nada" | "espera" | "entrou">("nada");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: view()")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.dataset.mvNivel !== "completo") return;
    // Já na tela (ou acima, ao voltar na página): fica como está, no estado final.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setEstado("entrou");
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    // Esconde só agora, já fora da tela: o visitante nunca vê o "sumir".
    const t = setTimeout(() => {
      setEstado("espera");
      obs.observe(el);
    }, 0);
    return () => {
      clearTimeout(t);
      obs.disconnect();
    };
  }, []);

  const classe = estado === "espera" ? " pfb-espera" : estado === "entrou" ? " pfb-entrou" : "";
  return (
    <div ref={ref} className={`${className}${classe}`}>
      {children}
    </div>
  );
}
