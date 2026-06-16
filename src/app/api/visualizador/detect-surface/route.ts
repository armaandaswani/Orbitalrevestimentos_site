import { NextRequest, NextResponse } from "next/server";

// POST /api/visualizador/detect-surface — public, best-effort.
//
// The client taps a point on their photo; we ask Gemini for a POLYGON outline of
// the continuous flat surface (wall / ceiling / door / cabinet face) at that
// point — NOT a bounding box, so the highlight hugs the real surface shape. The
// Visualizador tints that polygon as the selected area and confines the render
// to its bounds. If anything fails, the client can fall back to the text
// description box.
//
// Gemini returns coordinates 0–1000 (origin top-left). We return a polygon of
// normalized [x, y] points (0..1) plus its bounding box.

export const maxDuration = 20;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_DETECT_MODEL || "gemini-2.5-flash";

function parseInline(input: string): { data: string; mime: string } | null {
  const m = input.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!m) return null;
  return { mime: m[1], data: m[2] };
}

// Pull a polygon (array of [x,y]) out of Gemini's (possibly fenced) JSON text.
function parsePolygon(text: string): Array<[number, number]> | null {
  // Prefer an explicit {"polygon": [...]} but accept a bare [[x,y],...] too.
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

export async function POST(req: NextRequest) {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.FREE_LLM_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Serviço não configurado." }, { status: 503 });

  let body: { photo?: string; point?: { x?: number; y?: number }; hint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const img = body.photo ? parseInline(body.photo) : null;
  if (!img) return NextResponse.json({ error: "Foto obrigatória." }, { status: 400 });

  const px = Math.round(Math.min(1, Math.max(0, body.point?.x ?? 0.5)) * 1000);
  const py = Math.round(Math.min(1, Math.max(0, body.point?.y ?? 0.5)) * 1000);
  const hint = typeof body.hint === "string" && body.hint.trim() ? body.hint.trim() : null;

  const instruction =
    `In this image, find the single continuous flat architectural surface ` +
    `(a wall, ceiling, door, or cabinet face${hint ? `; the client says it is: ${hint}` : ""}) ` +
    `that contains the point x=${px}, y=${py} (coordinates 0–1000, origin top-left). ` +
    `Trace its outline as a polygon of 12–28 ordered points that hugs the surface's ` +
    `real edges (follow corners, door frames, where the wall meets floor/ceiling). ` +
    `Respond with ONLY JSON: {"polygon": [[x,y], ...]} using integer coordinates 0–1000. ` +
    `No prose, no code fence.`;

  let res: Response;
  try {
    res = await fetch(`${GEMINI_BASE}/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: instruction }, { inline_data: { mime_type: img.mime, data: img.data } }],
          },
        ],
        generationConfig: { temperature: 0, responseModalities: ["TEXT"] },
      }),
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível detectar a superfície." }, { status: 502 });
  }

  if (!res.ok) return NextResponse.json({ error: `Erro na detecção (${res.status}).` }, { status: 502 });

  const json = await res.json();
  const parts: Array<{ text?: string }> = json?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join(" ");
  const poly = parsePolygon(text);
  if (!poly) return NextResponse.json({ error: "Superfície não detectada." }, { status: 422 });

  // Normalize to 0..1 and compute the bounding box.
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
  if (!(w > 0.02 && h > 0.02)) {
    return NextResponse.json({ error: "Região detectada muito pequena." }, { status: 422 });
  }

  return NextResponse.json({ polygon, rect: { x: minX, y: minY, w, h } });
}
