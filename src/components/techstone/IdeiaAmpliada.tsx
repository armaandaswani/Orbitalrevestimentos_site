"use client";

import { useRef, useState } from "react";
import { useDialogo } from "@/components/ds/useDialogo";

export interface IdeiaFoto {
  src: string;
  largo?: string;
  alt: string;
  titulo: string;
  /** "Taj Mahal" */
  modelo: string;
  /** "1200 × 600 mm" */
  tamanho: string;
}

const botao = "w-11 h-11 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white";

/**
 * Ideia do TechStone em tela cheia: a foto inteira (sem o recorte do palco),
 * setas, deslizar para o lado e contador, como a galeria dos projetos. Monta
 * só enquanto está aberta; Esc fecha e o foco volta para a ideia.
 */
export default function IdeiaAmpliada({ lista, inicio, onFechar, onVerTamanho }: {
  lista: IdeiaFoto[];
  inicio: number;
  /** Recebe a ideia em que o visitante parou, para a galeria da página acompanhar. */
  onFechar: (ultima: number) => void;
  onVerTamanho: (ideia: number) => void;
}) {
  const [idx, setIdx] = useState(inicio);
  const caixa = useRef<HTMLDivElement>(null);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const total = lista.length;
  const ideia = lista[idx];
  const ir = (sentido: -1 | 1) => setIdx((i) => (i + sentido + total) % total);
  const fechar = () => onFechar(idx);

  useDialogo(caixa, fechar, true, caixa);

  return (
    <div ref={caixa} role="dialog" aria-modal="true" tabIndex={-1} aria-label={`Ideia: ${ideia.titulo}`}
      onKeyDown={(e) => {
        if (total < 2) return;
        if (e.key === "ArrowLeft") { e.preventDefault(); ir(-1); }
        if (e.key === "ArrowRight") { e.preventDefault(); ir(1); }
      }}
      className="outline-none fixed inset-0 z-[60] bg-[#16130F] flex flex-col text-white" style={{ height: "100dvh" }}>

      <div className="flex items-start justify-between gap-3 pl-4 sm:pl-6 pr-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 border-b border-white/10 flex-shrink-0">
        <div className="min-w-0 py-1.5" aria-live="polite">
          <p className="text-[#D8C3A5] text-xs tracking-[0.14em] uppercase font-bold">{ideia.modelo} · <span className="tabular-nums">{ideia.tamanho}</span></p>
          <h2 className="font-serif text-lg leading-snug mt-0.5 truncate">{ideia.titulo}</h2>
        </div>
        <button type="button" onClick={fechar} aria-label="Fechar" className={`${botao} text-white/80 hover:text-white flex-shrink-0`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      {/* touch-pan-y + pinch-zoom: o deslize horizontal troca a foto; rolar e o zoom de pinça continuam do navegador. */}
      <div className="flex-1 min-h-0 relative select-none touch-pan-y touch-pinch-zoom"
        onPointerDown={(e) => { if (e.pointerType !== "mouse") toque.current = { x: e.clientX, y: e.clientY }; }}
        onPointerCancel={() => { toque.current = null; }}
        onPointerUp={(e) => {
          const t = toque.current; toque.current = null;
          if (!t || total < 2) return;
          const dx = e.clientX - t.x;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - t.y)) ir(dx < 0 ? 1 : -1);
        }}>
        <picture key={ideia.src}>
          {ideia.largo && <source media="(min-width: 768px)" srcSet={ideia.largo} />}
          <img src={ideia.src} alt={ideia.alt} decoding="async" draggable={false} className="absolute inset-0 w-full h-full object-contain" />
        </picture>
        {total > 1 && (
          <>
            <button type="button" onClick={() => ir(-1)} aria-label="Ideia anterior"
              className={`${botao} absolute left-2 top-1/2 -translate-y-1/2 bg-black/45 hover:bg-black/70`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button type="button" onClick={() => ir(1)} aria-label="Próxima ideia"
              className={`${botao} absolute right-2 top-1/2 -translate-y-1/2 bg-black/45 hover:bg-black/70`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] border-t border-white/10">
        <button type="button" onClick={() => onVerTamanho(idx)}
          className="min-h-11 px-4 rounded-full border border-white/30 text-sm font-semibold hover:border-white/70 transition-colors">
          Ver o tamanho {ideia.tamanho}
        </button>
        {total > 1 && <p className="text-white/70 text-sm ml-auto tabular-nums">{idx + 1} / {total}</p>}
      </div>
    </div>
  );
}
