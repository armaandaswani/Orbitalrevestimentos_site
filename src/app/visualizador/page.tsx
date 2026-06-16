"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { applicationAreaFor } from "@/lib/render-prompt";

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

// Distinct colors so each drawn zone is visually separable on the photo.
const ZONE_COLORS = ["#3b6934", "#b4791e", "#1e5fb4", "#a83279", "#2a9d8f", "#9b2226"];

type Rect = { x: number; y: number; w: number; h: number };

// One application zone the client defined on the current photo: a target
// surface + an assigned panel + (optionally) a drawn rectangle, dims and a
// free-text instruction.
interface Zone {
  id: string;
  label: string; // "Área 1" by default, editable
  surface: string; // VIZ_SPACES id or "__custom__"
  customLabel: string; // free text when surface === "__custom__"
  productId: string; // assigned panel (Product.id)
  rect: Rect | null; // normalized 0..1, optional
  instruction: string; // optional free-text "where" instruction
  width: string; // optional dims (meters, as typed)
  height: string;
}

// An ambiente carried into the Simulador (one per zone). `thumb` is the photo's
// final multi-zone render, shared across that photo's zones.
interface SavedAmbiente {
  key: string;
  spaceId: string | null; // null = custom text local
  local: string;
  width: number | null;
  height: number | null;
  productCode: string;
  productName: string;
  productImage: string;
  thumb: string;
  isRender: boolean;
}

function parseDim(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return isFinite(n) && n > 0 ? n : null;
}

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

type Step = "upload" | "zones" | "review" | "result";
const STEP_LABELS: { id: Step; n: string; label: string }[] = [
  { id: "upload", n: "1", label: "Foto" },
  { id: "zones", n: "2", label: "Áreas e modelos" },
  { id: "review", n: "3", label: "Revisão" },
  { id: "result", n: "4", label: "Resultado" },
];

