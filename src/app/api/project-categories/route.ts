import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn, isMissingTable } from "@/lib/db-compat";

const BASE_COLS = "slug, label, parent_slug, sort_order, is_showroom, address, maps_url, invite_enabled";

export const runtime = "nodejs";

// GET /api/project-categories — categorias ativas, ordenadas (público). Usado
// pela página de Projetos (ordem dos filtros/seções, subcategorias, endereços de
// showroom) e pelo contexto do chat de IA. Vazio quando a migração 049 não rodou.
export async function GET() {
  const db = supabaseAdmin();
  const query = (cols: string) => db
    .from("project_categories")
    .select(cols)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  let { data, error } = await query(`${BASE_COLS}, description`);
  // Retrocompat: "description" só existe a partir da migração 052.
  if (isMissingColumn(error)) ({ data, error } = await query(BASE_COLS));
  if (error) {
    if (isMissingTable(error)) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
