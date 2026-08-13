import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { isAdminRequest } from "@/lib/admin-auth";
import { isMissingColumn } from "@/lib/db-compat";
import { CACHE_CONTEUDO } from "@/lib/api-cache";

function checkAuth(req: NextRequest): boolean {
  return isAdminRequest(req);
}

// Colunas opcionais adicionadas por migrações recentes (045/047/051). Quando o
// banco ainda não as tem, removemos do payload e reenviamos, para não quebrar o
// salvar.
const OPTIONAL_PHOTO_COLS = [
  "short_description", "is_featured", "show_on_home", "is_new", "feature_order", "content_type", "cover_category",
  // migração 053
  "primary_category", "showroom_id", "tags", "needs_review", "review_reason",
  "cover_focus_x", "cover_focus_y", "cover_zoom",
];
export function stripOptionalPhotoCols(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const out = { ...(body as Record<string, unknown>) };
  for (const c of OPTIONAL_PHOTO_COLS) delete out[c];
  return out;
}

export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("project_photos")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Conteúdo igual para todo visitante — pode ficar na edge.
  return NextResponse.json(data, { headers: { "Cache-Control": CACHE_CONTEUDO } });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const sb = supabaseAdmin();
  let { data, error } = await sb.from("project_photos").insert(body).select().single();
  // Retrocompat: colunas novas (migrações 045/047) ainda não aplicadas → tenta de
  // novo sem elas em vez de falhar o cadastro.
  if (isMissingColumn(error)) {
    ({ data, error } = await sb.from("project_photos").insert(stripOptionalPhotoCols(body)).select().single());
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
