import sharp from "sharp";

/**
 * OpenAI image edit (GPT Image) for the Visualizador.
 *
 * POST /v1/images/edits, multipart:
 *   image[]  1) the client's photo (PNG)  2..n) the flat texture of each model
 *   mask     PNG with alpha, same size as image 1: TRANSPARENT = area to edit
 *   size     the photo's own proportions (custom WxH, multiples of 16)
 *
 * The API changes quickly, so the model is configurable (OPENAI_IMAGE_MODEL)
 * and a rejected model name or size falls back to the next option instead of
 * failing the render.
 */

const ENDPOINT = `${(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")}/images/edits`;
const DEFAULT_MODELS = ["gpt-image-2.5-sunburst", "gpt-image-2", "gpt-image-1"];

export function openaiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export class OpenAIImageError extends Error {
  constructor(message: string, readonly status: number, readonly detail?: string) {
    super(message);
  }
}

/** Photo proportions → WxH with the long edge at `longEdge`, both multiples of 16, ratio within 1:3–3:1. */
export function sizeFor(w: number, h: number, longEdge = 1536): string {
  const ratio = Math.min(3, Math.max(1 / 3, w / h));
  const r16 = (n: number) => Math.max(256, Math.round(n / 16) * 16);
  return ratio >= 1 ? `${r16(longEdge)}x${r16(longEdge / ratio)}` : `${r16(longEdge * ratio)}x${r16(longEdge)}`;
}

/** Our mask (white = surface to clad, black = keep) → OpenAI mask (transparent = edit), sized to the photo. */
async function toOpenAIMask(maskPng: Buffer, w: number, h: number): Promise<Buffer> {
  const grey = await sharp(maskPng).resize(w, h, { fit: "fill" }).greyscale().raw().toBuffer();
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4 + 3] = grey[i] > 127 ? 0 : 255; // white → transparent (edit)
  }
  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

export async function openaiEditImage(input: {
  photo: Buffer;
  /** One flat texture per model, in the order the prompt numbers them (image 2, 3, …). */
  textures: { data: Buffer; mime: string }[];
  mask: Buffer | null;
  prompt: string;
}): Promise<{ image: string; model: string; size: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new OpenAIImageError("OPENAI_API_KEY não configurada.", 503);

  // Photo as PNG (the mask must match its format and size).
  const photoImg = sharp(input.photo).rotate();
  const meta = await photoImg.metadata();
  const pw = meta.autoOrient?.width ?? meta.width ?? 0;
  const ph = meta.autoOrient?.height ?? meta.height ?? 0;
  if (!pw || !ph) throw new OpenAIImageError("Foto inválida.", 400);
  const photoPng = await photoImg.png().toBuffer();
  const maskPng = input.mask ? await toOpenAIMask(input.mask, pw, ph) : null;
  // Textures as PNG too (some models reject mixed formats), capped at 1024 px:
  // a swatch carries no detail beyond that and smaller uploads are faster.
  const texturePngs = await Promise.all(
    input.textures.map((t) => sharp(t.data).resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).png().toBuffer())
  );

  const models = [process.env.OPENAI_IMAGE_MODEL?.trim(), ...DEFAULT_MODELS].filter(
    (m, i, a): m is string => !!m && a.indexOf(m) === i
  );
  const quality = process.env.OPENAI_IMAGE_QUALITY?.trim() || "medium";
  const sizes = [sizeFor(pw, ph), "auto"];
  // input_fidelity "high" keeps the rest of the photo (frames, furniture,
  // framing) much closer to the original. Dropped if a model rejects it.
  let fidelity = true;

  let lastErr: OpenAIImageError | null = null;
  for (const model of models) {
    for (let s = 0; s < sizes.length; s++) {
      const size = sizes[s];
      for (let attempt = 0; attempt < 2; attempt++) {
        const form = new FormData();
        form.append("model", model);
        form.append("prompt", input.prompt);
        form.append("image[]", new Blob([new Uint8Array(photoPng)], { type: "image/png" }), "foto.png");
        texturePngs.forEach((t, i) => form.append("image[]", new Blob([new Uint8Array(t)], { type: "image/png" }), `textura-${i + 1}.png`));
        if (maskPng) form.append("mask", new Blob([new Uint8Array(maskPng)], { type: "image/png" }), "mascara.png");
        form.append("size", size);
        form.append("quality", quality);
        form.append("output_format", "jpeg");
        form.append("n", "1");
        if (fidelity) form.append("input_fidelity", "high");

        let res: Response;
        try {
          res = await fetch(ENDPOINT, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
        } catch (e) {
          lastErr = new OpenAIImageError("Não foi possível contatar o gerador de imagem.", 502, String(e));
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        const text = await res.text();
        if (res.ok) {
          let json: { data?: Array<{ b64_json?: string }> };
          try { json = JSON.parse(text); } catch { throw new OpenAIImageError("Resposta inválida do gerador.", 502, text.slice(0, 300)); }
          const b64 = json.data?.[0]?.b64_json;
          if (!b64) throw new OpenAIImageError("O gerador não retornou uma imagem.", 502, text.slice(0, 300));
          return { image: `data:image/jpeg;base64,${b64}`, model, size };
        }

        console.error(`[render/openai] ${res.status} model=${model} size=${size}:`, text.slice(0, 600));
        const msg = text.toLowerCase();
        lastErr = new OpenAIImageError(`Erro do gerador de imagem (${res.status}).`, res.status, text.slice(0, 500));
        if (res.status === 429 || res.status >= 500) {
          if (attempt === 0) { await new Promise((r) => setTimeout(r, 2500)); continue; }
          break;
        }
        if (msg.includes("safety") || msg.includes("moderation")) {
          throw new OpenAIImageError("A imagem foi bloqueada pelo filtro de conteúdo. Tente outra foto.", 400, text.slice(0, 300));
        }
        if (fidelity && msg.includes("input_fidelity")) { fidelity = false; attempt--; continue; }
        // Size rejected → try "auto"; model rejected → next model; anything else → stop.
        if (msg.includes("size") && s < sizes.length - 1) break;
        if (msg.includes("model")) { s = sizes.length; break; }
        throw lastErr;
      }
    }
  }
  throw lastErr ?? new OpenAIImageError("Não foi possível gerar a visualização.", 502);
}
