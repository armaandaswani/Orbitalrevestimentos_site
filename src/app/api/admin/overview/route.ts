import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/admin/overview — the "Hoje" command-center feed: everything that
// needs the owner's attention, aggregated server-side in one round-trip.
// Each block is best-effort (a missing table/column from an unapplied
// migration yields an empty block, never a failed dashboard).
//
// Deliberately separate from the legacy /api/admin/dashboard (coupon-centric
// KPIs/trend), which keeps feeding the metrics section unchanged.

export const dynamic = "force-dynamic";

async function safe<T>(p: PromiseLike<T>, fallback: T): Promise<T> {
  try {
    const r = await p;
    return r ?? fallback;
  } catch {
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const nowIso = new Date().toISOString();
  const in7d = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const in7dDate = in7d.slice(0, 10);

  const [
    followupsRes,
    meetingsRes,
    productsRes,
    ordersRes,
    quotesExpiringRes,
    usesRes,
    pedidosCommRes,
    partnersPendingRes,
  ] = await Promise.all([
    // Overdue follow-ups: leads with a reminder due now or earlier, still open.
    safe(
      db
        .from("leads")
        .select("id, name, phone, status, next_reminder_at, reminder_note")
        .lte("next_reminder_at", nowIso)
        .not("status", "in", "(ganho,perdido)")
        .order("next_reminder_at", { ascending: true })
        .limit(50),
      { data: [] as Record<string, unknown>[] } as never
    ),
    // Upcoming rep meetings (next 7 days).
    safe(
      db
        .from("rep_meetings")
        .select("id, sales_rep_id, title, scheduled_at, location, status")
        .gte("scheduled_at", nowIso)
        .lte("scheduled_at", in7d)
        .order("scheduled_at", { ascending: true })
        .limit(20),
      { data: [] as Record<string, unknown>[] } as never
    ),
    // All active products (low-stock filter applied in code — the comparison
    // is between two columns, which PostgREST can't express directly).
    safe(
      db
        .from("products")
        .select("id, name, code, stock_on_hand, stock_reserved, reorder_point, is_active")
        .eq("is_active", true),
      { data: [] as Record<string, unknown>[] } as never
    ),
    // Orders in flight.
    safe(
      db
        .from("pedidos")
        .select("id, client_name, status, total, expected_delivery_at, created_at")
        .in("status", ["em_producao", "pronto"])
        .order("created_at", { ascending: false })
        .limit(50),
      { data: [] as Record<string, unknown>[] } as never
    ),
    // Quotes expiring within 7 days (pedidos still unpaid/pending with a
    // validity date coming up).
    safe(
      db
        .from("pedidos")
        .select("id, client_name, quote_valid_until, total, status")
        .lte("quote_valid_until", in7dDate)
        .in("status", ["em_producao"])
        .eq("payment_status", "pendente")
        .order("quote_valid_until", { ascending: true })
        .limit(20),
      { data: [] as Record<string, unknown>[] } as never
    ),
    // Unpaid coupon-side commissions.
    safe(
      db
        .from("coupon_uses")
        .select("id, commission_owed, sales_rep_commission_owed, partner_commission_paid_at, rep_commission_paid_at, sale_status")
        .eq("sale_status", "concluido"),
      { data: [] as Record<string, unknown>[] } as never
    ),
    // Unpaid order-side commissions (delivered orders).
    safe(
      db
        .from("pedidos")
        .select("id, partner_commission_amount, sales_rep_commission_amount, partner_commission_paid_at, sales_rep_commission_paid_at, status")
        .eq("status", "entregue"),
      { data: [] as Record<string, unknown>[] } as never
    ),
    safe(db.from("partners").select("id").eq("status", "pending"), { data: [] as Record<string, unknown>[] } as never),
  ]);

  const rows = (r: unknown): Record<string, unknown>[] =>
    (r as { data?: Record<string, unknown>[] } | null)?.data ?? [];

  // Resolve rep names for the meetings block.
  const meetings = rows(meetingsRes);
  let meetingsUpcoming: Record<string, unknown>[] = [];
  if (meetings.length > 0) {
    const repIds = [...new Set(meetings.map((m) => m.sales_rep_id as string).filter(Boolean))];
    const repsRes = await safe(db.from("sales_reps").select("id, name").in("id", repIds), { data: [] as Record<string, unknown>[] } as never);
    const nameById = new Map(rows(repsRes).map((r) => [r.id as string, r.name as string]));
    meetingsUpcoming = meetings.map((m) => ({ ...m, sales_rep_name: nameById.get(m.sales_rep_id as string) ?? null }));
  }

  const followups = rows(followupsRes);
  const lowStock = rows(productsRes).filter((p) => {
    const reorder = Number(p.reorder_point) || 0;
    if (reorder <= 0) return false;
    const available = (Number(p.stock_on_hand) || 0) - (Number(p.stock_reserved) || 0);
    return available <= reorder;
  });
  const ordersInFlight = rows(ordersRes);
  const quotesExpiring = rows(quotesExpiringRes);

  // Unpaid commissions: coupon side + order side (mirrors the Commissions tab
  // merge — see commissionRows in admin/page.tsx).
  let commissionsUnpaid = 0;
  for (const u of rows(usesRes)) {
    if (!u.partner_commission_paid_at) commissionsUnpaid += Number(u.commission_owed) || 0;
    if (!u.rep_commission_paid_at) commissionsUnpaid += Number(u.sales_rep_commission_owed) || 0;
  }
  for (const p of rows(pedidosCommRes)) {
    if (!p.partner_commission_paid_at) commissionsUnpaid += Number(p.partner_commission_amount) || 0;
    if (!p.sales_rep_commission_paid_at) commissionsUnpaid += Number(p.sales_rep_commission_amount) || 0;
  }

  return NextResponse.json({
    followupsOverdue: { count: followups.length, rows: followups.slice(0, 5) },
    meetingsUpcoming: { count: meetingsUpcoming.length, rows: meetingsUpcoming.slice(0, 5) },
    lowStock: {
      count: lowStock.length,
      rows: lowStock
        .map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          available: (Number(p.stock_on_hand) || 0) - (Number(p.stock_reserved) || 0),
          reorder_point: p.reorder_point,
        }))
        .slice(0, 5),
    },
    ordersInFlight: {
      count: ordersInFlight.length,
      emProducao: ordersInFlight.filter((o) => o.status === "em_producao").length,
      pronto: ordersInFlight.filter((o) => o.status === "pronto").length,
      rows: ordersInFlight.slice(0, 5),
    },
    quotesExpiring: { count: quotesExpiring.length, rows: quotesExpiring.slice(0, 5) },
    commissionsUnpaid,
    partnersPending: rows(partnersPendingRes).length,
  });
}
