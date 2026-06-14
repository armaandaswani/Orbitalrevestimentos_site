/*
 * Abandoned-simulador recovery cron (Feature 6).
 *
 * Finds simulador sessions where a visitor entered a phone but never submitted
 * the orçamento, then sends a single gentle WhatsApp nudge via SM Click. Each
 * session is nudged at most once (nudged_at).
 *
 * Eligibility window:
 *   - completed = false           (they didn't finish)
 *   - nudged_at IS NULL           (not nudged before)
 *   - created 30min–24h ago       (grace period to finish; stay in WhatsApp's
 *                                   24h free-form window so no template needed)
 *
 * Env:
 *   CRON_SECRET   if set, require Authorization: Bearer <secret>
 *   SMCLICK_*     SM Click credentials
 *
 * Suggested schedule: hourly.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { smclickConfigured, sendText, normalizePhone } from "@/lib/smclick";
import { abandonedNudgeMessage } from "@/lib/smclick-messages";

const GRACE_MINUTES = 30;
const WINDOW_HOURS = 24;
const MAX_PER_RUN = 50;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!smclickConfigured()) {
    return NextResponse.json({ ok: true, skipped: "SM Click não configurado." });
  }

  const db = supabaseAdmin();
  const now = Date.now();
  const newestAllowed = new Date(now - GRACE_MINUTES * 60 * 1000).toISOString();
  const oldestAllowed = new Date(now - WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  const { data: sessions, error } = await db
    .from("simulador_sessions")
    .select("id, name, phone, space, created_at")
    .eq("completed", false)
    .is("nudged_at", null)
    .not("phone", "is", null)
    .lte("created_at", newestAllowed)
    .gte("created_at", oldestAllowed)
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const candidates = sessions ?? [];
  if (candidates.length === 0) return NextResponse.json({ ok: true, nudged: 0 });

  // Skip phones that already completed a session under a different id (e.g. the
  // visitor finished from another tab) so we never nudge someone who converted.
  const phones = [...new Set(candidates.map((s) => s.phone as string).filter(Boolean))];
  const completedPhones = new Set<string>();
  if (phones.length > 0) {
    const { data: done } = await db
      .from("simulador_sessions")
      .select("phone")
      .eq("completed", true)
      .in("phone", phones);
    for (const r of done ?? []) if (r.phone) completedPhones.add(r.phone as string);
  }

  let nudged = 0;
  let failed = 0;
  for (const s of candidates) {
    if (s.phone && completedPhones.has(s.phone as string)) {
      // Mark as nudged so we stop reconsidering it, but don't message.
      await db.from("simulador_sessions").update({ nudged_at: new Date().toISOString() }).eq("id", s.id);
      continue;
    }
    const phone = normalizePhone(s.phone as string | null);
    if (!phone) {
      await db.from("simulador_sessions").update({ nudged_at: new Date().toISOString() }).eq("id", s.id);
      continue;
    }
    const res = await sendText(phone, abandonedNudgeMessage(s.name as string | null, s.space as string | null));
    if (res.ok) {
      nudged++;
      await db.from("simulador_sessions").update({ nudged_at: new Date().toISOString() }).eq("id", s.id);
    } else {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, candidates: candidates.length, nudged, failed });
}
