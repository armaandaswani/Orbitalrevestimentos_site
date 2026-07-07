import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

// One personal admin event: PATCH (reschedule/edit/cancel) or DELETE.

export const dynamic = "force-dynamic";

const EDITABLE = new Set(["title", "scheduled_at", "duration_minutes", "location", "notes", "status"]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (!EDITABLE.has(k)) continue;
    if (k === "duration_minutes") patch[k] = v == null ? null : Math.max(0, Number(v) || 0);
    else patch[k] = typeof v === "string" ? (v.trim() || null) : v;
  }
  const db = supabaseAdmin();
  const { data, error } = await db.from("admin_events").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from("admin_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
