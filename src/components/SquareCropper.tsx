"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Recorte 1:1 sem deformar a foto. O usuário reposiciona (arrastar) e amplia
// (zoom); a imagem preenche o quadrado (cover) e o resultado é exportado em
// 1080×1080. O arquivo original NÃO é alterado — o cropper apenas gera uma nova
// versão quadrada para exibição.
export default function SquareCropper({
  file,
  onCancel,
  onCropped,
  outputSize = 1080,
}: {
  file: File;
  onCancel: () => void;
  onCropped: (blob: Blob) => void | Promise<void>;
  outputSize?: number;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const S = 320; // viewport de edição (px)

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    const im = new Image();
    im.onload = () => setNat({ w: im.naturalWidth, h: im.naturalHeight });
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = nat ? Math.max(S / nat.w, S / nat.h) : 1;
  const dispScale = baseScale * zoom;
  const dispW = nat ? nat.w * dispScale : S;
  const dispH = nat ? nat.h * dispScale : S;

  // Mantém a imagem cobrindo o quadrado (sem bordas vazias).
  const clamp = useCallback((x: number, y: number) => {
    const minX = S - dispW, minY = S - dispH;
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
  }, [dispW, dispH]);

  useEffect(() => { setOffset((o) => clamp(o.x, o.y)); }, [zoom, nat, clamp]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    setOffset(clamp(drag.current.ox + dx, drag.current.oy + dy));
  }
  function onPointerUp() { drag.current = null; }

  async function confirm() {
    if (!nat || !imgUrl) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = outputSize; canvas.height = outputSize;
      const ctx = canvas.getContext("2d")!;
      const ratio = outputSize / S;
      const im = new Image();
      await new Promise<void>((res, rej) => { im.onload = () => res(); im.onerror = rej; im.src = imgUrl; });
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(im, offset.x * ratio, offset.y * ratio, dispW * ratio, dispH * ratio);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.9));
      if (blob) await onCropped(blob);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <p className="text-[#002045] font-[var(--font-noto-serif)] text-base mb-1">Ajustar enquadramento (1:1)</p>
        <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mb-3">Arraste para reposicionar e use o controle para ampliar. A foto não é distorcida.</p>
        <div
          ref={boxRef}
          className="relative mx-auto overflow-hidden bg-[#f0f0f0] cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ width: S, height: S }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {imgUrl && nat && (
            <img
              src={imgUrl}
              alt=""
              draggable={false}
              style={{ position: "absolute", left: offset.x, top: offset.y, width: dispW, height: dispH, maxWidth: "none" }}
            />
          )}
          {/* moldura */}
          <div className="pointer-events-none absolute inset-0 ring-1 ring-black/10" />
        </div>
        <div className="flex items-center gap-3 mt-4">
          <span className="text-[#74777f] text-[10px] font-bold uppercase tracking-wider">Zoom</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={confirm} disabled={busy || !nat} className="flex-1 bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50">
            {busy ? "Processando…" : "Aplicar recorte"}
          </button>
          <button onClick={onCancel} disabled={busy} className="flex-1 border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] py-2.5 hover:border-[#002045] transition-colors disabled:opacity-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
