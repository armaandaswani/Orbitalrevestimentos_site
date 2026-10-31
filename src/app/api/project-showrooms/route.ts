import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { CACHE_CONTEUDO } from "@/lib/api-cache";
import { lerLinhasShowrooms, montarShowrooms } from "@/lib/projetos-dados";

export const runtime = "nodejs";

/**
 * GET /api/project-showrooms — showrooms parceiros e pontos de revenda ativos
 * (público). Cada lugar traz a contagem de ambientes PUBLICADOS e, quando não
 * tem foto de capa própria, a capa de um dos ambientes — a conta mora em
 * montarShowrooms, a mesma que as páginas de Projetos usam no servidor.
 * Devolve lista vazia (não erro) enquanto a migração 053 não rodou.
 */
export async function GET() {
  const db = supabaseAdmin();
  const { linhas, erro } = await lerLinhasShowrooms(db);
  if (erro) return NextResponse.json({ error: erro }, { status: 500 });

  const { data: projetos } = await db
    .from("project_photos")
    .select("showroom_id, image_after, cover_focus_x, cover_focus_y, cover_zoom, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const lugares = montarShowrooms(linhas, ((projetos ?? []) as Record<string, unknown>[]).map((p) => ({
    showroom_id: p.showroom_id ? String(p.showroom_id) : null,
    image_after: String(p.image_after ?? ""),
    cover_focus_x: p.cover_focus_x as number | null,
    cover_focus_y: p.cover_focus_y as number | null,
    cover_zoom: p.cover_zoom as number | null,
  })));
  // Conteúdo igual para todo visitante — pode ficar na edge.
  return NextResponse.json(lugares, { headers: { "Cache-Control": CACHE_CONTEUDO } });
}
