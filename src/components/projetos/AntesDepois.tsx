"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Comparador antes × depois: as duas fotos uma sobre a outra e uma divisória
 * que o visitante arrasta (dedo, mouse ou setas do teclado).
 *
 * Enquanto ninguém mexeu, a divisória acompanha a rolagem: a seção entra na
 * tela mostrando o "antes" e, conforme desce, o "depois" vai tomando o quadro.
 * Com movimento reduzido, fica parada no meio. Sem JavaScript, as duas fotos
 * aparecem lado a lado (a divisória só existe depois de hidratar).
 */
interface Foto { src: string; alt: string }

export default function AntesDepois({ antes, depois, proporcao = "4 / 3", sizes = "(max-width: 1023px) 100vw, 1100px" }: {
  antes: Foto;
  depois: Foto;
  proporcao?: string;
  sizes?: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(50);
  const [pronto, setPronto] = useState(false);
  const mexeu = useRef(false);
  const arrastando = useRef(false);

  // Primeiro a troca do par estático pelo comparador; a rolagem só depois que ele existe.
  useEffect(() => {
    const t = setTimeout(() => setPronto(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = caixa.current;
    if (!pronto || !el) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const seguir = () => {
      raf = 0;
      if (mexeu.current) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 quando o topo da foto entra por baixo da tela; 1 quando o centro dela passa do meio.
      const t = Math.min(1, Math.max(0, (vh - r.top) / (vh / 2 + r.height / 2)));
      setPct(Math.round(88 - t * 76));
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(seguir); };
    if (!reduzir) {
      pedir();
      window.addEventListener("scroll", pedir, { passive: true });
      window.addEventListener("resize", pedir);
    }
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", pedir); window.removeEventListener("resize", pedir); };
  }, [pronto]);

  const mover = (clientX: number) => {
    const r = caixa.current?.getBoundingClientRect();
    if (!r) return;
    mexeu.current = true;
    setPct(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  if (!pronto) {
    // Primeira pintura e sem JS: as duas metades no MESMO quadro do comparador
    // (sem salto de layout quando ele assume).
    return (
      <div className="relative overflow-hidden bg-primary grid grid-cols-2 gap-1" style={{ aspectRatio: proporcao }}>
        {[{ f: antes, r: "Antes" }, { f: depois, r: "Depois" }].map(({ f, r }) => (
          <figure key={r} className="relative overflow-hidden">
            <Image src={f.src} alt={f.alt} fill sizes="50vw" className="object-cover" />
            <figcaption className="absolute left-3 bottom-3 bg-black/60 text-white text-xs tracking-[0.14em] uppercase font-bold px-2 py-1">{r}</figcaption>
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div ref={caixa} className="relative overflow-hidden bg-primary select-none touch-pan-y" style={{ aspectRatio: proporcao }}
      onPointerDown={(e) => {
        // Mouse arrasta de qualquer ponto; no toque, só pela alça — senão rolar
        // a página com o dedo em cima da foto mexeria na divisória.
        if (e.pointerType !== "mouse" && !(e.target as HTMLElement).closest("[data-alca]")) return;
        arrastando.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        mover(e.clientX);
      }}
      onPointerMove={(e) => { if (arrastando.current) mover(e.clientX); }}
      onPointerUp={() => { arrastando.current = false; }}
      onPointerCancel={() => { arrastando.current = false; }}>
      <Image src={depois.src} alt={depois.alt} fill sizes={sizes} className="object-cover" draggable={false} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
        <Image src={antes.src} alt={antes.alt} fill sizes={sizes} className="object-cover brightness-[0.85] saturate-[0.8]" draggable={false} />
      </div>
      <span className="absolute left-3 bottom-3 bg-black/60 text-white text-xs tracking-[0.14em] uppercase font-bold px-2 py-1" aria-hidden>Antes</span>
      <span className="absolute right-3 bottom-3 bg-secondary text-primary text-xs tracking-[0.14em] uppercase font-bold px-2 py-1" aria-hidden>Depois</span>
      <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" style={{ left: `${pct}%` }} aria-hidden />
      <button type="button" data-alca role="slider" aria-label="Comparar antes e depois" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}
        aria-valuetext={`${Math.round(pct)}% antes`}
        onKeyDown={(e) => {
          const passo = e.shiftKey ? 20 : 5;
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); mexeu.current = true; setPct((p) => Math.max(0, p - passo)); }
          if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); mexeu.current = true; setPct((p) => Math.min(100, p + passo)); }
          if (e.key === "Home") { e.preventDefault(); mexeu.current = true; setPct(0); }
          if (e.key === "End") { e.preventDefault(); mexeu.current = true; setPct(100); }
        }}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white text-primary shadow-lg flex items-center justify-center cursor-ew-resize touch-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        style={{ left: `${pct}%` }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" /></svg>
      </button>
    </div>
  );
}
