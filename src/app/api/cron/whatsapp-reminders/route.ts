/*
 * WhatsApp Reminders Cron
 *
 * Finds CRM leads whose next_reminder_at is due (<= now) and not yet sent, then
 * sends a single digest WhatsApp message to the owner via SM Click so they
 * remember to follow up. Each reminder is marked reminder_sent_at so it fires
 * at most once (re-setting next_reminder_at to a later time re-arms it because
 * we only treat a reminder as "sent" when reminder_sent_at >= next_reminder_at).
 *
 * Env:
 *   CRON_SECRET          if set, require Authorization: Bearer <secret>
 *   SMCLICK_REMINDER_TO  owner's WhatsApp number to receive the digest
 *   SMCLICK_API_URL / SMCLICK_API_KEY / SMCLICK_INSTANCE_ID  (SM Click)
 *
 * Suggested schedule: daily, e.g. 12:00 UTC (08:00 Manaus).
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { smclickConfigured, sendText, normalizePhone } from "@/lib/smclick";
import { isMissingColumn } from "@/lib/db-compat";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Manaus" });
}

/**
 * Next occurrence strictly after `now` for a recurring reminder, starting from
 * the original `from` time so the time-of-day is preserved. Returns null for
 * non-recurring reminders.
 */
function nextOccurrence(from: string, recur: string, now: Date): string | null {
  if (recur === "none" || !recur) return null;
  const d = new Date(from);
  let guard = 0;
  while (d <= now && guard++ < 1000) {
    if (recur === "daily") d.setDate(d.getDate() + 1);
    else if (recur === "weekly") d.setDate(d.getDate() + 7);
    else if (recur === "monthly") d.setMonth(d.getMonth() + 1);
    else return null;
  }
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const ownerPhone = normalizePhone(process.env.SMCLICK_REMINDER_TO);
  if (!smclickConfigured() || !ownerPhone) {
    return NextResponse.json({
      ok: true,
      skipped: "SM Click ou SMCLICK_REMINDER_TO não configurado.",
    });
  }

  const db = supabaseAdmin();
  const nowIso = new Date().toISOString();

  // Due reminders that haven't been sent for this reminder time yet.
  const dueQuery = () =>
    db
      .from("leads")
      .select("id, name, phone, status, reminder_note, next_reminder_at, reminder_sent_at, reminder_recur")
      .not("next_reminder_at", "is", null)
      .lte("next_reminder_at", nowIso)
      .order("next_reminder_at", { ascending: true })
      .limit(100);

  let { data: leads, error } = await dueQuery();

  // Migration 016 (reminder_recur) may not have run yet — retry without it;
  // every reminder is then treated as one-off (the pre-migration behavior).
  if (error && isMissingColumn(error)) {
    const fallback = await db
      .from("leads")
      .select("id, name, phone, status, reminder_note, next_reminder_at, reminder_sent_at")
      .not("next_reminder_at", "is", null)
      .lte("next_reminder_at", nowIso)
      .order("next_reminder_at", { ascending: true })
      .limit(100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    leads = fallback.data as any;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const due = (leads ?? []).filter((l) => {
    const sent = l.reminder_sent_at as string | null;
    const at = l.next_reminder_at as string;
    return !sent || new Date(sent) < new Date(at);
  });

  if (due.length === 0) {
    return NextResponse.json({ ok: true, due: 0 });
  }

  const lines = due.map((l, i) => {
    const note = l.reminder_note ? ` — ${l.reminder_note}` : "";
    const phone = l.phone ? ` (${l.phone})` : "";
    return `${i + 1}. ${l.name}${phone}${note}`;
  });
  const message =
    `🔔 Lembretes de follow-up (${due.length})\n\n` +
    lines.join("\n") +
    `\n\nAcesse o painel para ver detalhes.`;

  const res = await sendText(ownerPhone, message);
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: `Falha ao enviar lembrete: ${res.error ?? `HTTP ${res.status}`}`, due: due.length },
      { status: 502 }
    );
  }

  // Recurring reminders advance to their next occurrence; one-off reminders are
  // simply marked sent so they don't fire again.
  const now = new Date();
  const recurring: { id: string; next: string }[] = [];
  const oneOff: string[] = [];
  for (const l of due) {
    const next = nextOccurrence(l.next_reminder_at as string, (l.reminder_recur as string) ?? "none", now);
    if (next) recurring.push({ id: l.id as string, next });
    else oneOff.push(l.id as string);
  }

  if (oneOff.length) {
    await db.from("leads").update({ reminder_sent_at: nowIso }).in("id", oneOff);
  }
  for (const r of recurring) {
    await db.from("leads").update({ next_reminder_at: r.next, reminder_sent_at: nowIso }).eq("id", r.id);
  }

  return NextResponse.json({
    ok: true,
    due: due.length,
    recurring: recurring.length,
    oneOff: oneOff.length,
    notified: due.map((l) => fmtDate(l.next_reminder_at as string)),
  });
}
