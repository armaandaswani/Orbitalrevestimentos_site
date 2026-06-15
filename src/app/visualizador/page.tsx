"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { applicationAreaFor } from "@/lib/render-prompt";

const WA_BASE = "https://wa.me/5592988150149?text=";

// Same plate size used by the Simulador — keep these in sync.
const PLATE_W = 1.2;
const PLATE_H = 2.9;

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

// Locais de aplicação — ids/labels match the Simulador's SPACES list so the
// handoff pre-fills the same space there.
const VIZ_SPACES: { id: string; label: string }[] = [
  { id: "parede", label: "Parede" },
  { id: "teto", label: "Teto" },
  { id: "sala", label: "Sala" },
  { id: "quarto", label: "Quarto" },
  { id: "escritorio", label: "Escritório" },
  { id: "corredor", label: "Corredor" },
  { id: "banheiro", label: "Banheiro" },
  { id: "lavabo", label: "Lavabo" },
  { id: "cozinha", label: "Cozinha" },
  { id: "movel", label: "Móvel / Marcenaria" },
  { id: "porta", label: "Porta" },
  { id: "box", label: "Box / Ducha" },
];

// An ambiente the client finished visualizing — carried into the Simulador.
interface SavedAmbiente {
  key: string;
  spaceId: string | null; // null = custom text local
  local: string;
  width: number | null;
  height: number | null;
  productCode: string;
  productName: string;
  productImage: string;
  thumb: string; // generated result if available, else the wall photo
}

function platesFor(w: number, h: number): number {
  return Math.ceil(w / PLATE_W) * Math.ceil(h / PLATE_H);
}

function parseDim(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return isFinite(n) && n > 0 ? n : null;
}

// Read a File into a data URL for sending to the render API.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    r.readAsDataURL(file);
  });
}

