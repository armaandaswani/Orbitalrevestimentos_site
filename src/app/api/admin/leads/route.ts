import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

/** GET /api/admin/leads?source=website|partner|manual&status=novo&search=foo */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const db = supabaseAdmin();
  let query = db.from("leads").select("*").order("created_at", { ascending: false });

  if (source && source !== "all") query = query.eq("source", source);
  if (status && status !== "all") query = query.eq("status", status);
  if (search && search.trim()) {
    const s = search.trim();
    query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich partner_name from partners table when only partner_id is known.
  const rows = data ?? [];
  const missingNameIds = [
    ...new Set(
      rows
        .filter((r) => r.partner_id && !r.partner_name)
        .map((r) => r.partner_id as string)
    ),
  ];
  if (missingNameIds.length > 0) {
    const { data: partners } = await db
      .from("partners")
      .select("id, name")
      .in("id", missingNameIds);
    const nameById: Record<string, string> = {};
    for (const p of partners ?? []) nameById[p.id as string] = p.name as string;
    for (const r of rows) {
      if (r.partner_id && !r.partner_name) r.partner_name = nameById[r.partner_id as string] ?? null;
    }
  }

  return NextResponse.json(rows);
}

/** POST /api/admin/leads — manually add a lead. */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("leads")
    .insert({
      name: body.name.trim(),
      email: body.email ? String(body.email).trim().toLowerCase() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      source: "manual",
      status: body.status ?? "novo",
      partner_id: body.partner_id ?? null,
      partner_name: body.partner_name ?? null,
      space: body.space ?? null,
      product_name: body.product_name ?? null,
      estimated_value: body.estimated_value ?? null,
      next_reminder_at: body.next_reminder_at ?? null,
      reminder_note: body.reminder_note ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
