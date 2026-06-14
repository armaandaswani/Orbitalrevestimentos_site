import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/simulador/capture — Feature 6 (abandoned-simulador recovery).
 *
 * Public endpoint called from the simulador as soon as the visitor enters a
 * valid phone, BEFORE they submit. Upserts a partial session keyed by a
 * client-generated UUID, so the abandoned-recovery cron can nudge people who
 * never finished. When the full orçamento is submitted, the
 * /api/client-email-sequences route flips this row's `completed` to true.
 *
 * Best-effort: a capture failure must never disrupt the simulador, so we always
 * return 200 (the cron simply won't see a row that didn't save).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const id = body && typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return NextResponse.json({ ok: false, ignored: "missing-id" });

    const db = supabaseAdmin();
    await db.from("simulador_sessions").upsert(
      {
        id,
        name: body.name ? String(body.name).trim() : null,
        email: body.email ? String(body.email).trim().toLowerCase() : null,
        phone: body.phone ? String(body.phone).trim() : null,
        space: body.space ? String(body.space) : null,
        product_name: body.product_name ? String(body.product_name) : null,
        estimated_total: typeof body.estimated_total === "number" ? body.estimated_total : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, ignored: "error" });
  }
}