// Build the Simulador URL with everything pre-filled. Ambientes with medidas
// come first (they become saved spaces there); at most one without medidas is
// allowed and goes last (it becomes the active space awaiting dimensions).
function buildSimuladorUrl(ambientes: SavedAmbiente[]): string {
  if (ambientes.length === 1) {
    const a = ambientes[0];
    const qp = new URLSearchParams({ src: "viz" });
    if (a.spaceId) qp.set("space", a.spaceId);
    else {
      qp.set("space", "custom");
      qp.set("customSpace", a.local);
    }
    qp.set("produto", a.productCode);
    if (a.width && a.height) {
      qp.set("w", String(a.width));
      qp.set("h", String(a.height));
    }
    return `/simulador?${qp.toString()}`;
  }
  const withDims = ambientes.filter((a) => a.width && a.height);
  const withoutDims = ambientes.filter((a) => !(a.width && a.height));
  const ordered = [...withDims, ...withoutDims];
  const qp = new URLSearchParams({ src: "viz", ms: String(ordered.length) });
  ordered.forEach((a, i) => {
    qp.set(`s${i}`, a.local);
    qp.set(`p${i}`, a.productCode);
    if (a.width && a.height) {
      qp.set(`w${i}`, String(a.width));
      qp.set(`h${i}`, String(a.height));
    }
  });
  return `/simulador?${qp.toString()}`;
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

  // Ambiente details (local + medidas) — optional, improve the render and
  // pre-fill the Simulador.
  const [spaceId, setSpaceId] = useState<string>("parede");
  const [customLocal, setCustomLocal] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  const [savedAmbientes, setSavedAmbientes] = useState<SavedAmbiente[]>([]);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

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

  const wNum = parseDim(width);
  const hNum = parseDim(height);
  const hasDims = !!(wNum && hNum);
  const plates = hasDims ? platesFor(wNum!, hNum!) : 0;

  const localLabel =
    spaceId === "__custom__"
      ? customLocal.trim()
      : VIZ_SPACES.find((s) => s.id === spaceId)?.label ?? "Parede";

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
          // Real measurements (optional) — the AI uses them to scale panels.
          wallWidthM: wNum ?? undefined,
          wallHeightM: hNum ?? undefined,
          // WHERE to apply the panel — derived from the "Local de aplicação"
          // choice. Surfaces (teto/porta/box/móvel) steer the AI; rooms/parede
          // resolve to undefined so the prompt targets the main wall by default.
          applicationArea: applicationAreaFor(spaceId, customLocal) ?? undefined,
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
  }, [photoData, selected, wNum, hNum, spaceId, customLocal]);

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

  // ── Multi-ambiente ─────────────────────────────────────────────
  const canSaveAmbiente = !!photoData && !!selected && !!localLabel;

  const saveAmbiente = () => {
    if (!canSaveAmbiente || !selected) return;
    setSavedAmbientes((prev) => [
      ...prev,
      {
        key: `amb-${Date.now()}`,
        spaceId: spaceId === "__custom__" ? null : spaceId,
        local: localLabel,
        width: wNum,
        height: hNum,
        productCode: selected.code,
        productName: selected.name,
        productImage: selected.image_path,
        thumb: result ?? photoData!,
      },
    ]);
    // Reset for the next ambiente — keep the product selection.
    setPhotoData(null);
    setResult(null);
    setError(null);
    setWidth("");
    setHeight("");
    setSpaceId("parede");
    setCustomLocal("");
    setSaveNotice("Ambiente salvo! Envie a foto do próximo ambiente.");
    setTimeout(() => setSaveNotice(null), 4000);
  };

  const removeAmbiente = (key: string) =>
    setSavedAmbientes((prev) => prev.filter((a) => a.key !== key));

  // Ambientes that go to the Simulador: saved ones + the one being edited
  // (counts as soon as a product and local are chosen, photo not required
  // for the orçamento itself).
  const currentAsAmbiente: SavedAmbiente | null =
    selected && localLabel && photoData
      ? {
          key: "__current__",
          spaceId: spaceId === "__custom__" ? null : spaceId,
          local: localLabel,
          width: wNum,
          height: hNum,
          productCode: selected.code,
          productName: selected.name,
          productImage: selected.image_path,
          thumb: result ?? photoData,
        }
      : null;

  const quoteAmbientes = [...savedAmbientes, ...(currentAsAmbiente ? [currentAsAmbiente] : [])];
  const missingDimsCount = quoteAmbientes.filter((a) => !(a.width && a.height)).length;
  const quoteReady = quoteAmbientes.length > 0 && missingDimsCount <= 1;
  const simuladorHref = quoteReady ? buildSimuladorUrl(quoteAmbientes) : "/simulador";

  const waMsg = selected
    ? `Olá! Usei o Visualizador e gostei do acabamento ${selected.name} (${selected.linha})${
        localLabel ? ` para ${localLabel.toLowerCase()}` : ""
      }${hasDims ? ` — área de ${width}m × ${height}m (${plates} placa${plates !== 1 ? "s" : ""})` : ""}. Gostaria de um orçamento.`
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
            Envie uma foto do seu ambiente, informe as medidas e escolha um dos 15
            acabamentos. Nossa inteligência aplica o revestimento na imagem — e os
            detalhes já vão preenchidos direto para o orçamento.
          </p>
        </div>
      </section>

      {/* ── Tool ─────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-12 max-w-[1280px] mx-auto">
        {saveNotice && (
          <div className="mb-6 flex items-center gap-2 bg-[#f3f8f1] border border-[#bcd8b4] px-4 py-3">
            <span className="w-5 h-5 rounded-full bg-[#3b6934] text-white text-[11px] flex items-center justify-center">✓</span>
            <p className="text-[#2f5429] text-sm font-[var(--font-inter)]">{saveNotice}</p>
          </div>
        )}

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
                  {savedAmbientes.length > 0
                    ? "Envie a foto do próximo ambiente"
                    : "Envie uma foto do seu ambiente"}
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
                  { n: "2", t: "Informe local e medidas", d: "Opcional, mas melhora o resultado — e já preenche o orçamento automaticamente." },
                  { n: "3", t: "Escolha o acabamento", d: "São 15 opções entre mármore fosco, polido e madeira." },
                  { n: "4", t: "Gere a visualização", d: "A IA aplica o revestimento respeitando ângulo, luz e as medidas reais." },
                  { n: "5", t: "Simule o orçamento", d: "Adicione quantos ambientes quiser — tudo vai pronto para o Simulador de Custo." },
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

                <button
                  onClick={saveAmbiente}
                  disabled={generating || !canSaveAmbiente}
                  className="inline-flex items-center gap-2 border border-[#3b6934] text-[#3b6934] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#f3f8f1] transition-colors disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Adicionar outro ambiente
                </button>
              </div>

              <p className="mt-3 text-[#a0a3a9] text-xs font-[var(--font-inter)]">
                A imagem gerada é uma simulação e pode diferir do resultado real.
              </p>
            </div>

            {/* Ambiente details + finish picker */}
            <div className="lg:sticky lg:top-24 space-y-4">
              <AmbientePanel
                spaceId={spaceId}
                setSpaceId={setSpaceId}
                customLocal={customLocal}
                setCustomLocal={setCustomLocal}
                width={width}
                setWidth={setWidth}
                height={height}
                setHeight={setHeight}
                hasDims={hasDims}
                plates={plates}
              />
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

        {/* ── Saved ambientes + orçamento handoff ───────────── */}
        {(savedAmbientes.length > 0 || quoteAmbientes.length > 0) && (
          <div className="mt-10 border border-[#e2e2e2] rounded-sm p-5 sm:p-6 bg-[#fbfbfa]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#002045]">
                Seus ambientes ({quoteAmbientes.length})
              </p>
            </div>

            {quoteAmbientes.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                {quoteAmbientes.map((a) => {
                  const isCurrent = a.key === "__current__";
                  const ambPlates = a.width && a.height ? platesFor(a.width, a.height) : null;
                  return (
                    <div key={a.key} className="relative bg-white border border-[#e2e2e2] rounded-sm overflow-hidden">
                      <div className="relative" style={{ aspectRatio: "4 / 3" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.thumb} alt={a.local} className="absolute inset-0 w-full h-full object-cover" />
                        {isCurrent && (
                          <span className="absolute top-1.5 left-1.5 bg-[#002045] text-white text-[9px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-2 py-0.5 rounded-full">
                            Em edição
                          </span>
                        )}
                        {!isCurrent && (
                          <button
                            onClick={() => removeAmbiente(a.key)}
                            title="Remover ambiente"
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 text-white text-xs flex items-center justify-center hover:bg-[#b42318] transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-[#002045] text-xs font-semibold font-[var(--font-inter)] truncate">{a.local}</p>
                        <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] truncate">{a.productName}</p>
                        <p className="text-[#a0a3a9] text-[10px] font-[var(--font-inter)]">
                          {a.width && a.height
                            ? `${a.width}m × ${a.height}m · ${ambPlates} placa${ambPlates !== 1 ? "s" : ""}`
                            : "Sem medidas — informe no orçamento"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {quoteReady ? (
                <Link
                  href={simuladorHref}
                  className="inline-flex items-center justify-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-[#1a365d] transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <path d="M8 6h8M8 10h8M8 14h4" />
                  </svg>
                  Simular orçamento com {quoteAmbientes.length === 1 ? "este ambiente" : `estes ${quoteAmbientes.length} ambientes`}
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center gap-2 bg-[#e8e8e6] text-[#a0a3a9] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 cursor-not-allowed">
                  Simular orçamento
                </span>
              )}
              <p className="text-[#74777f] text-xs font-[var(--font-inter)] leading-relaxed">
                {quoteReady
                  ? "Local, medidas e acabamento de cada ambiente já vão preenchidos — sem digitar nada de novo."
                  : missingDimsCount > 1
                  ? "Informe as medidas (largura × altura) dos ambientes para levar tudo preenchido ao orçamento."
                  : "Escolha um acabamento e um local para simular o orçamento."}
              </p>
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
              href={`${WA_BASE}${encodeURIComponent(waMsg)}`}
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

// ── Ambiente details panel ───────────────────────────────────────
function AmbientePanel({
  spaceId,
  setSpaceId,
  customLocal,
  setCustomLocal,
  width,
  setWidth,
  height,
  setHeight,
  hasDims,
  plates,
}: {
  spaceId: string;
  setSpaceId: (v: string) => void;
  customLocal: string;
  setCustomLocal: (v: string) => void;
  width: string;
  setWidth: (v: string) => void;
  height: string;
  setHeight: (v: string) => void;
  hasDims: boolean;
  plates: number;
}) {
  const sanitizeDim = (v: string) => v.replace(/[^0-9.,]/g, "").replace(",", ".");
  return (
    <div className="bg-white border border-[#e2e2e2] rounded-sm p-4">
      <p className="text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#002045] mb-3">
        Ambiente
      </p>

      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">
        Local de aplicação
      </label>
      <select
        value={spaceId}
        onChange={(e) => setSpaceId(e.target.value)}
        className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] bg-white focus:outline-none focus:border-[#002045] transition-colors mb-3"
      >
        {VIZ_SPACES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
        <option value="__custom__">Outro…</option>
      </select>

      {spaceId === "__custom__" && (
        <input
          type="text"
          value={customLocal}
          onChange={(e) => setCustomLocal(e.target.value)}
          placeholder="ex: Hall de entrada"
          className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors mb-3"
        />
      )}

      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">
        Medidas da área <span className="normal-case font-normal">(opcional)</span>
      </label>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          type="text"
          inputMode="decimal"
          value={width}
          onChange={(e) => setWidth(sanitizeDim(e.target.value))}
          placeholder="Largura (m)"
          className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors"
        />
        <input
          type="text"
          inputMode="decimal"
          value={height}
          onChange={(e) => setHeight(sanitizeDim(e.target.value))}
          placeholder="Altura (m)"
          className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] transition-colors"
        />
      </div>

      {hasDims ? (
        <p className="text-[#2f5429] text-xs font-[var(--font-inter)] bg-[#f3f8f1] border border-[#dcebd7] px-3 py-2">
          ≈ <strong>{plates} placa{plates !== 1 ? "s" : ""}</strong> de 1,2m × 2,9m ·
          medidas vão direto para o orçamento
        </p>
      ) : (
        <p className="text-[#a0a3a9] text-[11px] font-[var(--font-inter)] leading-relaxed">
          Com as medidas reais, a IA aplica as placas na escala certa e o
          orçamento já sai calculado.
        </p>
      )}
    </div>
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
        <div className="grid grid-cols-3 gap-x-2 gap-y-3 max-h-[440px] overflow-y-auto pr-1 pb-1">
          {filtered.map((p) => {
            const active = selected?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                title={p.name}
                className="group text-left"
              >
                <span
                  style={{ aspectRatio: "1 / 1" }}
                  className={`relative block w-full overflow-hidden rounded-sm border-2 transition-colors ${
                    active ? "border-[#3b6934]" : "border-[#e8e8e6] group-hover:border-[#86a0cd]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image_path}
                    alt={p.name}
                    className="absolute inset-0 w-full h-full object-cover scale-[1.35]"
                    loading="lazy"
                  />
                  {active && (
                    <span className="absolute top-1 right-1 w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full bg-[#3b6934] text-white text-[10px] flex items-center justify-center shadow">
                      ✓
                    </span>
                  )}
                </span>
                <span
                  className={`mt-1 block text-[11px] leading-tight font-[var(--font-inter)] truncate ${
                    active ? "text-[#002045] font-semibold" : "text-[#43474e]"
                  }`}
                >
                  {p.name}
                </span>
                <span className="block text-[10px] text-[#a0a3a9] font-[var(--font-inter)]">
                  R$ {p.price}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
