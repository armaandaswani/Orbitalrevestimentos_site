import { NextRequest, NextResponse } from "next/server";

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "orbital2025";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-auth") !== ADMIN_PW)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiBase = process.env.FREE_LLM_API_URL; // e.g. http://your-server:3001/v1
  const apiKey = process.env.FREE_LLM_API_KEY || "freellmapi-key";

  if (!apiBase)
    return NextResponse.json({ error: "FREE_LLM_API_URL não configurada no servidor." }, { status: 503 });

  const { imageUrl, category, hint } = await req.json();

  if (!imageUrl)
    return NextResponse.json({ error: "imageUrl obrigatório." }, { status: 400 });

  const categoryHint =
    category === "antes"
      ? "Esta é uma foto ANTES da instalação do revestimento."
      : category === "depois"
      ? "Esta é uma foto DEPOIS da instalação do revestimento."
      : "Esta é uma foto do projeto com revestimento instalado.";

  const systemPrompt = `Você é um redator de portfólio de revestimentos arquitetônicos premium para a empresa Orbital Revestimentos, em Manaus.`;

  const hintLine = hint?.trim() ? `\nFoco especial: ${hint.trim()}` : "";

  const userPrompt = `${categoryHint}${hintLine}

Analise a imagem e escreva uma legenda curta (máximo 2 frases, até 120 caracteres) para o portfólio online.
- Destaque o material (painel de fibra de bambu) e o efeito visual
- Linguagem elegante, objetiva e técnica
- Não mencione "Orbital" nem "PFB" — foque no resultado visual e no ambiente
- Responda SOMENTE com a legenda, sem aspas, sem prefixo`;

  // Fetch image as base64 to guarantee vision models can access it
  let imageContent: { type: "image_url"; image_url: { url: string } };
  try {
    const imgRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const base64 = buffer.toString("base64");
    imageContent = { type: "image_url", image_url: { url: `data:${contentType};base64,${base64}` } };
  } catch {
    // Fall back to URL if fetch fails
    imageContent = { type: "image_url", image_url: { url: imageUrl } };
  }

  const body = {
    model: process.env.FREE_LLM_MODEL || "gemini-2.0-flash-lite",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          imageContent,
          { type: "text", text: userPrompt },
        ],
      },
    ],
    max_tokens: 150,
    stream: false,
  };

  const res = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `API error: ${err}` }, { status: 502 });
  }

  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";

  return NextResponse.json({ description: text });
}
