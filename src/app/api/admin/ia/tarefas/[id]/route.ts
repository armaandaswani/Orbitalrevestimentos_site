import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { atualizar, auditar, type Tarefa } from "@/lib/ia/fila";
import { decidirParabens, type Canal } from "@/lib/ia/parabens";

/**
 * POST /api/admin/ia/tarefas/:id — decisão humana sobre uma tarefa.
 *   { acao: "aprovar", texto?, canal: "whatsapp" | "manual" }
 *   { acao: "recusar" }
 *   { acao: "repetir" }  (tarefa que falhou volta para a fila)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { acao?: string; texto?: string; canal?: string };
  const db = supabaseAdmin();
  const { data } = await db.from("ai_tasks").select("*").eq("id", id).maybeSingle();
  const t = data as Tarefa | null;
  if (!t) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
  const ator = "admin";

  if (body.acao === "repetir") {
    if (t.status !== "falhou") return NextResponse.json({ error: "Só tarefas que falharam podem ser repetidas." }, { status: 400 });
    await atualizar(db, t.id, { status: "fila", tentativas: 0, erro: null });
    await auditar(db, ator, "repetiu_tarefa", t.id);
    return NextResponse.json({ ok: true });
  }

  if (body.acao === "aprovar" || body.acao === "recusar") {
    const canal: Canal = body.canal === "whatsapp" ? "whatsapp" : "manual";
    const texto = typeof body.texto === "string" ? body.texto.slice(0, 600) : undefined;
    const r = await decidirParabens(db, t, { aprovar: body.acao === "aprovar", texto, canal, ator });
    if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
