import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminRequest, repIdFromRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import { smclickConfigured, normalizePhone, sendText } from "@/lib/smclick";
import { meetingInviteMessage } from "@/lib/smclick-messages";

const MIGRATION_HINT = "Recurso indisponível — rode a migração 019 (rep_meetings) no Supabase.";
const ORBITAL_MEETING_EMAIL = "orbitalrevestimentos@gmail.com";

interface Invitee { name: string; phone: string; email: string }
interface EmailRecipient extends Invitee { role: "partner" | "rep" | "admin" }
interface MeetingRow {
  id: string;
  sales_rep_id: string;
  title: string;
  scheduled_at: string;
  duration_minutes?: number | null;
  location: string | null;
  invitees: Invitee[];
  invitees_notified_at?: string | null;
}

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000);
}

function calendarStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function calendarLinks(meeting: MeetingRow, repName: string | null) {
  const start = new Date(meeting.scheduled_at);
  const end = addMinutes(meeting.scheduled_at, meeting.duration_minutes || 60);
  const details = [
    `Reunião agendada pela Orbital Revestimentos${repName ? ` com ${repName}` : ""}.`,
    "Qualquer dúvida, responda ao e-mail ou WhatsApp recebido.",
  ].join("\n\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: meeting.title,
    dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
    details,
  });
  if (meeting.location) params.set("location", meeting.location);
  return {
    google: `https://calendar.google.com/calendar/render?${params.toString()}`,
    start,
    end,
    details,
  };
}

