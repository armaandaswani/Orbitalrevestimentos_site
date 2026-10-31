import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

/**
 * Presentations booked by the WhatsApp assistant (Ste) with architects land in the site CRM:
 * the architect (registered partner, or a prospect when not registered yet) moves to "Reunião agendada"
 * in the CEO's rep CRM and the meeting shows up in the Agenda. The Google Calendar event (with the invite
 * to the architect) is created by Ste; here nobody is notified again, so the architect never gets a
 * second invite from another number.
 *
 * Auth: Authorization: Bearer <ATENDENTE_API_TOKEN>.
 *   POST { ref, name, phone, email?, profession?, start, end?, location?, notes?, calendar_link? }
 *        → { meeting_id, crm_id, partner_id, created } (same ref twice = same meeting, nothing duplicated)
 *   PATCH { ref, status: "cancelled" } → cancels the meeting booked under that ref
 * Rep: ATENDENTE_MEETING_REP_EMAIL (default: the CEO's rep record).
 */

const REP_EMAIL = process.env.ATENDENTE_MEETING_REP_EMAIL || "armaandaswani@icloud.com";
// Stages a booking can move forward from (an active partner stays active).
const MOVABLE = new Set(["novo_contato", "acompanhamento", "inativo", "reuniao_realizada"]);

function authorized(req: NextRequest): boolean {
  const token = process.env.ATENDENTE_API_TOKEN;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || !given || token.length !== given.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(given));
}

const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");
// Brazilian numbers come with or without 55 and the 9th digit: compare the last 8.
const samePhone = (a: unknown, b: unknown) => {
  const x = digits(a), y = digits(b);
  return x.length >= 8 && y.length >= 8 && x.slice(-8) === y.slice(-8);
};
const refTag = (ref: string) => `[ste:${ref}]`;

async function repId(db: ReturnType<typeof supabaseAdmin>) {
  const { data } = await db.from("sales_reps").select("id").ilike("email", REP_EMAIL).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const ref = String(body.ref ?? "").trim();
  const name = String(body.name ?? "").trim();
  const phone = digits(body.phone);
  const email = String(body.email ?? "").trim() || null;
  const start = new Date(String(body.start ?? ""));
  if (!ref || !name || Number.isNaN(start.getTime()))
    return NextResponse.json({ error: "ref, name e start são obrigatórios." }, { status: 400 });
  const end = body.end ? new Date(String(body.end)) : null;
  const minutes = end && !Number.isNaN(end.getTime()) ? Math.max(30, Math.round((end.getTime() - start.getTime()) / 60_000)) : 120;

  const db = supabaseAdmin();
  const salesRepId = await repId(db);
  if (!salesRepId) return NextResponse.json({ error: `Representante não encontrado (${REP_EMAIL}).` }, { status: 500 });

  // Same booking sent twice (retry): return the meeting already created.
  const { data: dup, error: dupErr } = await db.from("rep_meetings").select("id, crm_id, partner_id").ilike("notes", `%${refTag(ref)}%`).maybeSingle();
  if (dupErr && isMissingTable(dupErr)) return NextResponse.json({ error: "Rode a migração 019 (rep_meetings)." }, { status: 503 });
  if (dup) return NextResponse.json({ meeting_id: dup.id, crm_id: dup.crm_id, partner_id: dup.partner_id, created: false });

  // Registered partner with this phone or e-mail?
  let partnerId: string | null = null;
  if (phone || email) {
    const { data: partners } = await db.from("partners").select("id, phone, email");
    const p = (partners ?? []).find((x) => (phone && samePhone(x.phone, phone)) || (email && x.email && x.email.toLowerCase() === email.toLowerCase()));
    partnerId = p?.id ?? null;
  }

  // The CRM relationship: by partner, else a prospect with the same phone/e-mail, else a new prospect.
  const { data: rows } = await db.from("rep_partner_crm").select("id, partner_id, stage, first_contact_at, prospect_phone, prospect_email").eq("sales_rep_id", salesRepId);
  let crm = (rows ?? []).find((r) => partnerId && r.partner_id === partnerId)
    ?? (rows ?? []).find((r) => !r.partner_id && ((phone && samePhone(r.prospect_phone, phone)) || (email && r.prospect_email?.toLowerCase() === email.toLowerCase())));
  if (!crm) {
    const insert: Record<string, unknown> = { sales_rep_id: salesRepId, stage: "novo_contato", first_contact_at: new Date().toISOString() };
    if (partnerId) insert.partner_id = partnerId;
    else Object.assign(insert, { prospect_name: name, prospect_phone: phone || null, prospect_email: email, prospect_profession: String(body.profession ?? "").trim() || "Arquiteto(a)" });
    const { data, error } = await db.from("rep_partner_crm").insert(insert).select("id, partner_id, stage, first_contact_at, prospect_phone, prospect_email").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    crm = data;
  }

  const location = String(body.location ?? "").trim() || null;
  const notes = [String(body.notes ?? "").trim(), body.calendar_link ? `Google Agenda: ${body.calendar_link}` : "", phone ? `WhatsApp: https://wa.me/${phone}` : "", `Marcada pela Ste (IA). ${refTag(ref)}`].filter(Boolean).join("\n");
  const { data: meeting, error } = await db.from("rep_meetings").insert({
    sales_rep_id: salesRepId,
    partner_id: partnerId,
    crm_id: crm!.id,
    title: `Apresentação Orbital — ${name}`,
    scheduled_at: start.toISOString(),
    duration_minutes: minutes,
    location,
    notes,
    invitees: [{ name, phone, email: email ?? "" }],
    // The invite already went out from Google Calendar: never notify again from here.
    invitees_notified_at: new Date().toISOString(),
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const patch: Record<string, unknown> = { meeting_id: meeting.id, updated_at: new Date().toISOString() };
  if (MOVABLE.has(crm!.stage)) patch.stage = "reuniao_agendada";
  if (!crm!.first_contact_at) patch.first_contact_at = new Date().toISOString();
  await db.from("rep_partner_crm").update(patch).eq("id", crm!.id);
  const when = start.toLocaleString("pt-BR", { timeZone: "America/Manaus", dateStyle: "short", timeStyle: "short" });
  await db.from("rep_partner_notes").insert({ crm_id: crm!.id, kind: "meeting", author: "Ste (IA)", body: `Apresentação marcada pela Ste no WhatsApp: ${when}${location ? ` · ${location}` : ""}.` });

  return NextResponse.json({ meeting_id: meeting.id, crm_id: crm!.id, partner_id: partnerId, created: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const ref = String(body?.ref ?? "").trim();
  if (!ref || body?.status !== "cancelled") return NextResponse.json({ error: "ref e status=cancelled obrigatórios." }, { status: 400 });
  const db = supabaseAdmin();
  const { data: m } = await db.from("rep_meetings").select("id, crm_id").ilike("notes", `%${refTag(ref)}%`).maybeSingle();
  if (!m) return NextResponse.json({ error: "reunião não encontrada" }, { status: 404 });
  await db.from("rep_meetings").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", m.id);
  if (m.crm_id) {
    await db.from("rep_partner_crm").update({ stage: "acompanhamento", updated_at: new Date().toISOString() }).eq("id", m.crm_id).eq("stage", "reuniao_agendada");
    await db.from("rep_partner_notes").insert({ crm_id: m.crm_id, kind: "system", author: "Ste (IA)", body: "Apresentação cancelada." });
  }
  return NextResponse.json({ ok: true });
}
