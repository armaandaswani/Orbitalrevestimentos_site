import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

const EDITABLE = new Set(["name", "amount", "cadence", "active", "started_at", "ended_at", "notes", "weekday", "month_day"]);
const CADENCES = new Set(["daily", "weekly", "monthly"]);

/** PATCH /api/admin/fixed-costs/[id] — edit / activate / deactivate. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(body)) {
    if (!EDITABLE.has(k)) continue;
    if (k === "amount") { const n = Number(v); if (Number.isFinite(n) && n >= 0) patch[k] = n; }
    else if (k === "cadence") { if (CADENCES.has(String(v))) patch[k] = v; }
    else if (k === "weekday") {
      const n = Number(v);
      patch[k] = Number.isInteger(n) && n >= 0 && n <= 6 ? n : null;
    }
    else if (k === "month_day") {
      const n = Number(v);
      patch[k] = Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
    }
    else patch[k] = v;
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb.from("fixed_costs").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** DELETE /api/admin/fixed-costs/[id]. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sb = supabaseAdmin();
  const { error } = await sb.from("fixed_costs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
