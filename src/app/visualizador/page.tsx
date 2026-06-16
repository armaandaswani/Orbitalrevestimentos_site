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

const ZONE_COLORS = ["#3b6934", "#b4791e", "#1e5fb4", "#a83279", "#2a9d8f", "#9b2226"];

type Rect = { x: number; y: number; w: number; h: number };
type Poly = Array<[number, number]>;

// One application zone: a surface the client tapped (auto-detected polygon) +
// an assigned panel + optional measurements / free-text instruction.
interface Zone {
  id: string;
  label: string;
  surface: string; // VIZ_SPACES id or "__custom__"
  customLabel: string;
  productId: string;
  polygon: Poly | null; // normalized 0..1 outline (Gemini fallback)
  maskUrl: string | null; // tinted translucent overlay PNG (fal.ai SAM mask)
  rect: Rect | null; // bounding box of the selection (used to confine the render)
  instruction: string;
  width: string;
  height: string;
  detecting: boolean; // true while the surface detection is in flight
}

interface SavedAmbiente {
  key: string;
  spaceId: string | null;
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("img"));
    im.src = src;
  });
}

// Turn a fal SAM mask (binary mask, or cutout with alpha) into a tinted
// translucent overlay PNG + the normalized bounding box. Runs on the client.
async function maskToOverlay(maskUrl: string, hex: string): Promise<{ url: string; rect: Rect | null }> {
  const im = await loadImage(maskUrl);
  const w = im.naturalWidth;
  const h = im.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(im, 0, 0);
  const src = ctx.getImageData(0, 0, w, h).data;
  let hasAlpha = false;
  for (let i = 3; i < src.length; i += 4) {
    if (src[i] < 250) {
      hasAlpha = true;
      break;
    }
  }
  const { r, g, b } = hexToRgb(hex);
  const out = ctx.createImageData(w, h);
  const od = out.data;
  let minX = w, minY = h, maxX = 0, maxY = 0, any = false;
  for (let p = 0, pi = 0; p < w * h; p++, pi += 4) {
    const on = hasAlpha ? src[pi + 3] > 40 : src[pi] * 0.299 + src[pi + 1] * 0.587 + src[pi + 2] * 0.114 > 110;
    if (on) {
      od[pi] = r;
      od[pi + 1] = g;
      od[pi + 2] = b;
      od[pi + 3] = 125;
      const x = p % w;
      const y = (p / w) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      any = true;
    } else {
      od[pi + 3] = 0;
    }
  }
  ctx.putImageData(out, 0, 0);
  const rect = any ? { x: minX / w, y: minY / h, w: (maxX - minX + 1) / w, h: (maxY - minY + 1) / h } : null;
  return { url: c.toDataURL(), rect };
}

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
  const [photoDims, setPhotoDims] = useState<{ w: number; h: number } | null>(null);

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

  const productById = useCallback((id: string) => products.find((p) => p.id === id) ?? null, [products]);

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      setError(null);
      try {
        const dataUrl = await fileToDataUrl(file);
        setPhotoData(dataUrl);
        setResult(null);
        setZones([]);
        setActiveZoneId(null);
        setStep("zones");
        // Natural pixel size — fal needs the point prompt in pixels.
        loadImage(dataUrl)
          .then((im) => setPhotoDims({ w: im.naturalWidth, h: im.naturalHeight }))
          .catch(() => setPhotoDims(null));
      } catch {
        setError("Não foi possível ler essa imagem. Tente outra.");
      }
    },
    []
  );

  const updateZone = useCallback((id: string, patch: Partial<Zone>) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }, []);

  const removeZone = useCallback((id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    setActiveZoneId((cur) => (cur === id ? null : cur));
  }, []);

  // Call the detector and apply the result (fal mask or Gemini polygon) to a zone.
  const detectInto = useCallback(
    async (id: string, colorIdx: number, nx: number, ny: number) => {
      if (!photoData) return;
      updateZone(id, { detecting: true });
      try {
        const res = await fetch("/api/visualizador/detect-surface", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photo: photoData,
            point: { x: nx, y: ny },
            width: photoDims?.w,
            height: photoDims?.h,
          }),
        });
        const j = (await res.json()) as {
          mask?: string;
          polygon?: Array<[number, number]>;
          rect?: Rect;
        };
        if (res.ok && typeof j.mask === "string") {
          try {
            const { url, rect } = await maskToOverlay(j.mask, ZONE_COLORS[colorIdx % ZONE_COLORS.length]);
            updateZone(id, { maskUrl: url, rect, polygon: null, detecting: false });
            return;
          } catch {
            /* fall through to no-selection */
          }
        }
        if (res.ok && Array.isArray(j.polygon)) {
          updateZone(id, { polygon: j.polygon, rect: j.rect ?? null, maskUrl: null, detecting: false });
          return;
        }
        updateZone(id, { detecting: false });
      } catch {
        updateZone(id, { detecting: false });
      }
    },
    [photoData, photoDims, updateZone]
  );

  // Tap on the photo → create a new area and auto-detect its surface.
  const tapAddSurface = useCallback(
    (nx: number, ny: number) => {
      if (!photoData) return;
      const id = `z-${Date.now()}`;
      const idx = zones.length;
      const z: Zone = {
        id,
        label: `Área ${idx + 1}`,
        surface: "parede",
        customLabel: "",
        productId: products[0]?.id ?? "",
        polygon: null,
        maskUrl: null,
        rect: null,
        instruction: "",
        width: "",
        height: "",
        detecting: true,
      };
      setZones((prev) => [...prev, z]);
      setActiveZoneId(id);
      void detectInto(id, idx, nx, ny);
    },
    [photoData, zones.length, products, detectInto]
  );

  // Re-run detection for an existing zone at a new tapped point.
  const redetectZone = useCallback(
    (id: string, nx: number, ny: number) => {
      const idx = zones.findIndex((z) => z.id === id);
      void detectInto(id, idx < 0 ? 0 : idx, nx, ny);
    },
    [zones, detectInto]
  );

  // When a zone is awaiting a re-detect tap, this holds its id.
  const [retargetId, setRetargetId] = useState<string | null>(null);
  const onTapPhoto = useCallback(
    (nx: number, ny: number) => {
      if (retargetId) {
        redetectZone(retargetId, nx, ny);
        setRetargetId(null);
      } else {
        tapAddSurface(nx, ny);
      }
    },
    [retargetId, redetectZone, tapAddSurface]
  );

  const zonesReady = zones.filter((z) => z.productId);
  const canReview = !!photoData && zonesReady.length > 0;
  const anyDetecting = zones.some((z) => z.detecting);

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
        if (!res.ok || !json.image) throw new Error(json.error || "Não foi possível gerar a visualização.");
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
    a.download = "orbital-visualizacao.png";
    a.click();
  };

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

  const addAnotherPhoto = () => {
    if (result) setSavedAmbientes((prev) => [...prev, ...currentAmbientes(result, true)]);
    setPhotoData(null);
    setZones([]);
    setActiveZoneId(null);
    setResult(null);
    setError(null);
    setStep("upload");
  };

  const allAmbientes = useMemo(() => {
    const current = result ? currentAmbientes(result, true) : [];
    return [...savedAmbientes, ...current];
  }, [savedAmbientes, result, currentAmbientes]);

  const missingDimsCount = allAmbientes.filter((a) => !(a.width && a.height)).length;
  const quoteReady = allAmbientes.length > 0 && missingDimsCount <= 1;
  const simuladorHref = quoteReady ? buildSimuladorUrl(allAmbientes) : "/simulador";

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
            body: JSON.stringify({ id: renderId, image: a.thumb, local: a.local, productName: a.productName, productCode: a.productCode }),
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
            Envie uma foto, toque nas superfícies (parede, teto, móvel…) e escolha um
            acabamento para cada uma. A IA aplica cada modelo na área certa,
            respeitando o tamanho real das placas.
          </p>
        </div>
      </section>

      <Stepper step={step} />

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
            onTapPhoto={onTapPhoto}
            updateZone={updateZone}
            removeZone={removeZone}
            retargetId={retargetId}
            setRetargetId={setRetargetId}
            anyDetecting={anyDetecting}
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
                    active ? "bg-[#002045] text-white" : done ? "bg-[#3b6934] text-white" : "bg-[#e8e8e6] text-[#a0a3a9]"
                  }`}
                >
                  {done ? "✓" : s.n}
                </span>
                <span className={`text-[11px] sm:text-xs font-[var(--font-inter)] truncate ${active ? "text-[#002045] font-bold" : "text-[#74777f]"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && <span className={`hidden sm:block flex-1 h-[2px] ${done ? "bg-[#3b6934]" : "bg-[#e8e8e6]"}`} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

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
          <p className="text-[#a0a3a9] text-xs font-[var(--font-inter)] mt-3">JPG ou PNG · foto de frente e bem iluminada funciona melhor</p>
        </div>
        {error && <p className="mt-3 text-sm text-[#b42318] font-[var(--font-inter)]">{error}</p>}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      <div>
        <p className="text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#3b6934] mb-4">Como funciona</p>
        <ol className="space-y-5">
          {[
            { n: "1", t: "Envie a foto", d: "Use uma foto bem iluminada e de frente para o ambiente." },
            { n: "2", t: "Toque nas superfícies", d: "Toque numa parede, teto ou móvel — a IA marca a área. Escolha o acabamento de cada uma." },
            { n: "3", t: "Revise", d: "Confira as áreas, modelos e medidas antes de gerar." },
            { n: "4", t: "Gere e simule", d: "A IA aplica cada modelo na sua área — e tudo vai pronto para o orçamento." },
          ].map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#002045] text-white text-sm font-bold font-[var(--font-inter)] flex items-center justify-center">{s.n}</span>
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

function ZonesStep({
  photoData,
  zones,
  activeZoneId,
  setActiveZoneId,
  onTapPhoto,
  updateZone,
  removeZone,
  retargetId,
  setRetargetId,
  anyDetecting,
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
  onTapPhoto: (nx: number, ny: number) => void;
  updateZone: (id: string, patch: Partial<Zone>) => void;
  removeZone: (id: string) => void;
  retargetId: string | null;
  setRetargetId: (id: string | null) => void;
  anyDetecting: boolean;
  products: Product[];
  loadingProducts: boolean;
  productById: (id: string) => Product | null;
  canReview: boolean;
  onBack: () => void;
  onReview: () => void;
}) {
  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start mt-6">
      <div>
        <SurfaceCanvas
          photoData={photoData}
          zones={zones}
          activeZoneId={activeZoneId}
          setActiveZoneId={setActiveZoneId}
          onTapPhoto={onTapPhoto}
          busy={anyDetecting}
          retargeting={!!retargetId}
        />
        <p className="mt-3 text-[#74777f] text-xs font-[var(--font-inter)] leading-relaxed">
          {retargetId ? (
            <strong className="text-[#b4791e]">Toque no ponto certo da superfície para refazer a seleção.</strong>
          ) : (
            <>
              <strong>Toque</strong> numa superfície (parede, teto, móvel…) e a IA marca a área. Toque em
              outra para adicionar. Cena difícil? Em cada área você pode <strong>descrever o local em palavras</strong>.
            </>
          )}
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
              Toque numa superfície e atribua um acabamento.
            </span>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-24 space-y-3">
        <p className="text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#002045]">
          Áreas ({zones.length})
        </p>
        {zones.length === 0 && (
          <p className="text-[#74777f] text-sm font-[var(--font-inter)] border border-dashed border-[#cdd3dd] px-4 py-6 text-center">
            Toque numa superfície da foto para começar.
          </p>
        )}
        {zones.map((z, i) => (
          <ZoneCard
            key={z.id}
            zone={z}
            index={i}
            active={activeZoneId === z.id}
            retargeting={retargetId === z.id}
            onSelect={() => setActiveZoneId(z.id)}
            onChange={(patch) => updateZone(z.id, patch)}
            onRemove={() => removeZone(z.id)}
            onRetarget={() => setRetargetId(retargetId === z.id ? null : z.id)}
            products={products}
            loadingProducts={loadingProducts}
            productById={productById}
          />
        ))}
      </div>
    </div>
  );
}

// Photo + tinted polygon overlays. Tapping reports a normalized point.
function SurfaceCanvas({
  photoData,
  zones,
  activeZoneId,
  setActiveZoneId,
  onTapPhoto,
  busy,
  retargeting,
}: {
  photoData: string;
  zones: Zone[];
  activeZoneId: string | null;
  setActiveZoneId: (id: string | null) => void;
  onTapPhoto: (nx: number, ny: number) => void;
  busy: boolean;
  retargeting: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const handleClick = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const ny = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    onTapPhoto(nx, ny);
  };
  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={`relative bg-[#11151b] rounded-sm overflow-hidden select-none ${retargeting ? "cursor-crosshair" : "cursor-pointer"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoData} alt="Seu ambiente" className="block w-full h-auto pointer-events-none" />

      {/* fal SAM mask overlays (already tinted + translucent) */}
      {zones.map((z) =>
        z.maskUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={z.id}
            src={z.maskUrl}
            alt=""
            className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity ${z.id === activeZoneId ? "opacity-100" : "opacity-75"}`}
          />
        ) : null
      )}

      {/* Gemini polygon overlays (fallback) */}
      <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
        {zones.map((z, i) => {
          if (!z.polygon || z.polygon.length < 3) return null;
          const color = ZONE_COLORS[i % ZONE_COLORS.length];
          const active = z.id === activeZoneId;
          return (
            <polygon
              key={z.id}
              points={z.polygon.map(([x, y]) => `${x},${y}`).join(" ")}
              fill={color}
              fillOpacity={active ? 0.42 : 0.26}
              stroke={color}
              strokeWidth={active ? 0.007 : 0.004}
              strokeLinejoin="round"
            />
          );
        })}
      </svg>

      {/* labels */}
      {zones.map((z, i) => {
        if (!z.rect) return null;
        const color = ZONE_COLORS[i % ZONE_COLORS.length];
        return (
          <button
            key={z.id}
            onClick={(e) => {
              e.stopPropagation();
              setActiveZoneId(z.id);
            }}
            style={{ left: `${z.rect.x * 100}%`, top: `${z.rect.y * 100}%`, background: color }}
            className="absolute -translate-y-1/2 text-white text-[10px] font-bold font-[var(--font-inter)] px-1.5 py-0.5 rounded-sm"
          >
            {z.label}
          </button>
        );
      })}

      {busy && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-black/70 px-4 py-2 rounded-full">
            <div className="w-4 h-4 border-2 border-white/30 border-t-[#a1d494] rounded-full animate-spin" />
            <span className="text-white text-xs font-[var(--font-inter)]">Detectando superfície…</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ZoneCard({
  zone,
  index,
  active,
  retargeting,
  onSelect,
  onChange,
  onRemove,
  onRetarget,
  products,
  loadingProducts,
  productById,
}: {
  zone: Zone;
  index: number;
  active: boolean;
  retargeting: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Zone>) => void;
  onRemove: () => void;
  onRetarget: () => void;
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
      className={`bg-white border rounded-sm p-4 cursor-pointer transition-colors ${active ? "border-[#002045] shadow-sm" : "border-[#e2e2e2] hover:border-[#86a0cd]"}`}
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
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Remover área" className="text-[#b42318] hover:text-[#7a1610]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
        </button>
      </div>

      {/* detection status + re-select */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-[var(--font-inter)]">
          {zone.detecting ? (
            <span className="text-[#74777f]">Detectando superfície…</span>
          ) : zone.polygon || zone.maskUrl ? (
            <span className="text-[#2f5429]">Superfície detectada ✓</span>
          ) : (
            <span className="text-[#b4791e]">Não detectada — descreva em texto abaixo</span>
          )}
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); onRetarget(); }}
          className={`text-[10px] font-bold font-[var(--font-inter)] ${retargeting ? "text-[#b4791e]" : "text-[#1e5fb4] hover:underline"}`}
        >
          {retargeting ? "Toque na foto…" : "Refazer seleção"}
        </button>
      </div>

      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Tipo de superfície</label>
      <select
        value={zone.surface}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange({ surface: e.target.value })}
        className="w-full border border-[#e2e2e2] px-2.5 py-2 text-sm font-[var(--font-inter)] text-[#002045] bg-white focus:outline-none focus:border-[#002045] mb-2"
      >
        {VIZ_SPACES.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
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

      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1 mt-1">
        Onde aplicar (em palavras) <span className="normal-case font-normal">(opcional)</span>
      </label>
      <textarea
        value={zone.instruction}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange({ instruction: e.target.value })}
        rows={2}
        placeholder="ex: nas paredes cinza ao fundo, atrás do sofá"
        className="w-full border border-[#e2e2e2] px-2.5 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] mb-1 resize-none"
      />

      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1 mt-1">
        Acabamento {prod ? `· ${prod.name}` : ""}
      </label>
      <div className="flex flex-wrap gap-1 mb-2" onClick={(e) => e.stopPropagation()}>
        {(["Todas", ...LINE_ORDER] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLineFilter(l)}
            className={`px-2 py-0.5 text-[10px] font-semibold font-[var(--font-inter)] rounded-full transition-colors ${lineFilter === l ? "bg-[#002045] text-white" : "bg-[#f0f0ee] text-[#74777f] hover:text-[#002045]"}`}
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
                <span style={{ aspectRatio: "1 / 1" }} className={`relative block w-full overflow-hidden rounded-sm border-2 ${sel ? "border-[#3b6934]" : "border-[#e8e8e6] group-hover:border-[#86a0cd]"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_path} alt={p.name} className="absolute inset-0 w-full h-full object-cover scale-[1.35]" loading="lazy" />
                  {sel && <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#3b6934] text-white text-[9px] flex items-center justify-center">✓</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1 mt-3">
        Medidas <span className="normal-case font-normal">(opcional)</span>
      </label>
      <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
        <input inputMode="decimal" value={zone.width} onChange={(e) => onChange({ width: sanitizeDim(e.target.value) })} placeholder="Largura (m)" className="w-full border border-[#e2e2e2] px-2.5 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
        <input inputMode="decimal" value={zone.height} onChange={(e) => onChange({ height: sanitizeDim(e.target.value) })} placeholder="Altura (m)" className="w-full border border-[#e2e2e2] px-2.5 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
      </div>
    </div>
  );
}

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
          <p className="text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#002045] mb-1">Revise antes de gerar</p>
          <p className="text-[#74777f] text-xs font-[var(--font-inter)]">
            {zones.length} {zones.length === 1 ? "área será aplicada" : "áreas serão aplicadas"}, uma de cada vez.
          </p>
        </div>
        <ol className="space-y-2">
          {zones.map((z, i) => {
            const prod = productById(z.productId);
            const surfaceLabel = z.surface === "__custom__" ? z.customLabel || "Outro" : VIZ_SPACES.find((s) => s.id === z.surface)?.label;
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
                    {z.instruction.trim() ? z.instruction.trim() : z.polygon || z.maskUrl ? "Área marcada na foto" : "Parede principal"}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap gap-3">
          <button onClick={onBack} className="inline-flex items-center gap-2 border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:border-[#002045] transition-colors">
            ← Voltar
          </button>
          <button onClick={onGenerate} className="inline-flex items-center gap-2 bg-[#3b6934] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3 hover:bg-[#2f5429] transition-colors">
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
              <button onClick={onDownload} className="inline-flex items-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#1a365d] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Baixar
              </button>
              <button onClick={onAddPhoto} className="inline-flex items-center gap-2 border border-[#3b6934] text-[#3b6934] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#f3f8f1] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Adicionar outra foto
              </button>
            </>
          )}
          <button onClick={onRegenerate} className="inline-flex items-center gap-2 border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:border-[#002045] transition-colors">
            {result ? "Gerar novamente" : "Tentar novamente"}
          </button>
          <button onClick={onRetry} className="inline-flex items-center gap-2 border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:border-[#002045] transition-colors">
            Editar áreas
          </button>
        </div>
      )}

      <p className="mt-3 text-[#a0a3a9] text-xs font-[var(--font-inter)]">A imagem gerada é uma simulação e pode diferir do resultado real.</p>
    </div>
  );
}
