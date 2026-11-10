import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/chat-prompt";
import { completarGratuito, llmGratuitoConfigurado } from "@/lib/llm-gratuito";

/**
 * POST /api/email-campaigns/ai-edit — product-grounded AI assistant for the
 * campaign editor. Takes the current campaign blocks + a free-form instruction
 * and returns updated blocks as JSON. Grounded in DEFAULT_SYSTEM_PROMPT (the
 * same verified product facts the site chatbot uses) with an explicit rule to
 * never invent prices, specs, or certifications.
 */

interface CurrentBlocks {
  subject?: string;
  subheadline?: string;
  headline?: string;
  body?: string;
}

function tryParse(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!llmGratuitoConfigurado()) return NextResponse.json({ error: "FREE_LLM_API_URL não configurada." }, { status: 503 });

  let parsed: { instruction?: string; current?: CurrentBlocks };
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const instruction = (parsed.instruction ?? "").trim();
  if (!instruction) return NextResponse.json({ error: "Diga à IA o que você quer alterar." }, { status: 400 });
  const current = parsed.current ?? {};

  const systemPrompt = `${DEFAULT_SYSTEM_PROMPT}

---
TAREFA: Você está ajudando a editar uma campanha de e-mail marketing da Orbital Revestimentos enviada para parceiros (arquitetos, designers, revendedores).

REGRAS CRÍTICAS:
- Use SOMENTE fatos reais do produto descritos acima. NUNCA invente preços, medidas, certificações, prazos, números ou características que não estejam listados.
- Se o pedido exigir uma informação que você não possui, não a invente — mantenha o texto factual e omita o dado que falta.
- Tom: elegante, profissional e persuasivo, em português do Brasil.
- O corpo (body) deve ter parágrafos curtos, cada parágrafo em uma linha separada (separados por \\n). Sem saudação ("Olá") e sem assinatura.
- Preserve os campos que o pedido do usuário não menciona.
- Responda APENAS com um objeto JSON válido, sem texto extra e sem markdown, exatamente neste formato:
{"subject": "...", "subheadline": "...", "headline": "...", "body": "...\\n..."}`;

  const userPrompt = `CONTEÚDO ATUAL DA CAMPANHA:
Assunto: ${current.subject ?? ""}
Etiqueta: ${current.subheadline ?? ""}
Título: ${current.headline ?? ""}
Corpo:
${current.body ?? ""}

PEDIDO DO USUÁRIO: ${instruction}

Retorne o conteúdo atualizado como JSON.`;

  const r = await completarGratuito({
    mensagens: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 900,
    json: true,
  });
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 502 });
  const raw = r.texto;
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const fence = cleaned.match(/\{[\s\S]*\}/);
  const out = tryParse(cleaned) ?? (fence ? tryParse(fence[0]) : null);
  if (!out) {
    return NextResponse.json({ error: "A IA retornou um formato inválido. Tente novamente." }, { status: 502 });
  }

  return NextResponse.json({
    subject: typeof out.subject === "string" ? out.subject : current.subject ?? "",
    subheadline: typeof out.subheadline === "string" ? out.subheadline : current.subheadline ?? "",
    headline: typeof out.headline === "string" ? out.headline : current.headline ?? "",
    body: typeof out.body === "string" ? out.body : current.body ?? "",
  });
}
