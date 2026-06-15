import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

const KINDS = new Set(["note", "call", "message", "meeting", "email", "system", "ai"]);

/** GET /api/admin/leads/[id]/notes — activity timeline, newest first. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("lead_notes")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST /api/admin/leads/[id]/notes — log a timeline entry. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  if (!body.body || typeof body.body !== "string" || !body.body.trim()) {
    return NextResponse.json({ error: "Texto é obrigatório." }, { status: 400 });
  }

  const kind = typeof body.kind === "string" && KINDS.has(body.kind) ? body.kind : "note";

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("lead_notes")
    .insert({
      lead_id: id,
      kind,
      body: body.body.trim(),
      author: body.author ? String(body.author).trim() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Touch the lead so "last activity" ordering stays fresh.
  await db.from("leads").update({ updated_at: new Date().toISOString() }).eq("id", id);

  return NextResponse.json(data, { status: 201 });
}

/** DELETE /api/admin/leads/[id]/notes?note=<noteId> — remove a timeline entry. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const noteId = new URL(req.url).searchParams.get("note");
  if (!noteId) return NextResponse.json({ error: "Missing note id" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db.from("lead_notes").delete().eq("id", noteId).eq("lead_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
