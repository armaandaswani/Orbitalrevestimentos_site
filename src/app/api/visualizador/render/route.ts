import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

const DEFAULT_PANEL_WIDTH_M = 1.2;
const DEFAULT_PANEL_HEIGHT_M = 2.9;

type FinishKind = "matte" | "polished" | "wood";

function finishDescription(kind: FinishKind): string {
  switch (kind) {
    case "polished":
      return "polished marble with a glossy, reflective sheen and rich veining";
    case "wood":
      return "warm textured wood with natural grain";
    case "matte":
    default:
      return "matte marble with a soft, non-reflective surface and subtle veining";
  }
}

// Fixed scaffold: every invariant rule lives here. Per-model (or per-line
// fallback) specifics are injected as parameters.
function composePrompt(opts: {
  finishText: string;
  panelWidthM: number;
  panelHeightM: number;
  extraNotes?: string | null;
  hasContextImage?: boolean;
}): string {
  const lines = [
    "You are an architectural visualization engine.",
    "The FIRST image is a real photo of a client's wall.",
    "The SECOND image is the product reference: a PFB wall panel with a",
    `${opts.finishText} finish.`,
  ];
  if (opts.hasContextImage) {
    lines.push(
      "The THIRD image shows this panel installed in a real room — use it as",
      "a guide for how the finish reads in context (scale, sheen, light response)."
    );
  }
  lines.push(
    "",
    "Re-render the FIRST photo so the wall is fully covered with this exact",
    "panel finish, as if the panels were physically installed on it.",
    "Rules:",
    "- Keep the EXACT same camera angle, viewpoint, framing and room as the original photo.",
    "- Apply the finish from the reference image precisely — same texture, color and tonality.",
    "- Cover the entire wall, floor to ceiling, respecting the panel proportions.",
    `- Panel size reference: ${opts.panelWidthM}m wide x ${opts.panelHeightM}m tall. Do not distort the texture.`,
    "- The whole wall must read as one continuous finish: no mixed textures or tones.",
    "- Preserve the real perspective, the room's existing furniture, floor, ceiling and lighting.",
    "- Keep the wall's natural shadows and light falloff so it looks photorealistic.",
    "- Ray-trace the result, cinematic studio lighting, soft shadows, ultra-realistic, ultra HD."
  );
  const notes = opts.extraNotes?.trim();
  if (notes) {
    lines.push(`Additional model-specific notes: ${notes}`);
  }
  lines.push("Output only the edited photo.");
  return lines.join("\n");
}

interface RenderProduct {
  image_path: string | null;
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
        "image_path, linha, render_finish_description, render_panel_width_m, render_panel_height_m, render_context_image_path, render_extra_notes"
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
  const apiKey = process.env.FREE_LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Serviço de visualização não configurado no servidor." },
      { status: 503 }
    );
  }

  let body: { photo?: string; productId?: string; referenceUrl?: string; finish?: FinishKind };
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

  // The panel swatch reference: prefer the server-side product image, fall
  // back to the legacy client-provided referenceUrl during rollout.
  const referenceUrl = product?.image_path || body.referenceUrl;
  if (!referenceUrl)
    return NextResponse.json({ error: "Acabamento de referência obrigatório." }, { status: 400 });

  // Resolve relative reference paths (e.g. /images/...) against this request's origin.
  const toAbsolute = (url: string) =>
    /^https?:\/\//.test(url) ? url : new URL(url, req.nextUrl.origin).toString();

  const contextImagePath = usePerModel ? product?.render_context_image_path?.trim() || null : null;

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

  const prompt = composePrompt({
    finishText: finishText ?? finishDescription(finish),
    panelWidthM: toPositiveNumber(product?.render_panel_width_m, DEFAULT_PANEL_WIDTH_M),
    panelHeightM: toPositiveNumber(product?.render_panel_height_m, DEFAULT_PANEL_HEIGHT_M),
    extraNotes: usePerModel ? product?.render_extra_notes : null,
    hasContextImage: !!contextImage,
  });

  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [
    { text: prompt },
    { inline_data: { mime_type: wall.mime, data: wall.data } },
    { inline_data: { mime_type: reference.mime, data: reference.data } },
  ];
  if (contextImage) {
    parts.push({ inline_data: { mime_type: contextImage.mime, data: contextImage.data } });
  }

  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["IMAGE"] },
  };

  let res: Response;
  try {
    res = await fetch(`${GEMINI_BASE}/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível contatar o gerador de imagem." }, { status: 502 });
  }

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json(
      { error: `Erro do gerador de imagem (${res.status}).`, detail: errText.slice(0, 500) },
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
