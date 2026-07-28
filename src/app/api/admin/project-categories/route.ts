import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

export const runtime = "nodejs";

// GET /api/admin/project-categories — categorias (metadados) ordenadas.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db.from("project_categories").select("*").order("sort_order", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// POST /api/admin/project-categories — cria (ou reordena em lote via {reorder:[{id,sort_order}]}).
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const db = supabaseAdmin();

  // Reordenação em lote.
  if (body && Array.isArray(body.reorder)) {
    await Promise.all((body.reorder as Array<{ id: string; sort_order: number }>).map((r) =>
      db.from("project_categories").update({ sort_order: r.sort_order }).eq("id", r.id)
    ));
    return NextResponse.json({ ok: true });
  }

  // Seed em lote: cria slugs que ainda não existem (a partir das categorias em uso).
  if (body && Array.isArray(body.seed)) {
    const seed = body.seed as Array<{ slug: string; label: string }>;
    const { data: existing } = await db.from("project_categories").select("slug");
    const have = new Set((existing ?? []).map((r) => (r as { slug: string }).slug));
    const { data: maxRow } = await db.from("project_categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    let next = ((maxRow as { sort_order?: number } | null)?.sort_order ?? -1) + 1;
    const toInsert = seed.filter((s) => s.slug && !have.has(s.slug)).map((s) => ({ slug: s.slug, label: s.label || s.slug, sort_order: next++ }));
    if (toInsert.length > 0) {
      const { error } = await db.from("project_categories").insert(toInsert);
      if (error && !isMissingTable(error)) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { data } = await db.from("project_categories").select("*").order("sort_order", { ascending: true });
    return NextResponse.json(data ?? []);
  }

  if (!body?.slug || !body?.label) return NextResponse.json({ error: "slug e label são obrigatórios." }, { status: 400 });
  // Sem isto a categoria nova nascia com sort_order = 0 (o default da coluna) e
  // empatava com a primeira da lista — a ordem no site ficava indefinida e os
  // botões ↑↓ tinham de ser usados só para desfazer o empate. Vai para o fim.
  const { data: lastRow } = await db.from("project_categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const nextOrder = ((lastRow as { sort_order?: number } | null)?.sort_order ?? -1) + 1;
  const { data, error } = await db.from("project_categories").insert({
    slug: String(body.slug), label: String(body.label), sort_order: nextOrder,
    parent_slug: body.parent_slug ? String(body.parent_slug) : null,
    is_showroom: body.is_showroom === true,
    address: typeof body.address === "string" ? body.address : null,
    maps_url: typeof body.maps_url === "string" ? body.maps_url : null,
    invite_enabled: body.invite_enabled === true,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
