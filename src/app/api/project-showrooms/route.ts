import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

export const runtime = "nodejs";

/**
 * GET /api/project-showrooms — showrooms parceiros ativos (público).
 *
 * Cada parceiro traz a contagem de ambientes PUBLICADOS e, quando não tem foto
 * de capa própria, a capa de um dos ambientes — para o cartão nunca sair vazio.
 * Devolve lista vazia (não erro) enquanto a migração 053 não rodou.
 */
export async function GET() {
  const db = supabaseAdmin();

  const { data: rows, error } = await db
    .from("partner_showrooms")
    .select("id, slug, name, address, maps_url, description, logo_url, cover_url, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingTable(error)) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: projects } = await db
    .from("project_photos")
    .select("showroom_id, image_after, cover_focus_x, cover_focus_y, cover_zoom, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const byShowroom = new Map<string, Array<Record<string, unknown>>>();
  for (const p of (projects ?? []) as Array<Record<string, unknown>>) {
    const sid = p.showroom_id ? String(p.showroom_id) : null;
    if (!sid) continue;
    if (!byShowroom.has(sid)) byShowroom.set(sid, []);
    byShowroom.get(sid)!.push(p);
  }

  const out = (rows ?? []).map((s) => {
    const r = s as Record<string, unknown>;
    const mine = byShowroom.get(String(r.id)) ?? [];
    const firstWithCover = mine.find((m) => String(m.image_after ?? "").trim() !== "");
    return {
      ...r,
      ambient_count: mine.length,
      // Capa própria do parceiro; sem ela, a capa de um ambiente serve de vitrine.
      display_cover: r.cover_url || firstWithCover?.image_after || null,
      display_focus_x: r.cover_url ? 0.5 : Number(firstWithCover?.cover_focus_x ?? 0.5),
      display_focus_y: r.cover_url ? 0.5 : Number(firstWithCover?.cover_focus_y ?? 0.5),
      display_zoom: r.cover_url ? 1 : Number(firstWithCover?.cover_zoom ?? 1),
    };
  });

  return NextResponse.json(out);
}
