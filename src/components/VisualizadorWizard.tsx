"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { applicationAreaFor } from "@/lib/render-prompt";

// ── Types ─────────────────────────────────────────────────────────────────────

type ProductLine = "Classic" | "Brilliance" | "Elegance";
type FinishKind = "matte" | "polished" | "wood";

export interface VizProduct {
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

export const LINE_ORDER: ProductLine[] = ["Classic", "Brilliance", "Elegance"];
export const FINISH_BY_LINE: Record<ProductLine, FinishKind> = {
  Classic: "matte",
  Brilliance: "polished",
  Elegance: "wood",
};

export const VIZ_SPACES: { id: string; label: string }[] = [
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

export type Rect = { x: number; y: number; w: number; h: number };
type Poly = Array<[number, number]>;

export interface Zone {
  id: string;
  label: string;
  surface: string;
  customLabel: string;
  productId: string;
  polygon: Poly | null;
  maskUrl: string | null;
  rect: Rect | null;
  manual: boolean;
  instruction: string;
  width: string;
  height: string;
  detecting: boolean;
}

export interface SimPrefill {
  productCode: string;
  spaceId: string;
  w?: number;
  h?: number;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

export function parseDim(v: string): number | null {
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

const MAX_DIM = 1600;
async function normalizeImage(file: File): Promise<{ dataUrl: string; w: number; h: number }> {
  const raw = await fileToDataUrl(file);
  const im = await loadImage(raw);
  let w = im.naturalWidth;
  let h = im.naturalHeight;
  if (!w || !h) return { dataUrl: raw, w: 0, h: 0 };
  const scale = Math.min(1, MAX_DIM / Math.max(w, h));
  w = Math.round(w * scale);
  h = Math.round(h * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return { dataUrl: raw, w: im.naturalWidth, h: im.naturalHeight };
  ctx.drawImage(im, 0, 0, w, h);
  return { dataUrl: c.toDataURL("image/jpeg", 0.9), w, h };
}

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
    if (src[i] < 250) { hasAlpha = true; break; }
  }
  const { r, g, b } = hexToRgb(hex);
  const out = ctx.createImageData(w, h);
  const od = out.data;
  let minX = w, minY = h, maxX = 0, maxY = 0, any = false;
  for (let p = 0, pi = 0; p < w * h; p++, pi += 4) {
    const on = hasAlpha ? src[pi + 3] > 40 : src[pi] * 0.299 + src[pi + 1] * 0.587 + src[pi + 2] * 0.114 > 110;
    if (on) {
      od[pi] = r; od[pi + 1] = g; od[pi + 2] = b; od[pi + 3] = 125;
      const x = p % w; const y = (p / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      any = true;
    } else { od[pi + 3] = 0; }
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
    else { qp.set("space", "custom"); qp.set("customSpace", a.local); }
    qp.set("produto", a.productCode);
    if (a.width && a.height) { qp.set("w", String(a.width)); qp.set("h", String(a.height)); }
    return `/simulador?${qp.toString()}`;
  }
  const withDims = ambientes.filter((a) => a.width && a.height);
  const withoutDims = ambientes.filter((a) => !(a.width && a.height));
  const ordered = [...withDims, ...withoutDims];
  const qp = new URLSearchParams({ src: "viz", ms: String(ordered.length) });
  ordered.forEach((a, i) => {
    qp.set(`s${i}`, a.local);
    qp.set(`p${i}`, a.productCode);
    if (a.width && a.height) { qp.set(`w${i}`, String(a.width)); qp.set(`h${i}`, String(a.height)); }
  });
  return `/simulador?${qp.toString()}`;
}

// ── Wizard step type ──────────────────────────────────────────────────────────

export type VizStep = "upload" | "zones" | "review" | "result";
const STEP_LABELS: { id: VizStep; n: string; label: string }[] = [
  { id: "upload", n: "1", label: "Foto" },
  { id: "zones", n: "2", label: "Áreas e modelos" },
  { id: "review", n: "3", label: "Revisão" },
  { id: "result", n: "4", label: "Resultado" },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface VisualizadorWizardProps {
  /** Pre-loaded product catalog. If not provided, the wizard fetches it itself. */
  products?: VizProduct[];
  loadingProducts?: boolean;
  /** Prefill zone defaults from a parent context (e.g. Simulador selection). */
  simPrefills?: SimPrefill[];
  /**
   * When true: lead was already captured upstream — suppress the lead-form
   * overlay, show a "Ver minha simulação" CTA when the result is ready, and
   * call onComplete/onSkip instead of handing off to /simulador.
   */
  embeddedMode?: boolean;
  /** Lead info from the parent (used for auto-saving the render). */
  prefilledLeadName?: string;
  prefilledLeadPhone?: string;
  /** Called when the user is done with the visualization (result ready + clicked CTA). */
  onComplete?: (vizRenderId?: string) => void;
  /** Called when the user skips the visualization step entirely. */
  onSkip?: () => void;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function VisualizadorWizard({
  products: productsProp,
  loadingProducts: loadingProp,
  simPrefills: simPrefillsProp,
  embeddedMode = false,
  prefilledLeadName = "",
  prefilledLeadPhone = "",
  onComplete,
  onSkip,
}: VisualizadorWizardProps) {
  // ── Product catalog ───────────────────────────────────────────────────────
  const [internalProducts, setInternalProducts] = useState<VizProduct[]>([]);
  const [internalLoading, setInternalLoading] = useState(!productsProp);

  useEffect(() => {
    if (productsProp) return; // parent supplies products
    let cancelled = false;
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: VizProduct[]) => {
        if (cancelled || !Array.isArray(data)) return;
        const sorted = [...data].sort(
          (a, b) =>
            LINE_ORDER.indexOf(a.linha) - LINE_ORDER.indexOf(b.linha) ||
            (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );
        setInternalProducts(sorted);
      })
      .catch(() => {})
      .finally(() => !cancelled && setInternalLoading(false));
    return () => { cancelled = true; };
  }, [productsProp]);

  const products = productsProp ?? internalProducts;
  const loadingProducts = loadingProp ?? internalLoading;

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<VizStep>("upload");
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
  const [retargetId, setRetargetId] = useState<string | null>(null);

  // In standalone mode: lead captured here. In embedded mode: prefilled by parent.
  const [leadName, setLeadName] = useState(prefilledLeadName);
  const [leadPhone, setLeadPhone] = useState(prefilledLeadPhone);
  const [leadSubmitted, setLeadSubmitted] = useState(embeddedMode);
  const pendingLeadRef = useRef({ name: prefilledLeadName, phone: prefilledLeadPhone });
  const vizRenderIdRef = useRef<string>("");

  // Sync prefilled lead into ref when props change (e.g. parent fills data after mount)
  useEffect(() => {
    if (embeddedMode) {
      pendingLeadRef.current = { name: prefilledLeadName, phone: prefilledLeadPhone };
      setLeadName(prefilledLeadName);
      setLeadPhone(prefilledLeadPhone);
      setLeadSubmitted(true);
    }
  }, [embeddedMode, prefilledLeadName, prefilledLeadPhone]);

  // ── Prefills ──────────────────────────────────────────────────────────────
  const [simPrefills, setSimPrefills] = useState<SimPrefill[]>(simPrefillsProp ?? []);
  const simPrefillsRef = useRef<SimPrefill[]>(simPrefillsProp ?? []);
  useEffect(() => {
    simPrefillsRef.current = simPrefills;
  }, [simPrefills]);

  // In standalone mode, parse prefills from URL (?src=sim)
  useEffect(() => {
    if (simPrefillsProp !== undefined) {
      setSimPrefills(simPrefillsProp);
      simPrefillsRef.current = simPrefillsProp;
      return;
    }
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("src") !== "sim") return;
    const prefills: SimPrefill[] = [];
    const msParam = params.get("ms");
    if (msParam) {
      const count = parseInt(msParam, 10);
      for (let i = 0; i < count; i++) {
        const productCode = params.get(`p${i}`) ?? "";
        const spaceId = params.get(`s${i}`) ?? "parede";
        const w = parseFloat(params.get(`w${i}`) ?? "");
        const h = parseFloat(params.get(`h${i}`) ?? "");
        prefills.push({ productCode, spaceId, w: isNaN(w) ? undefined : w, h: isNaN(h) ? undefined : h });
      }
    } else {
      const productCode = params.get("produto") ?? "";
      const spaceId = params.get("space") ?? "parede";
      const w = parseFloat(params.get("w") ?? "");
      const h = parseFloat(params.get("h") ?? "");
      if (productCode || spaceId !== "parede") {
        prefills.push({ productCode, spaceId, w: isNaN(w) ? undefined : w, h: isNaN(h) ? undefined : h });
      }
    }
    if (prefills.length > 0) {
      setSimPrefills(prefills);
      simPrefillsRef.current = prefills;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Scroll helpers ────────────────────────────────────────────────────────
  const topRef = useRef<HTMLDivElement | null>(null);
  const stepInit = useRef(true);
  useEffect(() => {
    if (stepInit.current) { stepInit.current = false; return; }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const scrollZoneRef = useRef<string | null>(null);
  useEffect(() => {
    const id = scrollZoneRef.current;
    if (!id) return;
    const z = zones.find((zz) => zz.id === id);
    if (!z) { scrollZoneRef.current = null; return; }
    if (z.detecting) return;
    scrollZoneRef.current = null;
    const t = setTimeout(() => {
      document.getElementById(`zone-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 60);
    return () => clearTimeout(t);
  }, [zones]);

  // ── File upload ───────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File | undefined | null) => {
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) return;
    setError(null);
    try {
      const { dataUrl, w, h } = await normalizeImage(file);
      setPhotoData(dataUrl);
      setPhotoDims(w && h ? { w, h } : null);
      setResult(null);
      setZones([]);
      setActiveZoneId(null);
      setLeadSubmitted(embeddedMode);
      vizRenderIdRef.current = "";
      setStep("zones");
    } catch {
      setError("Não foi possível ler essa imagem. Tente outra foto (JPG ou PNG).");
    }
  }, [embeddedMode]);

  // ── Zone management ───────────────────────────────────────────────────────
  const productById = useCallback((id: string) => products.find((p) => p.id === id) ?? null, [products]);

  const resolveZonePrefill = useCallback(
    (zoneIdx: number): { productId: string; surface: string; customLabel: string; width: string; height: string } => {
      const pf = simPrefillsRef.current[zoneIdx];
      const defaultProduct = products[0]?.id ?? "";
      if (!pf) return { productId: defaultProduct, surface: "parede", customLabel: "", width: "", height: "" };
      const prod = products.find((p) => p.code === pf.productCode);
      const knownSpace = VIZ_SPACES.some((s) => s.id === pf.spaceId);
      return {
        productId: prod?.id ?? defaultProduct,
        surface: knownSpace ? pf.spaceId : (pf.spaceId ? "__custom__" : "parede"),
        customLabel: knownSpace ? "" : (pf.spaceId ?? ""),
        width: pf.w ? String(pf.w) : "",
        height: pf.h ? String(pf.h) : "",
      };
    },
    [products]
  );

  const updateZone = useCallback((id: string, patch: Partial<Zone>) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }, []);

  const removeZone = useCallback((id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    setActiveZoneId((cur) => (cur === id ? null : cur));
  }, []);

  const detectInto = useCallback(
    async (id: string, colorIdx: number, nx: number, ny: number) => {
      if (!photoData) return;
      updateZone(id, { detecting: true });
      try {
        const res = await fetch("/api/visualizador/detect-surface", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photo: photoData, point: { x: nx, y: ny }, width: photoDims?.w, height: photoDims?.h }),
        });
        const j = (await res.json()) as { mask?: string; polygon?: Array<[number, number]>; rect?: Rect };
        if (res.ok && typeof j.mask === "string") {
          try {
            const { url, rect } = await maskToOverlay(j.mask, ZONE_COLORS[colorIdx % ZONE_COLORS.length]);
            updateZone(id, { maskUrl: url, rect, polygon: null, detecting: false });
            return;
          } catch { /* fall through */ }
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

  const tapAddSurface = useCallback(
    (nx: number, ny: number) => {
      if (!photoData) return;
      const id = `z-${Date.now()}`;
      const idx = zones.length;
      const pf = resolveZonePrefill(idx);
      setZones((prev) => [...prev, {
        id, label: `Área ${idx + 1}`, surface: pf.surface, customLabel: pf.customLabel,
        productId: pf.productId, polygon: null, maskUrl: null, rect: null, manual: false,
        instruction: "", width: pf.width, height: pf.height, detecting: true,
      }]);
      setActiveZoneId(id);
      scrollZoneRef.current = id;
      void detectInto(id, idx, nx, ny);
    },
    [photoData, zones.length, detectInto, resolveZonePrefill]
  );

  const redetectZone = useCallback(
    (id: string, nx: number, ny: number) => {
      const idx = zones.findIndex((z) => z.id === id);
      void detectInto(id, idx < 0 ? 0 : idx, nx, ny);
    },
    [zones, detectInto]
  );

  const onTapPhoto = useCallback(
    (nx: number, ny: number) => {
      if (retargetId) { redetectZone(retargetId, nx, ny); setRetargetId(null); }
      else { tapAddSurface(nx, ny); }
    },
    [retargetId, redetectZone, tapAddSurface]
  );

  const drawAddRect = useCallback(
    (rect: Rect) => {
      const id = `z-${Date.now()}`;
      const idx = zones.length;
      const pf = resolveZonePrefill(idx);
      setZones((prev) => [...prev, {
        id, label: `Área ${idx + 1}`, surface: pf.surface, customLabel: pf.customLabel,
        productId: pf.productId, polygon: null, maskUrl: null, rect, manual: true,
        instruction: "", width: pf.width, height: pf.height, detecting: false,
      }]);
      setActiveZoneId(id);
      scrollZoneRef.current = id;
    },
    [zones.length, resolveZonePrefill]
  );

  const addTextZone = useCallback(() => {
    const id = `z-${Date.now()}`;
    const idx = zones.length;
    const pf = resolveZonePrefill(idx);
    setZones((prev) => [...prev, {
      id, label: `Área ${idx + 1}`, surface: pf.surface, customLabel: pf.customLabel,
      productId: pf.productId, polygon: null, maskUrl: null, rect: null, manual: false,
      instruction: "", width: pf.width, height: pf.height, detecting: false,
    }]);
    setActiveZoneId(id);
    scrollZoneRef.current = id;
  }, [zones.length, resolveZonePrefill]);

  const zonesReady = zones.filter((z) => z.productId);
  const canReview = !!photoData && zonesReady.length > 0;
  const anyDetecting = zones.some((z) => z.detecting);

  const areaForZone = (z: Zone): string | undefined => {
    const txt = z.instruction.trim();
    if (txt) return txt;
    return applicationAreaFor(z.surface, z.customLabel) ?? undefined;
  };

  // ── Generate ──────────────────────────────────────────────────────────────
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
            photo: current, productId: prod.id, referenceUrl: prod.image_path,
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

      // Auto-save the render so admin can see it regardless of later steps
      const firstZ = zs[0];
      const firstProd = firstZ ? productById(firstZ.productId) : null;
      const localLabel = firstZ
        ? (VIZ_SPACES.find((s) => s.id === firstZ.surface)?.label ?? firstZ.customLabel) || "Área"
        : "Ambiente";
      void (async () => {
        try {
          const sr = await fetch("/api/visualizador/save-render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: vizRenderIdRef.current || undefined,
              image: current,
              local: localLabel,
              productName: firstProd?.name ?? null,
              productCode: firstProd?.code ?? null,
              name: pendingLeadRef.current.name || undefined,
              phone: pendingLeadRef.current.phone || undefined,
            }),
          });
          if (sr.ok) {
            const sd = (await sr.json()) as { id?: string };
            if (sd.id) vizRenderIdRef.current = sd.id;
          }
        } catch {}
      })();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar a visualização.");
    } finally {
      setGenerating(false);
      setProgress(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoData, zones, productById]);

  // ── Lead submit (standalone mode) ─────────────────────────────────────────
  const handleLeadSubmit = useCallback(() => {
    if (!leadName.trim() || !leadPhone.trim()) return;
    pendingLeadRef.current = { name: leadName.trim(), phone: leadPhone.trim() };
    setLeadSubmitted(true);
    const id = vizRenderIdRef.current;
    if (id) {
      void fetch("/api/visualizador/save-render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: leadName.trim(), phone: leadPhone.trim() }),
      }).catch(() => {});
    }
  }, [leadName, leadPhone]);

  // ── Download ──────────────────────────────────────────────────────────────
  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = "orbital-visualizacao.png";
    a.click();
  };

  // ── Standalone: multi-photo and "go to simulador" ─────────────────────────
  const currentAmbientes = useCallback(
    (thumb: string, isRender: boolean): SavedAmbiente[] =>
      zones.filter((z) => z.productId).map((z) => {
        const prod = productById(z.productId);
        const local = z.surface === "__custom__"
          ? z.customLabel.trim() || "Área"
          : VIZ_SPACES.find((s) => s.id === z.surface)?.label ?? "Parede";
        return {
          key: `${z.id}-${Date.now()}`,
          spaceId: z.surface === "__custom__" ? null : z.surface,
          local, width: parseDim(z.width), height: parseDim(z.height),
          productCode: prod?.code ?? "", productName: prod?.name ?? "",
          productImage: prod?.image_path ?? "", thumb, isRender,
        };
      }),
    [zones, productById]
  );

  const addAnotherPhoto = () => {
    if (result) setSavedAmbientes((prev) => [...prev, ...currentAmbientes(result, true)]);
    setPhotoData(null); setZones([]); setActiveZoneId(null);
    setResult(null); setError(null); setStep("upload");
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
    setProceeding(true);
    let url = simuladorHref;
    const existingId = vizRenderIdRef.current;
    if (existingId) {
      try {
        await fetch("/api/visualizador/save-render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: existingId, name: leadName.trim() || undefined, phone: leadPhone.trim() || undefined }),
        });
      } catch {}
      url += `${url.includes("?") ? "&" : "?"}viz_render=${encodeURIComponent(existingId)}`;
    } else {
      const seen = new Set<string>();
      const renders = allAmbientes.filter((a) => {
        if (!a.isRender || !a.thumb.startsWith("data:") || seen.has(a.thumb)) return false;
        seen.add(a.thumb); return true;
      });
      let renderId: string | undefined;
      for (const a of renders) {
        try {
          const res = await fetch("/api/visualizador/save-render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: renderId, image: a.thumb, local: a.local,
              productName: a.productName, productCode: a.productCode,
              name: leadName.trim() || undefined, phone: leadPhone.trim() || undefined,
            }),
          });
          if (res.ok) { const data = (await res.json()) as { id?: string }; if (data.id) renderId = data.id; }
        } catch {}
      }
      if (renderId) url += `${url.includes("?") ? "&" : "?"}viz_render=${encodeURIComponent(renderId)}`;
    }
    window.location.assign(url);
  }, [proceeding, simuladorHref, allAmbientes, leadName, leadPhone]);

  // ── Embedded: "Ver minha simulação" handler ───────────────────────────────
  const handleEmbeddedComplete = useCallback(() => {
    onComplete?.(vizRenderIdRef.current || undefined);
  }, [onComplete]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div ref={topRef} className="scroll-mt-24" />

      {/* Stepper — only in standalone mode */}
      {!embeddedMode && (
        <section className="px-4 sm:px-6 pt-10 pb-2 max-w-[1280px] mx-auto">
          <WizStepper step={step} />
        </section>
      )}

      <section className={embeddedMode ? "" : "px-4 sm:px-6 pb-12 max-w-[1280px] mx-auto"}>
        {step === "upload" && (
          <UploadStep
            fileInputRef={fileInputRef}
            dragOver={dragOver}
            setDragOver={setDragOver}
            handleFile={handleFile}
            error={error}
            hasBanked={savedAmbientes.length > 0}
            simPrefills={simPrefills}
            products={products}
            embeddedMode={embeddedMode}
            onSkip={onSkip}
          />
        )}

        {step === "zones" && photoData && (
          <ZonesStep
            photoData={photoData}
            zones={zones}
            activeZoneId={activeZoneId}
            setActiveZoneId={setActiveZoneId}
            onTapPhoto={onTapPhoto}
            onDrawRect={drawAddRect}
            onAddTextZone={addTextZone}
            updateZone={updateZone}
            removeZone={removeZone}
            retargetId={retargetId}
            setRetargetId={setRetargetId}
            anyDetecting={anyDetecting}
            products={products}
            loadingProducts={loadingProducts}
            productById={productById}
            canReview={canReview}
            simPrefills={simPrefills}
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
            leadSubmitted={leadSubmitted}
            leadName={leadName}
            leadPhone={leadPhone}
            onLeadNameChange={setLeadName}
            onLeadPhoneChange={setLeadPhone}
            onLeadSubmit={handleLeadSubmit}
            onRetry={() => setStep("zones")}
            onRegenerate={generate}
            onDownload={download}
            onAddPhoto={addAnotherPhoto}
            embeddedMode={embeddedMode}
            onEmbeddedComplete={handleEmbeddedComplete}
          />
        )}

        {/* Standalone: continue to simulador panel */}
        {!embeddedMode && allAmbientes.length > 0 && (step === "result" || savedAmbientes.length > 0) && (
          <div className="mt-10 border border-[#e2e2e2] rounded-sm p-5 sm:p-6 bg-[#fbfbfa]">
            <p className="text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#002045] mb-1">
              Continuar para o orçamento
            </p>
            <p className="text-[#74777f] text-xs font-[var(--font-inter)] mb-4">
              {allAmbientes.length} {allAmbientes.length === 1 ? "área" : "áreas"} pronta{allAmbientes.length === 1 ? "" : "s"} para o orçamento.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {quoteReady && leadSubmitted ? (
                <button
                  type="button"
                  onClick={goToSimulador}
                  disabled={proceeding}
                  className="inline-flex items-center justify-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-[#1a365d] transition-colors disabled:opacity-70 disabled:cursor-wait"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h8M8 14h4" />
                  </svg>
                  {proceeding ? "Preparando…" : "Simular orçamento"}
                </button>
              ) : (
                <span className="inline-flex items-center justify-center gap-2 bg-[#e8e8e6] text-[#a0a3a9] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 cursor-not-allowed">
                  Simular orçamento
                </span>
              )}
              <p className="text-[#74777f] text-xs font-[var(--font-inter)] leading-relaxed">
                {!leadSubmitted
                  ? "Visualize o resultado para continuar."
                  : quoteReady
                  ? "Cada área já vai preenchida — sem digitar nada de novo."
                  : "Informe as medidas das áreas para levar tudo preenchido."}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function WizStepper({ step }: { step: VizStep }) {
  const idx = STEP_LABELS.findIndex((s) => s.id === step);
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {STEP_LABELS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.id} className="flex items-center gap-2 sm:gap-3 flex-1 last:flex-none">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold font-[var(--font-inter)] flex items-center justify-center ${active ? "bg-[#002045] text-white" : done ? "bg-[#3b6934] text-white" : "bg-[#e8e8e6] text-[#a0a3a9]"}`}>
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
  );
}

function UploadStep({
  fileInputRef, dragOver, setDragOver, handleFile, error, hasBanked, simPrefills, products, embeddedMode, onSkip,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleFile: (f: File | undefined | null) => void;
  error: string | null;
  hasBanked: boolean;
  simPrefills?: SimPrefill[];
  products?: VizProduct[];
  embeddedMode?: boolean;
  onSkip?: () => void;
}) {
  const simBanner = React.useMemo(() => {
    if (!simPrefills?.length || !products?.length) return null;
    if (simPrefills.length === 1) {
      const pf = simPrefills[0];
      const prod = products.find((p) => p.code === pf.productCode);
      const spaceLabel = VIZ_SPACES.find((s) => s.id === pf.spaceId)?.label ?? pf.spaceId;
      return prod ? `${prod.name} · ${spaceLabel}` : spaceLabel;
    }
    const names = simPrefills.map((pf) => {
      const prod = products.find((p) => p.code === pf.productCode);
      return prod?.name ?? pf.productCode;
    }).filter(Boolean);
    return `${simPrefills.length} modelos: ${names.join(", ")}`;
  }, [simPrefills, products]);

  return (
    <div className={`grid gap-10 items-start mt-6 ${embeddedMode ? "grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]" : "grid lg:grid-cols-[1.1fr_0.9fr]"}`}>
      <div>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
          className={`cursor-pointer border-2 border-dashed rounded-sm flex flex-col items-center justify-center text-center px-6 py-20 transition-colors ${dragOver ? "border-[#3b6934] bg-[#f3f8f1]" : "border-[#cdd3dd] bg-[#f9f9f7] hover:border-[#002045]"}`}
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
        {simBanner && (
          <div className="mt-4 border border-[#bcd0e8] bg-[#f5f8fc] px-4 py-3">
            <p className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#002045] mb-0.5">
              {embeddedMode ? "Produto selecionado" : "Vindo do Simulador"}
            </p>
            <p className="text-[#43474e] text-sm font-[var(--font-inter)]">
              {simBanner}.{" "}
              {(simPrefills?.length ?? 0) > 1
                ? "Os modelos serão pré-selecionados conforme você adiciona as áreas."
                : "O modelo será pré-selecionado quando você marcar a área."}
            </p>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

        {embeddedMode && onSkip && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={onSkip}
              className="flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors"
            >
              Pular esta etapa
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#3b6934] mb-4">Como funciona</p>
        <ol className="space-y-5">
          {[
            { n: "1", t: "Envie a foto", d: "Use uma foto bem iluminada e de frente para o ambiente." },
            { n: "2", t: "Toque nas superfícies", d: "Toque numa parede, teto ou móvel — a IA marca a área. Escolha o acabamento de cada uma." },
            { n: "3", t: "Revise", d: "Confira as áreas, modelos e medidas antes de gerar." },
            { n: "4", t: "Gere e veja", d: embeddedMode ? "A IA aplica cada modelo na sua área — resultado em segundos." : "A IA aplica cada modelo na sua área — e tudo vai pronto para o orçamento." },
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

type ZoneMode = "tap" | "draw";

function ZonesStep({
  photoData, zones, activeZoneId, setActiveZoneId, onTapPhoto, onDrawRect, onAddTextZone,
  updateZone, removeZone, retargetId, setRetargetId, anyDetecting, products, loadingProducts,
  productById, canReview, simPrefills, onBack, onReview,
}: {
  photoData: string;
  zones: Zone[];
  activeZoneId: string | null;
  setActiveZoneId: (id: string | null) => void;
  onTapPhoto: (nx: number, ny: number) => void;
  onDrawRect: (rect: Rect) => void;
  onAddTextZone: () => void;
  updateZone: (id: string, patch: Partial<Zone>) => void;
  removeZone: (id: string) => void;
  retargetId: string | null;
  setRetargetId: (id: string | null) => void;
  anyDetecting: boolean;
  products: VizProduct[];
  loadingProducts: boolean;
  productById: (id: string) => VizProduct | null;
  canReview: boolean;
  simPrefills?: SimPrefill[];
  onBack: () => void;
  onReview: () => void;
}) {
  const [mode, setMode] = useState<ZoneMode>("tap");

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start mt-6">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mr-1">Como marcar:</span>
          <div className="inline-flex border border-[#e2e2e2] rounded-sm overflow-hidden">
            {([{ id: "tap" as const, label: "Tocar" }, { id: "draw" as const, label: "Desenhar" }]).map((m) => (
              <button key={m.id} onClick={() => { setMode(m.id); setRetargetId(null); }}
                className={`px-3.5 py-2 text-[11px] font-bold font-[var(--font-inter)] transition-colors ${mode === m.id ? "bg-[#002045] text-white" : "text-[#74777f] hover:text-[#002045]"}`}>
                {m.label}
              </button>
            ))}
          </div>
          <button onClick={onAddTextZone}
            className="inline-flex items-center gap-1 px-3 py-2 text-[11px] font-bold font-[var(--font-inter)] text-[#3b6934] border border-[#bcd8b4] rounded-sm hover:bg-[#f3f8f1] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Descrever em texto
          </button>
        </div>

        <SurfaceCanvas
          photoData={photoData} zones={zones} activeZoneId={activeZoneId} setActiveZoneId={setActiveZoneId}
          mode={mode} onTapPhoto={onTapPhoto} onDrawRect={onDrawRect} updateZone={updateZone}
          busy={anyDetecting} retargeting={!!retargetId}
        />
        <p className="mt-3 text-[#74777f] text-xs font-[var(--font-inter)] leading-relaxed">
          {retargetId ? (
            <strong className="text-[#b4791e]">Toque no ponto certo da superfície para refazer a seleção.</strong>
          ) : mode === "tap" ? (
            <><strong>Tocar:</strong> toque numa superfície (parede, teto, móvel…) e a IA marca a área sozinha.</>
          ) : (
            <><strong>Desenhar:</strong> arraste sobre a foto para desenhar a área você mesmo.</>
          )}{" "}
          Você também pode <strong>Descrever em texto</strong> — escolha o que preferir.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={onBack}
            className="inline-flex items-center gap-2 border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:border-[#002045] transition-colors">
            Trocar foto
          </button>
          <button onClick={onReview} disabled={!canReview}
            className="inline-flex items-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3 hover:bg-[#1a365d] transition-colors disabled:opacity-50">
            Revisar e gerar →
          </button>
          {!canReview && (
            <span className="text-xs text-[#b4791e] font-[var(--font-inter)] self-center">
              Adicione uma área e atribua um acabamento.
            </span>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-24 space-y-3">
        <p className="text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#002045]">Áreas ({zones.length})</p>
        {zones.length === 0 && simPrefills && simPrefills.length > 0 && (
          <div className="border border-[#bcd0e8] bg-[#f5f8fc] px-3 py-2.5 mb-1">
            <p className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#002045] mb-0.5">Simulador</p>
            <p className="text-[#43474e] text-xs font-[var(--font-inter)]">
              {simPrefills.length === 1
                ? "Marque uma área — o modelo do Simulador será pré-selecionado."
                : `${simPrefills.length} modelos aguardando. Marque cada área e eles serão pré-selecionados em ordem.`}
            </p>
          </div>
        )}
        {zones.length === 0 && (
          <p className="text-[#74777f] text-sm font-[var(--font-inter)] border border-dashed border-[#cdd3dd] px-4 py-6 text-center">
            Toque, desenhe ou descreva uma área para começar.
          </p>
        )}
        {zones.map((z, i) => (
          <ZoneCard key={z.id} zone={z} index={i} active={activeZoneId === z.id} retargeting={retargetId === z.id}
            onSelect={() => setActiveZoneId(z.id)} onChange={(patch) => updateZone(z.id, patch)} onRemove={() => removeZone(z.id)}
            onRetarget={() => { setMode("tap"); setRetargetId(retargetId === z.id ? null : z.id); }}
            products={products} loadingProducts={loadingProducts} productById={productById}
          />
        ))}
        {zones.length > 0 && (
          <button onClick={onReview} disabled={!canReview}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50">
            Revisar e gerar →
          </button>
        )}
      </div>
    </div>
  );
}

function SurfaceCanvas({
  photoData, zones, activeZoneId, setActiveZoneId, mode, onTapPhoto, onDrawRect, updateZone, busy, retargeting,
}: {
  photoData: string; zones: Zone[]; activeZoneId: string | null; setActiveZoneId: (id: string | null) => void;
  mode: ZoneMode; onTapPhoto: (nx: number, ny: number) => void; onDrawRect: (rect: Rect) => void;
  updateZone: (id: string, patch: Partial<Zone>) => void; busy: boolean; retargeting: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef<null | { kind: "create"; sx: number; sy: number } | { kind: "move"; id: string; offX: number; offY: number; w: number; h: number } | { kind: "resize"; id: string; x: number; y: number }>(null);
  const [draft, setDraft] = useState<Rect | null>(null);
  const draftRef = useRef<Rect | null>(null);
  const setDraftBoth = (r: Rect | null) => { draftRef.current = r; setDraft(r); };

  const norm = (cx: number, cy: number) => {
    const el = ref.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (cx - r.left) / r.width)), y: Math.min(1, Math.max(0, (cy - r.top) / r.height)) };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (mode !== "tap") return;
    const p = norm(e.clientX, e.clientY);
    onTapPhoto(p.x, p.y);
  };

  const onBgPointerDown = (e: React.PointerEvent) => {
    if (mode !== "draw") return;
    const p = norm(e.clientX, e.clientY);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { kind: "create", sx: p.x, sy: p.y };
    setDraftBoth({ x: p.x, y: p.y, w: 0, h: 0 });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = norm(e.clientX, e.clientY);
    if (d.kind === "create") {
      setDraftBoth({ x: Math.min(d.sx, p.x), y: Math.min(d.sy, p.y), w: Math.abs(p.x - d.sx), h: Math.abs(p.y - d.sy) });
    } else if (d.kind === "move") {
      updateZone(d.id, { rect: { x: Math.min(1 - d.w, Math.max(0, p.x - d.offX)), y: Math.min(1 - d.h, Math.max(0, p.y - d.offY)), w: d.w, h: d.h } });
    } else if (d.kind === "resize") {
      updateZone(d.id, { rect: { x: d.x, y: d.y, w: Math.max(0.03, Math.min(1 - d.x, p.x - d.x)), h: Math.max(0.03, Math.min(1 - d.y, p.y - d.y)) } });
    }
  };
  const onPointerUp = () => {
    const d = drag.current;
    const f = draftRef.current;
    if (d?.kind === "create" && f && f.w > 0.03 && f.h > 0.03) onDrawRect(f);
    drag.current = null; setDraftBoth(null);
  };

  return (
    <div ref={ref} onClick={handleClick} onPointerDown={onBgPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
      className={`relative bg-[#11151b] rounded-sm overflow-hidden select-none touch-none ${mode === "draw" || retargeting ? "cursor-crosshair" : "cursor-pointer"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoData} alt="Seu ambiente" className="block w-full h-auto pointer-events-none" />
      {zones.map((z) => z.maskUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={z.id} src={z.maskUrl} alt="" className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity ${z.id === activeZoneId ? "opacity-100" : "opacity-75"}`} />
      ) : null)}
      <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
        {zones.map((z, i) => {
          if (!z.polygon || z.polygon.length < 3) return null;
          const color = ZONE_COLORS[i % ZONE_COLORS.length];
          const active = z.id === activeZoneId;
          return <polygon key={z.id} points={z.polygon.map(([x, y]) => `${x},${y}`).join(" ")} fill={color} fillOpacity={active ? 0.42 : 0.26} stroke={color} strokeWidth={active ? 0.007 : 0.004} strokeLinejoin="round" />;
        })}
      </svg>
      {zones.map((z, i) => {
        if (!z.rect) return null;
        const color = ZONE_COLORS[i % ZONE_COLORS.length];
        return (
          <button key={z.id} onClick={(e) => { e.stopPropagation(); setActiveZoneId(z.id); }}
            style={{ left: `${z.rect.x * 100}%`, top: `${z.rect.y * 100}%`, background: color }}
            className="absolute -translate-y-1/2 text-white text-[10px] font-bold font-[var(--font-inter)] px-1.5 py-0.5 rounded-sm">
            {z.label}
          </button>
        );
      })}
      {zones.map((z, i) => {
        if (!z.manual || !z.rect) return null;
        const color = ZONE_COLORS[i % ZONE_COLORS.length];
        const rect = z.rect;
        const active = z.id === activeZoneId;
        return (
          <div key={z.id}
            onPointerDown={(e) => {
              if (mode !== "draw") return;
              e.stopPropagation(); setActiveZoneId(z.id);
              const p = norm(e.clientX, e.clientY);
              try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
              drag.current = { kind: "move", id: z.id, offX: p.x - rect.x, offY: p.y - rect.y, w: rect.w, h: rect.h };
            }}
            style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%`, borderColor: color, background: `${color}22` }}
            className={`absolute border-2 ${active ? "ring-2 ring-white/70" : ""} ${mode === "draw" ? "cursor-move" : "pointer-events-none"}`}>
            {mode === "draw" && (
              <span onPointerDown={(e) => {
                  e.stopPropagation(); setActiveZoneId(z.id);
                  try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
                  drag.current = { kind: "resize", id: z.id, x: rect.x, y: rect.y };
                }}
                style={{ background: color }}
                className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full border-2 border-white cursor-nwse-resize" />
            )}
          </div>
        );
      })}
      {draft && draft.w > 0 && (
        <div style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.w * 100}%`, height: `${draft.h * 100}%` }}
          className="absolute border-2 border-dashed border-white bg-white/10 pointer-events-none" />
      )}
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

function ZoneCard({ zone, index, active, retargeting, onSelect, onChange, onRemove, onRetarget, products, loadingProducts, productById }: {
  zone: Zone; index: number; active: boolean; retargeting: boolean;
  onSelect: () => void; onChange: (patch: Partial<Zone>) => void; onRemove: () => void; onRetarget: () => void;
  products: VizProduct[]; loadingProducts: boolean; productById: (id: string) => VizProduct | null;
}) {
  const color = ZONE_COLORS[index % ZONE_COLORS.length];
  const prod = productById(zone.productId);
  const sanitizeDim = (v: string) => v.replace(/[^0-9.,]/g, "").replace(",", ".");
  const [lineFilter, setLineFilter] = useState<ProductLine | "Todas">("Todas");
  const list = lineFilter === "Todas" ? products : products.filter((p) => p.linha === lineFilter);

  return (
    <div id={`zone-${zone.id}`} onClick={onSelect}
      className={`scroll-mt-24 bg-white border rounded-sm p-4 cursor-pointer transition-colors ${active ? "border-[#002045] shadow-sm" : "border-[#e2e2e2] hover:border-[#86a0cd]"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
          <input value={zone.label} onClick={(e) => e.stopPropagation()} onChange={(e) => onChange({ label: e.target.value })}
            className="text-sm font-semibold text-[#002045] font-[var(--font-inter)] bg-transparent border-b border-transparent focus:border-[#e2e2e2] focus:outline-none min-w-0 w-28" />
        </div>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Remover área" className="text-[#b42318] hover:text-[#7a1610]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
        </button>
      </div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-[var(--font-inter)]">
          {zone.detecting ? <span className="text-[#74777f]">Detectando superfície…</span>
            : zone.polygon || zone.maskUrl ? <span className="text-[#2f5429]">Superfície detectada ✓</span>
            : zone.manual && zone.rect ? <span className="text-[#2f5429]">Área desenhada ✓</span>
            : <span className="text-[#b4791e]">Descreva o local em texto abaixo</span>}
        </p>
        <button onClick={(e) => { e.stopPropagation(); onRetarget(); }}
          className={`text-[10px] font-bold font-[var(--font-inter)] ${retargeting ? "text-[#b4791e]" : "text-[#1e5fb4] hover:underline"}`}>
          {retargeting ? "Toque na foto…" : "Refazer seleção"}
        </button>
      </div>
      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Tipo de superfície</label>
      <select value={zone.surface} onClick={(e) => e.stopPropagation()} onChange={(e) => onChange({ surface: e.target.value })}
        className="w-full border border-[#e2e2e2] px-2.5 py-2 text-sm font-[var(--font-inter)] text-[#002045] bg-white focus:outline-none focus:border-[#002045] mb-2">
        {VIZ_SPACES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        <option value="__custom__">Outro…</option>
      </select>
      {zone.surface === "__custom__" && (
        <input value={zone.customLabel} onClick={(e) => e.stopPropagation()} onChange={(e) => onChange({ customLabel: e.target.value })}
          placeholder="ex: parede atrás da TV" className="w-full border border-[#e2e2e2] px-2.5 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] mb-2" />
      )}
      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1 mt-1">
        Onde aplicar <span className="normal-case font-normal">(opcional)</span>
      </label>
      <textarea value={zone.instruction} onClick={(e) => e.stopPropagation()} onChange={(e) => onChange({ instruction: e.target.value })}
        rows={2} placeholder="ex: nas paredes cinza ao fundo, atrás do sofá"
        className="w-full border border-[#e2e2e2] px-2.5 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] mb-1 resize-none" />
      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1 mt-1">
        Acabamento {prod ? `· ${prod.name}` : ""}
      </label>
      <div className="flex flex-wrap gap-1 mb-2" onClick={(e) => e.stopPropagation()}>
        {(["Todas", ...LINE_ORDER] as const).map((l) => (
          <button key={l} onClick={() => setLineFilter(l)}
            className={`px-2 py-0.5 text-[10px] font-semibold font-[var(--font-inter)] rounded-full transition-colors ${lineFilter === l ? "bg-[#002045] text-white" : "bg-[#f0f0ee] text-[#74777f] hover:text-[#002045]"}`}>
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

function ReviewStep({ photoData, zones, productById, onBack, onGenerate }: {
  photoData: string; zones: Zone[]; productById: (id: string) => VizProduct | null; onBack: () => void; onGenerate: () => void;
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
                  <span className="col-span-2"><span className="text-[#74777f]">Onde:</span>{" "}
                    {z.instruction.trim() ? z.instruction.trim() : z.polygon || z.maskUrl || (z.manual && z.rect) ? "Área marcada na foto" : "Parede principal"}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap gap-3">
          <button onClick={onBack} className="inline-flex items-center gap-2 border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:border-[#002045] transition-colors">← Voltar</button>
          <button onClick={onGenerate} className="inline-flex items-center gap-2 bg-[#3b6934] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3 hover:bg-[#2f5429] transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z" /></svg>
            Gerar visualização
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultStep({
  photoData, result, generating, progress, error,
  leadSubmitted, leadName, leadPhone, onLeadNameChange, onLeadPhoneChange, onLeadSubmit,
  onRetry, onRegenerate, onDownload, onAddPhoto,
  embeddedMode, onEmbeddedComplete,
}: {
  photoData: string | null; result: string | null; generating: boolean;
  progress: { i: number; total: number; label: string } | null; error: string | null;
  leadSubmitted: boolean; leadName: string; leadPhone: string;
  onLeadNameChange: (v: string) => void; onLeadPhoneChange: (v: string) => void; onLeadSubmit: () => void;
  onRetry: () => void; onRegenerate: () => void; onDownload: () => void; onAddPhoto: () => void;
  embeddedMode?: boolean; onEmbeddedComplete?: () => void;
}) {
  const showLeadOverlay = !embeddedMode && !leadSubmitted && !error;
  const leadReady = leadName.trim().length > 0 && leadPhone.trim().length > 0;
  const resultReady = !generating && !!result;

  return (
    <div className="mt-6">
      <div className="relative bg-[#11151b] rounded-sm overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={result ?? photoData ?? ""} alt={result ? "Visualização gerada" : "Sua foto"}
          className={`block w-full h-auto${showLeadOverlay && result ? " blur-md scale-[1.02]" : ""}`} />
        <div className="pointer-events-none absolute top-3 left-3 bg-black/55 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <p className="text-white/90 text-xs font-[var(--font-inter)]">{result ? "Resultado gerado" : "Sua foto"}</p>
        </div>

        {/* Standalone: lead capture overlay */}
        {showLeadOverlay && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-5 px-4 py-8">
            {generating && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 border-2 border-white/30 border-t-[#a1d494] rounded-full animate-spin flex-shrink-0" />
                <p className="text-white font-[var(--font-inter)] text-sm">
                  {progress ? `Aplicando ${progress.label} (${progress.i} de ${progress.total})…` : "Gerando…"}
                </p>
              </div>
            )}
            <div className="bg-white w-full max-w-xs px-5 py-5">
              {resultReady ? (
                <><p className="font-[var(--font-noto-serif)] text-[#002045] text-lg leading-snug mb-1">Sua visualização está pronta!</p>
                  <p className="text-[#74777f] text-sm font-[var(--font-inter)] mb-4">Informe seus dados para ver o resultado.</p></>
              ) : (
                <><p className="text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#002045] mb-1">Enquanto geramos sua visualização</p>
                  <p className="text-[#74777f] text-xs font-[var(--font-inter)] mb-4">Informe seus dados para receber o resultado.</p></>
              )}
              <div className="flex flex-col gap-2.5 mb-4">
                <input value={leadName} onChange={(e) => onLeadNameChange(e.target.value)} placeholder="Seu nome completo"
                  className="border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] bg-white w-full" />
                <input value={leadPhone} onChange={(e) => onLeadPhoneChange(e.target.value)} placeholder="WhatsApp (92) 99999-9999"
                  inputMode="tel" className="border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] bg-white w-full"
                  onKeyDown={(e) => { if (e.key === "Enter" && leadReady) onLeadSubmit(); }} />
              </div>
              <button onClick={onLeadSubmit} disabled={!leadReady}
                className="w-full inline-flex items-center justify-center bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-3 hover:bg-[#1a365d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {resultReady ? "Ver resultado →" : "Salvar e aguardar →"}
              </button>
            </div>
          </div>
        )}

        {/* Spinner shown when generating (standalone: after lead submitted; embedded: always) */}
        {generating && (leadSubmitted || embeddedMode) && (
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

      {!generating && (leadSubmitted || !!error) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {/* Embedded mode: "Ver minha simulação" CTA */}
          {embeddedMode && result && (
            <button onClick={onEmbeddedComplete}
              className="inline-flex items-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-[#1a365d] transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              Ver minha simulação
            </button>
          )}
          {/* Standalone: download + add photo */}
          {!embeddedMode && result && leadSubmitted && (
            <>
              <button onClick={onDownload} className="inline-flex items-center gap-2 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#1a365d] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                Baixar
              </button>
              <button onClick={onAddPhoto} className="inline-flex items-center gap-2 border border-[#3b6934] text-[#3b6934] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#f3f8f1] transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                Adicionar outra foto
              </button>
            </>
          )}
          {/* Download also shown in embedded mode */}
          {embeddedMode && result && (
            <button onClick={onDownload} className="inline-flex items-center gap-2 border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:border-[#002045] transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              Baixar imagem
            </button>
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
