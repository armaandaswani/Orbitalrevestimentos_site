/*
 * Rep Weekly Digest Cron
 *
 * For every active sales rep, gathers (a) rep_partner_crm rows with a due or
 * overdue follow-up reminder, and (b) rep_meetings scheduled in the next 7
 * days. If either is non-empty, sends a digest via WhatsApp (SM Click, same
 * mechanism as /api/cron/whatsapp-reminders) and email (Resend), unlike that
 * route which sends a single digest to one owner number — this one is
 * per-rep, to each rep's own phone/email.
 *
 * Env:
 *   CRON_SECRET  if set, require Authorization: Bearer <secret>
 *   SMCLICK_API_URL / SMCLICK_API_KEY / SMCLICK_INSTANCE_ID  (SM Click)
 *   RESEND_API_KEY  (Resend)
 *
 * Suggested schedule: Monday, e.g. 12:00 UTC (08:00 Manaus) — same slot as
 * the existing weekly commission-report cron, different route.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { smclickConfigured, sendText, normalizePhone } from "@/lib/smclick";
import { getResend } from "@/lib/resend";
import { isMissingTable } from "@/lib/db-compat";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Manaus", dateStyle: "short", timeStyle: "short" });
}

interface CrmRow {
  id: string;
  partner_id: string;
  reminder_note: string | null;
  next_reminder_at: string;
}
interface MeetingRow {
  id: string;
  title: string;
  scheduled_at: string;
  partner_id: string | null;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = supabaseAdmin();
  const { data: reps, error: repsErr } = await db
    .from("sales_reps")
    .select("id, name, phone, email")
    .eq("status", "active");
  if (repsErr) return NextResponse.json({ error: repsErr.message }, { status: 500 });
  if (!reps || reps.length === 0) return NextResponse.json({ ok: true, reps: 0 });

  const nowIso = new Date().toISOString();
  const weekAheadIso = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  const canWhatsapp = smclickConfigured();
  let resend: ReturnType<typeof getResend> | null = null;
  try {
    resend = getResend();
  } catch {
    resend = null;
  }

  let sent = 0;
  let skippedNoChannel = 0;
  const results: Array<{ rep: string; overdue: number; upcomingMeetings: number; sentVia: string[] }> = [];

  for (const rep of reps) {
    const { data: crmDue, error: crmErr } = await db
      .from("rep_partner_crm")
      .select("id, partner_id, reminder_note, next_reminder_at")
      .eq("sales_rep_id", rep.id)
      .not("next_reminder_at", "is", null)
      .lte("next_reminder_at", nowIso)
      .order("next_reminder_at", { ascending: true })
      .limit(50);
    if (crmErr && !isMissingTable(crmErr)) continue;

    const { data: meetings, error: meetingsErr } = await db
      .from("rep_meetings")
      .select("id, title, scheduled_at, partner_id")
      .eq("sales_rep_id", rep.id)
      .eq("status", "scheduled")
      .gte("scheduled_at", nowIso)
      .lte("scheduled_at", weekAheadIso)
      .order("scheduled_at", { ascending: true })
      .limit(50);
    if (meetingsErr && !isMissingTable(meetingsErr)) continue;

    const due = (crmDue ?? []) as CrmRow[];
    const upcoming = (meetings ?? []) as MeetingRow[];
    if (due.length === 0 && upcoming.length === 0) continue;

    const partnerIds = [...new Set([...due.map((d) => d.partner_id), ...upcoming.map((m) => m.partner_id).filter(Boolean) as string[]])];
    const { data: partners } = partnerIds.length
      ? await db.from("partners").select("id, name").in("id", partnerIds)
      : { data: [] };
    const partnerNameById = new Map((partners ?? []).map((p) => [p.id as string, p.name as string]));

    const lines: string[] = [];
    if (due.length > 0) {
      lines.push(`📋 Follow-ups pendentes (${due.length}):`);
      due.forEach((d, i) => {
        const partnerName = partnerNameById.get(d.partner_id) ?? "Parceiro";
        const note = d.reminder_note ? ` — ${d.reminder_note}` : "";
        lines.push(`${i + 1}. ${partnerName}${note}`);
      });
    }
    if (upcoming.length > 0) {
      if (lines.length) lines.push("");
      lines.push(`📅 Reuniões nos próximos 7 dias (${upcoming.length}):`);
      upcoming.forEach((m, i) => {
        const partnerName = m.partner_id ? partnerNameById.get(m.partner_id) : null;
        const suffix = partnerName ? ` · ${partnerName}` : "";
        lines.push(`${i + 1}. ${fmtDate(m.scheduled_at)} — ${m.title}${suffix}`);
      });
    }

    const message = `🔔 Resumo semanal — ${rep.name}\n\n${lines.join("\n")}\n\nAcesse o portal para ver detalhes.`;
    const sentVia: string[] = [];

    const phone = normalizePhone(rep.phone);
    if (canWhatsapp && phone) {
      const res = await sendText(phone, message);
      if (res.ok) sentVia.push("whatsapp");
    }

    if (resend && rep.email) {
      try {
        await resend.emails.send({
          from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
          to: rep.email,
          subject: `Resumo semanal — ${due.length} follow-up${due.length !== 1 ? "s" : ""}, ${upcoming.length} reunião${upcoming.length !== 1 ? "ões" : ""}`,
          html: `<pre style="font-family:Arial,sans-serif;font-size:14px;color:#002045;white-space:pre-wrap;">${lines.join("\n")}</pre>`,
        });
        sentVia.push("email");
      } catch {
        // best-effort — WhatsApp digest still counts as delivered
      }
    }

    if (sentVia.length > 0) sent++;
    else skippedNoChannel++;
    results.push({ rep: rep.name, overdue: due.length, upcomingMeetings: upcoming.length, sentVia });
  }

  return NextResponse.json({ ok: true, reps: reps.length, sent, skippedNoChannel, results });
}
