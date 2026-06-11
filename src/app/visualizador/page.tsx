"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

const WA_BASE = "https://wa.me/5592988150149?text=";

type ProductLine = "Classic" | "Brilliance" | "Elegance";
type FinishKind = "matte" | "polished" | "wood";

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
const FINISH_BY_LINE: Record<ProductLine, FinishKind> = {
  Classic: "matte",
  Brilliance: "polished",
  Elegance: "wood",
};

// Read a File into a data URL for sending to the render API.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    r.readAsDataURL(file);
  });
}

export default function VisualizadorPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [lineFilter, setLineFilter] = useState<ProductLine | "Todas">("Todas");
  const [selected, setSelected] = useState<Product | null>(null);

  const [photoData, setPhotoData] = useState<string | null>(null); // wall photo data URL
  const [result, setResult] = useState<string | null>(null); // generated image data URL
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

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

  const handleFile = useCallback(async (file: File | undefined | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    setResult(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPhotoData(dataUrl);
    } catch {
      setError("Não foi possível ler essa imagem. Tente outra.");
    }
  }, []);

  const generate = useCallback(async () => {
    if (!photoData || !selected) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/visualizador/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo: photoData,
          productId: selected.id, // the server resolves the per-model prompt from this
          referenceUrl: selected.image_path, // legacy fallback during rollout
          finish: FINISH_BY_LINE[selected.linha], // legacy fallback during rollout
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.image) {
        throw new Error(json.error || "Não foi possível gerar a visualização.");
      }
      setResult(json.image);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar a visualização.");
    } finally {
      setGenerating(false);
    }
  }, [photoData, selected]);

  const changePhoto = () => {
    setPhotoData(null);
    setResult(null);
    setError(null);
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `orbital-${selected?.code ?? "visualizacao"}.png`;
    a.click();
  };

  const waMsg = selected
    ? `Olá! Usei o Visualizador e gostei do acabamento ${selected.name} (${selected.linha}). Gostaria de um orçamento.`
    : "Olá! Usei o Visualizador de revestimentos e gostaria de um orçamento.";

  const ready = !!photoData;

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
            Envie uma foto da sua parede e escolha um dos 15 acabamentos. Nossa
            inteligência aplica o revestimento na imagem — no mesmo ângulo, com a
            perspectiva e a iluminação reais do seu ambiente.
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
                  JPG ou PNG · foto de frente e bem iluminada funciona melhor
                </p>
              </div>
              {error && (
                <p className="mt-3 text-sm text-[#b42318] font-[var(--font-inter)]">{error}</p>
              )}
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
                  { n: "3", t: "Gere a visualização", d: "A IA aplica o revestimento na sua parede, respeitando ângulo e luz." },
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
            {/* Preview column */}
            <div>
              <div className="relative bg-[#11151b] rounded-sm overflow-hidden select-none aspect-[4/5] sm:aspect-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result ?? photoData!}
                  alt={result ? "Visualização gerada" : "Sua parede"}
                  className="block w-full h-auto"
                />

                {/* original / result badge */}
                <div className="pointer-events-none absolute top-3 left-3 bg-black/55 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <p className="text-white/90 text-xs font-[var(--font-inter)]">
                    {result ? "Resultado gerado" : "Foto original"}
                  </p>
                </div>

                {/* generating overlay */}
                {generating && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4 text-center px-6">
                    <div className="w-10 h-10 border-2 border-white/30 border-t-[#a1d494] rounded-full animate-spin" />
                    <p className="text-white font-[var(--font-inter)] text-sm">
                      Aplicando {selected?.name} na sua parede…
                    </p>
                    <p className="text-white/60 font-[var(--font-inter)] text-xs">
                      Isso pode levar alguns segundos.
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <p className="mt-3 text-sm text-[#b42318] font-[var(--font-inter)]">{error}</p>
              )}

              {/* Action row */}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={generate}
                  disabled={generating || !selected}
                  className="inline-flex items-center gap-2 bg-[#3b6934] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#2f5429] transition-colors disabled:opacity-50"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 3v4M3 5h4M6 17v4m-2-2h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z" />
                  </svg>
                  {generating ? "Gerando…" : result ? "Gerar novamente" : "Gerar visualização"}
                </button>

                {result && (
                  <button
                    onClick={download}
                    className="inline-flex items-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#1a365d] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Baixar
                  </button>
                )}

                <button
                  onClick={changePhoto}
                  disabled={generating}
                  className="inline-flex items-center gap-2 border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:border-[#002045] transition-colors disabled:opacity-50"
                >
                  Trocar foto
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
              </div>

              <p className="mt-3 text-[#a0a3a9] text-xs font-[var(--font-inter)]">
                A imagem gerada é uma simulação e pode diferir do resultado real.
              </p>
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
