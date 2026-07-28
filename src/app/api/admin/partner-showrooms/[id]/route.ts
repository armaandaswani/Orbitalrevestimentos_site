import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const TEXT_FIELDS = ["name", "address", "maps_url", "description", "logo_url", "cover_url"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const f of TEXT_FIELDS) {
    if (f in body) patch[f] = typeof body[f] === "string" && body[f] !== "" ? body[f] : f === "name" ? undefined : null;
  }
  if (patch.name === undefined) delete patch.name;
  if ("active" in body) patch.active = body.active !== false;
  if ("sort_order" in body) patch.sort_order = Number(body.sort_order) || 0;
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

  const db = supabaseAdmin();
  const { data, error } = await db.from("partner_showrooms").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = supabaseAdmin();

  // Apagar um parceiro não pode levar junto os ambientes cadastrados nele. Eles
  // voltam a ficar sem parceiro e entram para revisão — visíveis, não perdidos.
  const { data: orphans } = await db.from("project_photos").select("id").eq("showroom_id", id);
  const n = (orphans ?? []).length;
  if (n > 0) {
    await db.from("project_photos")
      .update({ showroom_id: null, needs_review: true, review_reason: "O showroom parceiro deste ambiente foi removido." })
      .eq("showroom_id", id);
  }

  const { error } = await db.from("partner_showrooms").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, released: n });
}
