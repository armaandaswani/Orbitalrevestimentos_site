import { NextRequest, NextResponse } from "next/server";

// Gemini image generation ("nano-banana"): takes the client's wall photo +
// the chosen PFB panel reference image and renders the panel applied to that
// exact wall, keeping the original viewpoint, perspective and lighting.
export const maxDuration = 60;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

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

function buildPrompt(kind: FinishKind): string {
  const finish = finishDescription(kind);
  return [
    "You are an architectural visualization engine.",
    "The FIRST image is a real photo of a client's wall.",
    "The SECOND image is the product reference: a PFB wall panel with a",
    `${finish} finish.`,
    "",
    "Re-render the FIRST photo so the wall is fully covered with this exact",
    "panel finish, as if the panels were physically installed on it.",
    "Rules:",
    "- Keep the EXACT same camera angle, viewpoint, framing and room as the original photo.",
    "- Apply the finish from the reference image precisely — same texture, color and tonality.",
    "- Cover the entire wall, floor to ceiling, respecting the panel proportions.",
    "- Panel size reference: 1.2m wide x 2.9m tall. Do not distort the texture.",
    "- The whole wall must read as one continuous finish: no mixed textures or tones.",
    "- Preserve the real perspective, the room's existing furniture, floor, ceiling and lighting.",
    "- Keep the wall's natural shadows and light falloff so it looks photorealistic.",
    "- Ray-trace the result, cinematic studio lighting, soft shadows, ultra-realistic, ultra HD.",
    "Output only the edited photo.",
  ].join("\n");
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

export async function POST(req: NextRequest) {
  const apiKey = process.env.FREE_LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Serviço de visualização não configurado no servidor." },
      { status: 503 }
    );
  }

  let body: { photo?: string; referenceUrl?: string; finish?: FinishKind };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const { photo, referenceUrl } = body;
  const finish: FinishKind = body.finish ?? "matte";

  if (!photo) return NextResponse.json({ error: "Foto da parede obrigatória." }, { status: 400 });
  if (!referenceUrl)
    return NextResponse.json({ error: "Acabamento de referência obrigatório." }, { status: 400 });

  // Resolve relative reference paths (e.g. /images/...) against this request's origin.
  const absoluteRef = /^https?:\/\//.test(referenceUrl)
    ? referenceUrl
    : new URL(referenceUrl, req.nextUrl.origin).toString();

  let wall: { data: string; mime: string };
  let reference: { data: string; mime: string };
  try {
    wall = parseInline(photo);
    reference = await fetchAsBase64(absoluteRef);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao preparar as imagens." },
      { status: 502 }
    );
  }

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: buildPrompt(finish) },
          { inline_data: { mime_type: wall.mime, data: wall.data } },
          { inline_data: { mime_type: reference.mime, data: reference.data } },
        ],
      },
    ],
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
  const parts: Array<{ inlineData?: { data: string; mimeType?: string }; inline_data?: { data: string; mime_type?: string } }> =
    json?.candidates?.[0]?.content?.parts ?? [];

  let outData: string | null = null;
  let outMime = "image/png";
  for (const p of parts) {
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
