"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

const WA_BASE = "https://wa.me/5592988150149?text=";

type ProductLine = "Classic" | "Brilliance" | "Elegance";

interface Product {
  id: string;
  code: string;
  name: string;
  linha: ProductLine;
  finish: string;
  price: number;
  image_path: string;
  is_active: boolean;
  sort_order: number;
}

const LINE_ORDER: ProductLine[] = ["Classic", "Brilliance", "Elegance"];
const LINE_LABEL: Record<ProductLine, string> = {
  Classic: "Classic · Mármore Fosco",
  Brilliance: "Brilliance · Mármore Polido",
  Elegance: "Elegance · Madeira",
};

const MAX_CANVAS = 1400; // longest side, internal resolution cap

export default function VisualizadorPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [lineFilter, setLineFilter] = useState<ProductLine | "Todas">("Todas");
  const [selected, setSelected] = useState<Product | null>(null);

  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [hasPainted, setHasPainted] = useState(false);

  const [brush, setBrush] = useState(70);
  const [strength, setStrength] = useState(0.85);
  const [mode, setMode] = useState<"paint" | "erase">("paint");

  const [cursor, setCursor] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  const [downloading, setDownloading] = useState(false);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const fxRef = useRef<HTMLCanvasElement | null>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const patternRef = useRef<CanvasPattern | null>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // ── Load products ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Product[]) => {
        if (cancelled || !Array.isArray(data)) return;
        const sorted = [...data].sort(
          (a, b) =>
            LINE_ORDER.indexOf(a.linha) - LINE_ORDER.indexOf(b.linha) ||
            (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );
        setProducts(sorted);
        if (sorted.length) setSelected(sorted[0]);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingProducts(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered =
    lineFilter === "Todas" ? products : products.filter((p) => p.linha === lineFilter);

  // ── Composite render (throttled via rAF) ───────────────────────
  const renderComposite = useCallback(() => {
    const cvs = canvasRef.current;
    const photo = photoRef.current;
    const mask = maskRef.current;
    const fx = fxRef.current;
    if (!cvs || !photo || !mask || !fx) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const w = cvs.width;
    const h = cvs.height;

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(photo, 0, 0, w, h);

    const pattern = patternRef.current;
    if (pattern) {
      const fctx = fx.getContext("2d");
      if (fctx) {
        fctx.globalCompositeOperation = "source-over";
        fctx.globalAlpha = 1;
        fctx.clearRect(0, 0, w, h);
        fctx.fillStyle = pattern;
        fctx.fillRect(0, 0, w, h);
        // clip the finish to the painted mask
        fctx.globalCompositeOperation = "destination-in";
        fctx.drawImage(mask, 0, 0);
        fctx.globalCompositeOperation = "source-over";

        // multiply preserves the wall's real lighting & shadows
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = strength;
        ctx.drawImage(fx, 0, 0);
        // light normal pass so color reads even on dark walls
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = strength * 0.3;
        ctx.drawImage(fx, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
    }
  }, [strength]);

  const scheduleRender = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      renderComposite();
    });
  }, [renderComposite]);

  // recomposite when strength changes
  useEffect(() => {
    if (ready) scheduleRender();
  }, [strength, ready, scheduleRender]);

  // ── Load finish texture into a pattern ─────────────────────────
  useEffect(() => {
    if (!selected) {
      patternRef.current = null;
      if (ready) scheduleRender();
      return;
    }
    const cvs = canvasRef.current;
    if (!cvs) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      const pat = ctx.createPattern(img, "repeat");
      if (pat) {
        // scale the texture so it reads at a believable size on the wall
        const target = cvs.width * 0.55; // ~ width of one swatch on the wall
        const scale = target / img.width;
        if (typeof DOMMatrix !== "undefined" && pat.setTransform) {
          pat.setTransform(new DOMMatrix([scale, 0, 0, scale, 0, 0]));
        }
        patternRef.current = pat;
        scheduleRender();
      }
    };
    img.src = selected.image_path;
  }, [selected, ready, scheduleRender]);

  // ── Photo upload ───────────────────────────────────────────────
  const [photoNonce, setPhotoNonce] = useState(0);
  const handleFile = useCallback((file: File | undefined | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      photoRef.current = img;
      historyRef.current = [];
      patternRef.current = null;
      setCanUndo(false);
      setHasPainted(false);
      setPhotoNonce((n) => n + 1);
      setReady(true); // mounts the editor + canvas; sizing happens in the effect below
    };
    img.src = url;
    setPhotoSrc(url);
  }, []);

  // Size canvases + initial render once the editor canvas is mounted
  useEffect(() => {
    if (!ready) return;
    const img = photoRef.current;
    const cvs = canvasRef.current;
    const mask = maskRef.current;
    const fx = fxRef.current;
    if (!img || !cvs || !mask || !fx) return;
    const maxSide = Math.max(img.width, img.height);
    const scale = Math.min(1, MAX_CANVAS / maxSide);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    cvs.width = w;
    cvs.height = h;
    mask.width = w;
    mask.height = h;
    fx.width = w;
    fx.height = h;
    mask.getContext("2d")?.clearRect(0, 0, w, h);
    renderComposite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, photoNonce]);

  // ── Pointer → canvas coords ────────────────────────────────────
  const toCanvasPt = (clientX: number, clientY: number) => {
    const cvs = canvasRef.current!;
    const rect = cvs.getBoundingClientRect();
    const sx = cvs.width / rect.width;
    const sy = cvs.height / rect.height;
    return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
  };

  const pushHistory = () => {
    const mask = maskRef.current;
    if (!mask) return;
    const mctx = mask.getContext("2d");
    if (!mctx) return;
    try {
      const snap = mctx.getImageData(0, 0, mask.width, mask.height);
      historyRef.current.push(snap);
      if (historyRef.current.length > 14) historyRef.current.shift();
      setCanUndo(true);
    } catch {
      /* ignore */
    }
  };

  const paintSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const mask = maskRef.current;
    if (!mask) return;
    const mctx = mask.getContext("2d");
    if (!mctx) return;
    mctx.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
    mctx.strokeStyle = "rgba(255,255,255,1)";
    mctx.fillStyle = "rgba(255,255,255,1)";
    mctx.lineCap = "round";
    mctx.lineJoin = "round";
    mctx.lineWidth = brush;
    mctx.beginPath();
    mctx.moveTo(from.x, from.y);
    mctx.lineTo(to.x, to.y);
    mctx.stroke();
    // dot for single taps
    mctx.beginPath();
    mctx.arc(to.x, to.y, brush / 2, 0, Math.PI * 2);
    mctx.fill();
    mctx.globalCompositeOperation = "source-over";
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pushHistory();
    drawingRef.current = true;
    const pt = toCanvasPt(e.clientX, e.clientY);
    lastPtRef.current = pt;
    paintSegment(pt, pt);
    if (mode === "paint") setHasPainted(true);
    scheduleRender();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top, show: true });
    }
    if (!drawingRef.current || !ready) return;
    const pt = toCanvasPt(e.clientX, e.clientY);
    const last = lastPtRef.current ?? pt;
    paintSegment(last, pt);
    lastPtRef.current = pt;
    scheduleRender();
  };

  const endStroke = () => {
    drawingRef.current = false;
    lastPtRef.current = null;
  };

  const undo = () => {
    const mask = maskRef.current;
    const snap = historyRef.current.pop();
    if (!mask || !snap) return;
    const mctx = mask.getContext("2d");
    mctx?.putImageData(snap, 0, 0);
    setCanUndo(historyRef.current.length > 0);
    scheduleRender();
  };

  const clearMask = () => {
    const mask = maskRef.current;
    if (!mask) return;
    pushHistory();
    mask.getContext("2d")?.clearRect(0, 0, mask.width, mask.height);
    setHasPainted(false);
    scheduleRender();
  };

  const changePhoto = () => {
    setReady(false);
    setHasPainted(false);
    historyRef.current = [];
    setCanUndo(false);
    if (photoSrc) URL.revokeObjectURL(photoSrc);
    setPhotoSrc(null);
  };

  const download = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    setDownloading(true);
    renderComposite();
    requestAnimationFrame(() => {
      cvs.toBlob((blob) => {
        if (blob) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `orbital-${selected?.code ?? "visualizacao"}.png`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        }
        setDownloading(false);
      }, "image/png");
    });
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const waMsg = selected
    ? `Olá! Usei o Visualizador e gostei do acabamento ${selected.name} (${selected.linha}). Gostaria de um orçamento.`
    : "Olá! Usei o Visualizador de revestimentos e gostaria de um orçamento.";

  return (
    <main className="bg-white">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative bg-[#002045] pt-32 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="relative max-w-[1100px] mx-auto text-center">
          <p className="text-[#86a0cd] text-[11px] tracking-[0.25em] uppercase font-bold font-[var(--font-inter)] mb-4">
            Visualizador Orbital
          </p>
          <h1 className="text-white font-[var(--font-noto-serif)] text-4xl sm:text-5xl leading-tight mb-5">
            Veja o acabamento na <span className="text-[#a1d494]">sua parede</span>
          </h1>
          <p className="text-white/70 font-[var(--font-inter)] text-base sm:text-lg max-w-[640px] mx-auto leading-relaxed">
            Envie uma foto da parede, escolha um dos 15 acabamentos e pinte por cima
            para ver como o revestimento PFB ficaria — antes mesmo de comprar.
          </p>
        </div>
      </section>

      {/* ── Tool ─────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-12 max-w-[1280px] mx-auto">
        {!ready ? (
          // Upload state
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                className={`cursor-pointer border-2 border-dashed rounded-sm flex flex-col items-center justify-center text-center px-6 py-20 transition-colors ${
                  dragOver
                    ? "border-[#3b6934] bg-[#f3f8f1]"
                    : "border-[#cdd3dd] bg-[#f9f9f7] hover:border-[#002045]"
                }`}
              >
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="1.3" className="mb-4">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <path d="M17 8l-5-5-5 5" />
                  <path d="M12 3v12" />
                </svg>
                <p className="font-[var(--font-noto-serif)] text-[#002045] text-xl mb-1">
                  Envie uma foto da sua parede
                </p>
                <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
                  Clique para escolher ou arraste a imagem aqui
                </p>
                <p className="text-[#a0a3a9] text-xs font-[var(--font-inter)] mt-3">
                  JPG ou PNG · a foto fica só no seu navegador
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            <div>
              <p className="text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#3b6934] mb-4">
                Como funciona
              </p>
              <ol className="space-y-5">
                {[
                  { n: "1", t: "Envie a foto", d: "Use uma foto bem iluminada e de frente para a parede." },
                  { n: "2", t: "Escolha o acabamento", d: "São 15 opções entre mármore fosco, polido e madeira." },
                  { n: "3", t: "Pinte sobre a parede", d: "O acabamento aparece com a iluminação e as sombras reais da sua foto." },
                  { n: "4", t: "Salve e compartilhe", d: "Baixe a imagem ou peça um orçamento no WhatsApp." },
                ].map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#002045] text-white text-sm font-bold font-[var(--font-inter)] flex items-center justify-center">
                      {s.n}
                    </span>
                    <div>
                      <p className="font-[var(--font-inter)] font-semibold text-[#002045] text-sm">{s.t}</p>
                      <p className="font-[var(--font-inter)] text-[#74777f] text-sm leading-relaxed">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          // Editor state
          <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
            {/* Canvas + toolbar */}
            <div>
              <div
                className="relative bg-[#11151b] rounded-sm overflow-hidden select-none"
                onMouseLeave={() => setCursor((c) => ({ ...c, show: false }))}
              >
                <canvas
                  ref={canvasRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endStroke}
                  onPointerCancel={endStroke}
                  className="block w-full h-auto touch-none"
                  style={{ cursor: "none" }}
                />
                {/* brush cursor ring */}
                {cursor.show && (
                  <div
                    className="pointer-events-none absolute rounded-full border-2"
                    style={{
                      left: cursor.x,
                      top: cursor.y,
                      transform: "translate(-50%, -50%)",
                      boxShadow: `0 0 0 1px rgba(0,0,0,0.5)`,
                      borderColor: mode === "erase" ? "#f87171" : "#a1d494",
                      // ring scaled by display/canvas ratio
                      ...(() => {
                        const cvs = canvasRef.current;
                        const rect = cvs?.getBoundingClientRect();
                        const ratio = cvs && rect ? rect.width / cvs.width : 1;
                        const d = brush * ratio;
                        return { width: d, height: d };
                      })(),
                    }}
                  />
                )}
                {!hasPainted && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-white/90 text-center text-sm font-[var(--font-inter)]">
                      ✏️ Pinte sobre a parede para aplicar o acabamento
                    </p>
                  </div>
                )}
              </div>

              {/* Toolbar */}
              <div className="mt-4 bg-[#f9f9f7] border border-[#e2e2e2] rounded-sm p-4 flex flex-wrap items-center gap-x-6 gap-y-4">
                <div className="flex items-center gap-1 bg-white border border-[#e2e2e2] rounded-sm p-1">
                  <button
                    onClick={() => setMode("paint")}
                    className={`px-3 py-1.5 text-xs font-bold font-[var(--font-inter)] tracking-wide rounded-sm transition-colors ${
                      mode === "paint" ? "bg-[#002045] text-white" : "text-[#74777f] hover:text-[#002045]"
                    }`}
                  >
                    Pincel
                  </button>
                  <button
                    onClick={() => setMode("erase")}
                    className={`px-3 py-1.5 text-xs font-bold font-[var(--font-inter)] tracking-wide rounded-sm transition-colors ${
                      mode === "erase" ? "bg-[#002045] text-white" : "text-[#74777f] hover:text-[#002045]"
                    }`}
                  >
                    Borracha
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs font-[var(--font-inter)] text-[#43474e]">
                  <span className="font-semibold whitespace-nowrap">Pincel</span>
                  <input
                    type="range"
                    min={15}
                    max={220}
                    value={brush}
                    onChange={(e) => setBrush(Number(e.target.value))}
                    className="w-28 accent-[#002045]"
                  />
                </label>

                <label className="flex items-center gap-2 text-xs font-[var(--font-inter)] text-[#43474e]">
                  <span className="font-semibold whitespace-nowrap">Intensidade</span>
                  <input
                    type="range"
                    min={0.3}
                    max={1}
                    step={0.05}
                    value={strength}
                    onChange={(e) => setStrength(Number(e.target.value))}
                    className="w-28 accent-[#002045]"
                  />
                </label>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="px-3 py-1.5 text-xs font-bold font-[var(--font-inter)] tracking-wide border border-[#e2e2e2] rounded-sm text-[#43474e] hover:border-[#002045] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Desfazer
                  </button>
                  <button
                    onClick={clearMask}
                    className="px-3 py-1.5 text-xs font-bold font-[var(--font-inter)] tracking-wide border border-[#e2e2e2] rounded-sm text-[#43474e] hover:border-[#002045]"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={changePhoto}
                    className="px-3 py-1.5 text-xs font-bold font-[var(--font-inter)] tracking-wide border border-[#e2e2e2] rounded-sm text-[#43474e] hover:border-[#002045]"
                  >
                    Trocar foto
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={download}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  {downloading ? "Salvando..." : "Baixar imagem"}
                </button>
                <a
                  href={`${WA_BASE}${encodeURIComponent(waMsg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25d366] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:brightness-95 transition"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 1112 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8.9-.3.2-.5 0a6.5 6.5 0 01-1.9-1.2 7.3 7.3 0 01-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 00-.7.3 2.9 2.9 0 00-.9 2.2 5.1 5.1 0 001.1 2.7 11.6 11.6 0 004.4 3.9c2.6 1 2.6.7 3.1.7a2.6 2.6 0 001.7-1.2 2.1 2.1 0 00.2-1.2c-.1-.1-.3-.2-.5-.3z" />
                  </svg>
                  Pedir orçamento
                </a>
                <Link
                  href="/simulador"
                  className="inline-flex items-center gap-2 border border-[#002045] text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#002045] hover:text-white transition-colors"
                >
                  Calcular preço
                </Link>
              </div>
            </div>

            {/* Finish picker */}
            <div className="lg:sticky lg:top-24">
              <FinishPicker
                filtered={filtered}
                lineFilter={lineFilter}
                setLineFilter={setLineFilter}
                selected={selected}
                setSelected={setSelected}
                loading={loadingProducts}
              />
            </div>
          </div>
        )}
      </section>

      {/* offscreen canvases */}
      <canvas ref={maskRef} className="hidden" />
      <canvas ref={fxRef} className="hidden" />

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="bg-[#002045] px-6 py-16">
        <div className="max-w-[820px] mx-auto text-center">
          <h2 className="text-white font-[var(--font-noto-serif)] text-3xl mb-4">
            Gostou do resultado?
          </h2>
          <p className="text-white/70 font-[var(--font-inter)] mb-8 leading-relaxed">
            Fale com a Orbital e transforme a simulação em projeto real. Pronta-entrega em Manaus,
            instalação sem obra em poucas horas.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href={`${WA_BASE}${encodeURIComponent("Olá! Usei o Visualizador da Orbital e quero falar sobre um projeto.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25d366] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:brightness-95 transition"
            >
              Falar no WhatsApp
            </a>
            <Link
              href="/produtos"
              className="border border-white/40 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-white hover:text-[#002045] transition-colors"
            >
              Ver acabamentos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

// ── Finish picker (shared) ───────────────────────────────────────
function FinishPicker({
  filtered,
  lineFilter,
  setLineFilter,
  selected,
  setSelected,
  loading,
}: {
  filtered: Product[];
  lineFilter: ProductLine | "Todas";
  setLineFilter: (l: ProductLine | "Todas") => void;
  selected: Product | null;
  setSelected: (p: Product) => void;
  loading: boolean;
}) {
  return (
    <div className="bg-white border border-[#e2e2e2] rounded-sm p-4">
      <p className="text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#002045] mb-3">
        Acabamento
      </p>

      {/* line filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(["Todas", ...LINE_ORDER] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLineFilter(l)}
            className={`px-2.5 py-1 text-[11px] font-semibold font-[var(--font-inter)] rounded-full transition-colors ${
              lineFilter === l
                ? "bg-[#002045] text-white"
                : "bg-[#f0f0ee] text-[#74777f] hover:text-[#002045]"
            }`}
          >
            {l === "Todas" ? "Todas" : l}
          </button>
        ))}
      </div>

      {selected && (
        <div className="mb-3 pb-3 border-b border-[#eee]">
          <p className="font-[var(--font-noto-serif)] text-[#002045] text-base leading-tight">
            {selected.name}
          </p>
          <p className="text-[#74777f] text-xs font-[var(--font-inter)]">
            {LINE_LABEL[selected.linha]} · R$ {selected.price}/placa
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)] py-6 text-center">Carregando…</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map((p) => {
            const active = selected?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                title={p.name}
                className={`group relative aspect-square overflow-hidden rounded-sm border-2 transition-all ${
                  active ? "border-[#3b6934] ring-2 ring-[#a1d494]" : "border-transparent hover:border-[#86a0cd]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image_path}
                  alt={p.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {active && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#3b6934] text-white text-[9px] flex items-center justify-center">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
