import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn } from "@/lib/db-compat";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (typeof body.label === "string") patch.label = body.label;
  if ("description" in body) patch.description = typeof body.description === "string" ? body.description : null;
  if ("parent_slug" in body) patch.parent_slug = body.parent_slug ? String(body.parent_slug) : null;
  if ("sort_order" in body) patch.sort_order = Number(body.sort_order) || 0;
  if ("is_showroom" in body) patch.is_showroom = body.is_showroom === true;
  if ("address" in body) patch.address = typeof body.address === "string" ? body.address : null;
  if ("maps_url" in body) patch.maps_url = typeof body.maps_url === "string" ? body.maps_url : null;
  if ("invite_enabled" in body) patch.invite_enabled = body.invite_enabled === true;
  if ("active" in body) patch.active = body.active !== false;

  const db = supabaseAdmin();
  let { data, error } = await db.from("project_categories").update(patch).eq("id", id).select().single();
  // Retrocompat: "description" só existe a partir da migração 052.
  if (isMissingColumn(error)) {
    const rest = { ...patch };
    delete rest.description;
    ({ data, error } = await db.from("project_categories").update(rest).eq("id", id).select().single());
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from("project_categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
