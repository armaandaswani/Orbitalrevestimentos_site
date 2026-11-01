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
 *
 * Só transform: a "janela" do antes desliza para a esquerda e a foto dentro
 * dela desliza de volta na mesma medida (fica parada na tela). A divisória e
 * a alça andam junto com a borda da janela. Nada de clip-path nem de `left`,
 * e a rolagem escreve direto no estilo (sem render do React a cada quadro).
 */
interface Foto { src: string; alt: string }

export default function AntesDepois({
  antes, depois, proporcao = "4 / 3", sizes = "(max-width: 1023px) 100vw, 70vw", rotulos = ["Antes", "Depois"],
}: {
  antes: Foto;
  depois: Foto;
  proporcao?: string;
  sizes?: string;
  rotulos?: [string, string];
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const janela = useRef<HTMLDivElement>(null);
  const interno = useRef<HTMLDivElement>(null);
  const borda = useRef<HTMLDivElement>(null);
  const alca = useRef<HTMLButtonElement>(null);
  const pct = useRef(50);
  const [pronto, setPronto] = useState(false);
  const mexeu = useRef(false);
  const arrastando = useRef(false);

  const aplicar = (p: number) => {
    const v = Math.min(100, Math.max(0, p));
    pct.current = v;
    const fora = 100 - v;
    if (janela.current) janela.current.style.transform = `translate3d(${-fora}%, 0, 0)`;
    if (interno.current) interno.current.style.transform = `translate3d(${fora}%, 0, 0)`;
    if (borda.current) borda.current.style.transform = `translate3d(${-fora}%, 0, 0)`;
    if (alca.current) {
      alca.current.setAttribute("aria-valuenow", String(Math.round(v)));
      alca.current.setAttribute("aria-valuetext", `${Math.round(v)}% ${rotulos[0].toLowerCase()}`);
    }
  };

  // Primeiro a troca do par estático pelo comparador; a rolagem só depois que ele existe.
  useEffect(() => {
    const t = setTimeout(() => setPronto(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = caixa.current;
    if (!pronto || !el) return;
    aplicar(pct.current);
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const seguir = () => {
      raf = 0;
      if (mexeu.current) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 quando o topo da foto entra por baixo da tela; 1 quando o centro dela passa do meio.
      const t = Math.min(1, Math.max(0, (vh - r.top) / (vh / 2 + r.height / 2)));
      aplicar(88 - t * 76);
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(seguir); };
    if (!reduzir) {
      pedir();
      window.addEventListener("scroll", pedir, { passive: true });
      window.addEventListener("resize", pedir);
    }
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", pedir); window.removeEventListener("resize", pedir); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- aplicar só escreve em refs
  }, [pronto]);

  const mover = (clientX: number) => {
    const r = caixa.current?.getBoundingClientRect();
    if (!r) return;
    mexeu.current = true;
    aplicar(((clientX - r.left) / r.width) * 100);
  };

  const selo = "absolute bottom-3 text-xs tracking-[0.14em] uppercase font-bold px-2 py-1";

  if (!pronto) {
    // Primeira pintura e sem JS: as duas metades no MESMO quadro do comparador
    // (sem salto de layout quando ele assume).
    return (
      <div className="relative overflow-hidden bg-primary grid grid-cols-2 gap-1" style={{ aspectRatio: proporcao }}>
        {[{ f: antes, r: rotulos[0] }, { f: depois, r: rotulos[1] }].map(({ f, r }) => (
          <figure key={r} className="relative overflow-hidden">
            <Image src={f.src} alt={f.alt} fill sizes={sizes.replace(/100vw/g, "50vw")} className="object-cover" />
            <figcaption className={`${selo} left-3 bg-black/60 text-white`}>{r}</figcaption>
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
      <div ref={janela} className="absolute inset-0 overflow-hidden will-change-transform">
        <div ref={interno} className="absolute inset-0 will-change-transform">
          <Image src={antes.src} alt={antes.alt} fill sizes={sizes} className="object-cover brightness-[0.85] saturate-[0.8]" draggable={false} />
        </div>
      </div>
      <span className={`${selo} left-3 bg-black/60 text-white`} aria-hidden>{rotulos[0]}</span>
      <span className={`${selo} right-3 bg-secondary text-primary`} aria-hidden>{rotulos[1]}</span>
      {/* A borda da janela: linha + alça, sempre na divisa. */}
      <div ref={borda} className="absolute inset-0 pointer-events-none will-change-transform">
        <span className="absolute inset-y-0 right-0 w-0.5 translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" aria-hidden />
        <button ref={alca} type="button" data-alca role="slider" aria-label={`Comparar ${rotulos[0].toLowerCase()} e ${rotulos[1].toLowerCase()}`}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={50} aria-valuetext={`50% ${rotulos[0].toLowerCase()}`}
          onKeyDown={(e) => {
            const passo = e.shiftKey ? 20 : 5;
            const ir = (v: number) => { e.preventDefault(); mexeu.current = true; aplicar(v); };
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") ir(pct.current - passo);
            if (e.key === "ArrowRight" || e.key === "ArrowUp") ir(pct.current + passo);
            if (e.key === "Home") ir(0);
            if (e.key === "End") ir(100);
          }}
          className="pointer-events-auto absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white text-primary shadow-lg flex items-center justify-center cursor-ew-resize touch-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  );
}
