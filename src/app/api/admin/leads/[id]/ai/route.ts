import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/admin/leads/[id]/ai  { action: "summary" | "followup" | "next_steps" }
 *
 * AI assist for the CRM. Pulls the lead + its timeline + data points, hands the
 * dossier to the LLM (same OpenAI-compatible FREE_LLM_* endpoint as the public
 * chat), and returns the generated text. For "summary" the result is cached on
 * leads.ai_summary so re-opening the drawer doesn't re-bill the LLM.
 */

type Action = "summary" | "followup" | "next_steps";

const PT_STATUS: Record<string, string> = {
  novo: "Novo",
  contatado: "Contatado",
  em_negociacao: "Em negociação",
  orcamento: "Orçamento enviado",
  ganho: "Ganho",
  perdido: "Perdido",
};

const SYSTEM_PROMPT = `Você é o assistente de CRM interno da Orbital Revestimentos (Manaus), especializada em PFB (Painel de Fibra de Bambu), revestimento premium de parede e teto. Você ajuda a equipe comercial a fechar vendas.

Linhas e preços: Classic (Mármore Fosco) R$ 559/placa, Brilliance (Mármore Polido) R$ 589, Elegance (Madeira Texturizada) R$ 649. Cada placa cobre 3,48m². Contato/WhatsApp: (92) 98815-0149.

Responda SEMPRE em português do Brasil, de forma direta, prática e profissional. Não invente dados que não estejam no dossiê do cliente. Não use linguagem corporativa robótica.`;

function buildUserPrompt(action: Action, dossier: string): string {
  switch (action) {
    case "summary":
      return `Resuma este cliente em 3-4 frases para a equipe comercial: quem é, em que estágio está, o que já aconteceu e qual o potencial. Seja conciso.\n\n=== DOSSIÊ ===\n${dossier}`;
    case "followup":
      return `Escreva uma mensagem curta e natural de follow-up (para WhatsApp) para reaquecer este cliente e avançar a venda. Tom humano, sem ser robótico. Apenas a mensagem, sem explicações.\n\n=== DOSSIÊ ===\n${dossier}`;
    case "next_steps":
      return `Sugira os próximos passos concretos para avançar esta venda. Liste 2-4 ações práticas e priorizadas. Seja específico.\n\n=== DOSSIÊ ===\n${dossier}`;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiBase = process.env.FREE_LLM_API_URL;
  const apiKey = process.env.FREE_LLM_API_KEY || "";
  if (!apiBase) return NextResponse.json({ error: "IA indisponível." }, { status: 503 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const action = body?.action as Action;
  if (!["summary", "followup", "next_steps"].includes(action)) {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: lead, error: leadErr } = await db.from("leads").select("*").eq("id", id).single();
  if (leadErr || !lead) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const [{ data: notes }, { data: points }] = await Promise.all([
    db.from("lead_notes").select("kind, body, author, created_at").eq("lead_id", id).order("created_at", { ascending: true }),
    db.from("lead_data_points").select("label, value").eq("lead_id", id),
  ]);

  // Assemble a compact text dossier for the LLM.
  const lines: string[] = [];
  lines.push(`Nome: ${lead.name ?? "—"}`);
  if (lead.email) lines.push(`Email: ${lead.email}`);
  if (lead.phone) lines.push(`Telefone: ${lead.phone}`);
  lines.push(`Origem: ${lead.source === "website" ? "Site (cliente de fora)" : lead.source === "partner" ? `Parceiro${lead.partner_name ? " — " + lead.partner_name : ""}` : "Cadastro manual"}`);
  lines.push(`Estágio: ${PT_STATUS[lead.status as string] ?? lead.status}`);
  if (lead.space) lines.push(`Ambiente: ${lead.space}`);
  if (lead.product_name) lines.push(`Produto de interesse: ${lead.product_name}`);
  if (lead.estimated_value) lines.push(`Valor estimado: R$ ${lead.estimated_value}`);
  if (lead.notes) lines.push(`Observações: ${lead.notes}`);
  if (points && points.length) {
    lines.push("Dados adicionais:");
    for (const p of points) lines.push(`  - ${p.label}: ${p.value ?? "—"}`);
  }
  if (notes && notes.length) {
    lines.push("Histórico de interações (mais antigo → mais recente):");
    for (const n of notes) {
      const when = n.created_at ? new Date(n.created_at as string).toLocaleDateString("pt-BR") : "";
      lines.push(`  [${when}] (${n.kind}) ${n.body}`);
    }
  } else {
    lines.push("Histórico de interações: nenhuma registrada ainda.");
  }
  const dossier = lines.join("\n");

  const res = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.FREE_LLM_MODEL || "gemini-2.0-flash-lite",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(action, dossier) },
      ],
      max_tokens: 400,
      stream: false,
    }),
  });

  if (!res.ok) return NextResponse.json({ error: "Erro no servidor de IA." }, { status: 502 });

  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content?.trim() ?? "";

  // Cache the summary on the lead so the drawer can show it without re-calling.
  if (action === "summary" && text) {
    await db
      .from("leads")
      .update({ ai_summary: text, ai_summary_at: new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({ text });
}
