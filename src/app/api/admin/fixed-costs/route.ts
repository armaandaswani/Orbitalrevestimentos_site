import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

const MIGRATION_HINT = "Recurso indisponível — rode a migração 023 (fixed_costs) no Supabase.";
const CADENCES = new Set(["daily", "weekly", "monthly"]);

function isMissing(err: { message?: string } | null): boolean {
  const m = err?.message?.toLowerCase() ?? "";
  return m.includes("fixed_costs") || m.includes("does not exist");
}

/** GET /api/admin/fixed-costs — all recurring fixed costs. */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("fixed_costs").select("*").order("created_at", { ascending: false });
  if (error && isMissing(error)) return NextResponse.json([]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST /api/admin/fixed-costs — create a recurring cost. */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const amount = Number(body.amount);
  const cadence = String(body.cadence);
  if (!name || !Number.isFinite(amount) || amount < 0 || !CADENCES.has(cadence)) {
    return NextResponse.json({ error: "Nome, valor e periodicidade (daily/weekly/monthly) obrigatórios." }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("fixed_costs")
    .insert({
      name,
      amount,
      cadence,
      active: body.active === false ? false : true,
      started_at: body.started_at || null,
      ended_at: body.ended_at || null,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    })
    .select()
    .single();

  if (error && isMissing(error)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
