"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Invólucro dos momentos especiais da página do PFB (a placa por dentro, o
 * leque das linhas e a foto do bambu): a entrada toca uma vez, por tempo, quando
 * o bloco chega à tela. Desde 15/11/2026 este é o único caminho, em todo
 * navegador: antes as figuras seguiam a rolagem, e quem parava no meio as via
 * montadas pela metade.
 *
 * Só põe classe quando tudo vale: há `IntersectionObserver`, não há movimento
 * reduzido, o nível é `completo` e o alvo está abaixo da tela ao montar. Aí
 * `pfb-espera` (estado de partida) entra num `setTimeout(0)`, já fora da tela, e
 * `pfb-entrou` (a animação por tempo) entra uma vez, quando o alvo cruza 18%
 * acima do fim da tela. Nos outros casos não há classe e tudo fica no estado
 * final. O mesmo padrão de estado do `Revelar`.
 *
 * O alvo é o próprio `div`, ou, com `observar` (um seletor), o primeiro
 * descendente que casa com ele: no capítulo 3, a figura (a entrada acontece com
 * ela na tela, não com o título). A classe vai sempre no `div`, que contém o
 * que anima.
 */
export default function EntradaPfb({
  className,
  children,
  observar,
}: {
  className: string;
  children: React.ReactNode;
  observar?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<"nada" | "espera" | "entrou">("nada");

  useEffect(() => {
    const el = ref.current;
    const alvo = el && observar ? el.querySelector(observar) : el;
    if (!alvo || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.dataset.mvNivel !== "completo") return;
    // Já na tela (ou acima, ao voltar na página): fica como está, no estado final.
    if (alvo.getBoundingClientRect().top < window.innerHeight) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setEstado("entrou");
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -18% 0px" },
    );
    // Esconde só agora, já fora da tela: o visitante nunca vê o "sumir".
    const t = setTimeout(() => {
      setEstado("espera");
      obs.observe(alvo);
    }, 0);
    return () => {
      clearTimeout(t);
      obs.disconnect();
    };
  }, [observar]);

  const classe = estado === "espera" ? " pfb-espera" : estado === "entrou" ? " pfb-entrou" : "";
  return (
    <div ref={ref} className={`${className}${classe}`}>
      {children}
    </div>
  );
}
