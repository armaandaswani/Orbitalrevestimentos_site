import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { isAdminRequest } from "@/lib/admin-auth";
import { CACHE_CONTEUDO } from "@/lib/api-cache";

function checkAuth(req: NextRequest): boolean {
  return isAdminRequest(req);
}

export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("project_renders")
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
