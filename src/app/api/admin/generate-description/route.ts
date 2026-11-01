import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin-auth";
import { completarGratuito, llmGratuitoConfigurado } from "@/lib/llm-gratuito";

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!llmGratuitoConfigurado())
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
- Destaque o material (Painel Flexível Fibra de Bambu) e o efeito visual
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

  // Precisa de um modelo que enxergue imagem: FREE_LLM_VISION_MODEL (lista
  // separada por vírgula) ou, sem ela, a lista padrão do site.
  const visao = (process.env.FREE_LLM_VISION_MODEL || "").split(",").map((m) => m.trim()).filter(Boolean);
  const r = await completarGratuito({
    mensagens: [
      { role: "system", content: systemPrompt },
      { role: "user", content: [imageContent, { type: "text", text: userPrompt }] },
    ],
    maxTokens: 150,
    modelos: visao.length ? visao : undefined,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 502 });
  const text = r.texto;

  return NextResponse.json({ description: text });
}