export default function VisualizadorPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [step, setStep] = useState<Step>("upload");
  const [photoData, setPhotoData] = useState<string | null>(null);

  const [zones, setZones] = useState<Zone[]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ i: number; total: number; label: string } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [savedAmbientes, setSavedAmbientes] = useState<SavedAmbiente[]>([]);
  const [proceeding, setProceeding] = useState(false);

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
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingProducts(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const productById = useCallback(
    (id: string) => products.find((p) => p.id === id) ?? null,
    [products]
  );

  // ── Photo upload ───────────────────────────────────────────────
  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      setError(null);
      try {
        const dataUrl = await fileToDataUrl(file);
        setPhotoData(dataUrl);
        setResult(null);
        // Seed a first zone so the client immediately has something to assign.
        const firstProduct = products[0];
        const z: Zone = {
          id: `z-${Date.now()}`,
          label: "Área 1",
          surface: "parede",
          customLabel: "",
          productId: firstProduct?.id ?? "",
          rect: null,
          instruction: "",
          width: "",
          height: "",
        };
        setZones([z]);
        setActiveZoneId(z.id);
        setStep("zones");
      } catch {
        setError("Não foi possível ler essa imagem. Tente outra.");
      }
    },
    [products]
  );

  // ── Zone mutations ─────────────────────────────────────────────
  const addZone = useCallback(() => {
    const n = zones.length + 1;
    const z: Zone = {
      id: `z-${Date.now()}`,
      label: `Área ${n}`,
      surface: "parede",
      customLabel: "",
      productId: products[0]?.id ?? "",
      rect: null,
      instruction: "",
      width: "",
      height: "",
    };
    setZones((prev) => [...prev, z]);
    setActiveZoneId(z.id);
  }, [zones.length, products]);

  const updateZone = useCallback((id: string, patch: Partial<Zone>) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }, []);

  const removeZone = useCallback(
    (id: string) => {
      setZones((prev) => prev.filter((z) => z.id !== id));
      setActiveZoneId((cur) => (cur === id ? null : cur));
    },
    []
  );

  // ── Surface detection (best-effort) ────────────────────────────
  const [detecting, setDetecting] = useState(false);
  const detectSurface = useCallback(
    async (zoneId: string, point: { x: number; y: number }) => {
      if (!photoData) return;
      const z = zones.find((zz) => zz.id === zoneId);
      setDetecting(true);
      try {
        const res = await fetch("/api/visualizador/detect-surface", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photo: photoData,
            point,
            hint: z ? VIZ_SPACES.find((s) => s.id === z.surface)?.label ?? z.customLabel : null,
          }),
        });
        const json = await res.json();
        if (res.ok && json.rect) {
          updateZone(zoneId, { rect: json.rect });
        } else {
          // Fallback: a sensible default box around the clicked point.
          updateZone(zoneId, {
            rect: {
              x: Math.max(0, point.x - 0.2),
              y: Math.max(0, point.y - 0.25),
              w: 0.4,
              h: 0.5,
            },
          });
        }
      } catch {
        updateZone(zoneId, {
          rect: { x: Math.max(0, point.x - 0.2), y: Math.max(0, point.y - 0.25), w: 0.4, h: 0.5 },
        });
      } finally {
        setDetecting(false);
      }
    },
    [photoData, zones, updateZone]
  );

  // ── Generation (iterative, one zone at a time) ─────────────────
  const zonesReady = zones.filter((z) => z.productId);
  const canReview = !!photoData && zonesReady.length > 0;

  const areaForZone = (z: Zone): string | undefined => {
    const txt = z.instruction.trim();
    if (txt) return txt;
    return applicationAreaFor(z.surface, z.customLabel) ?? undefined;
  };

  const generate = useCallback(async () => {
    if (!photoData) return;
    const zs = zones.filter((z) => z.productId);
    if (zs.length === 0) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    setStep("result");
    let current = photoData;
    try {
      for (let i = 0; i < zs.length; i++) {
        const z = zs[i];
        const prod = productById(z.productId);
        if (!prod) continue;
        setProgress({ i: i + 1, total: zs.length, label: z.label });
        const res = await fetch("/api/visualizador/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photo: current,
            productId: prod.id,
            referenceUrl: prod.image_path,
            finish: FINISH_BY_LINE[prod.linha],
            wallWidthM: parseDim(z.width) ?? undefined,
            wallHeightM: parseDim(z.height) ?? undefined,
            applicationArea: areaForZone(z),
            rect: z.rect ?? undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.image) {
          throw new Error(json.error || "Não foi possível gerar a visualização.");
        }
        current = json.image;
      }
      setResult(current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar a visualização.");
    } finally {
      setGenerating(false);
      setProgress(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoData, zones, productById]);

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `orbital-visualizacao.png`;
    a.click();
  };

  // Map the current photo's zones into ambientes (sharing the final render thumb).
  const currentAmbientes = useCallback(
    (thumb: string, isRender: boolean): SavedAmbiente[] =>
      zones
        .filter((z) => z.productId)
        .map((z) => {
          const prod = productById(z.productId);
          const local =
            z.surface === "__custom__"
              ? z.customLabel.trim() || "Área"
              : VIZ_SPACES.find((s) => s.id === z.surface)?.label ?? "Parede";
          return {
            key: `${z.id}-${Date.now()}`,
            spaceId: z.surface === "__custom__" ? null : z.surface,
            local,
            width: parseDim(z.width),
            height: parseDim(z.height),
            productCode: prod?.code ?? "",
            productName: prod?.name ?? "",
            productImage: prod?.image_path ?? "",
            thumb,
            isRender,
          };
        }),
    [zones, productById]
  );

  // Start a fresh photo, banking the current one's zones as ambientes.
  const addAnotherPhoto = () => {
    if (result) setSavedAmbientes((prev) => [...prev, ...currentAmbientes(result, true)]);
    setPhotoData(null);
    setZones([]);
    setActiveZoneId(null);
    setResult(null);
    setError(null);
    setStep("upload");
  };

  // All ambientes for the orçamento: banked ones + the current photo's zones.
  const allAmbientes = useMemo(() => {
    const current = result ? currentAmbientes(result, true) : [];
    return [...savedAmbientes, ...current];
  }, [savedAmbientes, result, currentAmbientes]);

  const missingDimsCount = allAmbientes.filter((a) => !(a.width && a.height)).length;
  const quoteReady = allAmbientes.length > 0 && missingDimsCount <= 1;
  const simuladorHref = quoteReady ? buildSimuladorUrl(allAmbientes) : "/simulador";

  // "Simular orçamento": persist the unique renders, then hand off.
  const goToSimulador = useCallback(async () => {
    if (proceeding) return;
    let url = simuladorHref;
    const seen = new Set<string>();
    const renders = allAmbientes.filter((a) => {
      if (!a.isRender || !a.thumb.startsWith("data:") || seen.has(a.thumb)) return false;
      seen.add(a.thumb);
      return true;
    });
    if (renders.length > 0) {
      setProceeding(true);
      let renderId: string | undefined;
      for (const a of renders) {
        try {
          const res = await fetch("/api/visualizador/save-render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: renderId,
              image: a.thumb,
              local: a.local,
              productName: a.productName,
              productCode: a.productCode,
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as { id?: string };
            if (data.id) renderId = data.id;
          }
        } catch {
          /* non-fatal */
        }
      }
      if (renderId) url += `${url.includes("?") ? "&" : "?"}viz_render=${encodeURIComponent(renderId)}`;
    }
    window.location.assign(url);
  }, [proceeding, simuladorHref, allAmbientes]);

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
            Veja os acabamentos no <span className="text-[#a1d494]">seu ambiente</span>
          </h1>
          <p className="text-white/70 font-[var(--font-inter)] text-base sm:text-lg max-w-[640px] mx-auto leading-relaxed">
            Envie uma foto, marque as áreas (parede, teto, móvel…) e escolha um
            acabamento para cada uma. A IA aplica cada modelo na área certa,
            respeitando o tamanho real das placas.
          </p>
        </div>
      </section>

      {/* ── Stepper ──────────────────────────────────────────── */}
      <Stepper step={step} />

      {/* ── Tool ─────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-12 max-w-[1280px] mx-auto">
        {step === "upload" && (
          <UploadStep
            fileInputRef={fileInputRef}
            dragOver={dragOver}
            setDragOver={setDragOver}
            handleFile={handleFile}
            error={error}
            hasBanked={savedAmbientes.length > 0}
          />
        )}

        {step === "zones" && photoData && (
          <ZonesStep
            photoData={photoData}
            zones={zones}
            activeZoneId={activeZoneId}
            setActiveZoneId={setActiveZoneId}
            addZone={addZone}
            updateZone={updateZone}
            removeZone={removeZone}
            detectSurface={detectSurface}
            detecting={detecting}
            products={products}
            loadingProducts={loadingProducts}
            productById={productById}
            canReview={canReview}
            onBack={() => setStep("upload")}
            onReview={() => setStep("review")}
          />
        )}

        {step === "review" && photoData && (
          <ReviewStep
            photoData={photoData}
            zones={zones.filter((z) => z.productId)}
            productById={productById}
            onBack={() => setStep("zones")}
            onGenerate={generate}
          />
        )}

        {step === "result" && (
          <ResultStep
            photoData={photoData}
            result={result}
            generating={generating}
            progress={progress}
            error={error}
            onRetry={() => setStep("zones")}
            onRegenerate={generate}
            onDownload={download}
            onAddPhoto={addAnotherPhoto}
          />
        )}

        {/* ── Orçamento handoff ─────────────────────────────── */}
        {allAmbientes.length > 0 && (step === "result" || savedAmbientes.length > 0) && (
          <div className="mt-10 border border-[#e2e2e2] rounded-sm p-5 sm:p-6 bg-[#fbfbfa]">
            <p className="text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#002045] mb-4">
              Seu orçamento ({allAmbientes.length} {allAmbientes.length === 1 ? "área" : "áreas"})
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {quoteReady ? (
                <button
                  type="button"
                  onClick={goToSimulador}
                  disabled={proceeding}
                  className="inline-flex items-center justify-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-[#1a365d] transition-colors disabled:opacity-70 disabled:cursor-wait"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <path d="M8 6h8M8 10h8M8 14h4" />
                  </svg>
                  {proceeding ? "Preparando…" : "Simular orçamento"}
                </button>
              ) : (
                <span className="inline-flex items-center justify-center gap-2 bg-[#e8e8e6] text-[#a0a3a9] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 cursor-not-allowed">
                  Simular orçamento
                </span>
              )}
              <p className="text-[#74777f] text-xs font-[var(--font-inter)] leading-relaxed">
                {quoteReady
                  ? "Cada área (local, medidas e acabamento) já vai preenchida — sem digitar nada de novo."
                  : "Informe as medidas das áreas para levar tudo preenchido ao orçamento."}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="bg-[#002045] px-6 py-16">
        <div className="max-w-[820px] mx-auto text-center">
          <h2 className="text-white font-[var(--font-noto-serif)] text-3xl mb-4">Gostou do resultado?</h2>
          <p className="text-white/70 font-[var(--font-inter)] mb-8 leading-relaxed">
            Fale com a Orbital e transforme a simulação em projeto real. Pronta-entrega em Manaus,
            instalação sem obra em poucas horas.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href={`${WA_BASE}${encodeURIComponent("Olá! Usei o Visualizador de revestimentos e gostaria de um orçamento.")}`}
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

// ── Stepper ──────────────────────────────────────────────────────
function Stepper({ step }: { step: Step }) {
  const idx = STEP_LABELS.findIndex((s) => s.id === step);
  return (
    <section className="px-4 sm:px-6 pt-10 pb-2 max-w-[1280px] mx-auto">
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEP_LABELS.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={s.id} className="flex items-center gap-2 sm:gap-3 flex-1 last:flex-none">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold font-[var(--font-inter)] flex items-center justify-center ${
                    active
                      ? "bg-[#002045] text-white"
                      : done
                      ? "bg-[#3b6934] text-white"
                      : "bg-[#e8e8e6] text-[#a0a3a9]"
                  }`}
                >
                  {done ? "✓" : s.n}
                </span>
                <span
                  className={`text-[11px] sm:text-xs font-[var(--font-inter)] truncate ${
                    active ? "text-[#002045] font-bold" : "text-[#74777f]"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <span className={`hidden sm:block flex-1 h-[2px] ${done ? "bg-[#3b6934]" : "bg-[#e8e8e6]"}`} />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ── Step 1: Upload ───────────────────────────────────────────────
function UploadStep({
  fileInputRef,
  dragOver,
  setDragOver,
  handleFile,
  error,
  hasBanked,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleFile: (f: File | undefined | null) => void;
  error: string | null;
  hasBanked: boolean;
}) {
  return (
    <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start mt-6">
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
            dragOver ? "border-[#3b6934] bg-[#f3f8f1]" : "border-[#cdd3dd] bg-[#f9f9f7] hover:border-[#002045]"
          }`}
        >
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="1.3" className="mb-4">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
          <p className="font-[var(--font-noto-serif)] text-[#002045] text-xl mb-1">
            {hasBanked ? "Envie a foto do próximo ambiente" : "Envie uma foto do seu ambiente"}
          </p>
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Clique para escolher ou arraste a imagem aqui</p>
          <p className="text-[#a0a3a9] text-xs font-[var(--font-inter)] mt-3">
            JPG ou PNG · foto de frente e bem iluminada funciona melhor
          </p>
        </div>
        {error && <p className="mt-3 text-sm text-[#b42318] font-[var(--font-inter)]">{error}</p>}
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
            { n: "1", t: "Envie a foto", d: "Use uma foto bem iluminada e de frente para o ambiente." },
            { n: "2", t: "Marque as áreas", d: "Toque numa superfície (a IA detecta a parede/teto) ou desenhe a área, e escolha o acabamento de cada uma." },
            { n: "3", t: "Revise", d: "Confira as áreas, modelos e medidas antes de gerar." },
            { n: "4", t: "Gere e simule", d: "A IA aplica cada modelo na sua área — e tudo vai pronto para o orçamento." },
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
  );
}

// ── Step 2: Zones (canvas + per-zone config) ─────────────────────
function ZonesStep({
  photoData,
  zones,
  activeZoneId,
  setActiveZoneId,
  addZone,
  updateZone,
  removeZone,
  detectSurface,
  detecting,
  products,
  loadingProducts,
  productById,
  canReview,
  onBack,
  onReview,
}: {
  photoData: string;
  zones: Zone[];
  activeZoneId: string | null;
  setActiveZoneId: (id: string | null) => void;
  addZone: () => void;
  updateZone: (id: string, patch: Partial<Zone>) => void;
  removeZone: (id: string) => void;
  detectSurface: (zoneId: string, point: { x: number; y: number }) => void;
  detecting: boolean;
  products: Product[];
  loadingProducts: boolean;
  productById: (id: string) => Product | null;
  canReview: boolean;
  onBack: () => void;
  onReview: () => void;
}) {
  const [tool, setTool] = useState<"select" | "draw" | "detect">("select");

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start mt-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <ToolButton active={tool === "select"} onClick={() => setTool("select")} label="Mover" />
          <ToolButton active={tool === "draw"} onClick={() => setTool("draw")} label="Desenhar área" />
          <ToolButton active={tool === "detect"} onClick={() => setTool("detect")} label="Detectar superfície" />
          {detecting && <span className="text-xs text-[#74777f] font-[var(--font-inter)]">Detectando…</span>}
        </div>

        <ZoneCanvas
          photoData={photoData}
          zones={zones}
          activeZoneId={activeZoneId}
          setActiveZoneId={setActiveZoneId}
          updateZone={updateZone}
          tool={tool}
          onDrawn={() => setTool("select")}
          onDetectPoint={(pt) => {
            const id = activeZoneId ?? zones[0]?.id;
            if (id) detectSurface(id, pt);
            setTool("select");
          }}
        />

        <p className="mt-3 text-[#74777f] text-xs font-[var(--font-inter)] leading-relaxed">
          <strong>Desenhar área:</strong> arraste sobre a foto para marcar onde o modelo entra.{" "}
          <strong>Detectar superfície:</strong> toque numa parede/teto e a IA marca a área — você ajusta depois.
          Cena difícil de desenhar? Em cada área você pode <strong>descrever o local em palavras</strong>.
          Áreas são opcionais: sem marcação, o modelo é aplicado na parede principal.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:border-[#002045] transition-colors"
          >
            Trocar foto
          </button>
          <button
            onClick={onReview}
            disabled={!canReview}
            className="inline-flex items-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
          >
            Revisar e gerar →
          </button>
          {!canReview && (
            <span className="text-xs text-[#b4791e] font-[var(--font-inter)] self-center">
              Atribua um acabamento a pelo menos uma área.
            </span>
          )}
        </div>
      </div>

      {/* Zone list / config */}
      <div className="lg:sticky lg:top-24 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#002045]">
            Áreas ({zones.length})
          </p>
          <button
            onClick={addZone}
            className="inline-flex items-center gap-1 text-[#3b6934] text-xs font-bold font-[var(--font-inter)] hover:underline"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Adicionar área
          </button>
        </div>

        {zones.map((z, i) => (
          <ZoneCard
            key={z.id}
            zone={z}
            index={i}
            active={activeZoneId === z.id}
            onSelect={() => setActiveZoneId(z.id)}
            onChange={(patch) => updateZone(z.id, patch)}
            onRemove={() => removeZone(z.id)}
            products={products}
            loadingProducts={loadingProducts}
            productById={productById}
          />
        ))}
      </div>
    </div>
  );
}

function ToolButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-[11px] font-semibold font-[var(--font-inter)] rounded-full transition-colors ${
        active ? "bg-[#002045] text-white" : "bg-[#f0f0ee] text-[#74777f] hover:text-[#002045]"
      }`}
    >
      {label}
    </button>
  );
}

// ── Canvas: draw / move / resize / detect ────────────────────────
function ZoneCanvas({
  photoData,
  zones,
  activeZoneId,
  setActiveZoneId,
  updateZone,
  tool,
  onDrawn,
  onDetectPoint,
}: {
  photoData: string;
  zones: Zone[];
  activeZoneId: string | null;
  setActiveZoneId: (id: string | null) => void;
  updateZone: (id: string, patch: Partial<Zone>) => void;
  tool: "select" | "draw" | "detect";
  onDrawn: () => void;
  onDetectPoint: (pt: { x: number; y: number }) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Drag state lives in a ref so pointer handlers stay stable.
  const drag = useRef<
    | null
    | { kind: "create"; startX: number; startY: number }
    | { kind: "move"; id: string; offX: number; offY: number }
    | { kind: "resize"; id: string; startX: number; startY: number; orig: Rect }
  >(null);
  const [draft, setDraft] = useState<Rect | null>(null);

  const norm = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const p = norm(e.clientX, e.clientY);
    if (tool === "detect") {
      onDetectPoint(p);
      return;
    }
    if (tool === "draw") {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      drag.current = { kind: "create", startX: p.x, startY: p.y };
      setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = norm(e.clientX, e.clientY);
    const d = drag.current;
    if (d.kind === "create") {
      const x = Math.min(d.startX, p.x);
      const y = Math.min(d.startY, p.y);
      const w = Math.abs(p.x - d.startX);
      const h = Math.abs(p.y - d.startY);
      setDraft({ x, y, w, h });
    } else if (d.kind === "move") {
      const z = zones.find((zz) => zz.id === d.id);
      if (z?.rect) {
        const w = z.rect.w;
        const h = z.rect.h;
        updateZone(d.id, {
          rect: { x: Math.min(1 - w, Math.max(0, p.x - d.offX)), y: Math.min(1 - h, Math.max(0, p.y - d.offY)), w, h },
        });
      }
    } else if (d.kind === "resize") {
      const w = Math.max(0.03, Math.min(1 - d.orig.x, p.x - d.orig.x));
      const h = Math.max(0.03, Math.min(1 - d.orig.y, p.y - d.orig.y));
      updateZone(d.id, { rect: { x: d.orig.x, y: d.orig.y, w, h } });
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (d?.kind === "create" && draft && draft.w > 0.03 && draft.h > 0.03) {
      const id = activeZoneId ?? zones[0]?.id;
      if (id) updateZone(id, { rect: draft });
      onDrawn();
    }
    drag.current = null;
    setDraft(null);
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      className={`relative bg-[#11151b] rounded-sm overflow-hidden select-none touch-none ${
        tool === "draw" ? "cursor-crosshair" : tool === "detect" ? "cursor-pointer" : "cursor-default"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoData} alt="Seu ambiente" className="block w-full h-auto pointer-events-none" />

      {zones.map((z, i) => {
        if (!z.rect) return null;
        const color = ZONE_COLORS[i % ZONE_COLORS.length];
        const active = z.id === activeZoneId;
        const r = z.rect;
        return (
          <div
            key={z.id}
            onPointerDown={(e) => {
              if (tool !== "select") return;
              e.stopPropagation();
              setActiveZoneId(z.id);
              const p = norm(e.clientX, e.clientY);
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              drag.current = { kind: "move", id: z.id, offX: p.x - r.x, offY: p.y - r.y };
            }}
            style={{
              left: `${r.x * 100}%`,
              top: `${r.y * 100}%`,
              width: `${r.w * 100}%`,
              height: `${r.h * 100}%`,
              borderColor: color,
              background: `${color}22`,
            }}
            className={`absolute border-2 ${active ? "ring-2 ring-white/70" : ""} ${
              tool === "select" ? "cursor-move" : "pointer-events-none"
            }`}
          >
            <span
              style={{ background: color }}
              className="absolute -top-0 left-0 text-white text-[10px] font-bold font-[var(--font-inter)] px-1.5 py-0.5"
            >
              {z.label}
            </span>
            {tool === "select" && (
              <span
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setActiveZoneId(z.id);
                  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  drag.current = { kind: "resize", id: z.id, startX: r.x, startY: r.y, orig: r };
                }}
                style={{ background: color }}
                className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full border-2 border-white cursor-nwse-resize"
              />
            )}
          </div>
        );
      })}

      {draft && draft.w > 0 && (
        <div
          style={{
            left: `${draft.x * 100}%`,
            top: `${draft.y * 100}%`,
            width: `${draft.w * 100}%`,
            height: `${draft.h * 100}%`,
          }}
          className="absolute border-2 border-dashed border-white bg-white/10 pointer-events-none"
        />
      )}
    </div>
  );
}

// ── Zone config card ─────────────────────────────────────────────
function ZoneCard({
  zone,
  index,
  active,
  onSelect,
  onChange,
  onRemove,
  products,
  loadingProducts,
  productById,
}: {
  zone: Zone;
  index: number;
  active: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Zone>) => void;
  onRemove: () => void;
  products: Product[];
  loadingProducts: boolean;
  productById: (id: string) => Product | null;
}) {
  const color = ZONE_COLORS[index % ZONE_COLORS.length];
  const prod = productById(zone.productId);
  const sanitizeDim = (v: string) => v.replace(/[^0-9.,]/g, "").replace(",", ".");
  const [lineFilter, setLineFilter] = useState<ProductLine | "Todas">("Todas");
  const list = lineFilter === "Todas" ? products : products.filter((p) => p.linha === lineFilter);

  return (
    <div
      onClick={onSelect}
      className={`bg-white border rounded-sm p-4 cursor-pointer transition-colors ${
        active ? "border-[#002045] shadow-sm" : "border-[#e2e2e2] hover:border-[#86a0cd]"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
          <input
            value={zone.label}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onChange({ label: e.target.value })}
            className="text-sm font-semibold text-[#002045] font-[var(--font-inter)] bg-transparent border-b border-transparent focus:border-[#e2e2e2] focus:outline-none min-w-0 w-28"
          />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remover área"
          className="text-[#b42318] hover:text-[#7a1610]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
        </button>
      </div>

      {/* surface */}
      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">
        Tipo de superfície
      </label>
      <select
        value={zone.surface}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange({ surface: e.target.value })}
        className="w-full border border-[#e2e2e2] px-2.5 py-2 text-sm font-[var(--font-inter)] text-[#002045] bg-white focus:outline-none focus:border-[#002045] mb-2"
      >
        {VIZ_SPACES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
        <option value="__custom__">Outro…</option>
      </select>
      {zone.surface === "__custom__" && (
        <input
          value={zone.customLabel}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onChange({ customLabel: e.target.value })}
          placeholder="ex: parede atrás da TV"
          className="w-full border border-[#e2e2e2] px-2.5 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] mb-2"
        />
      )}

      {/* describe where, in words — best when the scene is busy and hard to draw */}
      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1 mt-1">
        Onde aplicar (em palavras) <span className="normal-case font-normal">(opcional)</span>
      </label>
      <textarea
        value={zone.instruction}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange({ instruction: e.target.value })}
        rows={2}
        placeholder="ex: nas paredes cinza ao fundo, atrás do sofá e ao lado do espelho redondo"
        className="w-full border border-[#e2e2e2] px-2.5 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] mb-1 resize-none"
      />
      <p className="text-[10px] text-[#a0a3a9] font-[var(--font-inter)] mb-1">
        Difícil desenhar? Descreva o local em palavras — a IA aplica exatamente onde você indicar (com ou sem desenho).
      </p>

      {/* product */}
      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1 mt-1">
        Acabamento {prod ? `· ${prod.name}` : ""}
      </label>
      <div className="flex flex-wrap gap-1 mb-2" onClick={(e) => e.stopPropagation()}>
        {(["Todas", ...LINE_ORDER] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLineFilter(l)}
            className={`px-2 py-0.5 text-[10px] font-semibold font-[var(--font-inter)] rounded-full transition-colors ${
              lineFilter === l ? "bg-[#002045] text-white" : "bg-[#f0f0ee] text-[#74777f] hover:text-[#002045]"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      {loadingProducts ? (
        <p className="text-[#74777f] text-xs font-[var(--font-inter)] py-3 text-center">Carregando…</p>
      ) : (
        <div className="grid grid-cols-4 gap-1.5 max-h-[180px] overflow-y-auto pr-1" onClick={(e) => e.stopPropagation()}>
          {list.map((p) => {
            const sel = zone.productId === p.id;
            return (
              <button key={p.id} onClick={() => onChange({ productId: p.id })} title={p.name} className="group text-left">
                <span
                  style={{ aspectRatio: "1 / 1" }}
                  className={`relative block w-full overflow-hidden rounded-sm border-2 ${
                    sel ? "border-[#3b6934]" : "border-[#e8e8e6] group-hover:border-[#86a0cd]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_path} alt={p.name} className="absolute inset-0 w-full h-full object-cover scale-[1.35]" loading="lazy" />
                  {sel && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#3b6934] text-white text-[9px] flex items-center justify-center">
                      ✓
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* dims */}
      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1 mt-3">
        Medidas <span className="normal-case font-normal">(opcional)</span>
      </label>
      <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
        <input
          inputMode="decimal"
          value={zone.width}
          onChange={(e) => onChange({ width: sanitizeDim(e.target.value) })}
          placeholder="Largura (m)"
          className="w-full border border-[#e2e2e2] px-2.5 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
        />
        <input
          inputMode="decimal"
          value={zone.height}
          onChange={(e) => onChange({ height: sanitizeDim(e.target.value) })}
          placeholder="Altura (m)"
          className="w-full border border-[#e2e2e2] px-2.5 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
        />
      </div>
      <p className="mt-2 text-[10px] text-[#a0a3a9] font-[var(--font-inter)]">
        {zone.rect
          ? "Área marcada na foto ✓"
          : zone.instruction.trim()
          ? "Local descrito em texto ✓"
          : "Sem marcação — aplicado na parede principal."}
      </p>
    </div>
  );
}

// ── Step 3: Review ───────────────────────────────────────────────
function ReviewStep({
  photoData,
  zones,
  productById,
  onBack,
  onGenerate,
}: {
  photoData: string;
  zones: Zone[];
  productById: (id: string) => Product | null;
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start mt-6">
      <div className="bg-[#11151b] rounded-sm overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoData} alt="Seu ambiente" className="block w-full h-auto" />
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#002045] mb-1">
            Revise antes de gerar
          </p>
          <p className="text-[#74777f] text-xs font-[var(--font-inter)]">
            {zones.length} {zones.length === 1 ? "área será aplicada" : "áreas serão aplicadas"}, uma de cada vez.
          </p>
        </div>
        <ol className="space-y-2">
          {zones.map((z, i) => {
            const prod = productById(z.productId);
            const surfaceLabel =
              z.surface === "__custom__" ? z.customLabel || "Outro" : VIZ_SPACES.find((s) => s.id === z.surface)?.label;
            const dims = z.width && z.height ? `${z.width}m × ${z.height}m` : null;
            return (
              <li key={z.id} className="border border-[#e2e2e2] rounded-sm p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }} />
                  <p className="text-sm font-semibold text-[#002045] font-[var(--font-inter)]">{z.label}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs font-[var(--font-inter)] text-[#43474e] pl-5">
                  <span><span className="text-[#74777f]">Superfície:</span> {surfaceLabel}</span>
                  <span><span className="text-[#74777f]">Modelo:</span> {prod?.name ?? "—"}</span>
                  <span><span className="text-[#74777f]">Medidas:</span> {dims ?? "—"}</span>
                  <span className="col-span-2">
                    <span className="text-[#74777f]">Onde:</span>{" "}
                    {z.instruction.trim()
                      ? z.instruction.trim()
                      : z.rect
                      ? "Área desenhada na foto"
                      : "Parede principal"}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:border-[#002045] transition-colors"
          >
            ← Voltar
          </button>
          <button
            onClick={onGenerate}
            className="inline-flex items-center gap-2 bg-[#3b6934] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3 hover:bg-[#2f5429] transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 3v4M3 5h4M6 17v4m-2-2h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z" />
            </svg>
            Gerar visualização
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Result ───────────────────────────────────────────────
function ResultStep({
  photoData,
  result,
  generating,
  progress,
  error,
  onRetry,
  onRegenerate,
  onDownload,
  onAddPhoto,
}: {
  photoData: string | null;
  result: string | null;
  generating: boolean;
  progress: { i: number; total: number; label: string } | null;
  error: string | null;
  onRetry: () => void;
  onRegenerate: () => void;
  onDownload: () => void;
  onAddPhoto: () => void;
}) {
  return (
    <div className="mt-6">
      <div className="relative bg-[#11151b] rounded-sm overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={result ?? photoData ?? ""} alt={result ? "Visualização gerada" : "Sua foto"} className="block w-full h-auto" />
        <div className="pointer-events-none absolute top-3 left-3 bg-black/55 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <p className="text-white/90 text-xs font-[var(--font-inter)]">{result ? "Resultado gerado" : "Sua foto"}</p>
        </div>
        {generating && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="w-10 h-10 border-2 border-white/30 border-t-[#a1d494] rounded-full animate-spin" />
            <p className="text-white font-[var(--font-inter)] text-sm">
              {progress ? `Aplicando ${progress.label} (${progress.i} de ${progress.total})…` : "Gerando…"}
            </p>
            <p className="text-white/60 font-[var(--font-inter)] text-xs">Cada área leva alguns segundos.</p>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-[#b42318] font-[var(--font-inter)]">{error}</p>}

      {!generating && (
        <div className="mt-4 flex flex-wrap gap-3">
          {result && (
            <>
              <button
                onClick={onDownload}
                className="inline-flex items-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#1a365d] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Baixar
              </button>
              <button
                onClick={onAddPhoto}
                className="inline-flex items-center gap-2 border border-[#3b6934] text-[#3b6934] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#f3f8f1] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Adicionar outra foto
              </button>
            </>
          )}
          <button
            onClick={onRegenerate}
            className="inline-flex items-center gap-2 border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:border-[#002045] transition-colors"
          >
            {result ? "Gerar novamente" : "Tentar novamente"}
          </button>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:border-[#002045] transition-colors"
          >
            Editar áreas
          </button>
        </div>
      )}

      <p className="mt-3 text-[#a0a3a9] text-xs font-[var(--font-inter)]">
        A imagem gerada é uma simulação e pode diferir do resultado real.
      </p>
    </div>
  );
}
