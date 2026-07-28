import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

export const runtime = "nodejs";

/** "Ornare Manaus" → "ornare-manaus". */
function slugify(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// GET /api/admin/partner-showrooms — parceiros + quantos ambientes cada um tem.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db.from("partner_showrooms").select("*").order("sort_order", { ascending: true });
  if (error) {
    // Antes da migração 053 a tabela não existe — a tela mostra o aviso.
    if (isMissingTable(error)) return NextResponse.json({ pending_migration: true, rows: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Contagem de ambientes por parceiro, para a lista dizer "3 ambientes".
  const { data: projs } = await db.from("project_photos").select("showroom_id");
  const counts = new Map<string, number>();
  for (const p of (projs ?? []) as Array<{ showroom_id: string | null }>) {
    if (p.showroom_id) counts.set(p.showroom_id, (counts.get(p.showroom_id) ?? 0) + 1);
  }
  const rows = (data ?? []).map((s) => {
    const row = s as Record<string, unknown> & { id: string };
    return { ...row, project_count: counts.get(row.id) ?? 0 };
  });
  return NextResponse.json({ pending_migration: false, rows });
}

// POST — cria um parceiro, ou reordena em lote via {reorder:[{id,sort_order}]}.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const db = supabaseAdmin();

  if (body && Array.isArray(body.reorder)) {
    await Promise.all((body.reorder as Array<{ id: string; sort_order: number }>).map((r) =>
      db.from("partner_showrooms").update({ sort_order: r.sort_order }).eq("id", r.id)
    ));
    return NextResponse.json({ ok: true });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "O nome do showroom é obrigatório." }, { status: 400 });

  // O slug é técnico e nunca aparece para o usuário — é gerado aqui, e ganha um
  // sufixo se já existir, para dois parceiros de mesmo nome não colidirem.
  const base = slugify(name) || "showroom";
  let slug = base;
  for (let n = 2; n < 50; n++) {
    const { data: clash } = await db.from("partner_showrooms").select("id").eq("slug", slug).maybeSingle();
    if (!clash) break;
    slug = `${base}-${n}`;
  }

  const { data: lastRow } = await db.from("partner_showrooms").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const sort_order = ((lastRow as { sort_order?: number } | null)?.sort_order ?? -1) + 1;

  const { data, error } = await db.from("partner_showrooms").insert({
    slug, name, sort_order,
    address: typeof body?.address === "string" ? body.address : null,
    maps_url: typeof body?.maps_url === "string" ? body.maps_url : null,
    description: typeof body?.description === "string" ? body.description : null,
    logo_url: typeof body?.logo_url === "string" ? body.logo_url : null,
    cover_url: typeof body?.cover_url === "string" ? body.cover_url : null,
    active: body?.active !== false,
  }).select().single();

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: "Rode a migração 053 antes de cadastrar showrooms." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ...(data as object), project_count: 0 }, { status: 201 });
}
