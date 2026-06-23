import { NextRequest, NextResponse } from "next/server";

// POST /api/visualizador/detect-surface — public, best-effort.
//
// The client either taps a point on their photo, or — when a tap fragments a
// surface into several small regions (e.g. SAM2 reading tile grout lines as
// object boundaries) — draws a box around the whole intended area. We return
// the selected surface so the Visualizador can highlight it and confine the
// render to it.
//
// Two engines, in order of preference:
//   1. fal.ai SAM2 (if FAL_KEY is set) — true pixel-accurate mask. Returns a
//      binary mask PNG (as a data URI via sync_mode); the client tints it.
//      Accepts either a point prompt or a box prompt: a box tells SAM2 "the
//      object I care about fills roughly this rectangle", which is far more
//      likely to produce one cohesive mask of a joint-divided surface than a
//      single point click (which can land on one sub-tile/segment).
//   2. Gemini polygon (fallback, uses the existing Gemini key) — an approximate
//      polygon outline. Used when FAL_KEY isn't configured or fal fails.
//
// Response is one of:
//   { mask: <data-uri png>, maskWidth, maskHeight }   (fal)
//   { polygon: [[x,y]…], rect: {x,y,w,h} }            (gemini)
// On total failure the client falls back to the raw point/box it was given
// (a plain rectangle for box requests — today's pre-existing behavior).

export const maxDuration = 30;

const FAL_RUN = "https://fal.run/fal-ai/sam2/image";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = process.env.GEMINI_DETECT_MODEL || "gemini-2.5-flash";

function parseInline(input: string): { data: string; mime: string } | null {
  const m = input.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!m) return null;
  return { mime: m[1], data: m[2] };
}

// ── fal.ai SAM2 ──────────────────────────────────────────────────────────────
// pxX/pxY are PIXEL coordinates in the source image.
async function detectFal(
  photoDataUrl: string,
  pxX: number,
  pxY: number
): Promise<{ mask: string; width: number; height: number } | null> {
  const key = process.env.FAL_KEY;
  if (!key) return null;
  try {
    const res = await fetch(FAL_RUN, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: photoDataUrl,
        prompts: [{ x: Math.round(pxX), y: Math.round(pxY), label: 1 }],
        output_format: "png",
        apply_mask: false, // return the binary mask, not a cutout
        sync_mode: true, // inline the result as a data URI (no CDN round-trip)
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const img = j?.image;
    if (!img?.url || typeof img.url !== "string") return null;
    return { mask: img.url, width: img.width ?? 0, height: img.height ?? 0 };
  } catch {
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
    if (!res.ok) return null;
    const j = await res.json();
    const img = j?.image;
    if (!img?.url || typeof img.url !== "string") return null;
    return { mask: img.url, width: img.width ?? 0, height: img.height ?? 0 };
  } catch {
    return null;
  }
}

// ── Gemini polygon fallback ──────────────────────────────────────────────────
function parsePolygon(text: string): Array<[number, number]> | null {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "");
  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  let parsed = tryParse(cleaned.trim());
  if (!parsed) {
    const m = cleaned.match(/\[\s*\[[\s\S]*?\]\s*\]/);
    if (m) parsed = tryParse(m[0]);
  }
  const arr =
    parsed && typeof parsed === "object" && "polygon" in (parsed as Record<string, unknown>)
      ? (parsed as { polygon: unknown }).polygon
      : parsed;
  if (!Array.isArray(arr)) return null;
  const pts: Array<[number, number]> = [];
  for (const p of arr) {
    if (Array.isArray(p) && p.length >= 2 && typeof p[0] === "number" && typeof p[1] === "number") {
      pts.push([p[0], p[1]]);
    }
  }
  return pts.length >= 3 ? pts : null;
}

