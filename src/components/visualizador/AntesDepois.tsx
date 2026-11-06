"use client";

// Antes e depois do Resultado: as duas fotos uma sobre a outra e uma divisória
// que começa no meio. A camada "depois" é recortada com clip-path pela variável
// --div (0 a 100); a linha e a alça andam com transform. A foto mantém
// touch-action: pan-y, então o dedo em cima dela rola a página; só a alça
// captura o ponteiro (touch-action: none só nela). Com mouse, apertar em
// qualquer ponto da foto leva a divisória até lá e segue arrastando pela alça.
// Teclado na alça: setas, Home e End (passoTeclado).
import React, { useRef, useState } from "react";
import { useProporcao } from "./EditorMarcacao";
import { limitarDivisor, passoTeclado } from "./fluxo";

type Tecla = Parameters<typeof passoTeclado>[1];
const TECLAS: Record<string, Tecla> = {
  ArrowLeft: "ArrowLeft", ArrowDown: "ArrowLeft",
  ArrowRight: "ArrowRight", ArrowUp: "ArrowRight",
  Home: "Home", End: "End",
};

export default function AntesDepois({
  antes,
  depois,
  rotuloAntes = "Antes",
  rotuloDepois = "Depois",
}: {
  antes: string;
  depois: string;
  rotuloAntes?: string;
  rotuloDepois?: string;
}) {
  const [div, setDiv] = useState(50);
  const caixa = useRef<HTMLDivElement | null>(null);
  const alca = useRef<HTMLButtonElement | null>(null);
  const arrasto = useRef<number | null>(null);
  const proporcao = useProporcao(antes) ?? 4 / 3;

  const levarPara = (clientX: number) => {
    const r = caixa.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setDiv(limitarDivisor(Math.round(((clientX - r.left) / r.width) * 100)));
  };
  const comecar = (e: React.PointerEvent, el: HTMLElement) => {
    arrasto.current = e.pointerId;
    el.setPointerCapture?.(e.pointerId);
    levarPara(e.clientX);
  };
  const soltar = (e: React.PointerEvent) => {
    if (arrasto.current !== e.pointerId) return;
    arrasto.current = null;
    alca.current?.releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      ref={caixa}
      data-viz-antes-depois
      className="viz-antes-depois relative mx-auto select-none overflow-hidden rounded-[6px] bg-[#11151b] touch-pan-y"
      style={{ "--div": div, "--proporcao": proporcao, aspectRatio: proporcao } as React.CSSProperties}
      onPointerDown={(e) => {
        // Só o mouse leva a divisória de qualquer ponto; o toque na foto rola.
        if (e.pointerType !== "mouse" || e.button !== 0 || !alca.current || alca.current.contains(e.target as Node)) return;
        e.preventDefault();
        comecar(e, alca.current);
        alca.current.focus({ preventScroll: true });
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={antes} alt="Sua foto, antes" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={depois} alt="A mesma foto com o acabamento escolhido" draggable={false} data-viz-depois className="viz-depois absolute inset-0 h-full w-full object-cover" />

      <span aria-hidden className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
        {rotuloAntes}
      </span>
      <span aria-hidden className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B1F45] backdrop-blur-sm">
        {rotuloDepois}
      </span>

      {/* Camada da divisória: largura da foto, deslocada por --div. */}
      <div className="viz-divisoria pointer-events-none absolute inset-0">
        <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(11,31,69,0.18)]" />
        <button
          ref={alca}
          type="button"
          role="slider"
          aria-label={`Comparar ${rotuloAntes.toLowerCase()} e ${rotuloDepois.toLowerCase()}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={div}
          aria-valuetext={`${div}% ${rotuloAntes.toLowerCase()}`}
          onPointerDown={(e) => { if (e.button === 0) comecar(e, e.currentTarget); }}
          onPointerMove={(e) => { if (arrasto.current === e.pointerId) levarPara(e.clientX); }}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          onLostPointerCapture={() => { arrasto.current = null; }}
          onKeyDown={(e) => {
            const tecla = TECLAS[e.key];
            if (!tecla) return;
            e.preventDefault();
            setDiv((v) => passoTeclado(v, tecla));
          }}
          className="pointer-events-auto absolute left-0 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none place-items-center rounded-full bg-white text-[#0B1F45] shadow-[0_4px_16px_rgba(11,31,69,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#36A35C]"
        >
          <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
