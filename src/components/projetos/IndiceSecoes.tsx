"use client";

import { useEffect, useState } from "react";

/**
 * Índice fixo da página: cada item pula para a sua seção e o da seção na tela
 * fica marcado. No celular a linha rola de lado.
 */
export interface ItemIndice {
  id: string;
  rotulo: string;
  conta?: number;
}

export default function IndiceSecoes({ itens, rotulo = "Seções da página" }: { itens: ItemIndice[]; rotulo?: string }) {
  const [ativo, setAtivo] = useState(itens[0]?.id ?? "");

  useEffect(() => {
    const els = itens.map((x) => document.getElementById(x.id)).filter((el): el is HTMLElement => !!el);
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver((entradas) => {
      const visivel = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visivel) setAtivo(visivel.target.id);
    }, { rootMargin: "-140px 0px -55% 0px" });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [itens]);

  return (
    <nav aria-label={rotulo} className="sticky top-20 z-40 bg-white/95 backdrop-blur-sm border-y border-surface-container-high">
      <ul className="max-w-[1280px] mx-auto px-4 lg:px-16 flex gap-1 overflow-x-auto scrollbar-none">
        {itens.map((x) => (
          <li key={x.id} className="flex-shrink-0">
            <a href={`#${x.id}`} aria-current={ativo === x.id ? "location" : undefined}
              className={`flex items-center min-h-12 px-3 sm:px-4 text-xs tracking-[0.12em] uppercase font-bold border-b-2 -mb-px transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2347A0] ${
                ativo === x.id ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-primary"
              }`}>
              {x.rotulo}{x.conta ? <span className="font-normal ml-1.5">{x.conta}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
