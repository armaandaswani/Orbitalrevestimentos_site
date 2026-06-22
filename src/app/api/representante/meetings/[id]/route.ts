import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, repIdFromRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

const EDITABLE = new Set([
  "title",
  "scheduled_at",
  "duration_minutes",
  "location",
  "notes",
  "invitees",
  "status",
  "partner_id",
]);

/** PATCH /api/representante/meetings/[id] — reschedule, edit invitees, mark completed/cancelled. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: existing, error: fetchErr } = await db
    .from("rep_meetings")
    .select("sales_rep_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isAdminRequest(req) && repIdFromRequest(req) !== existing.sales_rep_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(body)) {
    if (!EDITABLE.has(k)) continue;
    if (k === "invitees" && Array.isArray(v)) {
      patch[k] = v
        .filter((i: unknown) => i && typeof i === "object")
        .map((i: { name?: unknown; phone?: unknown; email?: unknown }) => ({
          name: typeof i.name === "string" ? i.name.trim() : "",
          phone: typeof i.phone === "string" ? i.phone.trim() : "",
          email: typeof i.email === "string" ? i.email.trim() : "",
        }))
        .filter((i: { name: string }) => i.name);
    } else {
      patch[k] = v;
    }
  }

  const { data, error } = await db.from("rep_meetings").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