function escapeIcs(s: string | null | undefined) {
  return (s || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function makeIcs(meeting: MeetingRow, invitee: Invitee, repName: string | null) {
  const { start, end, details } = calendarLinks(meeting, repName);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Orbital Revestimentos//CRM//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${meeting.id}@orbitalrevestimentos.com.br`,
    `DTSTAMP:${calendarStamp(new Date())}`,
    `DTSTART:${calendarStamp(start)}`,
    `DTEND:${calendarStamp(end)}`,
    `SUMMARY:${escapeIcs(meeting.title)}`,
    `DESCRIPTION:${escapeIcs(details)}`,
    meeting.location ? `LOCATION:${escapeIcs(meeting.location)}` : "",
    "ORGANIZER;CN=Orbital Revestimentos:mailto:noreply@orbitalrevestimentos.com.br",
    invitee.email ? `ATTENDEE;CN=${escapeIcs(invitee.name)};RSVP=TRUE:mailto:${invitee.email}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

function isGoogleEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  return domain === "gmail.com" || domain === "googlemail.com";
}

function normalizeEmail(email: string | null | undefined) {
  return (email || "").trim().toLowerCase();
}

function addEmailRecipient(recipients: EmailRecipient[], recipient: EmailRecipient) {
  const email = normalizeEmail(recipient.email);
  if (!email || recipients.some((r) => normalizeEmail(r.email) === email)) return;
  recipients.push({ ...recipient, email });
}

function meetingEmailHtml(input: {
  message: string;
  googleCalendarUrl: string;
  googlePreferred: boolean;
}) {
  const escapedMessage = input.message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  const primary = input.googlePreferred
    ? "Adicionar ao Google Calendar"
    : "Usar o arquivo .ics anexado";
  const secondary = input.googlePreferred
    ? "Também anexamos um arquivo .ics para Apple Calendar, Outlook e outros calendários."
    : "Como este e-mail não parece ser Gmail, anexamos um convite .ics compatível com Apple Calendar, Outlook e outros calendários.";
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#1a1c1c;line-height:1.55;max-width:620px">
      <p>${escapedMessage}</p>
      ${input.googlePreferred ? `
        <p style="margin:24px 0">
          <a href="${input.googleCalendarUrl}" style="background:#002045;color:#ffffff;text-decoration:none;padding:12px 18px;font-weight:700;display:inline-block">
            ${primary}
          </a>
        </p>
      ` : ""}
      <p style="font-size:13px;color:#74777f">${secondary}</p>
    </div>
  `;
}

// Best-effort: notify every invitee of a freshly-scheduled meeting over WhatsApp
// (SM Click) and/or email (Resend), then stamp invitees_notified_at so we never
// double-notify. Never throws — invites are a nice-to-have, not a gate on the
// meeting being saved.
async function notifyInvitees(db: SupabaseClient, meeting: MeetingRow): Promise<void> {
  try {
    const invitees = Array.isArray(meeting.invitees) ? meeting.invitees : [];
    if (meeting.invitees_notified_at) return;

    let repName: string | null = null;
    let repEmail: string | null = null;
    try {
      const { data } = await db.from("sales_reps").select("name,email").eq("id", meeting.sales_rep_id).maybeSingle();
      repName = (data as { name?: string } | null)?.name ?? null;
      repEmail = (data as { email?: string } | null)?.email ?? null;
    } catch { /* non-fatal */ }

    const whenLabel = new Date(meeting.scheduled_at).toLocaleString("pt-BR", {
      timeZone: "America/Manaus", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    // Resend throws if unconfigured — resolve it lazily and tolerate absence.
    let resend: import("resend").Resend | null = null;
    if (process.env.RESEND_API_KEY) {
      try { resend = (await import("@/lib/resend")).getResend(); } catch { resend = null; }
    }

    const calendar = calendarLinks(meeting, repName);
    const emailRecipients: EmailRecipient[] = [];

    for (const inv of invitees) {
      const msg = meetingInviteMessage({
        inviteeName: inv.name, title: meeting.title, whenLabel, location: meeting.location, repName,
      });
      if (inv.phone && smclickConfigured()) {
        const tel = normalizePhone(inv.phone);
        const googlePreferred = inv.email ? isGoogleEmail(inv.email) : false;
        const calendarHint = inv.email
          ? `\n\nTambém enviamos o convite por e-mail${googlePreferred ? " com link do Google Calendar" : " com arquivo .ics para calendário"}.`
          : "";
        if (tel) await sendText(tel, `${msg}${calendarHint}`).catch(() => {});
      }

      addEmailRecipient(emailRecipients, {
        role: "partner",
        name: inv.name,
        phone: inv.phone,
        email: inv.email,
      });
    }

    addEmailRecipient(emailRecipients, {
      role: "rep",
      name: repName || "Representante Orbital",
      phone: "",
      email: repEmail || "",
    });
    addEmailRecipient(emailRecipients, {
      role: "admin",
      name: "Admin Orbital",
      phone: "",
      email: ORBITAL_MEETING_EMAIL,
    });

    if (resend) {
      for (const recipient of emailRecipients) {
        const googlePreferred = isGoogleEmail(recipient.email);
        const inviteeName = recipient.role === "partner" ? recipient.name : recipient.role === "rep" ? (repName || recipient.name) : "Admin Orbital";
        const msg = meetingInviteMessage({
          inviteeName, title: meeting.title, whenLabel, location: meeting.location, repName,
        });

        await resend.emails
          .send({
            from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
            to: recipient.email,
            subject: "Reunião agendada — Orbital Revestimentos",
            text: `${msg}\n\n${
              googlePreferred
                ? `Adicionar ao Google Calendar: ${calendar.google}\n\nTambém anexamos um arquivo .ics para outros calendários.`
                : "Anexamos um arquivo .ics para adicionar esta reunião ao seu calendário."
            }`,
            html: meetingEmailHtml({
              message: msg,
              googleCalendarUrl: calendar.google,
              googlePreferred,
            }),
            attachments: [
              {
                filename: "reuniao-orbital.ics",
                content: Buffer.from(makeIcs(meeting, recipient, repName)).toString("base64"),
              },
            ],
          })
          .catch(() => {});
      }
    }

    await db.from("rep_meetings").update({ invitees_notified_at: new Date().toISOString() }).eq("id", meeting.id);
  } catch (e) {
    console.error("[rep-meetings] invitee notify failed", e instanceof Error ? e.message : e);
  }
}

/** GET /api/representante/meetings?sales_rep_id=&from=&to= — agenda for one rep. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const salesRepId = searchParams.get("sales_rep_id");
  if (!salesRepId) return NextResponse.json({ error: "sales_rep_id required" }, { status: 400 });

  if (!isAdminRequest(req) && repIdFromRequest(req) !== salesRepId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const db = supabaseAdmin();
  let query = db
    .from("rep_meetings")
    .select("*")
    .eq("sales_rep_id", salesRepId)
    .order("scheduled_at", { ascending: true });

  if (from) query = query.gte("scheduled_at", from);
  if (to) query = query.lte("scheduled_at", to);

  const { data, error } = await query;
  if (error && isMissingTable(error)) return NextResponse.json([]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST /api/representante/meetings — create a meeting. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const salesRepId = body.sales_rep_id;
  if (!salesRepId) return NextResponse.json({ error: "sales_rep_id required" }, { status: 400 });
  if (!isAdminRequest(req) && repIdFromRequest(req) !== salesRepId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
  }
  if (!body.scheduled_at) {
    return NextResponse.json({ error: "Data/hora é obrigatória." }, { status: 400 });
  }

  const invitees = Array.isArray(body.invitees)
    ? body.invitees
        .filter((i: unknown) => i && typeof i === "object")
        .map((i: { name?: unknown; phone?: unknown; email?: unknown }) => ({
          name: typeof i.name === "string" ? i.name.trim() : "",
          phone: typeof i.phone === "string" ? i.phone.trim() : "",
          email: typeof i.email === "string" ? i.email.trim() : "",
        }))
        .filter((i: { name: string }) => i.name)
    : [];

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("rep_meetings")
    .insert({
      sales_rep_id: salesRepId,
      partner_id: body.partner_id || null,
      crm_id: body.crm_id || null,
      title: body.title.trim(),
      scheduled_at: body.scheduled_at,
      duration_minutes: Number.isFinite(body.duration_minutes) ? body.duration_minutes : 60,
      location: body.location ? String(body.location).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
      invitees,
    })
    .select()
    .single();

  if (error && isMissingTable(error)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify invitees (WhatsApp + email), unless the caller opted out.
  if (body.notify !== false) await notifyInvitees(db, data as MeetingRow);

  return NextResponse.json(data, { status: 201 });
}
