"use client";

// Folha de baixo do Visualizador (Onde, Ajustes, dados do contato): diálogo
// modal acessível. Esc, ✕, toque no véu ou arrastar a alça (ou a linha do
// título) para baixo mais de 80 px fecham. Aberta, trava a rolagem da página
// com o mesmo contador das outras folhas do site (ds/useDialogo › travarRolagem,
// que põe overflow:hidden no body). O painel sobe com transform; com movimento
// reduzido, aparece e some no lugar (globals.css › Visualizador). Com
// fechavel={false} (o contato que libera o resultado) nada disso fecha: sem ✕,
// sem Esc, sem véu e sem arrasto; ela some quando o wizard tira `aberta`.
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { travarRolagem } from "@/components/ds/useDialogo";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function prefereMenosMovimento(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function focaveis(painel: HTMLElement): HTMLElement[] {
  return [...painel.querySelectorAll<HTMLElement>(FOCAVEIS)].filter((el) => el.getClientRects().length > 0);
}

export default function Folha({
  aberta,
  titulo,
  onFechar,
  fechavel = true,
  children,
}: {
  aberta: boolean;
  titulo: string;
  onFechar: () => void;
  fechavel?: boolean;
  children: React.ReactNode;
}) {
  // Continua montada durante a saída, para o painel descer antes de sumir.
  const [montada, setMontada] = useState(aberta);
  if (aberta && !montada) setMontada(true);
  if (!aberta && montada && prefereMenosMovimento()) setMontada(false);

  const painelRef = useRef<HTMLDivElement | null>(null);
  const tituloId = useId();
  const onFecharRef = useRef(onFechar);
  useEffect(() => { onFecharRef.current = fechavel ? onFechar : () => {}; });

  // Saída: desmonta quando a transição do painel termina (com folga de tempo).
  useEffect(() => {
    if (aberta || !montada) return;
    const painel = painelRef.current;
    let feito = false;
    const fim = () => { if (!feito) { feito = true; setMontada(false); } };
    const aoTerminar = (e: TransitionEvent) => { if (e.target === painel && e.propertyName === "transform") fim(); };
    painel?.addEventListener("transitionend", aoTerminar);
    const t = window.setTimeout(fim, 700);
    return () => { painel?.removeEventListener("transitionend", aoTerminar); window.clearTimeout(t); };
  }, [aberta, montada]);

  // Aberta: foco no painel, Tab preso dentro dele, Esc fecha. Ao fechar, o foco
  // volta para quem abriu.
  useEffect(() => {
    if (!aberta) return;
    const painel = painelRef.current;
    const quemAbriu = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const soltarRolagem = travarRolagem();
    painel?.focus({ preventScroll: true });
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onFecharRef.current(); return; }
      if (e.key !== "Tab" || !painel) return;
      const lista = focaveis(painel);
      if (lista.length === 0) { e.preventDefault(); painel.focus(); return; }
      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      const ativo = document.activeElement;
      const fora = !painel.contains(ativo) || ativo === painel;
      if (e.shiftKey && (ativo === primeiro || fora)) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && (ativo === ultimo || fora)) { e.preventDefault(); primeiro.focus(); }
    };
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("keydown", tecla);
      soltarRolagem();
      if (quemAbriu?.isConnected) quemAbriu.focus({ preventScroll: true });
    };
  }, [aberta]);

  // Arrastar a alça ou o título para baixo: o painel acompanha o dedo; passou de
  // 80 px, fecha. Eventos de toque passivos, sem touch-action:none. Um toque
  // parado no ✕ não move nada (dy 0) e o clique fecha normalmente.
  const arrasto = useRef<{ y0: number; dy: number } | null>(null);
  const comecarArrasto = (e: React.TouchEvent) => {
    const painel = painelRef.current;
    if (!fechavel || !painel || e.touches.length !== 1) return;
    arrasto.current = { y0: e.touches[0].clientY, dy: 0 };
    painel.setAttribute("data-arrastando", "");
  };
  const moverArrasto = (e: React.TouchEvent) => {
    const a = arrasto.current;
    const painel = painelRef.current;
    if (!a || !painel) return;
    a.dy = Math.max(0, e.touches[0].clientY - a.y0);
    painel.style.transform = a.dy > 0 ? `translate3d(0, ${a.dy}px, 0)` : "";
  };
  const soltarArrasto = () => {
    const a = arrasto.current;
    const painel = painelRef.current;
    arrasto.current = null;
    if (!painel) return;
    painel.removeAttribute("data-arrastando");
    painel.style.transform = "";
    if (a && a.dy > 80) onFecharRef.current();
  };

  if (!montada || typeof document === "undefined") return null;

  return createPortal(
    <div className="viz-folha fixed inset-0 z-[60]" data-aberta={aberta ? "" : undefined}>
      <div aria-hidden className="viz-folha-veu absolute inset-0 bg-[#0B1F45]/45" onClick={() => onFecharRef.current()} />
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="viz-folha-painel absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-[560px] flex-col overscroll-contain rounded-t-[14px] bg-white shadow-[0_-12px_40px_rgba(11,31,69,0.18)] outline-none"
      >
        {/* Área de arrasto: a alça e a linha do título. */}
        <div
          data-folha-arrasto
          className={`shrink-0 ${fechavel ? "cursor-grab" : ""}`}
          onTouchStart={comecarArrasto}
          onTouchMove={moverArrasto}
          onTouchEnd={soltarArrasto}
          onTouchCancel={soltarArrasto}
        >
        <div className="flex h-7 items-center justify-center">
          <span aria-hidden className="h-1 w-10 rounded-full bg-[#d5d9e0]" />
        </div>
        <div className={`flex items-center justify-between gap-3 pl-5 pr-2 ${fechavel ? "" : "min-h-11 pr-5"}`}>
          <h2 id={tituloId} className="font-serif text-xl leading-tight text-[#0B1F45]">{titulo}</h2>
          {fechavel && <button
            type="button"
            onClick={() => onFecharRef.current()}
            aria-label="Fechar"
            className="grid h-11 w-11 shrink-0 place-items-center text-[#43474e] hover:text-[#0B1F45] transition-colors"
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>}
        </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
