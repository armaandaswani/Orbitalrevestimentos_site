import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { isAdminRequest } from "@/lib/admin-auth";

function checkAuth(req: NextRequest): boolean {
  return isAdminRequest(req);
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
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const sb = supabaseAdmin();
  let { data, error } = await sb.from("project_photos").insert(body).select().single();
  // Retrocompat: coluna nova (ex. short_description / migração 045) ainda não
  // aplicada → tenta novamente sem ela em vez de falhar o cadastro.
  if (error && /column .* does not exist/i.test(error.message) && body && typeof body === "object" && "short_description" in body) {
    const { short_description: _omit, ...rest } = body as Record<string, unknown>;
    ({ data, error } = await sb.from("project_photos").insert(rest).select().single());
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
