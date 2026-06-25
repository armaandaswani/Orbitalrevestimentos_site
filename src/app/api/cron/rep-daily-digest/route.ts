/*
 * Rep Daily Digest Cron
 *
 * Sends each active sales rep a daily priority digest at 07:00 Brasilia time:
 * first today's meetings to confirm, then follow-ups due/overdue, with a
 * suggested next action for each partner/prospect. Delivery is WhatsApp
 * through SM Click and email through Resend when each channel is configured.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { smclickConfigured, sendText, normalizePhone } from "@/lib/smclick";
import { getResend } from "@/lib/resend";
import { isMissingTable } from "@/lib/db-compat";

const TIME_ZONE = "America/Sao_Paulo";

interface RepRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface CrmRow {
  id: string;
  partner_id: string | null;
  stage: string;
  reminder_note: string | null;
  next_reminder_at: string;
  reminder_sent_at: string | null;
  mostruario_sent: boolean | null;
  mostruario_received: boolean | null;
  has_specified: boolean | null;
  specified_count: number | null;
  project_added: boolean | null;
  project_added_count: number | null;
  prospect_name: string | null;
  prospect_phone: string | null;
  prospect_email: string | null;
}

interface MeetingRow {
  id: string;
  title: string;
  scheduled_at: string;
  partner_id: string | null;
  invitees: Array<{ name?: string; phone?: string; email?: string }> | null;
}

interface PartnerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  profession: string | null;
}

function dateKey(isoOrDate: string | Date) {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stageAction(stage: string) {
  switch (stage) {
    case "reuniao_agendada":
      return "Confirmar presença, horário e pauta.";
    case "reuniao_realizada":
      return "Registrar resultado e combinar o próximo passo.";
    case "acompanhamento":
      return "Fazer follow-up e remover qualquer pendência.";
    case "ativo":
      return "Manter relacionamento ativo e buscar novo projeto.";
    case "inativo":
      return "Reativar com uma mensagem simples ou arquivar.";
    case "novo_contato":
    default:
      return "Fazer primeiro contato e tentar agendar reunião.";
  }
}

function suggestedAction(row: CrmRow) {
  if (row.mostruario_sent && !row.mostruario_received) return "Confirmar se o mostruario chegou.";
  if (row.mostruario_received && !(row.has_specified || (row.specified_count ?? 0) > 0)) {
    return "Pedir feedback do mostruario e puxar primeira especificacao.";
  }
  if ((row.specified_count ?? 0) > 0 && !(row.project_added || (row.project_added_count ?? 0) > 0)) {
    return "Perguntar em qual projeto a Orbital pode entrar agora.";
  }
  return stageAction(row.stage);
}

function partnerLabel(row: CrmRow, partners: Map<string, PartnerRow>) {
  if (row.partner_id) return partners.get(row.partner_id)?.name ?? "Parceiro";
  return row.prospect_name || "Prospecto";
}

function meetingLabel(row: MeetingRow, partners: Map<string, PartnerRow>) {
  if (row.partner_id) return partners.get(row.partner_id)?.name ?? row.title;
  return row.invitees?.[0]?.name || row.title;
}

function dueForDigest(row: CrmRow, todayKey: string) {
  if (!row.next_reminder_at) return false;
  if (dateKey(row.next_reminder_at) > todayKey) return false;
  if (!row.reminder_sent_at) return true;
  return new Date(row.reminder_sent_at) < new Date(row.next_reminder_at);
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: reps, error: repsErr } = await db
    .from("sales_reps")
    .select("id, name, phone, email")
    .eq("status", "active");
  if (repsErr) return NextResponse.json({ error: repsErr.message }, { status: 500 });
  if (!reps?.length) return NextResponse.json({ ok: true, reps: 0 });

  const now = new Date();
  const today = dateKey(now);
  const roughStart = new Date(now.getTime() - 18 * 3600 * 1000).toISOString();
  const roughEnd = new Date(now.getTime() + 36 * 3600 * 1000).toISOString();
  const canWhatsapp = smclickConfigured();
  let resend: ReturnType<typeof getResend> | null = null;
  try {
    resend = getResend();
  } catch {
    resend = null;
  }

  const results: Array<{ rep: string; meetings: number; followups: number; sentVia: string[] }> = [];

  for (const rep of reps as RepRow[]) {
    const { data: meetings, error: meetingsErr } = await db
      .from("rep_meetings")
      .select("id, title, scheduled_at, partner_id, invitees")
      .eq("sales_rep_id", rep.id)
      .eq("status", "scheduled")
      .gte("scheduled_at", roughStart)
      .lte("scheduled_at", roughEnd)
      .order("scheduled_at", { ascending: true })
      .limit(100);
    if (meetingsErr && !isMissingTable(meetingsErr)) continue;

    const { data: crmRows, error: crmErr } = await db
      .from("rep_partner_crm")
      .select("id, partner_id, stage, reminder_note, next_reminder_at, reminder_sent_at, mostruario_sent, mostruario_received, has_specified, specified_count, project_added, project_added_count, prospect_name, prospect_phone, prospect_email")
      .eq("sales_rep_id", rep.id)
      .not("next_reminder_at", "is", null)
      .lte("next_reminder_at", roughEnd)
      .order("next_reminder_at", { ascending: true })
      .limit(100);
    if (crmErr && !isMissingTable(crmErr)) continue;

    const todaysMeetings = ((meetings ?? []) as MeetingRow[]).filter((m) => dateKey(m.scheduled_at) === today);
    const dueFollowups = ((crmRows ?? []) as CrmRow[]).filter((r) => dueForDigest(r, today));
    if (!todaysMeetings.length && !dueFollowups.length) continue;

    const partnerIds = [
      ...new Set(
        [
          ...todaysMeetings.map((m) => m.partner_id).filter(Boolean),
          ...dueFollowups.map((r) => r.partner_id).filter(Boolean),
        ] as string[]
      ),
    ];
    const { data: partners } = partnerIds.length
      ? await db.from("partners").select("id, name, phone, email, profession").in("id", partnerIds)
      : { data: [] };
    const partnerMap = new Map<string, PartnerRow>(
      ((partners ?? []) as PartnerRow[]).map((p) => [p.id, p])
    );

    const lines: string[] = [
      `Bom dia, ${rep.name}.`,
      `Prioridade de hoje: confirmar reunioes e executar follow-ups importantes.`,
      "",
    ];

    if (todaysMeetings.length) {
      lines.push(`1) Confirmar reunioes de hoje (${todaysMeetings.length})`);
      todaysMeetings.forEach((m, i) => {
        lines.push(`${i + 1}. ${fmtTime(m.scheduled_at)} - ${meetingLabel(m, partnerMap)} - confirmar presenca e pauta.`);
      });
      lines.push("");
    }

    if (dueFollowups.length) {
      lines.push(`${todaysMeetings.length ? "2" : "1"}) Follow-ups para hoje/atrasados (${dueFollowups.length})`);
      dueFollowups.forEach((r, i) => {
        const note = r.reminder_note ? ` Nota: ${r.reminder_note}.` : "";
        lines.push(`${i + 1}. ${partnerLabel(r, partnerMap)} - ${suggestedAction(r)}${note}`);
      });
      lines.push("");
    }

    lines.push("Sugestao de ordem: confirmar reunioes primeiro, depois follow-ups atrasados, depois novos contatos.");
    const message = lines.join("\n");
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
          subject: `Digest do dia - ${todaysMeetings.length} reuniao(oes), ${dueFollowups.length} follow-up(s)`,
          html: `<pre style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#002045;white-space:pre-wrap;">${escapeHtml(message)}</pre>`,
        });
        sentVia.push("email");
      } catch {
        // Best effort. The WhatsApp channel may still have succeeded.
      }
    }

    results.push({ rep: rep.name, meetings: todaysMeetings.length, followups: dueFollowups.length, sentVia });
  }

  return NextResponse.json({
    ok: true,
    timezone: TIME_ZONE,
    date: today,
    reps: (reps as RepRow[]).length,
    sent: results.filter((r) => r.sentVia.length > 0).length,
    results,
  });
}
