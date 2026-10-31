import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { isAdminRequest } from "@/lib/admin-auth";
import { CACHE_CONTEUDO, SEM_CACHE } from "@/lib/api-cache";
import { CAMPOS_PUBLICOS_RENDER, soCampos } from "@/lib/projetos-tipos";

function checkAuth(req: NextRequest): boolean {
  return isAdminRequest(req);
}

/** Público: só CAMPOS_PUBLICOS_RENDER. ?admin=1: linha inteira, com sessão de admin. */
export async function GET(req: NextRequest) {
  const admin = req.nextUrl.searchParams.get("admin") === "1";
  if (admin && !checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("project_renders")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (admin) return NextResponse.json(data, { headers: { "Cache-Control": SEM_CACHE } });
  const publico = ((data ?? []) as Record<string, unknown>[]).map((r) => soCampos(r, CAMPOS_PUBLICOS_RENDER));
  // Conteúdo igual para todo visitante — pode ficar na edge.
  return NextResponse.json(publico, { headers: { "Cache-Control": CACHE_CONTEUDO } });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("project_renders")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
