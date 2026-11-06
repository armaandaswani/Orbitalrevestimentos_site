"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, useSyncExternalStore } from "react";
import { applicationAreaFor, DEFAULT_PANEL_WIDTH_M, DEFAULT_PANEL_HEIGHT_M } from "@/lib/render-prompt";
import { ORCAMENTO_INSTANTANEO_VISIVEL, abrirContato } from "@/lib/contato";
import {
  type Quad,
  panelLayout,
  tileTexture,
  projectTextureToQuad,
} from "@/lib/texture-projection";
import VizShell, { focarEtapa, rolarParaTopo, type AcaoShell } from "./visualizador/VizShell";
import EtapaFoto from "./visualizador/EtapaFoto";
import EtapaResultado from "./visualizador/EtapaResultado";
import AtalhoConsultor from "./visualizador/AtalhoConsultor";
import {
  areaSeguinte, areaSemDescricao, avisoFaltaDescricao, etapaVisivel, indiceDaArea, podeGerar, podeIrParaProximaArea, rotuloZona, ZONE_COLORS,
  LINE_ORDER, VIZ_SPACES, type ProductLine,
} from "./visualizador/fluxo";
import EtapaAcabamento, { AcabamentoSemAreas, FotoAcabamento } from "./visualizador/EtapaAcabamento";
import SurfaceCanvas, { type ZoneMode } from "./visualizador/SurfaceCanvas";
import EditorMarcacao, { FotoMarcavel, PainelMarcacao, marcaNoLugar, useMarcacaoNoLugar, useProporcao } from "./visualizador/EditorMarcacao";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// LINE_ORDER e VIZ_SPACES moram em visualizador/fluxo (o Acabamento também usa,
// sem importar valores daqui) e seguem exportados por este módulo.
export { LINE_ORDER, VIZ_SPACES };
export const FINISH_BY_LINE: Record<ProductLine, FinishKind> = {
  Classic: "matte",
  Brilliance: "polished",
  Elegance: "wood",
};

// ── Render engine ────────────────────────────────────────────────────────────
// PRODUCTION path = Gemini generative "apply the panel" (see /api/visualizador/
// render + composePrompt): the client's photo is preserved untouched and the
// panel is rendered realistically onto the selected surface — how the space
// would actually look installed.
//
// The deterministic texture-projection engine (warp the flat slab into the
// drawn quad locally) is kept in the code but DISABLED: it produced flat,
// pasted-looking panels (no perspective realism, no room lighting). The 4-point
// draw UI stays on regardless — its quad/box just defines WHERE Gemini applies
// the panel (via the surface mask), it no longer drives a local paste.
// Flip to true only to re-enable the (worse) deterministic paste.
const DETERMINISTIC_PROJECTION = false;

// Divisão de trabalho (decisão do dono, out/2026): o SAM2 (fal) DETECTA a
// superfície a cada toque/retângulo — recorte exato da parede, em perspectiva,
// sem os objetos da frente — e o ChatGPT (gpt-image) faz o RENDER. A IA da
// OpenAI ainda descreve as áreas em texto (/analisar) e, quando todas têm
// recorte do SAM2, o render recebe a máscara junto. (A máscara de RETÂNGULO
// fazia o gerador redesenhar tudo dentro dele — por isso só vai a do SAM2.)
const SURFACE_DETECTION = true;

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
  // True once the client has EXPLICITLY picked a finish for this area (tapped a
  // swatch, or it came pre-chosen from the Simulador). A default productId is
  // seeded so rendering has a target, but generation stays gated until the
  // client actively chooses — that's the "modelo escolhido" step of the guided
  // flow, and why the Gerar button no longer lights up prematurely.
  productChosen?: boolean;
  // Marcação por toque (um ponto) em vez de retângulo desenhado.
  point?: boolean;
  // Último texto escrito pela IA para esta área: se instruction ainda é igual a
  // ele, uma nova análise pode substituí-lo; se o cliente editou, fica o dele.
  aiText?: string;
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

/** Assinatura vazia para useSyncExternalStore de valores que não mudam na página (?debug=1). */
const nadaParaAssinar = () => () => {};

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