async function detectGemini(
  photo: { data: string; mime: string },
  locateClause: string,
  hint: string | null
): Promise<{ polygon: Array<[number, number]>; rect: { x: number; y: number; w: number; h: number } } | null> {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.FREE_LLM_API_KEY;
  if (!apiKey) return null;
  const instruction =
    `In this image, find the single continuous flat architectural surface ` +
    `(a wall, ceiling, door, or cabinet face${hint ? `; the client says it is: ${hint}` : ""}) ` +
    `${locateClause} ` +
    `Trace its outline as a polygon of 12–28 ordered points that hugs the surface's real edges. ` +
    `If the surface is divided by grout lines, tile joints or panel seams, treat the WHOLE divided ` +
    `area as ONE single surface and trace its outer outline — do not trace just one sub-tile. ` +
    `Respond with ONLY JSON: {"polygon": [[x,y], ...]} using integer coordinates 0–1000. No prose.`;
  let res: Response;
  try {
    res = await fetch(`${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: instruction }, { inline_data: { mime_type: photo.mime, data: photo.data } }] },
        ],
        generationConfig: { temperature: 0, responseModalities: ["TEXT"] },
      }),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const json = await res.json();
  const parts: Array<{ text?: string }> = json?.candidates?.[0]?.content?.parts ?? [];
  const poly = parsePolygon(parts.map((p) => p.text ?? "").join(" "));
  if (!poly) return null;
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  const polygon = poly.map(([x, y]) => {
    const nx = Math.min(1, Math.max(0, x / 1000));
    const ny = Math.min(1, Math.max(0, y / 1000));
    if (nx < minX) minX = nx;
    if (nx > maxX) maxX = nx;
    if (ny < minY) minY = ny;
    if (ny > maxY) maxY = ny;
    return [nx, ny] as [number, number];
  });
  const w = maxX - minX;
  const h = maxY - minY;
  if (!(w > 0.02 && h > 0.02)) return null;
  return { polygon, rect: { x: minX, y: minY, w, h } };
}

export async function POST(req: NextRequest) {
  let body: {
    photo?: string;
    point?: { x?: number; y?: number };
    box?: { x?: number; y?: number; w?: number; h?: number };
    width?: number;
    height?: number;
    hint?: string;
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
  const hint = typeof body.hint === "string" && body.hint.trim() ? body.hint.trim() : null;

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
    if (process.env.FAL_KEY && natW > 0 && natH > 0) {
      const fal = await detectFalBox(body.photo, box.x1 * natW, box.y1 * natH, box.x2 * natW, box.y2 * natH);
      if (fal) return NextResponse.json({ mask: fal.mask, maskWidth: fal.width, maskHeight: fal.height });
    }
    const gem = await detectGemini(
      img,
      `that fills approximately the rectangle from (x=${Math.round(box.x1 * 1000)}, y=${Math.round(box.y1 * 1000)}) ` +
        `to (x=${Math.round(box.x2 * 1000)}, y=${Math.round(box.y2 * 1000)}) (coordinates 0–1000, origin top-left).`,
      hint
    );
    if (gem) return NextResponse.json(gem);
    return NextResponse.json({ error: "Superfície não detectada." }, { status: 422 });
  }

  // Point-prompt path (tap-to-detect) — unchanged.
  const nx = Math.min(1, Math.max(0, body.point?.x ?? 0.5));
  const ny = Math.min(1, Math.max(0, body.point?.y ?? 0.5));

  if (process.env.FAL_KEY && natW > 0 && natH > 0) {
    const fal = await detectFal(body.photo, nx * natW, ny * natH);
    if (fal) return NextResponse.json({ mask: fal.mask, maskWidth: fal.width, maskHeight: fal.height });
  }

  const gem = await detectGemini(
    img,
    `that contains the point x=${Math.round(nx * 1000)}, y=${Math.round(ny * 1000)} (coordinates 0–1000, origin top-left).`,
    hint
  );
  if (gem) return NextResponse.json(gem);

  return NextResponse.json({ error: "Superfície não detectada." }, { status: 422 });
}
