import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { stripOptionalPhotoCols } from "../route";
import { isMissingColumn } from "@/lib/db-compat";

import { isAdminRequest } from "@/lib/admin-auth";

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
  let { data, error } = await sb.from("project_photos").update(body).eq("id", id).select().single();
  // Retrocompat: colunas novas (migrações 045/047) ausentes → retenta sem elas.
  if (isMissingColumn(error)) {
    ({ data, error } = await sb.from("project_photos").update(stripOptionalPhotoCols(body)).eq("id", id).select().single());
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
  const { error } = await sb.from("project_photos").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
