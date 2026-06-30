import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  composePrompt,
  finishDescription,
  DEFAULT_PANEL_WIDTH_M,
  DEFAULT_PANEL_HEIGHT_M,
  type FinishKind,
} from "@/lib/render-prompt";

// Gemini image generation ("nano-banana"): takes the client's wall photo +
// the chosen PFB panel reference image and renders the panel applied to that
// exact wall, keeping the original viewpoint, perspective and lighting.
//
// The prompt is resolved PER MODEL: when the request carries a productId and
// that product has per-model render fields set (migration 011), the prompt is
// composed from a fixed scaffold + those fields. Otherwise it falls back to
// the legacy per-line (matte/polished/wood) prompt so existing products keep
// rendering during rollout.
export const maxDuration = 60;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

interface RenderProduct {
  image_path: string | null;
  render_texture_path: string | null;
  linha: string | null;
  render_finish_description: string | null;
  render_panel_width_m: number | string | null;
  render_panel_height_m: number | string | null;
  render_context_image_path: string | null;
  render_extra_notes: string | null;
}

// Loads the product's render fields. Returns null on ANY failure (product not
// found, migration 011 not yet applied, etc.) so the caller falls back to the
// legacy per-line prompt instead of breaking the render.
async function loadRenderProduct(productId: string): Promise<RenderProduct | null> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("products")
      .select(
        "image_path, render_texture_path, linha, render_finish_description, render_panel_width_m, render_panel_height_m, render_context_image_path, render_extra_notes"
      )
      .eq("id", productId)
      .single();
    if (error || !data) return null;
    return data as RenderProduct;
  } catch {
    return null;
  }
}

