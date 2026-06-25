import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminRequest, repIdFromRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import { smclickConfigured, normalizePhone, sendText } from "@/lib/smclick";
import { meetingInviteMessage } from "@/lib/smclick-messages";

const MIGRATION_HINT = "Recurso indisponível — rode a migração 019 (rep_meetings) no Supabase.";

interface Invitee { name: string; phone: string; email: string }
interface MeetingRow {
  id: string;
  sales_rep_id: string;
  title: string;
  scheduled_at: string;
  location: string | null;
  invitees: Invitee[];
  invitees_notified_at?: string | null;
}

// Best-effort: notify every invitee of a freshly-scheduled meeting over WhatsApp
// (SM Click) and/or email (Resend), then stamp invitees_notified_at so we never
// double-notify. Never throws — invites are a nice-to-have, not a gate on the
// meeting being saved.
async function notifyInvitees(db: SupabaseClient, meeting: MeetingRow): Promise<void> {
  try {
    const invitees = Array.isArray(meeting.invitees) ? meeting.invitees : [];
    if (invitees.length === 0 || meeting.invitees_notified_at) return;

    let repName: string | null = null;
    try {
      const { data } = await db.from("sales_reps").select("name").eq("id", meeting.sales_rep_id).maybeSingle();
      repName = (data as { name?: string } | null)?.name ?? null;
    } catch { /* non-fatal */ }

    const whenLabel = new Date(meeting.scheduled_at).toLocaleString("pt-BR", {
      timeZone: "America/Manaus", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    // Resend throws if unconfigured — resolve it lazily and tolerate absence.
    let resend: import("resend").Resend | null = null;
    if (process.env.RESEND_API_KEY) {
      try { resend = (await import("@/lib/resend")).getResend(); } catch { resend = null; }
    }

    for (const inv of invitees) {
      const msg = meetingInviteMessage({
        inviteeName: inv.name, title: meeting.title, whenLabel, location: meeting.location, repName,
      });
      if (inv.phone && smclickConfigured()) {
        const tel = normalizePhone(inv.phone);
        if (tel) await sendText(tel, msg).catch(() => {});
      }
      if (inv.email && resend) {
        await resend.emails
          .send({
            from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
            to: inv.email,
            subject: "Reunião agendada — Orbital Revestimentos",
            text: msg,
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
