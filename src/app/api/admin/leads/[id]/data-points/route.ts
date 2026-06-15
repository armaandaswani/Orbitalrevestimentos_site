import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

/** GET /api/admin/leads/[id]/data-points — custom key/value attributes. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("lead_data_points")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/**
 * POST /api/admin/leads/[id]/data-points — add or update a data point.
 * Upserts on (lead_id, label) so editing the same label replaces in place.
 */
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
  if (!body.label || typeof body.label !== "string" || !body.label.trim()) {
    return NextResponse.json({ error: "Rótulo é obrigatório." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("lead_data_points")
    .upsert(
      {
        lead_id: id,
        label: body.label.trim(),
        value: body.value != null ? String(body.value) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_id,label" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

/** DELETE /api/admin/leads/[id]/data-points?point=<pointId> — remove a data point. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const pointId = new URL(req.url).searchParams.get("point");
  if (!pointId) return NextResponse.json({ error: "Missing point id" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("lead_data_points")
    .delete()
    .eq("id", pointId)
    .eq("lead_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
