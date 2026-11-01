import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin-auth";
import { completarGratuito, llmGratuitoConfigurado } from "@/lib/llm-gratuito";

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!llmGratuitoConfigurado())
    return NextResponse.json({ error: "FREE_LLM_API_URL não configurada." }, { status: 503 });

  const { systemPrompt, userPrompt, maxTokens } = await req.json();

  if (!userPrompt)
    return NextResponse.json({ error: "userPrompt obrigatório." }, { status: 400 });

  const r = await completarGratuito({
    mensagens: [
      ...(systemPrompt ? [{ role: "system" as const, content: String(systemPrompt) }] : []),
      { role: "user", content: String(userPrompt) },
    ],
    maxTokens: Math.min(Number(maxTokens) || 400, 2000),
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 502 });
  return NextResponse.json({ text: r.texto });
}
