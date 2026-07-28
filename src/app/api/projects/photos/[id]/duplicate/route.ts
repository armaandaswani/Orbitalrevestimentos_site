import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/admin-auth";
import { isMissingColumn } from "@/lib/db-compat";

// POST /api/projects/photos/[id]/duplicate — clona um projeto como RASCUNHO
// (is_active=false), com novo slug e as mesmas mídias. Não toca no original.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const sb = supabaseAdmin();

  const { data: orig, error } = await sb.from("project_photos").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!orig) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });

  const src = orig as Record<string, unknown>;
  const baseSlug = String(src.slug || "projeto");
  // Slug único: base-copia, base-copia-2, …
  let newSlug = `${baseSlug}-copia`;
  for (let n = 2; n < 50; n++) {
    const { data: clash } = await sb.from("project_photos").select("id").eq("slug", newSlug).maybeSingle();
    if (!clash) break;
    newSlug = `${baseSlug}-copia-${n}`;
  }

  // Copia todos os campos exceto os controlados; nasce como rascunho.
  const { id: _omitId, created_at: _omitCreated, updated_at: _omitUpdated, ...rest } = src;
  const copyRow: Record<string, unknown> = {
    ...rest,
    slug: newSlug,
    title: `${String(src.title || "Projeto")} (cópia)`,
    is_active: false,
  };
  let { data: created, error: insErr } = await sb.from("project_photos").insert(copyRow).select().single();
  if (isMissingColumn(insErr)) {
    // Retrocompat: remove colunas que a migração ainda não criou.
    for (const c of ["short_description", "is_featured", "show_on_home", "is_new", "feature_order", "content_type", "cover_category"]) delete copyRow[c];
    ({ data: created, error: insErr } = await sb.from("project_photos").insert(copyRow).select().single());
  }
  if (insErr || !created) return NextResponse.json({ error: insErr?.message ?? "Falha ao duplicar." }, { status: 500 });

  // Copia as mídias adicionais para o novo slug.
  try {
    const { data: media } = await sb.from("project_media").select("*").eq("project_slug", baseSlug).order("sort_order", { ascending: true });
    if (Array.isArray(media) && media.length > 0) {
      const rows = media.map((m) => {
        const { id: _mid, created_at: _mc, project_slug: _ps, ...mr } = m as Record<string, unknown>;
        return { ...mr, project_slug: newSlug };
      });
      await sb.from("project_media").insert(rows);
    }
  } catch {
    // mídia é best-effort — o projeto duplicado já existe.
  }

  return NextResponse.json({ ok: true, id: (created as { id: string }).id, slug: newSlug });
}
