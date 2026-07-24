import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

import { isAdminRequest } from "@/lib/admin-auth";
import { isMissingColumn } from "@/lib/db-compat";

function checkAuth(req: NextRequest): boolean {
  return isAdminRequest(req);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const sb = supabaseAdmin();
  let { data, error } = await sb.from("products").update(body).eq("id", id).select().single();
  // Retrocompat: coluna nova (show_in_catalog / migração 046) ausente → retenta sem ela.
  if (isMissingColumn(error) && body && typeof body === "object" && "show_in_catalog" in body) {
    const { show_in_catalog: _omit, ...rest } = body as Record<string, unknown>;
    ({ data, error } = await sb.from("products").update(rest).eq("id", id).select().single());
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sb = supabaseAdmin();
  const { error } = await sb.from("products").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
