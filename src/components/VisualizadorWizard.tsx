"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { applicationAreaFor, DEFAULT_PANEL_WIDTH_M, DEFAULT_PANEL_HEIGHT_M } from "@/lib/render-prompt";
import {
  type Quad,
  panelLayout,
  tileTexture,
  projectTextureToQuad,
  transferLuminance,
} from "@/lib/texture-projection";

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
  // Flat, front-on, glare-free slab texture for the deterministic pixel-exact
  // projection. When absent, the zone falls back to the generative render path.
  render_texture_path?: string | null;
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
  // Four wall corners (normalized 0..1, TL/TR/BR/BL) for pixel-exact projection.
  // Pre-filled from the mask, user-adjustable. Null until the projection flow
  // captures it; the generative path ignores it.
  quad?: Quad | null;
  // True once the user pressed "Atualizar pontos": the corner handles hide and
  // SAM2 has re-detected the surface from the adjusted corners. Recallable.
  quadConfirmed?: boolean;
  // Which engine produced the current surface ("fal" = precise SAM2, "gemini" =
  // coarse polygon fallback), and whether the last detection failed entirely.
  // Surfaced in the zone card so SAM2 misconfiguration is visible, not silent.
  detectEngine?: "fal" | "gemini" | null;
  detectFailed?: boolean;
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

function loadImage(src: string, cors = false): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    // Cross-origin textures (Supabase storage) must be loaded with CORS or the
    // canvas becomes tainted and toDataURL/getImageData throw — which silently
    // breaks the deterministic projection. Set it BEFORE assigning src.
    if (cors) im.crossOrigin = "anonymous";
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

