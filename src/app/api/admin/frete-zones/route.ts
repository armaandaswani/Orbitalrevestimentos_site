import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

export const runtime = "nodejs";

// GET /api/admin/frete-zones — zonas de frete configuráveis (migração 044).
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db.from("frete_zones").select("*").order("priority", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// POST /api/admin/frete-zones — cria uma zona.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body?.name || typeof body.name !== "string") return NextResponse.json({ error: "Nome da zona é obrigatório." }, { status: 400 });
  const db = supabaseAdmin();
  const row = {
    name: String(body.name).trim(),
    neighborhoods: typeof body.neighborhoods === "string" ? body.neighborhoods : null,
    cep_start: typeof body.cep_start === "string" ? body.cep_start.replace(/\D/g, "") || null : null,
    cep_end: typeof body.cep_end === "string" ? body.cep_end.replace(/\D/g, "") || null : null,
    cep_list: typeof body.cep_list === "string" ? body.cep_list : null,
    value: Number(body.value) || 0,
    priority: Number.isFinite(Number(body.priority)) ? Number(body.priority) : 0,
    active: body.active !== false,
    notes: typeof body.notes === "string" ? body.notes : null,
  };
  const { data, error } = await db.from("frete_zones").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
