import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import { matchArquiteto, normEmail, type CrmRow } from "@/lib/arquiteto-match";

/**
 * Meetings with architects land in the site CRM from two places:
 *  - source "ste" (default): presentations booked by the WhatsApp assistant (Ste);
 *  - source "agenda": meetings the owner creates by hand in Google Calendar (orbitalrevestimentos@gmail.com)
 *    with the architect as a guest. Ste reads the calendar and sends them here (owner, 04/11).
 * The guest e-mails are matched against the architects we know (partner → CRM prospect → professionals
 * sheet, see lib/arquiteto-match). The architect (or a new prospect) moves to "Reunião agendada" in the
 * CEO's rep CRM and the meeting shows up in the Agenda. The Google Calendar event already invited the
 * guests, so nobody is notified again from here.
 *
 * Auth: Authorization: Bearer <ATENDENTE_API_TOKEN>.
 *   POST { ref, name, phone?, email?, emails?, invitees?, profession?, start, end?, location?, notes?, calendar_link?, source? }
 *        → { meeting_id, crm_id, partner_id, match, created, updated }
 *        Same ref twice = same meeting: nothing duplicated; a new time/place updates the meeting.
 *   PATCH { ref, status: "cancelled" } → cancels the meeting booked under that ref
 * Rep: ATENDENTE_MEETING_REP_EMAIL (default: the CEO's rep record).
 */

const REP_EMAIL = process.env.ATENDENTE_MEETING_REP_EMAIL || "armaandaswani@icloud.com";
// Stages a booking can move forward from (an active partner stays active).
const MOVABLE = new Set(["novo_contato", "acompanhamento", "inativo", "reuniao_realizada"]);
const BASE_LABEL = { parceiro: "parceiro cadastrado", crm: "já estava no CRM", aniversarios: "planilha de profissionais", novo: "contato novo" } as const;

function authorized(req: NextRequest): boolean {
  const token = process.env.ATENDENTE_API_TOKEN;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || !given || token.length !== given.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(given));
}

const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");
const refTag = (ref: string) => `[ste:${ref}]`;
const whenText = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Manaus", dateStyle: "short", timeStyle: "short" });