async function maskToOverlay(
  maskUrl: string,
  hex: string
): Promise<{ url: string; rect: Rect | null; coverage: number }> {
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
  let minX = w, minY = h, maxX = 0, maxY = 0, any = false, count = 0;
  for (let p = 0, pi = 0; p < w * h; p++, pi += 4) {
    const on = hasAlpha ? src[pi + 3] > 40 : src[pi] * 0.299 + src[pi + 1] * 0.587 + src[pi + 2] * 0.114 > 110;
    if (on) {
      od[pi] = r; od[pi + 1] = g; od[pi + 2] = b; od[pi + 3] = 125;
      const x = p % w; const y = (p / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      any = true; count++;
    } else { od[pi + 3] = 0; }
  }
  ctx.putImageData(out, 0, 0);
  const rect = any ? { x: minX / w, y: minY / h, w: (maxX - minX + 1) / w, h: (maxY - minY + 1) / h } : null;
  const coverage = w * h > 0 ? count / (w * h) : 0;
  return { url: c.toDataURL(), rect, coverage };
}

// Box-draw detection: intersect the detected surface with the rectangle the
// user drew. The drawn box is a region-of-interest, not the answer itself —
// SAM2/Gemini finds the real surface (clean edges, foreground objects like a
// mirror excluded), and we keep only the part of it inside the box. So a big
// box covering a whole wall yields that whole wall; a small box yields just
// that portion of the wall; and because the result is bounded by the box it
// can never run away across the photo. `overlayUrl` is a tinted mask overlay
// (alpha inside / transparent outside); `box` is normalized 0..1. Returns the
// clipped overlay + its new bounding box, or null if nothing remains.
async function clipOverlayToBox(overlayUrl: string, box: Rect): Promise<{ url: string; rect: Rect } | null> {
  const im = await loadImage(overlayUrl);
  const w = im.naturalWidth, h = im.naturalHeight;
  if (!w || !h) return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(im, 0, 0);
  // Keep only pixels inside the drawn box.
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = "#fff";
  ctx.fillRect(Math.round(box.x * w), Math.round(box.y * h), Math.round(box.w * w), Math.round(box.h * h));
  ctx.globalCompositeOperation = "source-over";
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = 0, maxY = 0, any = false;
  for (let p = 0, pi = 0; p < w * h; p++, pi += 4) {
    if (data[pi + 3] > 40) {
      const x = p % w, y = (p / w) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      any = true;
    }
  }
  if (!any) return null;
  return { url: c.toDataURL(), rect: { x: minX / w, y: minY / h, w: (maxX - minX + 1) / w, h: (maxY - minY + 1) / h } };
}

// Rasterizes a normalized polygon into a tinted overlay (same look as
// maskToOverlay) so the Gemini-polygon fallback can be clipped to the box the
// same way the fal mask is.
function polygonToOverlay(polygon: Array<[number, number]>, hex: string, w: number, h: number): string {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const { r, g, b } = hexToRgb(hex);
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.49)`;
  ctx.beginPath();
  polygon.forEach(([x, y], i) => {
    const px = x * w, py = y * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
  return c.toDataURL();
}

// ── Mask-stencil compositing ────────────────────────────────────────────────
// Gemini's render call is a full-image regeneration, not true inpainting — it
// only gets a soft "confine to this area" instruction. Chaining renders (each
// zone's output feeding the next zone's input) lets drift compound across
// zones. Instead of trusting the model's promise to leave everything else
// untouched, we enforce it ourselves: accept ONLY each zone's masked pixels
// from its AI output, onto a running composite that started as the pristine
// photo. Falls through maskUrl (precise SAM mask) → polygon (Gemini-fallback
// detection) → rect (manual zones) → null (text-only zones, no spatial info
// — caller then accepts that zone's output wholesale, same as before).
async function buildStencil(z: Zone, targetW: number, targetH: number, preferQuad = false): Promise<HTMLCanvasElement | null> {
  const c = document.createElement("canvas");
  c.width = targetW;
  c.height = targetH;
  const ctx = c.getContext("2d")!;

  const paintQuad = (q: Quad) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    q.forEach(([x, y], i) => {
      const px = x * targetW, py = y * targetH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    return c;
  };

  if (preferQuad && z.quad) return paintQuad(z.quad);
  if (z.maskUrl) {
    // maskUrl is the tinted overlay from maskToOverlay (alpha=125 inside /
    // 0 outside). Scale to targetW/targetH, then binarize alpha so no
    // partial edge value from the tint leaks into the composite.
    const im = await loadImage(z.maskUrl);
    ctx.drawImage(im, 0, 0, targetW, targetH);
    const id = ctx.getImageData(0, 0, targetW, targetH);
    for (let i = 3; i < id.data.length; i += 4) id.data[i] = id.data[i] > 20 ? 255 : 0;
    ctx.putImageData(id, 0, 0);
    return c;
  }
  if (z.polygon && z.polygon.length >= 3) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    z.polygon.forEach(([x, y], i) => {
      const px = x * targetW, py = y * targetH;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    return c;
  }
  if (z.rect && z.rect.w > 0 && z.rect.h > 0) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(z.rect.x * targetW, z.rect.y * targetH, z.rect.w * targetW, z.rect.h * targetH);
    return c;
  }
  if (z.quad) return paintQuad(z.quad);
  return null;
}

// Composites sourceDataUrl (this zone's full Gemini output) onto baseDataUrl
// (the running composite): keeps ONLY the pixels inside the zone's mask from
// source, everything else from base. Output is pinned to base's pixel
// dimensions regardless of source's actual size — drawImage's scale-to-fit
// absorbs any Gemini output-size wobble, same implicit-scaling idiom
// normalizeImage/maskToOverlay already rely on elsewhere in this file.
async function compositeMaskedRegion(baseDataUrl: string, sourceDataUrl: string, z: Zone, preferQuad = false): Promise<string> {
  const [baseImg, sourceImg] = await Promise.all([loadImage(baseDataUrl), loadImage(sourceDataUrl)]);
  const w = baseImg.naturalWidth, h = baseImg.naturalHeight;

  const stencil = await buildStencil(z, w, h, preferQuad);
  if (!stencil) return sourceDataUrl; // no spatial constraint available — trust output wholesale

  const cut = document.createElement("canvas");
  cut.width = w;
  cut.height = h;
  const cutCtx = cut.getContext("2d")!;
  cutCtx.drawImage(sourceImg, 0, 0, w, h);
  cutCtx.globalCompositeOperation = "destination-in";
  cutCtx.drawImage(stencil, 0, 0);

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const outCtx = out.getContext("2d")!;
  outCtx.drawImage(baseImg, 0, 0, w, h);
  outCtx.drawImage(cut, 0, 0);
  return out.toDataURL("image/jpeg", 0.92);
}

// Builds a clean white-on-black binary mask (PNG data URL) at w×h from the
// zone's spatial descriptor, to hand to the render API so Gemini paints only
// the real surface under the white region — following its true perspective and
// keeping foreground objects on top. Returns null for text-only zones (no
// spatial info), so the render falls back to the text/rect prompt as before.
async function buildMaskDataUrl(z: Zone, w: number, h: number): Promise<string | null> {
  const stencil = await buildStencil(z, w, h); // opaque inside / transparent outside
  if (!stencil) return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  // Paint pure white only where the stencil is opaque (color-independent: the
  // SAM overlay stencil carries the zone tint, not white — normalize it here).
  const white = document.createElement("canvas");
  white.width = w;
  white.height = h;
  const wctx = white.getContext("2d")!;
  wctx.fillStyle = "#fff";
  wctx.fillRect(0, 0, w, h);
  wctx.globalCompositeOperation = "destination-in";
  wctx.drawImage(stencil, 0, 0);
  ctx.drawImage(white, 0, 0);
  return c.toDataURL("image/png");
}

// A normalized rect → a TL/TR/BR/BL quad (axis-aligned). Used to seed a zone's
// adjustable 4-corner quad from its detected bounding box before the user nudges
// the corners to the wall's true perspective.
function rectToQuad(r: Rect): Quad {
  return [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x + r.w, r.y + r.h],
    [r.x, r.y + r.h],
  ];
}

function rectAroundPoint(nx: number, ny: number): Rect {
  const w = 0.46;
  const h = 0.36;
  return {
    x: Math.min(1 - w, Math.max(0, nx - w / 2)),
    y: Math.min(1 - h, Math.max(0, ny - h / 2)),
    w,
    h,
  };
}

// Perspective-aware quad from a set of normalized points: the 4 extreme corners
// by min/max of x±y (TL/TR/BR/BL). For an angled wall this starts the corners
// near the surface's real corners — far closer than an axis-aligned bbox, so the
// user barely has to nudge them. Returns null if the points are degenerate.
function quadFromPoints(pts: Array<[number, number]>): Quad | null {
  if (pts.length < 3) return null;
  let tl = pts[0], tr = pts[0], br = pts[0], bl = pts[0];
  let sTL = Infinity, sTR = -Infinity, sBR = -Infinity, sBL = Infinity;
  for (const p of pts) {
    const sum = p[0] + p[1], dif = p[0] - p[1];
    if (sum < sTL) { sTL = sum; tl = p; }
    if (dif > sTR) { sTR = dif; tr = p; }
    if (sum > sBR) { sBR = sum; br = p; }
    if (dif < sBL) { sBL = dif; bl = p; }
  }
  const q: Quad = [[tl[0], tl[1]], [tr[0], tr[1]], [br[0], br[1]], [bl[0], bl[1]]];
  // Reject if it collapsed (e.g. a thin sliver) — caller falls back to the rect.
  const area = Math.abs((q[2][0] - q[0][0]) * (q[2][1] - q[0][1]));
  return area > 0.0008 ? q : null;
}

// Same, but scans a tinted mask-overlay PNG's alpha for the extreme corners.
async function quadFromMaskUrl(maskUrl: string): Promise<Quad | null> {
  try {
    const im = await loadImage(maskUrl);
    const w = im.naturalWidth, h = im.naturalHeight;
    if (!w || !h) return null;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(im, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;
    const pts: Array<[number, number]> = [];
    const step = Math.max(1, Math.round(Math.min(w, h) / 240));
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (d[(y * w + x) * 4 + 3] > 40) pts.push([x / w, y / h]);
      }
    }
    return quadFromPoints(pts);
  } catch {
    return null;
  }
}

// Deterministic pixel-exact render for one zone: tiles the flat slab texture at
// panel scale, warps it into the zone's 4-corner quad (true perspective), and
// transfers the room's shading onto it. Returns a full-image PNG (the panel,
// transparent everywhere else) ready for compositeMaskedRegion to clip to the
// zone's mask. NO generative model touches the material → the finish is exact.
async function renderZoneProjection(
  textureUrl: string,
  quad: Quad,
  widthStr: string,
  heightStr: string,
  base: string,
  w: number,
  h: number
): Promise<string> {
  // Route absolute (cross-origin Supabase) textures through our same-origin
  // proxy so the canvas is never tainted (CORS-independent). Base photo is a
  // same-origin data URL.
  const texSrc = /^https?:\/\//.test(textureUrl)
    ? `/api/visualizador/texture-proxy?url=${encodeURIComponent(textureUrl)}`
    : textureUrl;
  const [tex, photo] = await Promise.all([loadImage(texSrc), loadImage(base)]);
  const { cols, rows } = panelLayout(parseDim(widthStr), parseDim(heightStr), DEFAULT_PANEL_WIDTH_M, DEFAULT_PANEL_HEIGHT_M);
  const tiled = tileTexture(tex, tex.naturalWidth || 1, tex.naturalHeight || 1, cols, rows);
  const projected = projectTextureToQuad(tiled, quad, w, h);
  const lit = transferLuminance(projected, photo, w, h);
  return lit.toDataURL("image/png");
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

export type VizStep = "upload" | "zones" | "result";
const STEP_LABELS: { id: VizStep; n: string; label: string }[] = [
  { id: "upload", n: "1", label: "Foto" },
  { id: "zones", n: "2", label: "Áreas e modelos" },
  { id: "result", n: "3", label: "Resultado" },
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
   * overlay, and call onComplete automatically the first time a generation
   * succeeds (no extra click) instead of handing off to /simulador.
   */
  embeddedMode?: boolean;
  /** Lead info from the parent (used for auto-saving the render). */
  prefilledLeadName?: string;
  prefilledLeadPhone?: string;
  /** Called once, right after the first successful generation, with the saved render id. */
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
  // Render mode. Default OFF = AI generative render fed the EXACT flat slab
  // texture as its reference (Gemini reproduces the real material and adds the
  // room's lighting/shadows). This is the reliable path. ON = deterministic
  // geometric projection — pixel-exact pattern but flat/fragile, kept behind the
  // toggle until it's solid. (Was reset to ON by a parallel edit; restored.)
  const [useProjection, setUseProjection] = useState(false);
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
  // Embedded mode: advance straight to the orçamento on the first successful
  // generation, no extra click. Guards against re-firing onComplete (which
  // triggers the parent's lead/quote submission + emails) on a regenerate.
  const autoAdvancedRef = useRef(false);

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
      const color = ZONE_COLORS[colorIdx % ZONE_COLORS.length];
      type DetectResp = { mask?: string; polygon?: Array<[number, number]>; rect?: Rect; engine?: string };
      const callDetect = async (skipFal: boolean): Promise<DetectResp | null> => {
        const res = await fetch("/api/visualizador/detect-surface", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photo: photoData, point: { x: nx, y: ny }, width: photoDims?.w, height: photoDims?.h, skipFal }),
        });
        return res.ok ? ((await res.json()) as DetectResp) : null;
      };
      try {
        // 1) Try fal SAM2 (point prompt). Its mask is only trustworthy if it
        //    actually covers a sensible area — a single tap often makes SAM2
        //    return an empty / pinhole / whole-image mask, which used to be
        //    accepted silently and looked like "nothing detected".
        let j = await callDetect(false);
        if (j && typeof j.mask === "string") {
          try {
            const { url, rect, coverage } = await maskToOverlay(j.mask, color);
            if (rect && coverage >= 0.005 && coverage <= 0.92) {
              updateZone(id, { maskUrl: url, rect, polygon: null, detecting: false, detectEngine: "fal", detectFailed: false });
              return;
            }
          } catch { /* fall through to Gemini retry */ }
          // 2) fal mask was empty/degenerate → retry forcing the Gemini polygon,
          //    which reliably traces the whole tapped surface.
          j = await callDetect(true);
        }
        if (j && Array.isArray(j.polygon)) {
          updateZone(id, { polygon: j.polygon, rect: j.rect ?? null, maskUrl: null, detecting: false, detectEngine: "gemini", detectFailed: false });
          return;
        }
        if (j && typeof j.mask === "string") {
          try {
            const { url, rect, coverage } = await maskToOverlay(j.mask, color);
            if (rect && coverage >= 0.005) {
              updateZone(id, { maskUrl: url, rect, polygon: null, detecting: false, detectEngine: j.engine === "fal" ? "fal" : "gemini", detectFailed: false });
              return;
            }
          } catch { /* fall through */ }
        }
        const fallback = rectAroundPoint(nx, ny);
        updateZone(id, {
          rect: fallback,
          quad: rectToQuad(fallback),
          quadConfirmed: false,
          maskUrl: null,
          polygon: null,
          manual: true,
          detecting: false,
          detectFailed: true,
          detectEngine: null,
        });
      } catch {
        const fallback = rectAroundPoint(nx, ny);
        updateZone(id, {
          rect: fallback,
          quad: rectToQuad(fallback),
          quadConfirmed: false,
          maskUrl: null,
          polygon: null,
          manual: true,
          detecting: false,
          detectFailed: true,
          detectEngine: null,
        });
      }
    },
    [photoData, photoDims, updateZone]
  );

  // Box-draw detection: the user drew a rectangle to mark roughly where the
  // surface is. We run SAM2/Gemini to find the real surface, then keep only the
  // part of it inside the drawn box (see clipOverlayToBox) — so the panel
  // follows the wall's true edges and excludes foreground objects (a mirror,
  // plant…), bounded by what the user marked. Falls back to the raw rect only
  // if detection returns nothing usable.
  const detectIntoFromBox = useCallback(
    async (id: string, colorIdx: number, rect: Rect) => {
      if (!photoData) return;
      updateZone(id, { detecting: true });
      const color = ZONE_COLORS[colorIdx % ZONE_COLORS.length];
      type DetectResp = { mask?: string; polygon?: Array<[number, number]>; rect?: Rect; engine?: string };
      const callDetect = async (skipFal: boolean): Promise<DetectResp | null> => {
        const res = await fetch("/api/visualizador/detect-surface", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photo: photoData, box: rect, width: photoDims?.w, height: photoDims?.h, skipFal }),
        });
        return res.ok ? ((await res.json()) as DetectResp) : null;
      };
      let engine: "fal" | "gemini" | null = null;
      try {
        // The drawn box is a region-of-interest, not the answer: SAM2/Gemini finds
        // the real surface (clean edges, foreground objects excluded) and we keep
        // only the part inside the box. CRITICAL: we must VALIDATE SAM2's mask the
        // same way the tap path does — a box prompt frequently returns an empty,
        // pinhole or whole-image mask, which previously got accepted silently and
        // left the zone as a bare rectangle. A bare rectangle lets the renderer
        // regenerate everything inside it (inventing furniture, changing the
        // model), so when SAM2 is degenerate we fall back to the Gemini polygon
        // tracer, which reliably outlines the whole surface.
        let overlayUrl: string | null = null;

        // 1) fal SAM2 (box prompt) — accept only if coverage is sane.
        let j = await callDetect(false);
        if (j && typeof j.mask === "string") {
          try {
            const { url, coverage } = await maskToOverlay(j.mask, color);
            if (coverage >= 0.005 && coverage <= 0.92) { overlayUrl = url; engine = "fal"; }
          } catch { /* fall through to Gemini retry */ }
          // 2) SAM2 mask empty/degenerate → force the Gemini polygon for the box.
          if (!overlayUrl) j = await callDetect(true);
        }

        // 3) Gemini polygon (the forced-fallback, or the first response when fal
        //    is unavailable). Rasterize it to a tinted overlay.
        if (!overlayUrl && j && Array.isArray(j.polygon) && j.polygon.length >= 3 &&
            photoDims && photoDims.w > 0 && photoDims.h > 0) {
          overlayUrl = polygonToOverlay(j.polygon, color, photoDims.w, photoDims.h);
          engine = "gemini";
        }
        // 4) A mask may still come back on the forced retry (rare) — last resort.
        if (!overlayUrl && j && typeof j.mask === "string") {
          try {
            const { url, coverage } = await maskToOverlay(j.mask, color);
            if (coverage >= 0.005) { overlayUrl = url; engine = j.engine === "fal" ? "fal" : "gemini"; }
          } catch { /* nothing usable */ }
        }

        if (overlayUrl) {
          const clipped = await clipOverlayToBox(overlayUrl, rect);
          if (clipped) {
            updateZone(id, { maskUrl: clipped.url, rect: clipped.rect, polygon: null, detecting: false, detectEngine: engine, detectFailed: false });
            return;
          }
        }
        // Both engines returned nothing usable — keep the drawn rect and flag it
        // so the UI can say "detection failed" instead of silently doing nothing.
        const existing = zones.find((z) => z.id === id);
        updateZone(id, {
          maskUrl: null,
          polygon: null,
          rect,
          quad: existing?.quad ?? rectToQuad(rect),
          quadConfirmed: false,
          manual: true,
          detecting: false,
          detectFailed: true,
          detectEngine: null,
        });
      } catch {
        const existing = zones.find((z) => z.id === id);
        updateZone(id, {
          rect,
          quad: existing?.quad ?? rectToQuad(rect),
          quadConfirmed: false,
          manual: true,
          detecting: false,
          detectFailed: true,
          detectEngine: null,
        });
      }
    },
    [photoData, photoDims, updateZone, zones]
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
        instruction: "", width: pf.width, height: pf.height, detecting: true,
      }]);
      setActiveZoneId(id);
      scrollZoneRef.current = id;
      void detectIntoFromBox(id, idx, rect);
    },
    [zones.length, resolveZonePrefill, detectIntoFromBox]
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

  // "Atualizar pontos": re-run SAM2 over the box the user framed with the 4
  // corners, then hide the handles. This is the explicit, on-demand re-detection
  // (we never re-run SAM2 on every corner drag — only when the user asks).
  const confirmQuad = useCallback(async (id: string) => {
    const z = zones.find((x) => x.id === id);
    if (z?.quad) {
      const xs = z.quad.map((p) => p[0]);
      const ys = z.quad.map((p) => p[1]);
      const x = Math.min(...xs), y = Math.min(...ys);
      const w = Math.max(...xs) - x, h = Math.max(...ys) - y;
      const idx = zones.findIndex((x) => x.id === id);
      if (w > 0.02 && h > 0.02) await detectIntoFromBox(id, idx < 0 ? 0 : idx, { x, y, w, h });
    }
    updateZone(id, { quadConfirmed: true });
  }, [zones, detectIntoFromBox, updateZone]);

  const zonesReady = zones.filter((z) => z.productId);
  const needsExactArea = useProjection && zonesReady.some((z) => {
    const prod = z.productId ? productById(z.productId) : null;
    return !!prod?.render_texture_path?.trim() && !z.quad && !z.rect;
  });
  const canGenerate = !!photoData && zonesReady.length > 0 && !needsExactArea;
  const anyDetecting = zones.some((z) => z.detecting);

  // Seed an adjustable 4-corner quad (from the detected box) for any zone whose
  // chosen product has a flat texture — that's what surfaces the corner handles
  // on the photo and enables pixel-exact projection. Runs once per zone (guarded
  // by !z.quad), so it never fights a user who's dragging the corners.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const z of zones) {
        if (z.quad) continue;
        const prod = z.productId ? productById(z.productId) : null;
        if (!prod?.render_texture_path?.trim()) continue;
        // Prefer a perspective-aware quad from the real surface shape; fall back
        // to the polygon, then the axis-aligned box.
        let q: Quad | null = null;
        if (z.maskUrl) q = await quadFromMaskUrl(z.maskUrl);
        if (!q && z.polygon && z.polygon.length >= 3) q = quadFromPoints(z.polygon);
        if (!q && z.rect) q = rectToQuad(z.rect);
        if (q && !cancelled) updateZone(z.id, { quad: q });
      }
    })();
    return () => { cancelled = true; };
  }, [zones, productById, updateZone]);

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
    // Each zone is rendered against the PRISTINE photo (not the running
    // composite) and then composited in by its own mask. This guarantees zones
    // are independent: a second zone's render can never see, alter, or be
    // confused by a panel already applied for the first — the recurring
    // multi-zone failure. The composite accumulates each zone's masked pixels.
    const base = photoData;
    let composite = photoData;
    // Photo pixel dimensions, used to build each zone's mask at the right size.
    // Compositing preserves these, so they stay constant across the loop.
    let dims = photoDims;
    if (!dims) {
      try {
        const im = await loadImage(photoData);
        dims = { w: im.naturalWidth, h: im.naturalHeight };
      } catch { dims = null; }
    }
    try {
      for (let i = 0; i < zs.length; i++) {
        const z = zs[i];
        const prod = productById(z.productId);
        if (!prod) continue;
        setProgress({ i: i + 1, total: zs.length, label: z.label });

        // ── Pixel-exact projection path ─────────────────────────────────────
        // When the product has a flat slab texture and the zone has a 4-corner
        // quad (seeded from the detected box, refined by the user), render the
        // panel deterministically: the EXACT swatch warped into perspective,
        // composited only under the zone's mask. No generative model touches the
        // material. If exact texture projection fails, stop and surface the
        // issue instead of silently falling through to Gemini.
        const textureUrl = prod.render_texture_path?.trim() || null;
        const quad: Quad | null = z.quad ?? (z.rect ? rectToQuad(z.rect) : null);
        if (useProjection && textureUrl && !quad) {
          throw new Error(`Ajuste a área de ${z.label} com os 4 pontos antes de gerar.`);
        }
        if (useProjection && textureUrl && quad && dims && dims.w > 0 && dims.h > 0) {
          try {
            const panel = await renderZoneProjection(textureUrl, quad, z.width, z.height, base, dims.w, dims.h);
            composite = await compositeMaskedRegion(composite, panel, z, true);
            continue; // zone done deterministically — skip the generative call
          } catch (e) {
            // Never silently fall back to Gemini when the user asked for exact
            // texture. A fallback can hallucinate the slab and alter the photo.
            console.error("[viz] exact texture projection failed:", e instanceof Error ? e.message : e);
            throw new Error(`Não consegui aplicar a textura exata em ${z.label}. Verifique os 4 pontos ou tente outro acabamento.`);
          }
        }

        // Hand Gemini the zone's exact mask (when it has one) so it paints only
        // the real surface, follows its perspective, and keeps foreground
        // objects on top — far more reliable than the bounding rect alone.
        let maskImage: string | null = null;
        if (dims && dims.w > 0 && dims.h > 0) {
          try { maskImage = await buildMaskDataUrl(z, dims.w, dims.h); } catch { maskImage = null; }
        }
        const reqBody = JSON.stringify({
          photo: base, productId: prod.id, referenceUrl: prod.image_path,
          finish: FINISH_BY_LINE[prod.linha],
          wallWidthM: parseDim(z.width) ?? undefined,
          wallHeightM: parseDim(z.height) ?? undefined,
          applicationArea: areaForZone(z),
          rect: z.rect ?? undefined,
          maskImage: maskImage ?? undefined,
        });
        // The image generator occasionally returns a transient capacity error
        // (the "error the first time, worked the second" case). Auto-retry once
        // on a server/network error before surfacing it, so the user doesn't
        // have to manually press generate again.
        let json: { image?: string; error?: string } | null = null;
        let lastErr = "Não foi possível gerar a visualização.";
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await fetch("/api/visualizador/render", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: reqBody,
            });
            const body = (await res.json()) as { image?: string; error?: string };
            if (res.ok && body.image) { json = body; break; }
            lastErr = body.error || lastErr;
            // Only retry transient server errors (5xx); a 4xx won't fix itself.
            if (res.status < 500 || attempt === 1) break;
          } catch {
            if (attempt === 1) break;
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
        if (!json || !json.image) throw new Error(lastErr);
        try {
          composite = await compositeMaskedRegion(composite, json.image, z);
        } catch {
          composite = json.image; // compositing failed — fall back rather than failing the whole render
        }
      }
      const current = composite;
      setResult(current);

      // Auto-save the render so admin can see it regardless of later steps
      const firstZ = zs[0];
      const firstProd = firstZ ? productById(firstZ.productId) : null;
      const localLabel = firstZ
        ? (VIZ_SPACES.find((s) => s.id === firstZ.surface)?.label ?? firstZ.customLabel) || "Área"
        : "Ambiente";
      // Per-zone summary for the WhatsApp caption (all areas + models).
      const items = zs.map((z) => {
        const p = productById(z.productId);
        const local = (VIZ_SPACES.find((s) => s.id === z.surface)?.label ?? z.customLabel) || "Área";
        return { local, productName: p?.name ?? null, productCode: p?.code ?? null };
      });
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
            items,
          }),
        });
        if (sr.ok) {
          const sd = (await sr.json()) as { id?: string };
          if (sd.id) vizRenderIdRef.current = sd.id;
        }
      } catch {}

      // Embedded mode: advance straight to the orçamento on the first
      // successful generation — no extra click. A later "Gerar novamente"
      // updates the saved render above but must not re-fire onComplete,
      // since that triggers the parent's one-time lead/quote submission.
      if (embeddedMode && !autoAdvancedRef.current) {
        autoAdvancedRef.current = true;
        onComplete?.(vizRenderIdRef.current || undefined);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar a visualização.");
    } finally {
      setGenerating(false);
      setProgress(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoData, zones, productById, embeddedMode, onComplete, useProjection]);

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
            onConfirmQuad={confirmQuad}
            updateZone={updateZone}
            removeZone={removeZone}
            retargetId={retargetId}
            setRetargetId={setRetargetId}
            anyDetecting={anyDetecting}
            products={products}
            loadingProducts={loadingProducts}
            productById={productById}
            canGenerate={canGenerate}
            needsExactArea={needsExactArea}
            simPrefills={simPrefills}
            onBack={() => setStep("upload")}
            onGenerate={generate}
            useProjection={useProjection}
            setUseProjection={setUseProjection}
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
            { n: "3", t: "Gere e veja", d: embeddedMode ? "A IA aplica cada modelo na sua área — resultado em segundos." : "A IA aplica cada modelo na sua área — e tudo vai pronto para o orçamento." },
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
  photoData, zones, activeZoneId, setActiveZoneId, onTapPhoto, onDrawRect, onAddTextZone, onConfirmQuad,
  updateZone, removeZone, retargetId, setRetargetId, anyDetecting, products, loadingProducts,
  productById, canGenerate, needsExactArea, simPrefills, onBack, onGenerate, useProjection, setUseProjection,
}: {
  photoData: string;
  zones: Zone[];
  activeZoneId: string | null;
  setActiveZoneId: (id: string | null) => void;
  onTapPhoto: (nx: number, ny: number) => void;
  onDrawRect: (rect: Rect) => void;
  onAddTextZone: () => void;
  onConfirmQuad: (id: string) => void;
  updateZone: (id: string, patch: Partial<Zone>) => void;
  removeZone: (id: string) => void;
  retargetId: string | null;
  setRetargetId: (id: string | null) => void;
  anyDetecting: boolean;
  products: VizProduct[];
  loadingProducts: boolean;
  productById: (id: string) => VizProduct | null;
  canGenerate: boolean;
  needsExactArea: boolean;
  simPrefills?: SimPrefill[];
  onBack: () => void;
  onGenerate: () => void;
  useProjection: boolean;
  setUseProjection: (v: boolean) => void;
}) {
  const [mode, setMode] = useState<ZoneMode>("tap");

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start mt-6">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mr-1">Como marcar:</span>
          <div className="inline-flex border border-[#e2e2e2] rounded-sm overflow-hidden">
            {([{ id: "tap" as const, label: "Tocar" }, { id: "draw" as const, label: "4 pontos" }]).map((m) => (
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
          busy={anyDetecting} retargeting={!!retargetId} onConfirmQuad={onConfirmQuad}
        />
        <p className="mt-3 text-[#74777f] text-xs font-[var(--font-inter)] leading-relaxed">
          {retargetId ? (
            <strong className="text-[#b4791e]">Toque no ponto certo da superfície para refazer a seleção.</strong>
          ) : mode === "tap" ? (
            <><strong>Tocar:</strong> toque numa superfície (parede, teto, móvel…) e a IA marca a área sozinha.</>
          ) : (
            <><strong>4 pontos:</strong> arraste para criar a área e ajuste os quatro cantos na foto.</>
          )}{" "}
          Você também pode <strong>Descrever em texto</strong> — escolha o que preferir.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={onBack}
            className="inline-flex items-center gap-2 border border-[#e2e2e2] text-[#43474e] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:border-[#002045] transition-colors">
            Trocar foto
          </button>
          <button onClick={onGenerate} disabled={!canGenerate}
            className="inline-flex items-center gap-2 bg-[#3b6934] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3 hover:bg-[#2f5429] transition-colors disabled:opacity-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z" /></svg>
            Gerar visualização
          </button>
          {!canGenerate && (
            <span className="text-xs text-[#b4791e] font-[var(--font-inter)] self-center">
              {needsExactArea ? "Marque a área na foto com Tocar ou 4 pontos." : "Adicione uma área e atribua um acabamento."}
            </span>
          )}
        </div>
        <div className="mt-3 border border-[#e2e2e2] bg-white p-2">
          <p className="text-[10px] tracking-[0.14em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Modo do resultado</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUseProjection(true)}
              className={`px-3 py-2 text-[11px] font-bold font-[var(--font-inter)] uppercase tracking-[0.08em] border transition-colors ${
                useProjection ? "bg-[#3b6934] border-[#3b6934] text-white" : "bg-white border-[#e2e2e2] text-[#43474e] hover:border-[#3b6934]"
              }`}
            >
              Textura exata
            </button>
            <button
              type="button"
              onClick={() => setUseProjection(false)}
              className={`px-3 py-2 text-[11px] font-bold font-[var(--font-inter)] uppercase tracking-[0.08em] border transition-colors ${
                !useProjection ? "bg-[#002045] border-[#002045] text-white" : "bg-white border-[#e2e2e2] text-[#43474e] hover:border-[#002045]"
              }`}
            >
              IA do ambiente
            </button>
          </div>
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
            useProjection={useProjection}
          />
        ))}
        {zones.length > 0 && (
          <button onClick={onGenerate} disabled={!canGenerate}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#3b6934] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-[#2f5429] transition-colors disabled:opacity-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z" /></svg>
            Gerar visualização
          </button>
        )}
      </div>
    </div>
  );
}

function SurfaceCanvas({
  photoData, zones, activeZoneId, setActiveZoneId, mode, onTapPhoto, onDrawRect, updateZone, busy, retargeting, onConfirmQuad,
}: {
  photoData: string; zones: Zone[]; activeZoneId: string | null; setActiveZoneId: (id: string | null) => void;
  mode: ZoneMode; onTapPhoto: (nx: number, ny: number) => void; onDrawRect: (rect: Rect) => void;
  updateZone: (id: string, patch: Partial<Zone>) => void; busy: boolean; retargeting: boolean;
  onConfirmQuad: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef<null | { kind: "create"; sx: number; sy: number } | { kind: "move"; id: string; offX: number; offY: number; w: number; h: number } | { kind: "resize"; id: string; x: number; y: number } | { kind: "corner"; id: string; idx: number }>(null);
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
    } else if (d.kind === "corner") {
      const zone = zones.find((z) => z.id === d.id);
      if (zone?.quad) {
        const nq = zone.quad.map((pt, i) => (i === d.idx ? ([p.x, p.y] as [number, number]) : pt)) as Quad;
        updateZone(d.id, { quad: nq });
      }
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
      onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", touchAction: "none" }}
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
        // Once a manually-drawn box gets upgraded to a precise mask/polygon,
        // show only that (like a tap-detected zone) — the raw box outline
        // underneath it is now stale and just visual clutter.
        if (!z.manual || !z.rect || z.maskUrl || (z.polygon && z.polygon.length >= 3)) return null;
        const color = ZONE_COLORS[i % ZONE_COLORS.length];
        const rect = z.rect;
        const active = z.id === activeZoneId;
        return (
          <div key={z.id}
            onPointerDown={(e) => {
              if (mode !== "draw") return;
              e.stopPropagation(); setActiveZoneId(z.id);
              const p = norm(e.clientX, e.clientY);
              // Capture on the STABLE container, not the handle: the handle
              // re-renders as it moves (its style changes every frame), which
              // drops capture on the handle element and makes the drag stop
              // after a few px. The root never remounts mid-drag.
              try { ref.current?.setPointerCapture(e.pointerId); } catch {}
              drag.current = { kind: "move", id: z.id, offX: p.x - rect.x, offY: p.y - rect.y, w: rect.w, h: rect.h };
            }}
            style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%`, borderColor: color, background: `${color}22` }}
            className={`absolute border-2 ${active ? "ring-2 ring-white/70" : ""} ${mode === "draw" ? "cursor-move" : "pointer-events-none"}`}>
            {mode === "draw" && (
              <span onPointerDown={(e) => {
                  e.stopPropagation(); setActiveZoneId(z.id);
                  // Capture on the STABLE container, not the handle: the handle
              // re-renders as it moves (its style changes every frame), which
              // drops capture on the handle element and makes the drag stop
              // after a few px. The root never remounts mid-drag.
              try { ref.current?.setPointerCapture(e.pointerId); } catch {}
                  drag.current = { kind: "resize", id: z.id, x: rect.x, y: rect.y };
                }}
                style={{ background: color }}
                className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full border-2 border-white cursor-nwse-resize" />
            )}
          </div>
        );
      })}
      {/* Pixel-exact projection: 4-corner quad for the active zone.
          - Not confirmed → draggable handles + "Atualizar pontos" (re-runs SAM2).
          - Confirmed → handles hidden, just an "Editar cantos" pill to recall. */}
      {(() => {
        const az = zones.find((z) => z.id === activeZoneId);
        if (!az?.quad) return null;
        const q = az.quad;
        const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4;
        const cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;

        if (az.quadConfirmed) {
          // Collapsed: only a small recall pill at the centre.
          return (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); updateZone(az.id, { quadConfirmed: false }); }}
              style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/85 text-white text-[10px] font-bold font-[var(--font-inter)] px-3 py-1.5 rounded-full whitespace-nowrap shadow-md">
              ✎ Editar cantos
            </button>
          );
        }
        return (
          <>
            <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
              <polygon points={q.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="#ffffff" strokeWidth={0.004} strokeDasharray="0.014 0.009" strokeLinejoin="round" />
            </svg>
            {q.map(([x, y], idx) => (
              // Large transparent hit area (finger-friendly) wrapping a small dot.
              <span key={idx}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  // Capture on the STABLE container, not the handle: the handle
              // re-renders as it moves (its style changes every frame), which
              // drops capture on the handle element and makes the drag stop
              // after a few px. The root never remounts mid-drag.
              try { ref.current?.setPointerCapture(e.pointerId); } catch {}
                  drag.current = { kind: "corner", id: az.id, idx };
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none">
                <span className="w-5 h-5 rounded-full bg-white border-2 border-[#002045] shadow-md" />
              </span>
            ))}
            {/* Confirm button at the quad centre — re-runs SAM2, then hides handles. */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onConfirmQuad(az.id); }}
              style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 bg-[#3b6934] hover:bg-[#2f5429] text-white text-[11px] font-bold font-[var(--font-inter)] px-4 py-2 rounded-full whitespace-nowrap shadow-lg">
              ✓ Atualizar pontos
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-[var(--font-inter)] px-3 py-1 rounded-full pointer-events-none whitespace-nowrap">
              Arraste os 4 cantos e toque em “Atualizar pontos”
            </div>
          </>
        );
      })()}
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

