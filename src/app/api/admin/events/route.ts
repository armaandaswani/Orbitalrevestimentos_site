import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

// Personal admin calendar ("minha agenda"). Admin-only. Backed by admin_events
// (migration 040) — degrades to an empty list if that migration hasn't run.

export const dynamic = "force-dynamic";

const CLEAN = (b: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  if (typeof b.title === "string") out.title = b.title.trim();
  if (typeof b.scheduled_at === "string") out.scheduled_at = b.scheduled_at;
  if (b.duration_minutes != null) out.duration_minutes = Math.max(0, Number(b.duration_minutes) || 0);
  if ("location" in b) out.location = b.location ? String(b.location).trim() : null;
  if ("notes" in b) out.notes = b.notes ? String(b.notes).trim() : null;
  if (b.status === "scheduled" || b.status === "cancelled") out.status = b.status;
  return out;
};

/** GET /api/admin/events?from=ISO&to=ISO — the admin's own upcoming events. */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const db = supabaseAdmin();
  let q = db.from("admin_events").select("*").eq("status", "scheduled").order("scheduled_at", { ascending: true });
  if (from) q = q.gte("scheduled_at", from);
  if (to) q = q.lte("scheduled_at", to);
  const { data, error } = await q;
  if (error) {
    if (isMissingTable(error)) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

/** POST /api/admin/events — create a personal event. */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  const payload = CLEAN(body as Record<string, unknown>);
  if (!payload.title || !payload.scheduled_at) {
    return NextResponse.json({ error: "Título e data/hora são obrigatórios." }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db.from("admin_events").insert(payload).select().single();
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: "Rode a migração 040 (admin_events) no Supabase." }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
