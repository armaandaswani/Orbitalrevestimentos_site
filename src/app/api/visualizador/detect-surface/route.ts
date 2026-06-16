import { NextRequest, NextResponse } from "next/server";

// POST /api/visualizador/detect-surface — public, best-effort.
//
// The client clicks a point on their photo; we ask Gemini for the 2D bounding
// box of the continuous flat surface (wall / ceiling / cabinet face / etc.) at
// that point. The Visualizador uses it to seed an adjustable rectangle zone, so
// the client doesn't have to draw from scratch. If anything fails, the client
// just falls back to drawing the rectangle manually.
//
// Gemini returns boxes as [ymin, xmin, ymax, xmax] normalized 0–1000; we convert
// to a normalized { x, y, w, h } in 0..1 (top-left origin).

export const maxDuration = 20;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
// A text+vision model (not the image generator) for spatial reasoning.
const MODEL = process.env.GEMINI_DETECT_MODEL || "gemini-2.5-flash";

function parseInline(input: string): { data: string; mime: string } | null {
  const m = input.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!m) return null;
  return { mime: m[1], data: m[2] };
}

// Pull the first [a,b,c,d] number array out of Gemini's (possibly fenced) text.
function parseBox(text: string): [number, number, number, number] | null {
  const m = text.match(/\[\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]) as number[];
    if (arr.length === 4 && arr.every((n) => typeof n === "number" && isFinite(n))) {
      return arr as [number, number, number, number];
    }
  } catch {
    /* fall through */
  }
  return null;
}

export async function POST(req: NextRequest) {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.FREE_LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Serviço não configurado." }, { status: 503 });
  }

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
    `In this image, identify the single continuous flat architectural surface ` +
    `(such as a wall, ceiling, door, or cabinet face${hint ? `; the client says it is: ${hint}` : ""}) ` +
    `that contains the point at x=${px}, y=${py} (coordinates normalized to 0–1000, ` +
    `origin at the top-left). Return ONLY that surface's 2D bounding box as a JSON ` +
    `array [ymin, xmin, ymax, xmax] with values 0–1000. No prose, no code fence.`;

  let res: Response;
  try {
    res = await fetch(`${GEMINI_BASE}/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: instruction },
              { inline_data: { mime_type: img.mime, data: img.data } },
            ],
          },
        ],
        generationConfig: { temperature: 0, responseModalities: ["TEXT"] },
      }),
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível detectar a superfície." }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: `Erro na detecção (${res.status}).` }, { status: 502 });
  }

  const json = await res.json();
  const parts: Array<{ text?: string }> = json?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join(" ");
  const box = parseBox(text);
  if (!box) {
    return NextResponse.json({ error: "Superfície não detectada." }, { status: 422 });
  }

  // [ymin, xmin, ymax, xmax] (0–1000) → normalized { x, y, w, h }.
  const [ymin, xmin, ymax, xmax] = box;
  const x = Math.min(xmin, xmax) / 1000;
  const y = Math.min(ymin, ymax) / 1000;
  const w = Math.abs(xmax - xmin) / 1000;
  const h = Math.abs(ymax - ymin) / 1000;

  if (!(w > 0.02 && h > 0.02)) {
    return NextResponse.json({ error: "Região detectada muito pequena." }, { status: 422 });
  }

  return NextResponse.json({
    rect: {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
      w: Math.min(w, 1 - x),
      h: Math.min(h, 1 - y),
    },
  });
}
