import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

// Suppliers master (Compras & Importação). Migration 039.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db.from("suppliers").select("*").order("name");
  if (error) {
    if (isMissingTable(error)) return NextResponse.json([]); // migration 039 not run
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("suppliers")
    .insert({
      name,
      country: body.country ?? null,
      contact: body.contact ?? null,
      lead_time_days: body.lead_time_days != null ? Math.max(0, Math.round(Number(body.lead_time_days)) || 0) : null,
      notes: body.notes ?? null,
    })
    .select()
    .single();
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: "Rode a migração 039 (compras/importação) no Supabase." }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

const EDITABLE = new Set(["name", "country", "contact", "lead_time_days", "notes", "active"]);

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (!EDITABLE.has(k)) continue;
    if (k === "lead_time_days") patch[k] = v != null ? Math.max(0, Math.round(Number(v)) || 0) : null;
    else if (k === "active") patch[k] = v !== false;
    else patch[k] = typeof v === "string" && v.trim() ? v.trim() : v == null ? null : v;
  }
  const db = supabaseAdmin();
  const { data, error } = await db.from("suppliers").update(patch).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = supabaseAdmin();
  const { error } = await db.from("suppliers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
