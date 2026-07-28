"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Enquadramento da capa no formato 4:5 — a mesma proporção do card do site.
 *
 * Não gera arquivo recortado: guarda apenas ONDE olhar (foco x/y) e QUANTO
 * aproximar (zoom). O card do site aplica os mesmos três números, então o que
 * se vê aqui é o que sai lá. A imagem original continua intacta e é ela que a
 * galeria abre, na resolução cheia.
 */

export const COVER_ASPECT = "4 / 5";

/** Estilo do recorte — usado aqui e no card, para não divergirem. */
export function coverStyle(focusX: number, focusY: number, zoom: number): React.CSSProperties {
  return {
    objectFit: "cover",
    objectPosition: `${focusX * 100}% ${focusY * 100}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${focusX * 100}% ${focusY * 100}%`,
  };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export default function CoverFramer({
  url,
  focusX,
  focusY,
  zoom,
  onChange,
}: {
  url: string;
  focusX: number;
  focusY: number;
  zoom: number;
  onChange: (v: { focusX: number; focusY: number; zoom: number }) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; fx: number; fy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, fx: focusX, fy: focusY };
    setDragging(true);
  }, [focusX, focusY]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box) return;
    const r = box.getBoundingClientRect();
    // Arrastar para a direita revela o lado esquerdo da foto → foco diminui.
    const nx = clamp01(d.fx - (e.clientX - d.px) / r.width);
    const ny = clamp01(d.fy - (e.clientY - d.py) / r.height);
    onChange({ focusX: Number(nx.toFixed(3)), focusY: Number(ny.toFixed(3)), zoom });
  }, [onChange, zoom]);

  const endDrag = useCallback(() => { drag.current = null; setDragging(false); }, []);

  if (!url) {
    return (
      <div className="w-full max-w-[240px] bg-[#f0f0f0] border border-dashed border-[#d4d6da] flex items-center justify-center" style={{ aspectRatio: COVER_ASPECT }}>
        <p className="text-[#a0a3a8] text-[11px] font-[var(--font-inter)] text-center px-4">
          Escolha uma imagem da galeria como capa
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[240px]">
      <div
        ref={boxRef}
        onPointerDown={onPointerDown}
        onPointerMove={dragging ? onPointerMove : undefined}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`relative w-full overflow-hidden bg-[#f0f0f0] border border-[#e2e2e2] touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ aspectRatio: COVER_ASPECT }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Prévia da capa"
          draggable={false}
          className="absolute inset-0 w-full h-full select-none"
          style={coverStyle(focusX, focusY, zoom)}
        />
      </div>

      <label className="block mt-3">
        <span className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">
          Aproximar — {zoom.toFixed(2)}×
        </span>
        <input
          type="range" min={1} max={2} step={0.01} value={zoom}
          onChange={(e) => onChange({ focusX, focusY, zoom: Number(e.target.value) })}
          className="w-full mt-1.5 accent-[#002045]"
        />
      </label>

      <div className="flex items-center justify-between gap-2 mt-1">
        <p className="text-[#74777f] text-[11px] font-[var(--font-inter)]">
          Arraste a imagem para reposicionar.
        </p>
        <button
          type="button"
          onClick={() => onChange({ focusX: 0.5, focusY: 0.5, zoom: 1 })}
          className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors whitespace-nowrap"
        >
          Centralizar
        </button>
      </div>

      <p className="text-[#a0a3a8] text-[10px] font-[var(--font-inter)] mt-2 leading-snug">
        Prévia exata de como a capa aparecerá no site. O recorte vale só para o card —
        na galeria a foto abre inteira, no tamanho original.
      </p>
    </div>
  );
}
