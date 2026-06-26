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
  // For weekly costs, the weekday it lands on (0=domingo … 6=sábado) so the
  // financeiro counts each occurrence in the period.
  const wd = Number(body.weekday);
  const weekday = cadence === "weekly" && Number.isInteger(wd) && wd >= 0 && wd <= 6 ? wd : null;
  const md = Number(body.month_day);
  const monthDay = cadence === "monthly" && Number.isInteger(md) && md >= 1 && md <= 31 ? md : null;

  const sb = supabaseAdmin();
  const row: Record<string, unknown> = {
    name,
    amount,
    cadence,
    active: body.active === false ? false : true,
    started_at: body.started_at || null,
    ended_at: body.ended_at || null,
    notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
  };
  // Only reference the weekday column when actually set, so costs still save if
  // migration 025 (fixed_costs.weekday) hasn't been applied yet.
  if (weekday !== null) row.weekday = weekday;
  if (monthDay !== null) row.month_day = monthDay;

  let { data, error } = await sb.from("fixed_costs").insert(row).select().single();
  // weekday column not there yet → retry without it.
  if (error && /(weekday|month_day)/i.test(error.message)) {
    delete row.weekday;
    delete row.month_day;
    ({ data, error } = await sb.from("fixed_costs").insert(row).select().single());
  }

  if (error && isMissing(error)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
