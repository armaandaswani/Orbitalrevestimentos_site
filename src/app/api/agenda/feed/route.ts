import { NextRequest, NextResponse } from "next/server";
import { verifyAgendaFeedToken } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

/**
 * GET /api/agenda/feed?t=<token> — agenda comercial em formato iCal, para
 * assinar no Google Calendar ("Adicionar agenda → Do URL"). Reúne as reuniões
 * de todos os representantes e a agenda pessoal do admin. O link é secreto
 * (token assinado), porque o Google Calendar não envia cookie de sessão.
 */

const DIA = 24 * 60 * 60 * 1000;

interface Invitee { name?: string; phone?: string; email?: string }

function stamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function esc(s: string | null | undefined) {
  return (s || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// RFC 5545: linhas com mais de 75 octetos são dobradas (continuação começa com espaço).
function fold(line: string) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch, "utf8") > (parts.length ? 74 : 75)) {
      parts.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

function evento(input: {
  uid: string;
  start: Date;
  minutes: number;
  summary: string;
  description: string;
  location: string | null;
  cancelled: boolean;
  updated: Date;
}) {
  const end = new Date(input.start.getTime() + input.minutes * 60_000);
  return [
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `LAST-MODIFIED:${stamp(input.updated)}`,
    `DTSTART:${stamp(input.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(input.summary)}`,
    `DESCRIPTION:${esc(input.description)}`,
    input.location ? `LOCATION:${esc(input.location)}` : "",
    `STATUS:${input.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
  ].filter(Boolean);
}

export async function GET(req: NextRequest) {
  if (!verifyAgendaFeedToken(req.nextUrl.searchParams.get("t"))) {
    return NextResponse.json({ error: "Link inválido." }, { status: 401 });
  }

  const db = supabaseAdmin();
  const from = new Date(Date.now() - 90 * DIA).toISOString();
  const to = new Date(Date.now() + 365 * DIA).toISOString();

  const linhas: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Orbital Revestimentos//Agenda comercial//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Orbital — Agenda comercial",
    "X-WR-TIMEZONE:America/Manaus",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  const { data: reunioes, error } = await db
    .from("rep_meetings")
    .select("id, sales_rep_id, title, scheduled_at, duration_minutes, location, notes, invitees, status, updated_at, created_at")
    .gte("scheduled_at", from)
    .lte("scheduled_at", to)
    .order("scheduled_at", { ascending: true });
  if (error && !isMissingTable(error)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const repIds = [...new Set((reunioes ?? []).map((m) => m.sales_rep_id as string))];
  const nomes = new Map<string, string>();
  if (repIds.length) {
    const { data: reps } = await db.from("sales_reps").select("id, name").in("id", repIds);
    for (const r of reps ?? []) nomes.set(r.id as string, r.name as string);
  }

  for (const m of reunioes ?? []) {
    const rep = nomes.get(m.sales_rep_id as string) ?? "Representante";
    const convidados = (Array.isArray(m.invitees) ? (m.invitees as Invitee[]) : [])
      .filter((i) => i?.name)
      .map((i) => [i.name, i.phone, i.email].filter(Boolean).join(" · "));
    const descricao = [
      `Representante: ${rep}`,
      convidados.length ? `Convidados:\n${convidados.join("\n")}` : "",
      m.notes ? `Observações: ${m.notes}` : "",
      m.status === "completed" ? "Status: realizada" : "",
    ].filter(Boolean).join("\n\n");
    linhas.push(...evento({
      uid: `${m.id}@orbitalrevestimentos.com.br`,
      start: new Date(m.scheduled_at as string),
      minutes: (m.duration_minutes as number) || 60,
      summary: `${m.title} — ${rep}`,
      description: descricao,
      location: (m.location as string) || null,
      cancelled: m.status === "cancelled",
      updated: new Date((m.updated_at as string) || (m.created_at as string) || Date.now()),
    }));
  }

  // Agenda pessoal do admin (migração 040). Sem a tabela, segue só com as reuniões.
  const { data: eventos } = await db
    .from("admin_events")
    .select("id, title, scheduled_at, duration_minutes, location, notes, status, updated_at, created_at")
    .gte("scheduled_at", from)
    .lte("scheduled_at", to);
  for (const e of eventos ?? []) {
    linhas.push(...evento({
      uid: `admin-${e.id}@orbitalrevestimentos.com.br`,
      start: new Date(e.scheduled_at as string),
      minutes: (e.duration_minutes as number) || 60,
      summary: e.title as string,
      description: (e.notes as string) || "",
      location: (e.location as string) || null,
      cancelled: e.status === "cancelled",
      updated: new Date((e.updated_at as string) || (e.created_at as string) || Date.now()),
    }));
  }

  linhas.push("END:VCALENDAR");
  return new NextResponse(linhas.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="orbital-agenda.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