// Cleans a raw SAM2 mask so the projected panel doesn't come out torn:
//  1. Morphological CLOSE (blur+threshold dilate, then erode) — bridges thin
//     gaps (grout lines, lamp cords crossing the wall) and smooths the jagged
//     boundary. Radius ~1.8% of the shorter side.
//  2. Interior HOLE FILL with a size threshold — SAM2 often punches holes in
//     the middle of a wall where the original paint has highlight streaks or
//     reflections; those show up as ugly patches of unpainted wall inside the
//     panel. Any hole NOT connected to the outside and smaller than ~3% of the
//     image is filled. LARGE interior holes (a mirror, a framed picture, a
//     plant in front of the wall) stay cut out, so real foreground objects are
//     still preserved on top of the panel.
// `onAt(i)` reports whether source pixel i is inside the raw mask.
function refineMaskCanvas(
  w: number,
  h: number,
  onAt: (pixelIndex: number) => boolean
): Uint8ClampedArray {
  const r = Math.max(2, Math.min(w, h) * 0.018);
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  };
  // Binary white-on-transparent starting mask.
  const bin = mk();
  const bctx = bin.getContext("2d")!;
  const img = bctx.createImageData(w, h);
  for (let p = 0, pi = 0; p < w * h; p++, pi += 4) {
    if (onAt(p)) { img.data[pi] = 255; img.data[pi + 1] = 255; img.data[pi + 2] = 255; img.data[pi + 3] = 255; }
  }
  bctx.putImageData(img, 0, 0);

  // Pass 1 — dilate: blur, then everything with any meaningful alpha turns on.
  const dil = mk();
  const dctx = dil.getContext("2d")!;
  dctx.filter = `blur(${r}px)`;
  dctx.drawImage(bin, 0, 0);
  dctx.filter = "none";
  const dilData = dctx.getImageData(0, 0, w, h).data;
  const dil2 = mk();
  const d2ctx = dil2.getContext("2d")!;
  const dimg = d2ctx.createImageData(w, h);
  for (let p = 0, pi = 3; p < w * h; p++, pi += 4) {
    if (dilData[pi] > 24) { dimg.data[pi - 3] = 255; dimg.data[pi - 2] = 255; dimg.data[pi - 1] = 255; dimg.data[pi] = 255; }
  }
  d2ctx.putImageData(dimg, 0, 0);

  // Pass 2 — erode: blur the dilated mask, keep only the solid core (high alpha).
  const ero = mk();
  const ectx = ero.getContext("2d")!;
  ectx.filter = `blur(${r}px)`;
  ectx.drawImage(dil2, 0, 0);
  ectx.filter = "none";
  const closed = ectx.getImageData(0, 0, w, h).data;
  // A dilatação (corte em 24) expande ~1,5r; para o fechamento voltar à borda
  // real, a erosão precisa cortar ALTO. Com corte no meio (128) a máscara
  // ficava ~20 px maior que a parede e invadia teto e piso no render.
  for (let pi = 3; pi < closed.length; pi += 4) closed[pi] = closed[pi] > 230 ? 255 : 0;

  // Pass 3 — fill small interior holes. Work on a downsampled grid (≤ ~360px
  // on the long side) so the flood fill is cheap even on a 4K photo: BFS from
  // every border cell over "off" cells marks the true OUTSIDE; any remaining
  // off-region is an interior hole — fill it if it's small, keep it if large
  // (that's a real foreground object).
  const scale = Math.max(1, Math.ceil(Math.max(w, h) / 360));
  const gw = Math.ceil(w / scale);
  const gh = Math.ceil(h / scale);
  const grid = new Uint8Array(gw * gh); // 1 = on (mask), 0 = off
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const x = Math.min(w - 1, gx * scale + (scale >> 1));
      const y = Math.min(h - 1, gy * scale + (scale >> 1));
      if (closed[(y * w + x) * 4 + 3] > 128) grid[gy * gw + gx] = 1;
    }
  }
  // BFS from borders: label 2 = outside.
  const queue: number[] = [];
  for (let gx = 0; gx < gw; gx++) {
    for (const gy of [0, gh - 1]) {
      const i = gy * gw + gx;
      if (grid[i] === 0) { grid[i] = 2; queue.push(i); }
    }
  }
  for (let gy = 0; gy < gh; gy++) {
    for (const gx of [0, gw - 1]) {
      const i = gy * gw + gx;
      if (grid[i] === 0) { grid[i] = 2; queue.push(i); }
    }
  }
  while (queue.length > 0) {
    const i = queue.pop()!;
    const gx = i % gw, gy = (i / gw) | 0;
    if (gx > 0 && grid[i - 1] === 0) { grid[i - 1] = 2; queue.push(i - 1); }
    if (gx < gw - 1 && grid[i + 1] === 0) { grid[i + 1] = 2; queue.push(i + 1); }
    if (gy > 0 && grid[i - gw] === 0) { grid[i - gw] = 2; queue.push(i - gw); }
    if (gy < gh - 1 && grid[i + gw] === 0) { grid[i + gw] = 2; queue.push(i + gw); }
  }
  // Remaining 0-cells are interior holes. Component-label them; fill small ones.
  const maxHoleCells = Math.round(gw * gh * 0.03);
  for (let start = 0; start < gw * gh; start++) {
    if (grid[start] !== 0) continue;
    const comp: number[] = [start];
    grid[start] = 3; // visiting
    for (let qi = 0; qi < comp.length; qi++) {
      const i = comp[qi];
      const gx = i % gw, gy = (i / gw) | 0;
      if (gx > 0 && grid[i - 1] === 0) { grid[i - 1] = 3; comp.push(i - 1); }
      if (gx < gw - 1 && grid[i + 1] === 0) { grid[i + 1] = 3; comp.push(i + 1); }
      if (gy > 0 && grid[i - gw] === 0) { grid[i - gw] = 3; comp.push(i - gw); }
      if (gy < gh - 1 && grid[i + gw] === 0) { grid[i + gw] = 3; comp.push(i + gw); }
    }
    const fill = comp.length <= maxHoleCells;
    for (const i of comp) grid[i] = fill ? 4 : 5; // 4 = fill, 5 = keep hole
  }
  // Upscale the fill decision back onto the full-res alpha.
  for (let y = 0; y < h; y++) {
    const gy = Math.min(gh - 1, (y / scale) | 0);
    for (let x = 0; x < w; x++) {
      const pi = (y * w + x) * 4 + 3;
      if (closed[pi] <= 128) {
        const g = grid[gy * gw + Math.min(gw - 1, (x / scale) | 0)];
        if (g === 4) closed[pi] = 255;
      }
    }
  }
  return closed as unknown as Uint8ClampedArray;
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
  // Clean the raw SAM2 mask (close gaps + smooth edges) before tinting it, so
  // the overlay the client sees AND the stencil the projection clips to are
  // both free of the ragged holes that caused torn panel edges.
  const closed = refineMaskCanvas(w, h, (p) => {
    const pi = p * 4;
    return hasAlpha ? src[pi + 3] > 40 : src[pi] * 0.299 + src[pi + 1] * 0.587 + src[pi + 2] * 0.114 > 110;
  });
  const { r, g, b } = hexToRgb(hex);
  const out = ctx.createImageData(w, h);
  const od = out.data;
  let minX = w, minY = h, maxX = 0, maxY = 0, any = false, count = 0;
  for (let p = 0, pi = 0; p < w * h; p++, pi += 4) {
    // Read the CLEANED (closed) mask, not the raw SAM output.
    const on = closed[pi + 3] > 128;
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

  // Feather the stencil's edge slightly (~0.3% of the shorter side) so the
  // panel boundary blends a couple of pixels into the photo instead of the
  // razor-sharp cut that made every mask imperfection read as a "tear".
  const feather = Math.max(1.5, Math.min(w, h) * 0.003);
  const soft = document.createElement("canvas");
  soft.width = w;
  soft.height = h;
  const softCtx = soft.getContext("2d")!;
  softCtx.filter = `blur(${feather}px)`;
  softCtx.drawImage(stencil, 0, 0);
  softCtx.filter = "none";

  const cut = document.createElement("canvas");
  cut.width = w;
  cut.height = h;
  const cutCtx = cut.getContext("2d")!;
  cutCtx.drawImage(sourceImg, 0, 0, w, h);
  cutCtx.globalCompositeOperation = "destination-in";
  cutCtx.drawImage(soft, 0, 0);

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const outCtx = out.getContext("2d")!;
  outCtx.drawImage(baseImg, 0, 0, w, h);
  outCtx.drawImage(cut, 0, 0);
  return out.toDataURL("image/jpeg", 0.92);
}

// True when the detected surface mask covers most of the zone's 4-corner quad —
// a flat wall whose detection only has holes (stains, putty, outlets). Then the
// quad is the better target: straight edges, no "torn" patches. When something
// big stands in front of the wall (sofa, cabinet), coverage drops and the
// detailed mask is kept so the object isn't painted over. Measured: holes only
// ≈ 1.00 (the overlay cleanup already closes them), a small object in front ≈
// 0.96, a sofa ≈ 0.87 — so only a near-complete wall switches to the quad.
async function maskFillsQuad(z: Zone, threshold = 0.97): Promise<boolean> {
  const cov = await maskQuadCoverage(z);
  console.info(`[viz] cobertura da detecção dentro dos cantos: ${cov.toFixed(2)}`);
  return cov >= threshold;
}

async function maskQuadCoverage(z: Zone): Promise<number> {
  if (!z.quad || !z.maskUrl) return 0;
  const W = 240, H = 240;
  const [sam, quad] = await Promise.all([buildStencil(z, W, H, false), buildStencil(z, W, H, true)]);
  if (!sam || !quad) return 0;
  const a = sam.getContext("2d")!.getImageData(0, 0, W, H).data;
  const b = quad.getContext("2d")!.getImageData(0, 0, W, H).data;
  let inQuad = 0, both = 0;
  for (let i = 3; i < b.length; i += 4) {
    if (b[i] > 128) { inQuad++; if (a[i] > 128) both++; }
  }
  return inQuad > 0 ? both / inQuad : 0;
}

// Fits the model's whole output to the photo's pixel size. Same aspect → plain
// scale; a different aspect → centred "cover" crop, never a stretch.
async function fitToBase(sourceDataUrl: string, w: number, h: number): Promise<string> {
  const im = await loadImage(sourceDataUrl);
  const sw = im.naturalWidth, sh = im.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale, dh = sh * scale;
  ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return c.toDataURL("image/jpeg", 0.92);
}

// Builds a clean white-on-black binary mask (PNG data URL) at w×h from the
// zone's spatial descriptor, to hand to the render API so Gemini paints only
// the real surface under the white region — following its true perspective and
// keeping foreground objects on top. Returns null for text-only zones (no
// spatial info), so the render falls back to the text/rect prompt as before.
// Máscara única (branco = revestir) com o recorte do SAM2 de TODAS as áreas,
// para o render multi-área. null se alguma área não tiver recorte: aí o render
// vai só com o texto (uma área sem máscara ficaria bloqueada).
async function buildUnionMaskDataUrl(zs: Zone[], w: number, h: number): Promise<string | null> {
  if (zs.length === 0 || zs.some((z) => !z.maskUrl)) return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighten";
  for (const z of zs) {
    const m = await buildMaskDataUrl(z, w, h);
    if (!m) return null;
    ctx.drawImage(await loadImage(m), 0, 0, w, h);
  }
  return c.toDataURL("image/png");
}

