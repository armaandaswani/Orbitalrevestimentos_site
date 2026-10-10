import { NextRequest, NextResponse } from "next/server";

// POST /api/visualizador/detect-surface — public, best-effort.
//
// The client either taps a point on their photo, or — when a tap fragments a
// surface into several small regions (e.g. SAM2 reading tile grout lines as
// object boundaries) — draws a box around the whole intended area. We return
// the selected surface so the Visualizador can highlight it and confine the
// render to it.
//
// Engine: fal.ai SAM2 (FAL_KEY) — pixel-accurate mask, returned as a binary
// mask PNG (data URI via sync_mode); the client tints it. Accepts a point or a
// box prompt (a box makes SAM2 segment "the one object filling this
// rectangle" instead of one sub-tile).
//
// Sem Gemini (decisão do dono, out/2026: a IA do site é a OpenAI). Se o SAM2
// falhar, a rota responde 422 e o cliente fica com a marcação crua.
// Obs.: no fluxo atual do Visualizador a detecção está desligada
// (SURFACE_DETECTION = false); a OpenAI descreve a superfície em /analisar.
//
// Response: { mask: <data-uri png>, maskWidth, maskHeight }

// O fal ganha um limite (antes podia travar até a função ser cortada).
export const maxDuration = 30;
const FAL_TIMEOUT_MS = 12_000;

// O SAM2 da fal às vezes trava na 1ª chamada (servidor "frio") e responde em
// ~1 s na seguinte: vale UMA segunda tentativa.
async function comRetentativa<T>(fn: () => Promise<T | null>): Promise<T | null> {
  return (await fn()) ?? (await fn());
}

const FAL_RUN = "https://fal.run/fal-ai/sam2/image";

function parseInline(input: string): { data: string; mime: string } | null {
  const m = input.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!m) return null;
  return { mime: m[1], data: m[2] };
}

async function imageUrlToDataUri(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`mask fetch ${res.status}`);
  const mime = res.headers.get("content-type") || "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${mime};base64,${buf.toString("base64")}`;
}

// ── fal.ai SAM2 ──────────────────────────────────────────────────────────────
// pxX/pxY are PIXEL coordinates in the source image; natW/natH are the image's
// pixel dimensions (used to size the point cluster).
async function detectFal(
  photoDataUrl: string,
  pxX: number,
  pxY: number,
  natW: number,
  natH: number
): Promise<{ mask: string; width: number; height: number } | null> {
  const key = process.env.FAL_KEY;
  if (!key) return null;
  try {
    // A SINGLE point is the weakest SAM2 prompt: on a large flat surface it
    // often returns only the sub-region it's most confident about (one slab
    // section, or the part cut off by a shadow/seam) → partial masks and empty
    // spaces. Send a small CLUSTER of positive points around the tap (±5% of
    // the image) so SAM2 reads "this whole surface", not one spot. The offset
    // is small enough to stay on the intended wall in the common case.
    const dx = Math.round((natW || 1000) * 0.05);
    const dy = Math.round((natH || 1000) * 0.05);
    const cx = (v: number) => Math.max(0, Math.min((natW || 1) - 1, Math.round(v)));
    const cy = (v: number) => Math.max(0, Math.min((natH || 1) - 1, Math.round(v)));
    const prompts = [
      { x: cx(pxX), y: cy(pxY), label: 1 },
      { x: cx(pxX + dx), y: cy(pxY), label: 1 },
      { x: cx(pxX - dx), y: cy(pxY), label: 1 },
      { x: cx(pxX), y: cy(pxY + dy), label: 1 },
      { x: cx(pxX), y: cy(pxY - dy), label: 1 },
    ];
    const res = await fetch(FAL_RUN, {
      method: "POST",
      signal: AbortSignal.timeout(FAL_TIMEOUT_MS),
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: photoDataUrl,
        prompts,
        output_format: "png",
        apply_mask: false, // return the binary mask, not a cutout
        sync_mode: true, // inline the result as a data URI (no CDN round-trip)
      }),
    });
    if (!res.ok) {
      // Surface WHY fal failed (401 = bad/missing key, 422 = bad prompt, etc.)
      // instead of failing silently.
      console.error(`[detect] fal SAM2 HTTP ${res.status}:`, (await res.text().catch(() => "")).slice(0, 300));
      return null;
    }
    const j = await res.json();
    const img = j?.image;
    if (!img?.url || typeof img.url !== "string") {
      console.error("[detect] fal SAM2 returned no mask image");
      return null;
    }
    return { mask: await imageUrlToDataUri(img.url), width: img.width ?? 0, height: img.height ?? 0 };
  } catch (e) {
    console.error("[detect] fal SAM2 threw:", e instanceof Error ? e.message : e);
    return null;
  }
}

