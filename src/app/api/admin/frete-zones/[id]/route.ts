import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if ("neighborhoods" in body) patch.neighborhoods = typeof body.neighborhoods === "string" ? body.neighborhoods : null;
  if ("cep_start" in body) patch.cep_start = typeof body.cep_start === "string" ? body.cep_start.replace(/\D/g, "") || null : null;
  if ("cep_end" in body) patch.cep_end = typeof body.cep_end === "string" ? body.cep_end.replace(/\D/g, "") || null : null;
  if ("cep_list" in body) patch.cep_list = typeof body.cep_list === "string" ? body.cep_list : null;
  if ("value" in body) patch.value = Number(body.value) || 0;
  if ("priority" in body) patch.priority = Number(body.priority) || 0;
  if ("active" in body) patch.active = body.active !== false;
  if ("notes" in body) patch.notes = typeof body.notes === "string" ? body.notes : null;

  const db = supabaseAdmin();
  const { data, error } = await db.from("frete_zones").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from("frete_zones").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