async function buildMaskDataUrl(z: Zone, w: number, h: number, preferQuad = false): Promise<string | null> {
  const stencil = await buildStencil(z, w, h, preferQuad); // opaque inside / transparent outside
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
  const tex = await loadImage(texSrc);
  const { cols, rows } = panelLayout(parseDim(widthStr), parseDim(heightStr), DEFAULT_PANEL_WIDTH_M, DEFAULT_PANEL_HEIGHT_M);
  const tiled = tileTexture(tex, tex.naturalWidth || 1, tex.naturalHeight || 1, cols, rows);
  const projected = projectTextureToQuad(tiled, quad, w, h);
  // Deterministic lighting removed for now: return the pure, exact texture (flat)
  // so its true colour shows with zero modulation. If the result is correct,
  // realistic lighting will be added back via a Gemini relight pass (hybrid
  // Stage 2). `base` is kept in the signature for that upcoming step.
  void base;
  return projected.toDataURL("image/png");
}

// Applies ONLY the lighting/shadow from a Gemini relight pass onto an image,
// inside the zone's mask, WITHOUT changing the texture in the slightest.
//
// We build a per-pixel BRIGHTNESS-MULTIPLIER map (ratio of relit luminance to
// the exact panel's own luminance), then BLUR it before applying. The blur is
// the key: Gemini's relit output contains sharp reflections of real room
// objects (a mirror, chairs), and copying those verbatim "prints" ghost
// furniture onto the slab. Blurring the multiplier keeps only the broad light
// GRADIENT — a smooth sheen — and discards the reflected-object detail. The
// multiplier is then amplified per finish (a strong sheen for polished; flat
// for matte/wood) and applied as a pure brightness scale, so the pattern,
// veins and colour stay pixel-identical. Not a repaint — a smoothed light map.
async function blendLuminanceInMask(
  baseDataUrl: string,
  litDataUrl: string,
  z: Zone,
  w: number,
  h: number,
  finish: FinishKind
): Promise<string> {
  const [baseImg, litImg, stencil] = await Promise.all([
    loadImage(baseDataUrl),
    loadImage(litDataUrl),
    buildStencil(z, w, h),
  ]);
  if (!stencil) return baseDataUrl; // no spatial info → leave the exact panel as-is

  const sample = (img: HTMLImageElement | HTMLCanvasElement) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h).data;
  };
  const litD = sample(litImg);
  const mskD = sample(stencil);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = w; outCanvas.height = h;
  const outCtx = outCanvas.getContext("2d")!;
  outCtx.drawImage(baseImg, 0, 0, w, h);
  const outImg = outCtx.getImageData(0, 0, w, h);
  const o = outImg.data;

  const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

  // PASS A — raw ratios + their mean over the masked area. Gemini often returns
  // a globally darker (or lighter) image; we mean-NORMALISE by this average so
  // only the RELATIVE light variation (where highlights vs shade fall) is kept,
  // and the panel's overall brightness stays exactly the exact texture's. This
  // is what prevents the "went dark and shadowy" failure regardless of what
  // exposure Gemini hands back.
  const raw = new Float32Array(w * h);
  let sum = 0, n = 0;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    if (mskD[i + 3] < 20) continue;
    const bl = lum(o[i], o[i + 1], o[i + 2]);
    if (bl < 1) { raw[p] = 1; continue; }
    const r = lum(litD[i], litD[i + 1], litD[i + 2]) / bl;
    raw[p] = r; sum += r; n++;
  }
  const mean = n > 0 ? sum / n : 1;

  // Highlight-biased amplification: brightening (shine) is amplified hard;
  // darkening is barely allowed and floored, so a polished panel can only gain
  // sheen, never turn moody. Matte/wood stay almost flat.
  const ampHi = finish === "polished" ? 2.4 : finish === "wood" ? 0.9 : 1.0;
  const ampLo = finish === "polished" ? 0.5 : 0.6;
  const hiCap = finish === "polished" ? 2.6 : 1.3;
  const loCap = finish === "polished" ? 0.82 : 0.8;

  // Multiplier map, grayscale where 100 = neutral 1.0×. Neutral outside the mask
  // so the blur at the boundary doesn't darken the edge.
  const mult = document.createElement("canvas");
  mult.width = w; mult.height = h;
  const mctx = mult.getContext("2d")!;
  const mimg = mctx.createImageData(w, h);
  const md = mimg.data;
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    let v = 100;
    if (mskD[i + 3] >= 20) {
      const norm = raw[p] / mean; // centre on 1.0 → removes global exposure shift
      const dev = norm - 1;
      const r = 1 + dev * (dev >= 0 ? ampHi : ampLo);
      v = Math.max(0, Math.min(255, Math.round(Math.max(loCap, Math.min(hiCap, r)) * 100)));
    }
    md[i] = v; md[i + 1] = v; md[i + 2] = v; md[i + 3] = 255;
  }
  mctx.putImageData(mimg, 0, 0);

  // Blur the multiplier → smooth sheen gradient, no ghosted reflections.
  const blurR = Math.max(3, Math.round(Math.min(w, h) * 0.02));
  const smooth = document.createElement("canvas");
  smooth.width = w; smooth.height = h;
  const sctx = smooth.getContext("2d")!;
  sctx.filter = `blur(${blurR}px)`;
  sctx.drawImage(mult, 0, 0);
  sctx.filter = "none";
  const sd = sctx.getImageData(0, 0, w, h).data;

  for (let i = 0; i < o.length; i += 4) {
    if (mskD[i + 3] < 20) continue; // outside mask → panel/photo untouched
    const m = sd[i] / 100; // decode multiplier
    o[i] = Math.min(255, o[i] * m);
    o[i + 1] = Math.min(255, o[i + 1] * m);
    o[i + 2] = Math.min(255, o[i + 2] * m);
  }
  outCtx.putImageData(outImg, 0, 0);
  return outCanvas.toDataURL("image/jpeg", 0.92);
}

// Asks the render API for a lighting-ONLY pass (mode="relight") over an image
// that already has the exact panel installed. `finish` drives how Gemini lights
// it (polished = sheen/reflections, matte/wood = soft/none). Returns Gemini's
// relit image or null on any failure, so the caller keeps the flat exact panel
// rather than failing the render. Only this output's LUMINANCE is used.
async function requestZoneRelight(
  photoComposite: string,
  prod: VizProduct,
  maskDataUrl: string | null
): Promise<string | null> {
  try {
    const res = await fetch("/api/visualizador/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photo: photoComposite,
        productId: prod.id,
        referenceUrl: prod.render_texture_path?.trim() || prod.image_path,
        finish: FINISH_BY_LINE[prod.linha],
        maskImage: maskDataUrl ?? undefined,
        mode: "relight",
      }),
    });
    const j = (await res.json()) as { image?: string };
    return res.ok && j.image ? j.image : null;
  } catch {
    return null;
  }
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
// "zones" is internally split into two phases (mark → model). The shell shows
// four visible steps (visualizador/fluxo.ts › etapaVisivel).

// ── Props ──────────────────────────────────────────────────────────────────────

