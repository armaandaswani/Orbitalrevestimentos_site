import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { isAdminRequest } from "@/lib/admin-auth";
import { SEM_CACHE } from "@/lib/api-cache";
import { semOcultas } from "@/lib/project-gallery";

function checkAuth(req: NextRequest) {
  return isAdminRequest(req);
}

/**
 * GET público: sem as fotos ocultas, mesmo para quem está logado (o site mostra
 * o que o cliente vê). GET ?admin=1: todas, só com sessão de admin e sem cache.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const admin = req.nextUrl.searchParams.get("admin") === "1";
  if (admin && !checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = supabaseAdmin();
  let query = sb.from("project_media").select("*").order("sort_order", { ascending: true });
  if (slug) query = query.eq("project_slug", slug);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (admin) return NextResponse.json(data ?? [], { headers: { "Cache-Control": SEM_CACHE } });
  return NextResponse.json(semOcultas(data ?? []));
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("project_media").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
