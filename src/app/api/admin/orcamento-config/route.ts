import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { loadOrcamentoConfig } from "@/lib/orcamento-server";

export const runtime = "nodejs";

// GET /api/admin/orcamento-config — current commercial config (engine numbers +
// installer/validity/automation extras), merged over the code defaults.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const { config, extras } = await loadOrcamentoConfig(db);
  return NextResponse.json({ ...config, ...extras });
}

// PUT /api/admin/orcamento-config — persist the full config JSONB (singleton).
export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("orcamento_settings")
    .upsert({ id: 1, config: body, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return the normalized, merged view so the client reflects fallbacks.
  const { config, extras } = await loadOrcamentoConfig(db);
  return NextResponse.json({ ...config, ...extras });
}
