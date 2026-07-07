import type { SupabaseClient } from "@supabase/supabase-js";
import { smclickConfigured, normalizePhone, sendText, adminWhatsappPhone } from "@/lib/smclick";
import { meetingInviteMessage, adminMeetingAlertMessage } from "@/lib/smclick-messages";

// Shared rep-meeting invite/notification logic. Used when a meeting is created
// (POST) AND when it's rescheduled or cancelled (PATCH), so the calendar invite
// (.ics) and WhatsApp/email always reflect the current state of the meeting.

export const ORBITAL_MEETING_EMAIL = "orbitalrevestimentos@gmail.com";

export interface Invitee { name: string; phone: string; email: string }
interface EmailRecipient extends Invitee { role: "partner" | "rep" | "admin" }
export interface MeetingRow {
  id: string;
  sales_rep_id: string;
  title: string;
  scheduled_at: string;
  duration_minutes?: number | null;
  location: string | null;
  invitees: Invitee[];
  invitees_notified_at?: string | null;
}

// What kind of notification this is — drives the subject/message wording and
// the .ics METHOD (REQUEST adds/updates the event, CANCEL removes it).
export type NotifyKind = "new" | "reschedule" | "cancel";

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

function makeIcs(meeting: MeetingRow, invitee: Invitee, repName: string | null, method: "REQUEST" | "CANCEL", sequence: number) {
  const { start, end, details } = calendarLinks(meeting, repName);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Orbital Revestimentos//CRM//PT-BR",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${meeting.id}@orbitalrevestimentos.com.br`,
    `SEQUENCE:${sequence}`,
    method === "CANCEL" ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
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

function meetingEmailHtml(input: { message: string; googleCalendarUrl: string; googlePreferred: boolean; cancelled: boolean }) {
  const escapedMessage = input.message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  if (input.cancelled) {
    return `
      <div style="font-family:Inter,Arial,sans-serif;color:#1a1c1c;line-height:1.55;max-width:620px">
        <p>${escapedMessage}</p>
        <p style="font-size:13px;color:#74777f">O convite anexado (.ics) remove automaticamente esta reunião do seu calendário.</p>
      </div>`;
  }
  const primary = input.googlePreferred ? "Adicionar ao Google Calendar" : "Usar o arquivo .ics anexado";
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

// Best-effort notify. `new` fires once (guarded by invitees_notified_at);
// `reschedule`/`cancel` always fire (force). Never throws.
export async function notifyMeeting(
  db: SupabaseClient,
  meeting: MeetingRow,
  kind: NotifyKind = "new"
): Promise<void> {
  try {
    const invitees = Array.isArray(meeting.invitees) ? meeting.invitees : [];
    if (kind === "new" && meeting.invitees_notified_at) return;

    const method: "REQUEST" | "CANCEL" = kind === "cancel" ? "CANCEL" : "REQUEST";
    // SEQUENCE must increase for calendars to accept an update. Timestamp-based
    // so it's monotonic without tracking a counter.
    const sequence = kind === "new" ? 0 : Math.floor(Date.now() / 1000);
    const prefix = kind === "reschedule" ? "[Remarcada] " : kind === "cancel" ? "[Cancelada] " : "";
    const subject = kind === "reschedule"
      ? "Reunião remarcada — Orbital Revestimentos"
      : kind === "cancel"
        ? "Reunião cancelada — Orbital Revestimentos"
        : "Reunião agendada — Orbital Revestimentos";

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

    let resend: import("resend").Resend | null = null;
    if (process.env.RESEND_API_KEY) {
      try { resend = (await import("@/lib/resend")).getResend(); } catch { resend = null; }
    }

    const calendar = calendarLinks(meeting, repName);
    const emailRecipients: EmailRecipient[] = [];

    for (const inv of invitees) {
      const msg = prefix + meetingInviteMessage({ inviteeName: inv.name, title: meeting.title, whenLabel, location: meeting.location, repName });
      if (inv.phone && smclickConfigured()) {
        const tel = normalizePhone(inv.phone);
        if (tel) await sendText(tel, msg).catch(() => {});
      }
      addEmailRecipient(emailRecipients, { role: "partner", name: inv.name, phone: inv.phone, email: inv.email });
    }

    addEmailRecipient(emailRecipients, { role: "rep", name: repName || "Representante Orbital", phone: "", email: repEmail || "" });
    addEmailRecipient(emailRecipients, { role: "admin", name: "Admin Orbital", phone: "", email: ORBITAL_MEETING_EMAIL });

    if (resend) {
      for (const recipient of emailRecipients) {
        const googlePreferred = isGoogleEmail(recipient.email);
        const inviteeName = recipient.role === "partner" ? recipient.name : recipient.role === "rep" ? (repName || recipient.name) : "Admin Orbital";
        const msg = prefix + meetingInviteMessage({ inviteeName, title: meeting.title, whenLabel, location: meeting.location, repName });
        await resend.emails
          .send({
            from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
            to: recipient.email,
            subject,
            text: `${msg}\n\n${kind === "cancel"
              ? "O arquivo .ics anexado remove esta reunião do seu calendário."
              : googlePreferred
                ? `Adicionar ao Google Calendar: ${calendar.google}\n\nTambém anexamos um arquivo .ics para outros calendários.`
                : "Anexamos um arquivo .ics para adicionar esta reunião ao seu calendário."}`,
            html: meetingEmailHtml({ message: msg, googleCalendarUrl: calendar.google, googlePreferred, cancelled: kind === "cancel" }),
            attachments: [
              { filename: kind === "cancel" ? "cancelamento-orbital.ics" : "reuniao-orbital.ics", content: Buffer.from(makeIcs(meeting, recipient, repName, method, sequence)).toString("base64") },
            ],
          })
          .catch(() => {});
      }
    }

    if (smclickConfigured()) {
      const adminTel = adminWhatsappPhone();
      if (adminTel) {
        await sendText(
          adminTel,
          prefix + adminMeetingAlertMessage({
            repName, title: meeting.title, whenLabel, location: meeting.location,
            inviteeNames: invitees.map((i) => i.name).filter(Boolean),
          })
        ).catch(() => {});
      }
    }

    if (kind === "new") {
      await db.from("rep_meetings").update({ invitees_notified_at: new Date().toISOString() }).eq("id", meeting.id);
    }
  } catch (e) {
    console.error("[rep-meetings] notify failed", e instanceof Error ? e.message : e);
  }
}
