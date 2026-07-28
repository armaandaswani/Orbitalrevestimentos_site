import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

export const runtime = "nodejs";

function slugify(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Características do ambiente ("área úmida", "cozinha", "teto"). Descrevem o
// projeto sem disputar espaço com a navegação principal do site.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db.from("project_tags").select("*").order("sort_order", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ pending_migration: true, rows: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pending_migration: false, rows: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  if (!label) return NextResponse.json({ error: "O nome da característica é obrigatório." }, { status: 400 });

  const db = supabaseAdmin();
  const slug = slugify(label);
  if (!slug) return NextResponse.json({ error: "Nome inválido." }, { status: 400 });

  const { data: clash } = await db.from("project_tags").select("id").eq("slug", slug).maybeSingle();
  if (clash) return NextResponse.json({ error: "Já existe uma característica com esse nome." }, { status: 409 });

  const { data: lastRow } = await db.from("project_tags").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const sort_order = ((lastRow as { sort_order?: number } | null)?.sort_order ?? -1) + 1;

  const { data, error } = await db.from("project_tags").insert({ slug, label, sort_order }).select().single();
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: "Rode a migração 053 antes de criar características." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
