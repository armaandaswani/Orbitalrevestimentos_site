import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, repIdFromRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

const MIGRATION_HINT = "Recurso indisponível — rode a migração 019 (rep_meetings) no Supabase.";

/** GET /api/representante/meetings?sales_rep_id=&from=&to= — agenda for one rep. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const salesRepId = searchParams.get("sales_rep_id");
  if (!salesRepId) return NextResponse.json({ error: "sales_rep_id required" }, { status: 400 });

  if (!isAdminRequest(req) && repIdFromRequest(req) !== salesRepId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const db = supabaseAdmin();
  let query = db
    .from("rep_meetings")
    .select("*")
    .eq("sales_rep_id", salesRepId)
    .order("scheduled_at", { ascending: true });

  if (from) query = query.gte("scheduled_at", from);
  if (to) query = query.lte("scheduled_at", to);

  const { data, error } = await query;
  if (error && isMissingTable(error)) return NextResponse.json([]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST /api/representante/meetings — create a meeting. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const salesRepId = body.sales_rep_id;
  if (!salesRepId) return NextResponse.json({ error: "sales_rep_id required" }, { status: 400 });
  if (!isAdminRequest(req) && repIdFromRequest(req) !== salesRepId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
  }
  if (!body.scheduled_at) {
    return NextResponse.json({ error: "Data/hora é obrigatória." }, { status: 400 });
  }

  const invitees = Array.isArray(body.invitees)
    ? body.invitees
        .filter((i: unknown) => i && typeof i === "object")
        .map((i: { name?: unknown; phone?: unknown; email?: unknown }) => ({
          name: typeof i.name === "string" ? i.name.trim() : "",
          phone: typeof i.phone === "string" ? i.phone.trim() : "",
          email: typeof i.email === "string" ? i.email.trim() : "",
        }))
        .filter((i: { name: string }) => i.name)
    : [];

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("rep_meetings")
    .insert({
      sales_rep_id: salesRepId,
      partner_id: body.partner_id || null,
      title: body.title.trim(),
      scheduled_at: body.scheduled_at,
      duration_minutes: Number.isFinite(body.duration_minutes) ? body.duration_minutes : 60,
      location: body.location ? String(body.location).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
      invitees,
    })
    .select()
    .single();

  if (error && isMissingTable(error)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