async function fetchAsBase64(url: string): Promise<{ data: string; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar a imagem de referência (${res.status}).`);
  const mime = res.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { data: buf.toString("base64"), mime };
}

// Accepts a data URL or a bare base64 string and normalizes it.
function parseInline(input: string, fallbackMime = "image/jpeg"): { data: string; mime: string } {
  const m = input.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (m) return { mime: m[1], data: m[2] };
  return { mime: fallbackMime, data: input };
}

function toPositiveNumber(v: number | string | null | undefined, fallback: number): number {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && isFinite(n) && n > 0 ? n : fallback;
}

export async function POST(req: NextRequest) {
  // Image generation talks to Google's Gemini API DIRECTLY, so it needs a real
  // Google Generative Language API key (from AI Studio) — NOT FREE_LLM_API_KEY,
  // which is the key for the OpenAI-compatible proxy the chat/CRM routes use.
  // Prefer a dedicated var; fall back to FREE_LLM_API_KEY only for back-compat.
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.FREE_LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Serviço de visualização não configurado no servidor." },
      { status: 503 }
    );
  }

  let body: {
    photo?: string;
    productId?: string;
    referenceUrl?: string;
    finish?: FinishKind;
    // Optional real wall measurements typed by the client (meters).
    wallWidthM?: number | string;
    wallHeightM?: number | string;
    // Optional description of WHERE to apply the panel (the guided flow's
    // "Aplicação" step): a preset surface phrase or the client's own text.
    applicationArea?: string;
    // Optional rectangular zone the client drew (normalized 0..1). Confines the
    // panel to that region so multi-zone renders keep each panel in its zone.
    rect?: { x?: number; y?: number; w?: number; h?: number };
    // Optional black-and-white mask (data URL) aligned to the photo: white =
    // the exact target surface, black = leave untouched. Far more precise than
    // rect — the model follows the masked surface's real shape and perspective
    // and won't paint over foreground objects. When present it supersedes rect.
    maskImage?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const { photo, productId } = body;
  const finish: FinishKind = body.finish ?? "matte";

  if (!photo) return NextResponse.json({ error: "Foto da parede obrigatória." }, { status: 400 });

  // Per-model path: resolve the product's curated render fields server-side.
  const product = productId ? await loadRenderProduct(productId) : null;
  const finishText = product?.render_finish_description?.trim() || null;
  const usePerModel = !!finishText;

  // The panel reference Gemini must reproduce. Prefer the FLAT, rectified slab
  // texture (render_texture_path) — that's the exact, glare-free, front-on
  // sample. Fall back to the styled catalogue photo (image_path), then the
  // legacy client referenceUrl. Using the flat texture here is what lets the
  // generative render reproduce the real material instead of a look-alike.
  const referenceUrl =
    product?.render_texture_path?.trim() || product?.image_path || body.referenceUrl;
  const usingFlatTexture = !!product?.render_texture_path?.trim();
  if (!referenceUrl)
    return NextResponse.json({ error: "Acabamento de referência obrigatório." }, { status: 400 });

  // Resolve relative reference paths (e.g. /images/...) against this request's origin.
  const toAbsolute = (url: string) =>
    /^https?:\/\//.test(url) ? url : new URL(url, req.nextUrl.origin).toString();

  const contextImagePath = usePerModel ? product?.render_context_image_path?.trim() || null : null;

  // Optional binary mask supplied by the client (data URL). Parsed defensively:
  // a malformed mask must never break a render — we just fall back to the rect.
  const maskInline =
    typeof body.maskImage === "string" && body.maskImage.startsWith("data:")
      ? parseInline(body.maskImage, "image/png")
      : null;

  let wall: { data: string; mime: string };
  let reference: { data: string; mime: string };
  let contextImage: { data: string; mime: string } | null = null;
  try {
    wall = parseInline(photo);
    reference = await fetchAsBase64(toAbsolute(referenceUrl));
    if (contextImagePath) {
      // The in-ambience reference is optional — if it fails to load, render
      // without it rather than failing the whole request.
      contextImage = await fetchAsBase64(toAbsolute(contextImagePath)).catch(() => null);
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao preparar as imagens." },
      { status: 502 }
    );
  }

  // Client-provided wall measurements (optional, capped to sane values).
  const wallW = toPositiveNumber(body.wallWidthM ?? null, 0);
  const wallH = toPositiveNumber(body.wallHeightM ?? null, 0);
  const hasWallDims = wallW > 0 && wallW <= 50 && wallH > 0 && wallH <= 20;

  // WHERE to apply the panel (optional). This is client-supplied text that goes
  // straight into the LLM prompt, so collapse whitespace and cap the length.
  // Allow a full sentence-length description (e.g. "the grey walls at the back,
  // behind the sofa") since that's often clearer than a drawn rectangle.
  const applicationArea =
    typeof body.applicationArea === "string"
      ? body.applicationArea.replace(/\s+/g, " ").trim().slice(0, 240) || null
      : null;

  // Optional drawn rectangle (normalized 0..1), clamped to valid bounds.
  const clamp01 = (n: unknown) => (typeof n === "number" && isFinite(n) ? Math.min(1, Math.max(0, n)) : null);
  let rect: { x: number; y: number; w: number; h: number } | null = null;
  if (body.rect && typeof body.rect === "object") {
    const x = clamp01(body.rect.x), y = clamp01(body.rect.y), w = clamp01(body.rect.w), h = clamp01(body.rect.h);
    if (x !== null && y !== null && w !== null && h !== null && w > 0.02 && h > 0.02) {
      rect = { x, y, w: Math.min(w, 1 - x), h: Math.min(h, 1 - y) };
    }
  }

  const prompt = composePrompt({
    finishText: finishText ?? finishDescription(finish),
    panelWidthM: toPositiveNumber(product?.render_panel_width_m, DEFAULT_PANEL_WIDTH_M),
    panelHeightM: toPositiveNumber(product?.render_panel_height_m, DEFAULT_PANEL_HEIGHT_M),
    extraNotes: usePerModel ? product?.render_extra_notes : null,
    hasContextImage: !!contextImage,
    hasMaskImage: !!maskInline,
    wallWidthM: hasWallDims ? wallW : null,
    wallHeightM: hasWallDims ? wallH : null,
    applicationArea,
    rect,
    referenceIsFlatTexture: usingFlatTexture,
  });

  // Image order MUST match composePrompt's numbering: photo (1), panel (2),
  // mask (3 if present), context (next if present).
  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [
    { text: prompt },
    { inline_data: { mime_type: wall.mime, data: wall.data } },
    { inline_data: { mime_type: reference.mime, data: reference.data } },
  ];
  if (maskInline) {
    parts.push({ inline_data: { mime_type: maskInline.mime, data: maskInline.data } });
  }
  if (contextImage) {
    parts.push({ inline_data: { mime_type: contextImage.mime, data: contextImage.data } });
  }

  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["IMAGE"] },
  };

  // Retry on transient Gemini failures — 503 (overloaded), 429 (rate) and 500
  // (sporadic server error), which are the usual "worked the second time"
  // cases. Exponential-ish backoff between attempts.
  const RETRYABLE = new Set([429, 500, 503]);
  let res: Response | null = null;
  const bodyStr = JSON.stringify(payload);
  const url = `${GEMINI_BASE}/models/${MODEL}:generateContent?key=${apiKey}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyStr,
      });
      if (!RETRYABLE.has(res.status)) break;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    } catch {
      if (attempt === 2) {
        return NextResponse.json({ error: "Não foi possível contatar o gerador de imagem." }, { status: 502 });
      }
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
  }
  if (!res) {
    return NextResponse.json({ error: "Não foi possível contatar o gerador de imagem." }, { status: 502 });
  }

  if (!res.ok) {
    const errText = await res.text();
    const isBusy = res.status === 503 || res.status === 429;
    // Log to Vercel function logs so the admin can see what Gemini actually says.
    console.error(`[render] Gemini ${res.status} using model ${MODEL}:`, errText.slice(0, 800));
    return NextResponse.json(
      {
        error: isBusy
          ? "O gerador de imagem está temporariamente sobrecarregado. Aguarde alguns segundos e tente novamente."
          : `Erro do gerador de imagem (${res.status}).`,
        detail: errText.slice(0, 500),
      },
      { status: 502 }
    );
  }

  const json = await res.json();
  const outParts: Array<{ inlineData?: { data: string; mimeType?: string }; inline_data?: { data: string; mime_type?: string } }> =
    json?.candidates?.[0]?.content?.parts ?? [];

  let outData: string | null = null;
  let outMime = "image/png";
  for (const p of outParts) {
    const inline = p.inlineData ?? p.inline_data;
    if (inline?.data) {
      outData = inline.data;
      outMime = (p.inlineData?.mimeType ?? p.inline_data?.mime_type) || outMime;
      break;
    }
  }

  if (!outData) {
    const finishReason = json?.candidates?.[0]?.finishReason;
    return NextResponse.json(
      {
        error:
          finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT"
            ? "A imagem foi bloqueada pelo filtro de conteúdo. Tente outra foto."
            : "O gerador não retornou uma imagem. Tente novamente.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ image: `data:${outMime};base64,${outData}` });
}
