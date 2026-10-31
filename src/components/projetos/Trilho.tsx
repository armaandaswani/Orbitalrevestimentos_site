"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Trilho horizontal com encaixe (scroll-snap). No toque, arrasta de lado; com
 * mouse ou teclado, as setas andam um cartão. Cada filho é um cartão.
 *
 * `largura` define quanto do trilho cada cartão ocupa em cada faixa de tela —
 * o cartão seguinte sempre aparece cortado na borda, que é o que diz "tem mais".
 */
export default function Trilho({
  rotulo, children, largura = "w-[84%] sm:w-[46%] lg:w-[31.5%]", escuro = false,
}: {
  rotulo: string;
  children: React.ReactNode[];
  largura?: string;
  escuro?: boolean;
}) {
  const trilho = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState({ inicio: true, fim: false });

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const medir = () => setPos({ inicio: el.scrollLeft < 8, fim: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => { el.removeEventListener("scroll", medir); window.removeEventListener("resize", medir); };
  }, []);

  const andar = (dir: 1 | -1) => {
    const el = trilho.current;
    const card = el?.querySelector("li");
    if (!el || !card) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * (card.getBoundingClientRect().width + 12), behavior: reduzir ? "auto" : "smooth" });
  };

  const seta = `w-11 h-11 flex items-center justify-center border transition-colors disabled:opacity-30 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 ${
    escuro ? "border-white/30 text-white hover:bg-white hover:text-primary focus-visible:outline-white" : "border-primary/30 text-primary hover:bg-primary hover:text-white focus-visible:outline-[#2347A0]"
  }`;
  const soUm = children.length <= 1;

  return (
    <div>
      <ul ref={trilho} aria-label={rotulo}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-px-4 -mx-4 px-4 lg:mx-0 lg:px-0 pb-1">
        {children.map((c, i) => (
          <li key={i} className={`snap-start flex-shrink-0 ${soUm ? "w-full sm:w-[46%] lg:w-[31.5%]" : largura}`}>{c}</li>
        ))}
      </ul>
      {!soUm && !(pos.inicio && pos.fim) && (
        <div className="hidden [@media(pointer:fine)]:flex justify-end gap-2 mt-4">
          <button type="button" className={seta} onClick={() => andar(-1)} disabled={pos.inicio} aria-label="Anterior">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button type="button" className={seta} onClick={() => andar(1)} disabled={pos.fim} aria-label="Próximo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
