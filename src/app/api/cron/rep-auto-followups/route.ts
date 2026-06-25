/*
 * Rep Automatic Follow-ups Cron
 *
 * Sends partner-facing WhatsApp follow-up messages via SM Click when a rep has
 * explicitly enabled automation for a CRM relationship and the selected
 * next_reminder_at is due.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { smclickConfigured, sendText, normalizePhone } from "@/lib/smclick";
import { isMissingColumn, isMissingTable } from "@/lib/db-compat";

interface CrmRow {
  id: string;
  sales_rep_id: string;
  partner_id: string | null;
  reminder_recur: string | null;
  next_reminder_at: string;
  auto_followup_message: string | null;
  auto_followup_sent_at: string | null;
  prospect_name: string | null;
  prospect_phone: string | null;
}

interface PartnerRow {
  id: string;
  name: string;
  phone: string | null;
}

interface RepRow {
  id: string;
  name: string;
}

function nextOccurrence(from: string, recur: string | null, now: Date): string | null {
  if (!recur || recur === "none") return null;
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

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function defaultMessage(name: string) {
  return `Oi, ${firstName(name)}. Tudo bem? Passando para dar sequencia ao nosso contato pela Orbital Revestimentos. Posso te ajudar com o proximo passo?`;
}

function personalize(template: string, partnerName: string, repName: string) {
  return template
    .replace(/\{\{\s*nome\s*\}\}|\{nome\}/gi, firstName(partnerName))
    .replace(/\{\{\s*parceiro\s*\}\}|\{parceiro\}/gi, partnerName)
    .replace(/\{\{\s*representante\s*\}\}|\{representante\}/gi, repName);
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!smclickConfigured()) {
    return NextResponse.json({ ok: true, skipped: "SM Click nao configurado." });
  }

  const db = supabaseAdmin();
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: rows, error } = await db
    .from("rep_partner_crm")
    .select("id, sales_rep_id, partner_id, reminder_recur, next_reminder_at, auto_followup_message, auto_followup_sent_at, prospect_name, prospect_phone")
    .eq("auto_followup_enabled", true)
    .not("next_reminder_at", "is", null)
    .lte("next_reminder_at", nowIso)
    .order("next_reminder_at", { ascending: true })
    .limit(100);

  if (error && (isMissingTable(error) || isMissingColumn(error))) {
    return NextResponse.json({ ok: true, skipped: "Rode a migracao 024 (rep CRM automatic follow-ups)." });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const due = ((rows ?? []) as CrmRow[]).filter((row) => {
    if (!row.auto_followup_sent_at) return true;
    return new Date(row.auto_followup_sent_at) < new Date(row.next_reminder_at);
  });
  if (!due.length) return NextResponse.json({ ok: true, due: 0 });

  const partnerIds = [...new Set(due.map((r) => r.partner_id).filter(Boolean) as string[])];
  const repIds = [...new Set(due.map((r) => r.sales_rep_id))];

  const { data: partners } = partnerIds.length
    ? await db.from("partners").select("id, name, phone").in("id", partnerIds)
    : { data: [] };
  const { data: reps } = repIds.length
    ? await db.from("sales_reps").select("id, name").in("id", repIds)
    : { data: [] };

  const partnerMap = new Map<string, PartnerRow>(
    ((partners ?? []) as PartnerRow[]).map((p) => [p.id, p])
  );
  const repMap = new Map<string, RepRow>(
    ((reps ?? []) as RepRow[]).map((r) => [r.id, r])
  );

  let sent = 0;
  const skipped: Array<{ id: string; reason: string }> = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const row of due) {
    const partner = row.partner_id ? partnerMap.get(row.partner_id) : null;
    const partnerName = partner?.name || row.prospect_name || "parceiro";
    const phone = normalizePhone(partner?.phone || row.prospect_phone);
    if (!phone) {
      skipped.push({ id: row.id, reason: "Sem telefone." });
      continue;
    }

    const repName = repMap.get(row.sales_rep_id)?.name || "Orbital";
    const message = row.auto_followup_message?.trim()
      ? personalize(row.auto_followup_message.trim(), partnerName, repName)
      : defaultMessage(partnerName);

    const res = await sendText(phone, message);
    if (!res.ok) {
      failed.push({ id: row.id, error: res.error ?? `HTTP ${res.status}` });
      continue;
    }

    const next = nextOccurrence(row.next_reminder_at, row.reminder_recur, now);
    const patch: Record<string, unknown> = {
      auto_followup_sent_at: nowIso,
      reminder_sent_at: nowIso,
      last_followup_at: nowIso,
      updated_at: nowIso,
    };
    if (next) patch.next_reminder_at = next;

    await db.from("rep_partner_crm").update(patch).eq("id", row.id);
    await db.from("rep_partner_notes").insert({
      crm_id: row.id,
      kind: "message",
      body: `Follow-up automatico enviado via SM Click: ${message}`,
      author: "Sistema",
    });
    sent++;
  }

  return NextResponse.json({
    ok: failed.length === 0,
    due: due.length,
    sent,
    skipped,
    failed,
  });
}
