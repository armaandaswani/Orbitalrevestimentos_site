import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * People the WhatsApp assistant (Ste) serves land in the site CRM (owner, 31/10: "marca no CRM"):
 * - final clients → Leads (source whatsapp), with the status following Ste's journey stage;
 * - architects/designers → a prospect in the CEO's rep CRM (stage "novo_contato"); a meeting booked later
 *   (/api/atendente/reuniao) finds the same row by phone and moves it to "Reunião agendada".
 * Nothing goes through SM Click here (no contact pushed, no automation, no message): Ste is already talking
 * to the person on WhatsApp.
 * The status only moves when it is still the one Ste wrote last (prev_status): a status changed by hand in
 * the admin is never overwritten.
 *
 * Auth: Authorization: Bearer <ATENDENTE_API_TOKEN>.
 *   POST { name, phone, kind: "cliente" | "arquiteto", status?, prev_status?, summary?, conversation_link? }
 *        → { lead_id | crm_id, created, status_updated }
 */

const REP_EMAIL = process.env.ATENDENTE_MEETING_REP_EMAIL || "armaandaswani@icloud.com";
const STATUSES = new Set(["novo", "contatado", "em_negociacao", "orcamento", "ganho", "perdido"]);

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

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const phone = digits(body.phone);
  const name = String(body.name ?? "").trim() || phone;
  const summary = String(body.summary ?? "").trim().slice(0, 2000) || null;
  const link = String(body.conversation_link ?? "").trim();
  if (phone.length < 10) return NextResponse.json({ error: "phone é obrigatório." }, { status: 400 });
  const db = supabaseAdmin();

  if (body.kind === "arquiteto") {
    const { data: rep } = await db.from("sales_reps").select("id").ilike("email", REP_EMAIL).maybeSingle();
    const salesRepId = (rep as { id: string } | null)?.id;
    if (!salesRepId) return NextResponse.json({ error: `Representante não encontrado (${REP_EMAIL}).` }, { status: 500 });
    const { data: partners } = await db.from("partners").select("id, phone");
    const partnerId = (partners ?? []).find((p) => samePhone(p.phone, phone))?.id ?? null;
    const { data: rows } = await db.from("rep_partner_crm").select("id, partner_id, prospect_phone").eq("sales_rep_id", salesRepId);
    const found = (rows ?? []).find((r) => (partnerId && r.partner_id === partnerId) || (!r.partner_id && samePhone(r.prospect_phone, phone)));
    if (found) return NextResponse.json({ crm_id: found.id, created: false, status_updated: false });
    const insert: Record<string, unknown> = { sales_rep_id: salesRepId, stage: "novo_contato", first_contact_at: new Date().toISOString() };
    if (partnerId) insert.partner_id = partnerId;
    else Object.assign(insert, { prospect_name: name, prospect_phone: phone, prospect_profession: "Arquiteto(a)" });
    const { data: crm, error } = await db.from("rep_partner_crm").insert(insert).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await db.from("rep_partner_notes").insert({
      crm_id: crm.id, kind: "system", author: "Ste (IA)",
      body: ["Arquiteto(a) atendido(a) pela Ste no WhatsApp.", summary, link ? `Conversa: ${link}` : "", `WhatsApp: https://wa.me/${phone}`].filter(Boolean).join("\n"),
    });
    return NextResponse.json({ crm_id: crm.id, created: true, status_updated: false }, { status: 201 });
  }

  const status = STATUSES.has(String(body.status)) ? String(body.status) : "contatado";
  const prev = STATUSES.has(String(body.prev_status)) ? String(body.prev_status) : null;
  const { data: leads } = await db.from("leads").select("id, phone, status").not("phone", "is", null);
  const lead = (leads ?? []).find((l) => samePhone(l.phone, phone));
  const now = new Date().toISOString();

  if (!lead) {
    const { data: created, error } = await db.from("leads").insert({
      name, phone, source: "whatsapp", status, last_contacted_at: now,
      notes: ["Veio pelo WhatsApp da Ste (IA).", link ? `Conversa: ${link}` : ""].filter(Boolean).join("\n"),
      ...(summary ? { ai_summary: summary, ai_summary_at: now } : {}),
    }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await db.from("lead_notes").insert({ lead_id: created.id, kind: "ai", author: "Ste (IA)", body: `Lead criado pela Ste no WhatsApp (etapa: ${status}).` });
    return NextResponse.json({ lead_id: created.id, created: true, status_updated: true }, { status: 201 });
  }

  // Existing lead: Ste only moves the status it set itself (or the untouched "novo").
  const mayMove = lead.status !== status && (lead.status === prev || lead.status === "novo");
  const patch: Record<string, unknown> = { updated_at: now, last_contacted_at: now };
  if (mayMove) patch.status = status;
  if (summary) Object.assign(patch, { ai_summary: summary, ai_summary_at: now });
  await db.from("leads").update(patch).eq("id", lead.id);
  if (mayMove) await db.from("lead_notes").insert({ lead_id: lead.id, kind: "ai", author: "Ste (IA)", body: `Etapa atualizada pela Ste: ${lead.status} → ${status}.` });
  return NextResponse.json({ lead_id: lead.id, created: false, status_updated: mayMove, status: mayMove ? status : lead.status });
}
