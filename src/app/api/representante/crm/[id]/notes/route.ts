import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, repIdFromRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

const KINDS = new Set(["note", "call", "message", "meeting", "followup", "system"]);
const MIGRATION_HINT = "Recurso indisponível — rode a migração 019 (rep_partner_notes) no Supabase.";

async function authorizeCrmRow(req: NextRequest, crmId: string) {
  const db = supabaseAdmin();
  const { data: existing, error } = await db
    .from("rep_partner_crm")
    .select("sales_rep_id")
    .eq("id", crmId)
    .maybeSingle();
  if (error) return { ok: false as const, status: 500, message: error.message };
  if (!existing) return { ok: false as const, status: 404, message: "Not found" };
  if (!isAdminRequest(req) && repIdFromRequest(req) !== existing.sales_rep_id) {
    return { ok: false as const, status: 401, message: "Unauthorized" };
  }
  return { ok: true as const };
}

/** GET /api/representante/crm/[id]/notes — activity timeline, newest first. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const auth = await authorizeCrmRow(req, id);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("rep_partner_notes")
    .select("*")
    .eq("crm_id", id)
    .order("created_at", { ascending: false });

  if (error && isMissingTable(error)) return NextResponse.json([]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST /api/representante/crm/[id]/notes — log a timeline entry. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const auth = await authorizeCrmRow(req, id);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !body.body || typeof body.body !== "string" || !body.body.trim()) {
    return NextResponse.json({ error: "Texto é obrigatório." }, { status: 400 });
  }

  const kind = typeof body.kind === "string" && KINDS.has(body.kind) ? body.kind : "note";

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("rep_partner_notes")
    .insert({
      crm_id: id,
      kind,
      body: body.body.trim(),
      author: body.author ? String(body.author).trim() : null,
    })
    .select()
    .single();

  if (error && isMissingTable(error)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("rep_partner_crm").update({ updated_at: new Date().toISOString() }).eq("id", id);

  return NextResponse.json(data, { status: 201 });
}