interface VisualizadorWizardProps {
  /** Pre-loaded product catalog. If not provided, the wizard fetches it itself. */
  products?: VizProduct[];
  loadingProducts?: boolean;
  /** Prefill zone defaults from a parent context (e.g. Simulador selection). */
  simPrefills?: SimPrefill[];
  /**
   * When true (inside /simulador): lead was already captured upstream, so
   * there is no lead sheet; the shell hides its own stepper and Voltar and
   * keeps the action bar in flow; onComplete fires automatically the first
   * time a generation succeeds (no extra click).
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
  // Sub-phase of the "zones" step:
  //   mark  → mark/draw the areas (full-screen editor on phones, in place on desktop)
  //   model → pick the finish, then Gerar. The analysis that used to have its own
  //           "confirm" screen now runs in the background (concluirMarcacao).
  const [zonePhase, setZonePhase] = useState<"mark" | "model">("mark");
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoDims, setPhotoDims] = useState<{ w: number; h: number } | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  // Render method. Default ON (4-point exact projection). A generative model
  // (Gemini) can never be pixel-exact — it repaints the panel and invents a
  // look-alike design, which is unacceptable for a product bought by its exact
  // pattern. So the panel is laid down DETERMINISTICALLY: the exact flat slab
  // texture is tiled at panel scale and warped into the wall via the 4-corner
  // quad (auto-seeded from the SAM mask, adjustable by the client), then clipped
  // to the CLEANED SAM mask (refineMaskCanvas) so its edges are solid, not
  // torn. Gemini never touches the panel → it cannot hallucinate or change the
  // design; the pattern is exact and repetitive and the rest of the photo stays
  // pixel-identical. Products without a flat texture fall back to Gemini-apply.
  const [useProjection] = useState(DETERMINISTIC_PROJECTION);
  // O que deve continuar igual na foto (escrito pela IA, editável pelo cliente).
  const [keepText, setKeepText] = useState("");
  const aiKeepRef = useRef("");
  const [analysis, setAnalysis] = useState<{ status: "idle" | "loading" | "done" | "error"; sig: string; error?: string }>({ status: "idle", sig: "" });
  const [progress, setProgress] = useState<{ i: number; total: number; label: string } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  // Prévia parcial do gerador enquanto a imagem final não chega.
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAmbientes, setSavedAmbientes] = useState<SavedAmbiente[]>([]);
  const [proceeding, setProceeding] = useState(false);
  const [retargetId, setRetargetId] = useState<string | null>(null);
  // Editor de marcação em tela cheia (toque ou tela estreita). Com mouse a partir
  // de 1024 px a marcação fica no lugar. Se a tela passa a marcar no lugar (girou,
  // alargou) com o editor aberto, ele fecha de verdade: o estado não fica armado
  // para reabrir sozinho depois.
  const [editorAberto, setEditorAberto] = useState(false);
  const noLugar = useMarcacaoNoLugar((v) => { if (v) { setEditorAberto(false); setRetargetId(null); } });
  const [modoMarcacao, setModoMarcacao] = useState<ZoneMode>("tap");
  // Áreas cujo tipo de superfície o cliente escolheu: só elas trocam "Área N"
  // pelo nome do tipo (exibição; o label da zona não muda).
  const [tiposEscolhidos, setTiposEscolhidos] = useState<ReadonlySet<string>>(() => new Set());
  const marcarTipoEscolhido = useCallback((id: string) => {
    setTiposEscolhidos((cur) => (cur.has(id) ? cur : new Set(cur).add(id)));
  }, []);
  // Acabamento, uma área por vez: a área mostrada é guardada pelo id da zona.
  // Voltar do editor fica na mesma zona, mesmo que uma área antes dela tenha
  // saído; se ela saiu, cai na seguinte (sem áreas, 0). O índice guardado junto
  // acompanha a zona e só serve para achar a seguinte.
  const [areaPedida, setAreaPedida] = useState<{ id: string | null; indice: number }>({ id: null, indice: 0 });
  const areaAtual = indiceDaArea(zones.map((z) => z.id), areaPedida);
  const idAreaAtual = zones[areaAtual]?.id ?? null;
  if (idAreaAtual !== areaPedida.id || areaAtual !== areaPedida.indice) setAreaPedida({ id: idAreaAtual, indice: areaAtual });
  const irParaArea = useCallback((i: number) => {
    setAreaPedida({ id: zones[i]?.id ?? null, indice: i });
  }, [zones]);
  // Rótulos técnicos (SAM2, tipo de render, cantos) só com ?debug=1 (falso no servidor).
  const depurar = useSyncExternalStore(
    nadaParaAssinar,
    () => new URLSearchParams(window.location.search).get("debug") === "1",
    () => false,
  );

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
  // VizShell rolls back to its top on every visible-step change. The anchor
  // below marks the shell (its next sibling) for the in-step scrolls here.
  const etapa = etapaVisivel(step, zonePhase);
  const topRef = useRef<HTMLDivElement | null>(null);

  // Próxima área (ou Voltar entre áreas): a troca é no lugar, e a página volta
  // ao topo do shell para a foto e os cartões da área nova começarem à vista;
  // o foco vai para o título da área. Com o editor aberto o índice também muda
  // quando sai uma área (antes da atual ou a própria): aí nada rola nem rouba o
  // foco do editor; ao fechar, o efeito do editor devolve a página ao topo.
  // Chegando pela linha "Falta dizer onde aplicar…", a folha Onde já abriu:
  // a página rola, mas o foco fica na folha.
  const areaAnterior = useRef(areaAtual);
  useEffect(() => {
    const mudou = areaAnterior.current !== areaAtual;
    areaAnterior.current = areaAtual;
    const shell = topRef.current?.nextElementSibling;
    if (!mudou || !(shell instanceof HTMLElement) || !shell.querySelector("[data-viz-acabamento]")) return;
    if (document.querySelector("[data-viz-editor]")) return;
    rolarParaTopo(shell);
    if (!document.querySelector('[role="dialog"][aria-modal="true"]')) focarEtapa(shell);
  }, [areaAtual]);

  // Editor fechado: a página volta com o topo da etapa à vista (enquanto ele
  // esteve aberto a rolagem ficou travada, e a rolagem suave da troca de etapa
  // pode ter parado no meio).
  const editorAntes = useRef(editorAberto);
  useEffect(() => {
    const fechou = editorAntes.current && !editorAberto;
    editorAntes.current = editorAberto;
    const shell = topRef.current?.nextElementSibling;
    if (!fechou || !(shell instanceof HTMLElement)) return;
    const raf = requestAnimationFrame(() => rolarParaTopo(shell));
    return () => cancelAnimationFrame(raf);
  }, [editorAberto]);

  // Área recém-criada. Antes a página rolava até o cartão dela; agora as áreas
  // nascem no editor (ou na marcação no lugar), onde não há cartão, e a rolagem
  // atrasada podia puxar o Acabamento para baixo logo depois do Pronto. Os
  // handlers de marcação continuam gravando aqui; nada mais lê.
  const scrollZoneRef = useRef<string | null>(null);

  // ── File upload ───────────────────────────────────────────────────────────
  // Linha discreta da etapa Foto com o que veio do Simulador (produto · espaço).
  const resumoSimulador = useMemo(() => {
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
      setAreaPedida({ id: null, indice: 0 });
      setActiveZoneId(null);
      setLeadSubmitted(embeddedMode);
      vizRenderIdRef.current = "";
      setZonePhase("mark");
      setStep("zones");
      setEditorAberto(!marcaNoLugar());
    } catch {
      setError("Não foi possível ler essa imagem. Tente outra foto (JPG ou PNG).");
    }
  }, [embeddedMode]);

  // ── Zone management ───────────────────────────────────────────────────────
  const productById = useCallback((id: string) => products.find((p) => p.id === id) ?? null, [products]);

  const resolveZonePrefill = useCallback(
    (zoneIdx: number): { productId: string; surface: string; customLabel: string; width: string; height: string; chosen: boolean } => {
      const pf = simPrefillsRef.current[zoneIdx];
      const defaultProduct = products[0]?.id ?? "";
      // No Simulador prefill → seed a default product for rendering, but leave it
      // UN-chosen so the guided flow still requires an explicit finish pick.
      if (!pf) return { productId: defaultProduct, surface: "parede", customLabel: "", width: "", height: "", chosen: false };
      const prod = products.find((p) => p.code === pf.productCode);
      return {
        productId: prod?.id ?? defaultProduct,
        surface: VIZ_SPACES.some((s) => s.id === pf.spaceId) ? pf.spaceId : (pf.spaceId ? "__custom__" : "parede"),
        customLabel: VIZ_SPACES.some((s) => s.id === pf.spaceId) ? "" : (pf.spaceId ?? ""),
        width: pf.w ? String(pf.w) : "",
        height: pf.h ? String(pf.h) : "",
        // A finish carried over from the Simulador counts as already chosen.
        chosen: !!prod,
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
        try {
          const res = await fetch("/api/visualizador/detect-surface", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photo: photoData, point: { x: nx, y: ny }, width: photoDims?.w, height: photoDims?.h, skipFal }),
          });
          return res.ok ? ((await res.json()) as DetectResp) : null;
        } catch {
          return null;
        }
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
        try {
          const res = await fetch("/api/visualizador/detect-surface", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photo: photoData, box: rect, width: photoDims?.w, height: photoDims?.h, skipFal }),
          });
          return res.ok ? ((await res.json()) as DetectResp) : null;
        } catch {
          return null;
        }
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
      if (!SURFACE_DETECTION) {
        // Instantâneo: o toque vira um alvo; a IA descobre a superfície depois.
        setZones((prev) => [...prev, {
          id, label: `Área ${idx + 1}`, surface: pf.surface, customLabel: pf.customLabel,
          productId: pf.productId, productChosen: pf.chosen, polygon: null, maskUrl: null, rect: rectAroundPoint(nx, ny), manual: true,
          point: true, instruction: "", width: pf.width, height: pf.height, detecting: false,
        }]);
        setActiveZoneId(id);
        return;
      }
      setZones((prev) => [...prev, {
        id, label: `Área ${idx + 1}`, surface: pf.surface, customLabel: pf.customLabel,
        productId: pf.productId, productChosen: pf.chosen, polygon: null, maskUrl: null, rect: null, manual: false,
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
      if (!SURFACE_DETECTION) {
        updateZone(id, { rect: rectAroundPoint(nx, ny), point: true, maskUrl: null, polygon: null, quad: null });
        return;
      }
      const idx = zones.findIndex((z) => z.id === id);
      void detectInto(id, idx < 0 ? 0 : idx, nx, ny);
    },
    [zones, detectInto, updateZone]
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
        productId: pf.productId, productChosen: pf.chosen, polygon: null, maskUrl: null, rect, manual: true,
        instruction: "", width: pf.width, height: pf.height, detecting: SURFACE_DETECTION,
      }]);
      setActiveZoneId(id);
      scrollZoneRef.current = id;
      if (SURFACE_DETECTION) void detectIntoFromBox(id, idx, rect);
    },
    [zones.length, resolveZonePrefill, detectIntoFromBox]
  );

  const addTextZone = useCallback(() => {
    const id = `z-${Date.now()}`;
    const idx = zones.length;
    const pf = resolveZonePrefill(idx);
    setZones((prev) => [...prev, {
      id, label: `Área ${idx + 1}`, surface: pf.surface, customLabel: pf.customLabel,
      productId: pf.productId, productChosen: pf.chosen, polygon: null, maskUrl: null, rect: null, manual: false,
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
  // Only the deterministic projection path needs a pixel-exact quad/rect, and
  // that path is off (DETERMINISTIC_PROJECTION = false) — generation is
  // generative (Gemini applies the finish to the marked/described area). So this
  // must NOT block, otherwise a text-described area with a textured finish could
  // never generate even after the client picked a model.
  const needsExactArea = DETERMINISTIC_PROJECTION && useProjection && zonesReady.some((z) => {
    const prod = z.productId ? productById(z.productId) : null;
    return !!prod?.render_texture_path?.trim() && !z.quad && !z.rect;
  });
  // Ready to leave the "mark" phase: at least one area exists and none are still
  // mid-detection (a text/described area qualifies immediately).
  const anyAreaMarked = zones.length > 0 && !zones.some((z) => z.detecting);
  const allModelsChosen = zones.length > 0 && zones.every((z) => z.productChosen);
  // Generation is gated on the full guided flow: a photo, at least one ready
  // area, exact-area captured where needed, AND an explicit finish chosen for
  // every area (no more "Gerar" before the client picks a model).
  const canGenerate = !!photoData && zonesReady.length > 0 && !needsExactArea && allModelsChosen;
  const anyDetecting = zones.some((z) => z.detecting);

  // Seed an adjustable 4-corner quad (from the detected box) for any zone whose
  // chosen product has a flat texture — that's what surfaces the corner handles
  // on the photo and enables pixel-exact projection. Only relevant when the
  // (currently dormant) projection path is active; gated on useProjection so
  // the corner-picker UI doesn't appear and do nothing while Gemini is the
  // render method. Runs once per zone (guarded by !z.quad), so it never fights
  // a user who's dragging the corners.
  useEffect(() => {
    if (!useProjection) return;
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
  }, [zones, productById, updateZone, useProjection]);

  const areaForZone = (z: Zone): string | undefined => {
    const txt = z.instruction.trim();
    if (txt) return txt;
    return applicationAreaFor(z.surface, z.customLabel) ?? undefined;
  };

  // ── Análise por IA (marcar → confirmar) ───────────────────────────────────
  // Assinatura da marcação: só reanalisa quando a foto ou as áreas mudaram.
  const marksSig = useMemo(
    () => JSON.stringify([photoData?.length ?? 0, zones.map((z) => [z.id, z.rect, z.point ?? false, z.instruction !== z.aiText ? z.instruction : ""])]),
    [photoData, zones]
  );
  const analyze = useCallback(async () => {
    if (!photoData || zones.length === 0) return;
    const sig = marksSig;
    setAnalysis({ status: "loading", sig });
    try {
      const res = await fetch("/api/visualizador/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo: photoData,
          zones: zones.map((z, i) => ({
            id: z.id,
            label: z.label,
            color: ZONE_COLORS[i % ZONE_COLORS.length],
            rect: z.rect,
            point: !!z.point,
            // Texto do próprio cliente (não o que a IA escreveu antes).
            text: z.instruction.trim() && z.instruction !== z.aiText ? z.instruction.trim() : "",
          })),
        }),
      });
      const j = (await res.json().catch(() => null)) as { areas?: { id: string; descricao: string }[]; manter?: string; error?: string } | null;
      if (!res.ok || !j?.areas) {
        setAnalysis({ status: "error", sig, error: j?.error || "Não consegui analisar a foto agora. Descreva a área no campo de texto." });
        return;
      }
      const byId = new Map(j.areas.map((a) => [a.id, a.descricao]));
      setZones((prev) => prev.map((z) => {
        const d = byId.get(z.id);
        if (!d) return z;
        const editedByClient = !!z.instruction.trim() && z.instruction !== z.aiText;
        return editedByClient ? { ...z, aiText: d } : { ...z, instruction: d, aiText: d };
      }));
      if (j.manter) {
        setKeepText((cur) => (!cur.trim() || cur === aiKeepRef.current ? j.manter! : cur));
        aiKeepRef.current = j.manter;
      }
      // A assinatura muda com o texto preenchido pela IA? Não: texto igual a aiText não entra nela.
      setAnalysis({ status: "done", sig });
    } catch {
      setAnalysis({ status: "error", sig, error: "Sem conexão. Descreva a área no campo de texto." });
    }
  }, [photoData, zones, marksSig]);

  // Fim da marcação (Pronto no editor, Continuar no computador): fecha o editor,
  // segue para o Acabamento e descreve as áreas em segundo plano, com a mesma
  // regra da antiga tela de confirmação (só reanalisa se a marcação mudou ou falhou).
  const concluirMarcacao = useCallback(() => {
    setEditorAberto(false);
    setRetargetId(null);
    setZonePhase("model");
    // Depois de "Editar áreas" o cliente volta para a mesma área (pelo id; se
    // ela saiu, a seguinte); a área 1 só volta a ser a atual com uma foto nova.
    if (analysis.sig !== marksSig || analysis.status === "error") void analyze();
  }, [analysis, marksSig, analyze]);

  // "Editar áreas": no celular reabre o editor; no computador volta à marcação no lugar.
  const editarAreas = useCallback(() => {
    if (marcaNoLugar()) { setModoMarcacao("tap"); setZonePhase("mark"); }
    else setEditorAberto(true);
  }, []);

  // Editor reaberto do Acabamento e fechado sem Pronto (✕, Esc, voltar): as
  // áreas que ficaram também ganham descrição, com a mesma regra. Lida pela ref
  // um tique depois de fechar, quando as zonas (já sem as descartadas) e a
  // assinatura estão atualizadas.
  const analisarSePrecisoRef = useRef<() => void>(() => {});
  useEffect(() => {
    analisarSePrecisoRef.current = () => {
      if (step !== "zones" || zonePhase !== "model") return;
      if (analysis.sig !== marksSig || analysis.status === "error") void analyze();
    };
  });
  // Toda saída do editor (✕, Esc, voltar do navegador) desarma o "Refazer".
  const fecharEditor = useCallback(() => {
    setEditorAberto(false);
    setRetargetId(null);
    window.setTimeout(() => analisarSePrecisoRef.current(), 0);
  }, []);

  const rotulos = useMemo(
    () => zones.map((_, i) => rotuloZona(zones, i, VIZ_SPACES, tiposEscolhidos)),
    [zones, tiposEscolhidos],
  );

  // Gerar: além do modelo escolhido, cada área precisa da descrição de onde
  // aplicar e a análise não pode estar rodando (como na antiga tela de
  // confirmação), para o render nunca sair com descrição vazia.
  const podeGerarAgora = podeGerar(zones, { canGenerate }) && analysis.status !== "loading";

  // Acabamento: a área mostrada e a seguinte (null na última).
  const zonaAtual: Zone | undefined = zones[areaAtual];
  const proximaArea = areaSeguinte(areaAtual, zones.length);
  const irParaProximaArea = useCallback(() => {
    if (proximaArea !== null) irParaArea(proximaArea);
  }, [proximaArea, irParaArea]);
  const atualizarZonaAtual = useCallback((patch: Partial<Zone>) => {
    if (!zonaAtual) return;
    if (patch.surface !== undefined) marcarTipoEscolhido(zonaAtual.id);
    updateZone(zonaAtual.id, patch);
  }, [zonaAtual, marcarTipoEscolhido, updateZone]);

  // Na última área, com o Gerar parado só porque outra área ficou sem a
  // descrição: uma linha acima da barra diz qual e leva até ela (pelo id da
  // zona) com a folha Onde aberta. A folha abre uma vez, ao montar a área.
  const [ondePedida, setOndePedida] = useState<string | null>(null);
  const semDescricao = proximaArea === null && analysis.status !== "loading"
    ? areaSemDescricao(zones, areaAtual, { canGenerate })
    : null;
  const avisoGerar = semDescricao === null ? undefined : {
    texto: avisoFaltaDescricao(rotulos[semDescricao] ?? zones[semDescricao].label),
    onClick: () => { setOndePedida(zones[semDescricao].id); irParaArea(semDescricao); },
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const generate = useCallback(async () => {
    if (!photoData) return;
    const zs = zones.filter((z) => z.productId);
    if (zs.length === 0) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    setPreview(null);
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
      // Fluxo da IA: todas as áreas numa só chamada, descritas em texto, sem
      // máscara — a foto volta inteira e igual, só com o revestimento. Se o
      // servidor não tiver o gerador para isso (501), segue o fluxo antigo.
      let doneInOneCall = false;
      if (!DETERMINISTIC_PROJECTION) {
        setProgress({ i: 1, total: 1, label: zs.length > 1 ? "as áreas" : "o revestimento" });
        let maskImage: string | null = null;
        if (dims && dims.w > 0 && dims.h > 0) {
          try { maskImage = await buildUnionMaskDataUrl(zs, dims.w, dims.h); } catch { maskImage = null; }
        }
        const res = await fetch("/api/visualizador/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photo: base,
            aspect: dims && dims.h > 0 ? dims.w / dims.h : undefined,
            keep: keepText.trim() || undefined,
            maskImage: maskImage ?? undefined,
            stream: true,
            areas: zs.map((z) => ({
              productId: z.productId,
              description: areaForZone(z) || "a parede principal, de frente para a câmera",
              referenceUrl: productById(z.productId)?.render_texture_path?.trim() || productById(z.productId)?.image_path || undefined,
              wallWidthM: parseDim(z.width) ?? undefined,
              wallHeightM: parseDim(z.height) ?? undefined,
            })),
          }),
        }).catch(() => null);
        if (res && res.status !== 501) {
          let j: { image?: string; error?: string } | null = null;
          if (res.ok && res.body && (res.headers.get("content-type") || "").includes("ndjson")) {
            // Stream: prévias aparecem na tela enquanto a final não chega.
            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let buf = "";
            const onLine = (line: string) => {
              if (!line.trim()) return;
              let ev: { type?: string; image?: string; error?: string };
              try { ev = JSON.parse(line); } catch { return; }
              if (ev.type === "partial" && ev.image) setPreview(ev.image);
              else if (ev.type === "final" && ev.image) j = { image: ev.image };
              else if (ev.type === "error") j = { error: ev.error || "Não foi possível gerar a visualização." };
            };
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              buf += dec.decode(value, { stream: true });
              let k: number;
              while ((k = buf.indexOf("\n")) >= 0) { onLine(buf.slice(0, k)); buf = buf.slice(k + 1); }
            }
            onLine(buf);
          } else {
            j = (await res.json().catch(() => null)) as { image?: string; error?: string } | null;
          }
          const got = j as { image?: string; error?: string } | null;
          if (!got?.image) throw new Error(got?.error || "Não foi possível gerar a visualização.");
          const finalImage = got.image;
          try {
            composite = dims ? await fitToBase(finalImage, dims.w, dims.h) : finalImage;
          } catch {
            composite = finalImage;
          }
          doneInOneCall = true;
        } else if (!res) {
          throw new Error("Sem conexão. Tente novamente.");
        }
      }
      for (let i = 0; i < zs.length && !doneInOneCall; i++) {
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
        // Derive the perspective quad automatically from the cleaned SAM mask
        // (then polygon, then drawn rect), or use the quad the client nudged with
        // the 4 corner handles. No manual 4-point step is required to generate.
        let quad: Quad | null = z.quad ?? null;
        if (DETERMINISTIC_PROJECTION && textureUrl && !quad) {
          if (z.maskUrl) quad = await quadFromMaskUrl(z.maskUrl);
          if (!quad && z.polygon && z.polygon.length >= 3) quad = quadFromPoints(z.polygon);
          if (!quad && z.rect) quad = rectToQuad(z.rect);
        }
        if (DETERMINISTIC_PROJECTION && textureUrl && quad && dims && dims.w > 0 && dims.h > 0) {
          try {
            // Lay down the EXACT slab, deterministically: the real texture tiled
            // at panel scale and warped into the quad, then clipped to the CLEANED
            // SAM mask (preferQuad=false) so foreground objects (mirror, plants)
            // stay on top and the edges are solid, not torn. No generative model
            // touches the material → the design is exact, repetitive, and can
            // never be hallucinated; everything outside the mask is byte-identical
            // to the client's photo.
            const panel = await renderZoneProjection(textureUrl, quad, z.width, z.height, base, dims.w, dims.h);
            composite = await compositeMaskedRegion(composite, panel, z, false);

            // Lighting pass — let Gemini add the room's light/shadow onto the
            // exact panel (a sheen on polished finishes; none on matte/wood),
            // then keep ONLY its luminance mapped back onto the exact texture
            // (blendLuminanceInMask). The pattern/colour cannot change in the
            // slightest — this is a brightness map, not a repaint. Best-effort:
            // if the relight call fails/unconfigured, the flat exact panel is
            // kept rather than failing the render.
            try {
              const relightMask = await buildMaskDataUrl(z, dims.w, dims.h);
              const relit = await requestZoneRelight(composite, prod, relightMask);
              if (relit) composite = await blendLuminanceInMask(composite, relit, z, dims.w, dims.h, FINISH_BY_LINE[prod.linha]);
            } catch (e) {
              console.warn("[viz] lighting pass skipped:", e instanceof Error ? e.message : e);
            }
            continue; // zone done — exact texture, optionally relit
          } catch (e) {
            console.error("[viz] exact texture projection failed:", e instanceof Error ? e.message : e);
            throw new Error(`Não consegui aplicar a textura exata em ${z.label}. Tente refazer a seleção da área ou outro acabamento.`);
          }
        }

        // Hand Gemini the zone's exact mask (when it has one) so it paints only
        // the real surface, follows its perspective, and keeps foreground
        // objects on top — far more reliable than the bounding rect alone.
        // Corners the client set by hand win. Otherwise, when the detection is a
        // flat wall with only holes (stains, putty, outlets), use 4 corners taken
        // from the detected shape itself — not the axis-aligned box, which on an
        // angled wall would also cover part of the ceiling or floor.
        let maskImage: string | null = null;
        let preferQuad = false;
        let zMask: Zone = z;
        if (dims && dims.w > 0 && dims.h > 0) {
          try {
            if (z.quadConfirmed && z.quad) {
              preferQuad = true;
            } else if (z.maskUrl) {
              const q = await quadFromMaskUrl(z.maskUrl);
              const zq: Zone | null = q ? { ...z, quad: q } : null;
              if (zq && await maskFillsQuad(zq)) { zMask = zq; preferQuad = true; }
            }
            maskImage = await buildMaskDataUrl(zMask, dims.w, dims.h, preferQuad);
          } catch { maskImage = null; }
        }
        const reqBody = JSON.stringify({
          photo: base, productId: prod.id, referenceUrl: prod.render_texture_path?.trim() || prod.image_path,
          finish: FINISH_BY_LINE[prod.linha],
          wallWidthM: parseDim(z.width) ?? undefined,
          wallHeightM: parseDim(z.height) ?? undefined,
          applicationArea: areaForZone(z),
          rect: z.rect ?? undefined,
          maskImage: maskImage ?? undefined,
          aspect: dims && dims.h > 0 ? dims.w / dims.h : undefined,
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
        if (zs.length === 1) {
          // One area: keep the model's whole, coherent edit. Cutting it back into
          // the original by the mask is what produced torn edges and the
          // "stepped floor" whenever the model's framing drifted a few pixels.
          try {
            composite = dims ? await fitToBase(json.image, dims.w, dims.h) : json.image;
          } catch {
            composite = json.image;
          }
          continue;
        }
        try {
          composite = await compositeMaskedRegion(composite, json.image, zMask, preferQuad);
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
            suppressWhatsapp: embeddedMode,
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
      setPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoData, zones, productById, embeddedMode, onComplete, useProjection, keepText]);

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

  // Pivô: com o orçamento instantâneo escondido, o fim do Visualizador abre a
  // aba do consultor já com os acabamentos escolhidos e a metragem medida.
  const falarComConsultor = useCallback(() => {
    const vistos = new Set<string>();
    const produtos = allAmbientes
      .filter((a) => (a.productCode || a.productName) && !vistos.has(a.productCode || a.productName) && vistos.add(a.productCode || a.productName))
      .map((a) => ({ code: a.productCode || null, name: a.productName || null, image: a.productImage || null }));
    // Medidas do Visualizador: uma área → preenche largura e altura; várias →
    // vão listadas para o consultor ("Sala: 3 × 2,6 m").
    const br = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    const medidas = allAmbientes.filter((a) => a.width && a.height);
    abrirContato(
      produtos,
      medidas.length === 1
        ? { largura: br(medidas[0].width!), altura: br(medidas[0].height!) }
        : medidas.length > 1
        ? { areasDetalhe: medidas.map((a) => `${a.local}: ${br(a.width!)} × ${br(a.height!)} m`) }
        : {},
    );
  }, [allAmbientes]);

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

  // ── Shell wiring ──────────────────────────────────────────────────────────
  // "Voltar" walks one screen back; hidden on Foto and while a render runs.
  const voltar: (() => void) | undefined =
    step === "zones"
      ? () => {
          if (zonePhase === "mark") setStep("upload");
          // No Acabamento, cada área é uma tela: Voltar passa pela área anterior.
          else if (areaAtual > 0) irParaArea(areaAtual - 1);
          else setZonePhase("mark");
        }
      : step === "result" && !generating
        ? () => { setZonePhase("model"); setStep("zones"); }
        : undefined;
  // The primary action of each zones phase, always in reach at the bottom.
  // Same handlers and rules as the step's own buttons.
  // No celular, com o editor fechado, a barra abre o editor enquanto não há área pronta.
  const acao: AcaoShell | undefined =
    step !== "zones"
      ? undefined
      : zonePhase === "mark"
        ? noLugar
          ? {
              rotulo: anyDetecting ? "Detectando área…" : anyAreaMarked ? "Continuar" : "Marque uma área",
              onClick: concluirMarcacao,
              desabilitada: !anyAreaMarked,
            }
          : anyAreaMarked
            ? { rotulo: "Continuar", onClick: concluirMarcacao }
            : { rotulo: "Marcar as áreas", onClick: () => setEditorAberto(true) }
        // Acabamento: "Próxima área" até a última (basta o acabamento da área
        // atual; a descrição pode vir depois), depois "Gerar visualização", que
        // exige acabamento e descrição em todas. Sem áreas, volta a marcar.
        : !zonaAtual
          ? { rotulo: "Marcar as áreas", onClick: editarAreas }
          : proximaArea !== null
            ? { rotulo: "Próxima área", onClick: irParaProximaArea, desabilitada: !podeIrParaProximaArea(zonaAtual) }
            : { rotulo: "Gerar visualização", onClick: generate, desabilitada: !podeGerarAgora, tom: "verde", aviso: avisoGerar };

  // Consultor ou orçamento, nunca os dois (regra de 7078a52): com o orçamento
  // instantâneo escondido (pivô), "Falar com um consultor"; com ele visível, só
  // o bloco do orçamento, no Resultado e no atalho das outras etapas.
  const consultorVisivel = !ORCAMENTO_INSTANTANEO_VISIVEL;
  const orcamento =
    ORCAMENTO_INSTANTANEO_VISIVEL && !embeddedMode && allAmbientes.length > 0
      ? {
          pronto: quoteReady && leadSubmitted,
          preparando: proceeding,
          resumo: `${allAmbientes.length} ${allAmbientes.length === 1 ? "área pronta" : "áreas prontas"} para o orçamento. ${
            quoteReady ? "Cada área já vai preenchida, sem digitar nada de novo." : "Informe as medidas das áreas para levar tudo preenchido."
          }`,
          onContinuar: goToSimulador,
        }
      : null;

  const marcacaoNoLugar = step === "zones" && zonePhase === "mark" && noLugar && !!photoData;
  const noAcabamento = step === "zones" && zonePhase !== "mark" && !!photoData;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div ref={topRef} />
      <VizShell
        etapa={etapa}
        embutido={embeddedMode}
        // No /simulador só Marcar e Acabamento têm o link de volta (compacto, no
        // fluxo): "Trocar foto" na marcação, "Voltar" no Acabamento.
        onVoltar={embeddedMode && step !== "zones" ? undefined : voltar}
        rotuloVoltar={embeddedMode && zonePhase === "mark" ? "Trocar foto" : "Voltar"}
        acao={acao}
        lateral={marcacaoNoLugar && photoData ? (
          <FotoMarcavel
            photoData={photoData}
            zones={zones}
            rotulos={rotulos}
            activeZoneId={activeZoneId}
            setActiveZoneId={setActiveZoneId}
            modo={modoMarcacao}
            retargeting={!!retargetId}
            onTapPhoto={onTapPhoto}
            onDrawRect={drawAddRect}
            onConfirmQuad={confirmQuad}
            updateZone={updateZone}
            alturaMax="calc(100dvh - 15rem)"
          />
        ) : noAcabamento && photoData ? (
          <FotoAcabamento photoData={photoData} zones={zones} rotulos={rotulos} zonaAtualId={zonaAtual?.id ?? null} />
        ) : undefined}
      >
        {step === "upload" && (
          <EtapaFoto
            onArquivo={handleFile}
            erro={error}
            temAmbienteSalvo={savedAmbientes.length > 0}
            resumoSimulador={resumoSimulador}
            embutido={embeddedMode}
            onPular={embeddedMode ? onSkip : undefined}
          />
        )}

        {step === "zones" && photoData && zonePhase === "mark" && (
          <MarcarAreas
            noLugar={noLugar}
            photoData={photoData}
            zones={zones}
            rotulos={rotulos}
            activeZoneId={activeZoneId}
            setActiveZoneId={setActiveZoneId}
            removeZone={removeZone}
            retargetId={retargetId}
            setRetargetId={setRetargetId}
            modo={modoMarcacao}
            setModo={setModoMarcacao}
            onAddTextZone={addTextZone}
            onEditar={() => setEditorAberto(true)}
          />
        )}

        {noAcabamento && (zonaAtual ? (
          <EtapaAcabamento
            key={zonaAtual.id}
            zona={zonaAtual}
            rotulo={rotulos[areaAtual]}
            indice={areaAtual}
            total={zones.length}
            produtos={products}
            carregando={loadingProducts}
            analise={analysis.status}
            erroAnalise={analysis.error}
            onTentarDeNovo={analyze}
            depurar={depurar}
            onEscolher={(productId) => updateZone(zonaAtual.id, { productId, productChosen: true })}
            onAtualizar={atualizarZonaAtual}
            keepText={keepText}
            setKeepText={setKeepText}
            onEditarAreas={editarAreas}
            abrirOnde={ondePedida === zonaAtual.id}
            onOndeFechada={() => setOndePedida(null)}
          />
        ) : (
          <AcabamentoSemAreas onEditarAreas={editarAreas} />
        ))}

        {step === "result" && photoData && (
          <EtapaResultado
            photoData={photoData}
            resultado={result}
            previa={preview}
            gerando={generating}
            progresso={progress}
            erro={error}
            embutido={embeddedMode}
            leadEnviado={leadSubmitted}
            leadNome={leadName}
            leadTelefone={leadPhone}
            onNome={setLeadName}
            onTelefone={setLeadPhone}
            onEnviarLead={handleLeadSubmit}
            onConsultor={consultorVisivel ? falarComConsultor : undefined}
            onBaixar={download}
            onOutroAcabamento={() => { setZonePhase("model"); irParaArea(0); setStep("zones"); }}
            onOutroAmbiente={addAnotherPhoto}
            onTentarDeNovo={generate}
            orcamento={orcamento}
          />
        )}

        {/* Próximo ambiente com um já salvo: o atalho para o consultor (ou para
            o orçamento, quando visível) continua nas outras etapas, como antes. */}
        {!embeddedMode && step !== "result" && savedAmbientes.length > 0 && (
          <AtalhoConsultor onConsultor={consultorVisivel ? falarComConsultor : undefined} orcamento={orcamento} />
        )}
      </VizShell>

      {photoData && (
        <EditorMarcacao
          aberto={editorAberto && !noLugar && step === "zones"}
          photoData={photoData}
          zones={zones}
          rotulos={rotulos}
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
          ocupado={anyDetecting}
          onPronto={concluirMarcacao}
          onFechar={fecharEditor}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

// Marcar, com o editor fechado (celular) ou no lugar (computador, a foto vai na
// coluna da esquerda pelo VizShell). No celular a foto aqui é parada: tocar e
// arrastar nela rola a página; marcar é no editor.
function MarcarAreas({
  noLugar, photoData, zones, rotulos, activeZoneId, setActiveZoneId, removeZone, retargetId, setRetargetId, modo, setModo,
  onAddTextZone, onEditar,
}: {
  noLugar: boolean;
  photoData: string;
  zones: Zone[];
  rotulos: string[];
  activeZoneId: string | null;
  setActiveZoneId: (id: string | null) => void;
  removeZone: (id: string) => void;
  retargetId: string | null;
  setRetargetId: (id: string | null) => void;
  modo: ZoneMode;
  setModo: (m: ZoneMode) => void;
  onAddTextZone: () => void;
  onEditar: () => void;
}) {
  if (noLugar) {
    return (
      <div>
        <h2 className="mb-2 font-serif text-xl leading-tight text-[#0B1F45] sm:text-2xl">Marque as áreas</h2>
        <PainelMarcacao
          tom="claro"
          zones={zones}
          rotulos={rotulos}
          activeZoneId={activeZoneId}
          setActiveZoneId={setActiveZoneId}
          removeZone={removeZone}
          retargetId={retargetId}
          setRetargetId={setRetargetId}
          modo={modo}
          setModo={setModo}
          onAddTextZone={onAddTextZone}
        />
        <p className="mt-6 border-t border-[#ececea] pt-4 text-sm text-[#74777f]">Depois de marcar, você escolhe o acabamento de cada área.</p>
      </div>
    );
  }
  return (
    <div>
      <StepHead title="Marque as áreas" subtitle="Toque em cada parede, teto ou móvel que quer revestir." />
      <FotoParada photoData={photoData} zones={zones} rotulos={rotulos} activeZoneId={activeZoneId} onEditar={onEditar} />
    </div>
  );
}

// A foto com as áreas, sem nenhum gesto (interativo={false}), e o atalho para editar.
function FotoParada({ photoData, zones, rotulos, activeZoneId, onEditar }: {
  photoData: string; zones: Zone[]; rotulos: string[]; activeZoneId: string | null; onEditar: () => void;
}) {
  const nada = () => {};
  // Altura contida: uma foto em pé não ocupa a tela inteira e a página rola pouco.
  const proporcao = useProporcao(photoData);
  return (
    <div>
      <div className="mx-auto" style={proporcao ? { width: `min(100%, calc(52dvh * ${proporcao}))` } : undefined}>
      <SurfaceCanvas
        interativo={false}
        photoData={photoData} zones={zones} rotulos={rotulos} activeZoneId={activeZoneId} setActiveZoneId={nada}
        mode="tap" onTapPhoto={nada} onDrawRect={nada} updateZone={nada}
        busy={false} retargeting={false} onConfirmQuad={nada}
      />
      </div>
      <div className="mt-1 flex items-center gap-4">
        <p className="text-sm text-[#5b5f66]">
          {zones.length === 0 ? "Nenhuma área marcada" : zones.length === 1 ? "1 área marcada" : `${zones.length} áreas marcadas`}
        </p>
        <button
          type="button"
          onClick={onEditar}
          className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-[#0B1F45] underline decoration-[#0B1F45]/25 underline-offset-4 hover:text-[#2347A0]"
        >
          <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
          </svg>
          Editar áreas
        </button>
      </div>
    </div>
  );
}

// Small step heading used across the guided phases: the "what to do now" cue.
function StepHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-serif text-[#0B1F45] text-xl sm:text-2xl leading-tight">{title}</h2>
      <p className="text-[#74777f] text-sm mt-1">{subtitle}</p>
    </div>
  );
}
