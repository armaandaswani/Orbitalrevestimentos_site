"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Trilho horizontal com encaixe (scroll-snap). No toque, arrasta de lado; com
 * mouse ou teclado, as setas andam um cartão. Cada filho é um cartão.
 *
 * `largura` define quanto do trilho cada cartão ocupa em cada faixa de tela —
 * o cartão seguinte sempre aparece cortado na borda, que é o que diz "tem mais".
 *
 * Embaixo, uma régua fina mostra onde o visitante está no trilho. Ela só usa
 * transform (o tamanho do "polegar" é medido no resize, a posição no scroll).
 * Sem JavaScript o trilho continua rolando de lado normalmente.
 */
export default function Trilho({
  rotulo, children, largura = "w-[84%] sm:w-[46%] lg:w-[31.5%]", escuro = false, sangria = true,
}: {
  rotulo: string;
  children: React.ReactNode[];
  largura?: string;
  escuro?: boolean;
  /** No celular, o trilho vai até a borda da tela (sangra o contêiner). */
  sangria?: boolean;
}) {
  const trilho = useRef<HTMLUListElement>(null);
  const polegar = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ inicio: true, fim: false, rola: false });

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    let raf = 0;
    let ultimaFracao = -1;
    const medir = () => {
      raf = 0;
      const max = el.scrollWidth - el.clientWidth;
      const fracao = el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1;
      const p = polegar.current;
      if (p) {
        // A largura só muda quando a proporção muda (resize); ao rolar, só transform.
        if (Math.abs(fracao - ultimaFracao) > 0.001) { ultimaFracao = fracao; p.style.width = `${Math.max(fracao, 0.08) * 100}%`; }
        const andou = max > 0 ? el.scrollLeft / max : 0;
        // translateX em % do próprio polegar: anda até a ponta da régua.
        p.style.transform = `translate3d(${andou * (1 / Math.max(fracao, 0.08) - 1) * 100}%, 0, 0)`;
      }
      const novo = { inicio: el.scrollLeft < 8, fim: el.scrollLeft > max - 8, rola: max > 8 };
      setPos((v) => (v.inicio === novo.inicio && v.fim === novo.fim && v.rola === novo.rola ? v : novo));
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(medir); };
    medir();
    el.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("scroll", pedir); window.removeEventListener("resize", pedir); };
  }, [children.length]);

  const andar = (dir: 1 | -1) => {
    const el = trilho.current;
    const card = el?.querySelector("li");
    if (!el || !card) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 12;
    el.scrollBy({ left: dir * (card.getBoundingClientRect().width + gap), behavior: reduzir ? "auto" : "smooth" });
  };

  const seta = `w-11 h-11 flex items-center justify-center border transition-colors disabled:opacity-30 disabled:cursor-default ${
    escuro ? "border-white/30 text-white hover:bg-white hover:text-primary" : "border-primary/25 text-primary hover:bg-primary hover:text-white"
  }`;
  const soUm = children.length <= 1;

  return (
    <div className={escuro ? "ds-escuro" : undefined}>
      <ul ref={trilho} aria-label={rotulo}
        className={`ds-trilho flex gap-3 lg:gap-4 overflow-x-auto snap-x snap-mandatory pb-1 ${
          sangria ? "-mx-[clamp(1rem,4.2vw,4rem)] px-[clamp(1rem,4.2vw,4rem)] scroll-px-[clamp(1rem,4.2vw,4rem)] lg:mx-0 lg:px-0 lg:scroll-px-0" : ""
        }`}>
        {children.map((c, i) => (
          <li key={i} className={`snap-start flex-shrink-0 ${soUm ? "w-full sm:w-[46%] lg:w-[31.5%]" : largura}`}>{c}</li>
        ))}
      </ul>
      {!soUm && (
        <div className={`flex items-center gap-4 mt-4 ${pos.rola ? "" : "invisible"}`}>
          {/* Régua de progresso do trilho (decorativa: o trilho já se anuncia pela lista). */}
          <span aria-hidden className={`relative flex-1 h-px overflow-hidden ${escuro ? "bg-white/20" : "bg-primary/15"}`}>
            <span ref={polegar} className={`absolute inset-y-0 left-0 w-1/4 ${escuro ? "bg-white" : "bg-primary"}`} />
          </span>
          <div className="hidden [@media(pointer:fine)]:flex gap-2">
            <button type="button" className={seta} onClick={() => andar(-1)} disabled={pos.inicio} aria-label={`${rotulo}: anterior`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button type="button" className={seta} onClick={() => andar(1)} disabled={pos.fim} aria-label={`${rotulo}: próximo`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
