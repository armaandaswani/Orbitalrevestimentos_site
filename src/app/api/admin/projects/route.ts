import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn, isMissingTable } from "@/lib/db-compat";

export const runtime = "nodejs";

/**
 * GET /api/admin/projects — a lista do painel.
 *
 * Existe porque o painel lia /api/projects/photos, que é o endpoint do SITE e
 * filtra is_active = true: um projeto salvo como Rascunho sumia da própria tela
 * que deveria gerenciá-lo. Aqui vem tudo, rascunho incluído, já com o que a
 * lista precisa mostrar (contagem de mídias, parceiro, caminho no site).
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();

  const { data: projects, error } = await db
    .from("project_photos")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (projects ?? []) as Array<Record<string, unknown>>;

  // Contagem de mídias por projeto (project_media guarda o slug, não o id).
  const counts = new Map<string, number>();
  const { data: media } = await db.from("project_media").select("project_slug");
  for (const m of (media ?? []) as Array<{ project_slug: string }>) {
    counts.set(m.project_slug, (counts.get(m.project_slug) ?? 0) + 1);
  }

  // Categorias (rótulo legível) e parceiros. Ambos toleram migração pendente.
  const { data: cats } = await db.from("project_categories").select("slug,label");
  const catLabel = new Map((cats ?? []).map((c) => [(c as { slug: string }).slug, (c as { label: string }).label]));

  let showrooms: Array<{ id: string; name: string; address: string | null }> = [];
  let pendingMigration = false;
  const sr = await db.from("partner_showrooms").select("id,name,address");
  if (sr.error) { if (isMissingTable(sr.error)) pendingMigration = true; }
  else showrooms = (sr.data ?? []) as typeof showrooms;
  const showroomById = new Map(showrooms.map((s) => [s.id, s]));

  const out = rows.map((p) => {
    const slug = String(p.slug ?? "");
    const primary = (p.primary_category as string | null) ?? null;
    const showroom = p.showroom_id ? showroomById.get(String(p.showroom_id)) ?? null : null;

    // "Projetos › Showrooms › Ornare › Sala Principal" — a mesma frase que o
    // formulário mostra, montada num lugar só para não divergirem.
    const trail = ["Projetos"];
    if (primary) trail.push(catLabel.get(primary) ?? primary);
    if (showroom) trail.push(showroom.name);
    trail.push(String(p.title ?? "Sem nome"));

    return {
      id: p.id,
      slug,
      title: p.title,
      product_code: p.product_code ?? "",
      image_after: p.image_after ?? "",
      cover_focus_x: p.cover_focus_x ?? 0.5,
      cover_focus_y: p.cover_focus_y ?? 0.5,
      cover_zoom: p.cover_zoom ?? 1,
      is_active: p.is_active !== false,
      primary_category: primary,
      category_label: primary ? catLabel.get(primary) ?? primary : null,
      showroom_id: p.showroom_id ?? null,
      showroom_name: showroom?.name ?? null,
      showroom_address: showroom?.address ?? null,
      tags: (p.tags as string[] | null) ?? [],
      needs_review: p.needs_review === true,
      review_reason: (p.review_reason as string | null) ?? null,
      media_count: counts.get(slug) ?? 0,
      site_path: trail.join(" › "),
      // Legado, para a tela conseguir mostrar algo antes da migração 053.
      categories: (p.categories as string[] | null) ?? [],
    };
  });

  return NextResponse.json({ pending_migration: pendingMigration, rows: out });
}

// PATCH /api/admin/projects — publicar/despublicar em lote ou individual.
export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: string; is_active?: boolean } | null;
  if (!body?.id) return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });

  const db = supabaseAdmin();
  const patch: Record<string, unknown> = {};
  if ("is_active" in body) patch.is_active = body.is_active !== false;

  let { data, error } = await db.from("project_photos").update(patch).eq("id", body.id).select().single();
  if (isMissingColumn(error)) ({ data, error } = await db.from("project_photos").update({}).eq("id", body.id).select().single());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