function ZoneCard({ zone, index, active, retargeting, onSelect, onChange, onRemove, onRetarget, products, loadingProducts, productById, useProjection }: {
  zone: Zone; index: number; active: boolean; retargeting: boolean;
  onSelect: () => void; onChange: (patch: Partial<Zone>) => void; onRemove: () => void; onRetarget: () => void;
  products: VizProduct[]; loadingProducts: boolean; productById: (id: string) => VizProduct | null;
  useProjection: boolean;
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
            : zone.detectFailed ? <span className="text-[#b42318]">Ajuste manual pelos 4 pontos</span>
            : (zone.polygon || zone.maskUrl) && zone.detectEngine === "fal" ? <span className="text-[#2f5429]">Superfície detectada (SAM2) ✓</span>
            : (zone.polygon || zone.maskUrl) && zone.detectEngine === "gemini" ? <span className="text-[#b4791e]">Contorno aproximado (SAM2 indisponível)</span>
            : zone.polygon || zone.maskUrl ? <span className="text-[#2f5429]">Superfície detectada ✓</span>
            : zone.manual && zone.rect ? <span className="text-[#2f5429]">Área desenhada ✓</span>
            : <span className="text-[#b4791e]">Descreva o local em texto abaixo</span>}
        </p>
        <button onClick={(e) => { e.stopPropagation(); onRetarget(); }}
          className={`text-[10px] font-bold font-[var(--font-inter)] ${retargeting ? "text-[#b4791e]" : "text-[#1e5fb4] hover:underline"}`}>
          {retargeting ? "Toque na foto…" : "Refazer seleção"}
        </button>
      </div>
      {/* Render status: tells the user whether this zone uses exact texture or AI. */}
      {prod && (
        <div className="flex items-center justify-between mb-2 -mt-0.5">
          {useProjection && prod.render_texture_path?.trim() ? (
            <span className="text-[10px] font-bold font-[var(--font-inter)] text-[#2f5429]">● Textura exata</span>
          ) : prod.render_texture_path?.trim() ? (
            <span className="text-[10px] font-bold font-[var(--font-inter)] text-[#b4791e]">● IA com referência</span>
          ) : (
            <span className="text-[10px] font-[var(--font-inter)] text-[#74777f]">○ IA com foto de referência</span>
          )}
          {prod.render_texture_path?.trim() && zone.quad && (
            <button onClick={(e) => { e.stopPropagation(); onChange({ quad: null }); }}
              className="text-[10px] font-bold font-[var(--font-inter)] text-[#1e5fb4] hover:underline">
              Redefinir cantos
            </button>
          )}
        </div>
      )}
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

function ResultStep({
  photoData, result, generating, progress, error,
  leadSubmitted, leadName, leadPhone, onLeadNameChange, onLeadPhoneChange, onLeadSubmit,
  onRetry, onRegenerate, onDownload, onAddPhoto,
  embeddedMode,
}: {
  photoData: string | null; result: string | null; generating: boolean;
  progress: { i: number; total: number; label: string } | null; error: string | null;
  leadSubmitted: boolean; leadName: string; leadPhone: string;
  onLeadNameChange: (v: string) => void; onLeadPhoneChange: (v: string) => void; onLeadSubmit: () => void;
  onRetry: () => void; onRegenerate: () => void; onDownload: () => void; onAddPhoto: () => void;
  embeddedMode?: boolean;
}) {
  const showLeadOverlay = !embeddedMode && !leadSubmitted && !error;
  // A real WhatsApp number has 8–13 digits (local 8–9 digits, or with DDD /
  // country code up to 13). Don't enable submit on a single stray digit.
  const phoneDigits = leadPhone.replace(/\D/g, "").length;
  const phoneValid = phoneDigits >= 8 && phoneDigits <= 13;
  const leadReady = leadName.trim().length > 0 && phoneValid;
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
                {phoneDigits > 0 && !phoneValid && (
                  <p className="text-[#b4791e] text-[11px] font-[var(--font-inter)]">Informe um WhatsApp válido com DDD.</p>
                )}
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