// pxX1/pxY1/pxX2/pxY2 are PIXEL coordinates (top-left, bottom-right) of the
// box the client drew. Box prompts make SAM2 segment "the one object filling
// roughly this rectangle" instead of whatever sub-region a single point lands
// on — the fix for surfaces (e.g. tiled backsplashes) where grout joints read
// as separate objects under a point prompt.
async function detectFalBox(
  photoDataUrl: string,
  pxX1: number,
  pxY1: number,
  pxX2: number,
  pxY2: number
): Promise<{ mask: string; width: number; height: number } | null> {
  const key = process.env.FAL_KEY;
  if (!key) return null;
  try {
    const res = await fetch(FAL_RUN, {
      method: "POST",
      signal: AbortSignal.timeout(FAL_TIMEOUT_MS),
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: photoDataUrl,
        box_prompts: [{
          x_min: Math.round(Math.min(pxX1, pxX2)),
          y_min: Math.round(Math.min(pxY1, pxY2)),
          x_max: Math.round(Math.max(pxX1, pxX2)),
          y_max: Math.round(Math.max(pxY1, pxY2)),
        }],
        output_format: "png",
        apply_mask: false,
        sync_mode: true,
      }),
    });
    if (!res.ok) {
      // Surface WHY fal failed (401 = bad/missing key, 422 = bad prompt, etc.)
      // instead of failing silently.
      console.error(`[detect] fal SAM2 HTTP ${res.status}:`, (await res.text().catch(() => "")).slice(0, 300));
      return null;
    }
    const j = await res.json();
    const img = j?.image;
    if (!img?.url || typeof img.url !== "string") {
      console.error("[detect] fal SAM2 returned no mask image");
      return null;
    }
    return { mask: await imageUrlToDataUri(img.url), width: img.width ?? 0, height: img.height ?? 0 };
  } catch (e) {
    console.error("[detect] fal SAM2 threw:", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: {
    photo?: string;
    point?: { x?: number; y?: number };
    box?: { x?: number; y?: number; w?: number; h?: number };
    width?: number;
    height?: number;
    hint?: string;
    // Pedido de "outro motor" (antes: Gemini). Não há outro motor: responde 422.
    skipFal?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const img = body.photo ? parseInline(body.photo) : null;
  if (!body.photo || !img) return NextResponse.json({ error: "Foto obrigatória." }, { status: 400 });

  const natW = typeof body.width === "number" && body.width > 0 ? body.width : 0;
  const natH = typeof body.height === "number" && body.height > 0 ? body.height : 0;
  const useFal = !body.skipFal && !!process.env.FAL_KEY;

  const b = body.box;
  const box =
    b && typeof b.w === "number" && typeof b.h === "number" && b.w > 0.01 && b.h > 0.01
      ? {
          x1: Math.min(1, Math.max(0, b.x ?? 0)),
          y1: Math.min(1, Math.max(0, b.y ?? 0)),
          x2: Math.min(1, Math.max(0, (b.x ?? 0) + b.w)),
          y2: Math.min(1, Math.max(0, (b.y ?? 0) + b.h)),
        }
      : null;

  // Box-prompt path — the client drew a rectangle (typically because tap-to-
  // detect fragmented the surface). Confine SAM2 to "the one object filling
  // this box" instead of wherever a single point would have landed.
  if (box) {
    if (useFal && natW > 0 && natH > 0) {
      const fal = await comRetentativa(() => detectFalBox(body.photo!, box.x1 * natW, box.y1 * natH, box.x2 * natW, box.y2 * natH));
      if (fal) return NextResponse.json({ mask: fal.mask, maskWidth: fal.width, maskHeight: fal.height, engine: "fal" });
    }
    return NextResponse.json({ error: "Superfície não detectada." }, { status: 422 });
  }

  // Point-prompt path (tap-to-detect).
  const nx = Math.min(1, Math.max(0, body.point?.x ?? 0.5));
  const ny = Math.min(1, Math.max(0, body.point?.y ?? 0.5));

  if (useFal && natW > 0 && natH > 0) {
    const fal = await comRetentativa(() => detectFal(body.photo!, nx * natW, ny * natH, natW, natH));
    if (fal) return NextResponse.json({ mask: fal.mask, maskWidth: fal.width, maskHeight: fal.height });
  }

  return NextResponse.json({ error: "Superfície não detectada." }, { status: 422 });
}