async function repId(db: ReturnType<typeof supabaseAdmin>) {
  const { data } = await db.from("sales_reps").select("id").ilike("email", REP_EMAIL).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const ref = String(body.ref ?? "").trim();
  const fromAgenda = body.source === "agenda";
  const author = fromAgenda ? "Google Agenda" : "Ste (IA)";
  let name = String(body.name ?? "").trim();
  const start = new Date(String(body.start ?? ""));
  if (!ref || !name || Number.isNaN(start.getTime()))
    return NextResponse.json({ error: "ref, name e start são obrigatórios." }, { status: 400 });
  const end = body.end ? new Date(String(body.end)) : null;
  const minutes = end && !Number.isNaN(end.getTime()) ? Math.max(30, Math.round((end.getTime() - start.getTime()) / 60_000)) : 120;
  const location = String(body.location ?? "").trim() || null;
  const guests = (Array.isArray(body.invitees) ? body.invitees : [])
    .map((g) => ({ name: String((g as Record<string, unknown>)?.name ?? "").trim(), email: String((g as Record<string, unknown>)?.email ?? "").trim() }))
    .filter((g) => g.email);
  const emails = [...new Set([String(body.email ?? ""), ...(Array.isArray(body.emails) ? body.emails.map(String) : []), ...guests.map((g) => g.email)].map((e) => e.trim()).filter(Boolean))];

  const db = supabaseAdmin();
  const salesRepId = await repId(db);
  if (!salesRepId) return NextResponse.json({ error: `Representante não encontrado (${REP_EMAIL}).` }, { status: 500 });

  // Same booking sent twice (retry, or the calendar event was edited): keep one meeting, follow the new time/place.
  const { data: dup, error: dupErr } = await db.from("rep_meetings").select("id, crm_id, partner_id, scheduled_at, duration_minutes, location, status").ilike("notes", `%${refTag(ref)}%`).maybeSingle();
  if (dupErr && isMissingTable(dupErr)) return NextResponse.json({ error: "Rode a migração 019 (rep_meetings)." }, { status: 503 });
  if (dup) {
    const moved = new Date(dup.scheduled_at).getTime() !== start.getTime() || dup.duration_minutes !== minutes || (dup.location ?? null) !== location;
    const back = dup.status === "cancelled";
    if (moved || back) {
      await db.from("rep_meetings").update({ scheduled_at: start.toISOString(), duration_minutes: minutes, location, status: "scheduled", updated_at: new Date().toISOString() }).eq("id", dup.id);
      if (dup.crm_id) {
        if (back) await db.from("rep_partner_crm").update({ stage: "reuniao_agendada", meeting_id: dup.id, updated_at: new Date().toISOString() }).eq("id", dup.crm_id).eq("stage", "acompanhamento");
        await db.from("rep_partner_notes").insert({ crm_id: dup.crm_id, kind: "meeting", author, body: `${back ? "Reunião de volta na agenda" : "Reunião remarcada"}: ${whenText(start)}${location ? ` · ${location}` : ""}.` });
      }
    }
    return NextResponse.json({ meeting_id: dup.id, crm_id: dup.crm_id, partner_id: dup.partner_id, created: false, updated: moved || back });
  }

  // The team (reps) is never "the architect" of a meeting.
  if (fromAgenda) {
    const { data: team } = await db.from("sales_reps").select("email");
    const own = new Set((team ?? []).map((t) => normEmail(t.email)));
    const others = emails.filter((e) => !own.has(normEmail(e)));
    if (!others.length) return NextResponse.json({ skipped: "só a equipe na reunião", created: false, updated: false });
    emails.splice(0, emails.length, ...others);
  }

  // Who is it? The first guest found in our bases wins (partner → CRM prospect → professionals sheet).
  const { data: rows } = await db.from("rep_partner_crm").select("id, partner_id, stage, first_contact_at, prospect_name, prospect_phone, prospect_email").eq("sales_rep_id", salesRepId);
  const crmRows = (rows ?? []) as CrmRow[];
  const match = await matchArquiteto(db, emails, digits(body.phone), crmRows, name);
  const phone = digits(match.phone);
  const email = match.email;
  // A known architect's name beats the calendar title; a new guest keeps the name the owner typed.
  if (match.name) name = match.name;
  // Found in the professionals sheet without an e-mail: keep the one from the invite there too.
  let savedOnSheet = false;
  if (match.sheetId && !match.knownEmail && email) {
    const { error: sheetErr } = await db.from("aniversarios").update({ email, updated_at: new Date().toISOString() }).eq("id", match.sheetId).is("email", null);
    savedOnSheet = !sheetErr;
  }

  let crm = crmRows.find((r) => r.id === match.crmId);
  if (!crm) {
    const insert: Record<string, unknown> = { sales_rep_id: salesRepId, stage: "novo_contato", first_contact_at: new Date().toISOString() };
    if (match.partnerId) insert.partner_id = match.partnerId;
    else Object.assign(insert, { prospect_name: name, prospect_phone: phone || null, prospect_email: email, prospect_profession: match.profession || String(body.profession ?? "").trim() || "Arquiteto(a)" });
    const { data, error } = await db.from("rep_partner_crm").insert(insert).select("id, partner_id, stage, first_contact_at, prospect_name, prospect_phone, prospect_email").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    crm = data as CrmRow;
  } else if (!crm.partner_id && ((!crm.prospect_email && email) || (!crm.prospect_phone && phone))) {
    // Fill what the CRM prospect was missing (e-mail from the invite, phone from the sheet).
    await db.from("rep_partner_crm").update({ ...(!crm.prospect_email && email ? { prospect_email: email } : {}), ...(!crm.prospect_phone && phone ? { prospect_phone: phone } : {}) }).eq("id", crm.id);
  }

  const origin = fromAgenda ? "Criada na Google Agenda." : "Marcada pela Ste (IA).";
  const found = `Convidado: ${BASE_LABEL[match.base]}${match.ref ? ` (${match.ref})` : ""}${match.office ? ` · ${match.office}` : ""}${match.via === "nome" ? ", achado pelo nome" : ""}${savedOnSheet ? "; e-mail do convite salvo na planilha" : ""}${match.knownEmail && email && normEmail(match.knownEmail) !== normEmail(email) ? `; o cadastro tem outro e-mail (${match.knownEmail})` : ""}.`;
  const notes = [String(body.notes ?? "").trim(), found, body.calendar_link ? `Google Agenda: ${body.calendar_link}` : "", phone ? `WhatsApp: https://wa.me/${phone}` : "", `${origin} ${refTag(ref)}`].filter(Boolean).join("\n");
  const invitees = guests.length
    ? guests.map((g) => (g.email === email ? { name, phone, email: g.email } : { name: g.name, phone: "", email: g.email }))
    : [{ name, phone, email: email ?? "" }];
  const { data: meeting, error } = await db.from("rep_meetings").insert({
    sales_rep_id: salesRepId,
    partner_id: match.partnerId,
    crm_id: crm.id,
    title: fromAgenda ? `Reunião — ${name}` : `Apresentação Orbital — ${name}`,
    scheduled_at: start.toISOString(),
    duration_minutes: minutes,
    location,
    notes,
    invitees,
    // The invite already went out from Google Calendar: never notify again from here.
    invitees_notified_at: new Date().toISOString(),
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const patch: Record<string, unknown> = { meeting_id: meeting.id, updated_at: new Date().toISOString() };
  if (MOVABLE.has(crm.stage)) patch.stage = "reuniao_agendada";
  if (!crm.first_contact_at) patch.first_contact_at = new Date().toISOString();
  await db.from("rep_partner_crm").update(patch).eq("id", crm.id);
  const what = fromAgenda ? `Reunião criada na Google Agenda (${BASE_LABEL[match.base]})` : "Apresentação marcada pela Ste no WhatsApp";
  await db.from("rep_partner_notes").insert({ crm_id: crm.id, kind: "meeting", author, body: `${what}: ${whenText(start)}${location ? ` · ${location}` : ""}.` });

  return NextResponse.json({ meeting_id: meeting.id, crm_id: crm.id, partner_id: match.partnerId, match: match.base, via: match.via, created: true, updated: false }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const ref = String(body?.ref ?? "").trim();
  if (!ref || body?.status !== "cancelled") return NextResponse.json({ error: "ref e status=cancelled obrigatórios." }, { status: 400 });
  const author = body?.source === "agenda" ? "Google Agenda" : "Ste (IA)";
  const db = supabaseAdmin();
  const { data: m } = await db.from("rep_meetings").select("id, crm_id, status").ilike("notes", `%${refTag(ref)}%`).maybeSingle();
  if (!m) return NextResponse.json({ error: "reunião não encontrada" }, { status: 404 });
  if (m.status === "cancelled") return NextResponse.json({ ok: true });
  await db.from("rep_meetings").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", m.id);
  if (m.crm_id) {
    await db.from("rep_partner_crm").update({ stage: "acompanhamento", updated_at: new Date().toISOString() }).eq("id", m.crm_id).eq("stage", "reuniao_agendada");
    await db.from("rep_partner_notes").insert({ crm_id: m.crm_id, kind: "system", author, body: "Reunião cancelada." });
  }
  return NextResponse.json({ ok: true });
}
