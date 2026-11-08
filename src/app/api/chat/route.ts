import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { completarGratuito, llmGratuitoConfigurado, type MensagemLLM } from "@/lib/llm-gratuito";
import { DEFAULT_SYSTEM_PROMPT as PROMPT_PADRAO, montarPromptDoSistema, type ShowroomConvite } from "@/lib/chat-prompt";

// O texto e a montagem do prompt moram em @/lib/chat-prompt (função pura,
// testada sem rede); aqui continua o export que o admin e o e-mail usam.
export const DEFAULT_SYSTEM_PROMPT = PROMPT_PADRAO;

export async function POST(req: NextRequest) {
  if (!llmGratuitoConfigurado()) {
    return NextResponse.json({ error: "Chat IA indisponível." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const bruto: unknown = body?.messages;
  if (!Array.isArray(bruto) || bruto.length === 0) {
    return NextResponse.json({ error: "messages obrigatório." }, { status: 400 });
  }
  // Só falas do visitante e do assistente, em texto, as 12 últimas e com
  // tamanho limitado: ninguém injeta um "system" e o custo por resposta fica baixo.
  const messages: MensagemLLM[] = bruto
    .filter((m): m is { role: "user" | "assistant"; content: string } =>
      !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim() !== "")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!messages.length) {
    return NextResponse.json({ error: "messages obrigatório." }, { status: 400 });
  }

  // Prompt salvo no /admin, se houver (senão vale o padrão).
  let promptSalvo: string | null = null;
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("site_settings").select("value").eq("key", "chat_system_prompt").single();
    if (data?.value?.trim()) promptSalvo = data.value.trim();
  } catch {
    // ignore — use default
  }

  // Showrooms de parceiros com convite ativo → o assistente pode convidar o
  // cliente a visitar, com endereço. Best-effort (tabela ausente = ignora).
  let showrooms: ShowroomConvite[] = [];
  try {
    const sb = supabaseAdmin();
    const { data: invites } = await sb
      .from("project_categories")
      .select("label, address, maps_url")
      .eq("active", true).eq("is_showroom", true).eq("invite_enabled", true);
    showrooms = (invites ?? []) as ShowroomConvite[];
  } catch {
    // ignore
  }

  // Prompt + regras fixas (preço, contato, revenda) + showrooms: ver chat-prompt.ts.
  const systemPrompt = montarPromptDoSistema(promptSalvo, showrooms);

  const r = await completarGratuito({
    mensagens: [{ role: "system", content: systemPrompt }, ...messages],
    maxTokens: 180,
  });
  if (!r.ok) {
    console.error("chat IA:", r.erro);
    // Motivo técnico curto (modelo + código HTTP, sem chave) para diagnóstico.
    return NextResponse.json(
      { error: "Erro no servidor de IA." },
      { status: r.status === 429 ? 503 : 502, headers: { "x-ia-motivo": r.erro.replace(/[^\w ./:-]/g, "").slice(0, 120) } },
    );
  }
  const text = r.texto;
  return NextResponse.json({ text });
}
