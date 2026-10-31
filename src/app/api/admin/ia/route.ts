import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import { modeloConfigurado } from "@/lib/ia/modelo";
import { rodarWorker } from "@/lib/ia/worker";
import { SEM_CACHE } from "@/lib/api-cache";

export const maxDuration = 60;

/**
 * GET  /api/admin/ia — o estado real da organização de IA: agentes, modelos por
 *      nível, tarefas recentes, pendências de aprovação e custo dos últimos 30 dias.
 * POST /api/admin/ia — { acao: "rodar" } roda o worker agora.
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const desde = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [agentes, modelos, tarefas, custo, permissoes] = await Promise.all([
    db.from("ai_agents").select("id, empresa, departamento, papel, nivel, autonomia, ativo").order("departamento"),
    db.from("ai_modelos").select("nivel, modelo, preco_entrada, preco_saida"),
    db.from("ai_tasks").select("*").order("criado_em", { ascending: false }).limit(100),
    db.from("ai_tasks").select("departamento, status, custo_usd, tokens_entrada, tokens_saida, tokens_cache_leitura").gte("criado_em", desde),
    db.from("relacionamento_permissoes").select("*"),
  ]);
  if (tarefas.error) {
    if (isMissingTable(tarefas.error)) {
      return NextResponse.json({ migracaoPendente: true, chaveConfigurada: modeloConfigurado() }, { headers: { "Cache-Control": SEM_CACHE } });
    }
    return NextResponse.json({ error: tarefas.error.message }, { status: 500 });
  }
  return NextResponse.json({
    migracaoPendente: false,
    chaveConfigurada: modeloConfigurado(),
    agentes: agentes.data ?? [],
    modelos: modelos.data ?? [],
    tarefas: tarefas.data ?? [],
    custo30: custo.data ?? [],
    permissoes: permissoes.data ?? [],
  }, { headers: { "Cache-Control": SEM_CACHE } });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { acao?: string };
  if (body.acao !== "rodar") return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  const resumo = await rodarWorker(supabaseAdmin(), { limiteMs: 45_000 });
  return NextResponse.json(resumo);
}
