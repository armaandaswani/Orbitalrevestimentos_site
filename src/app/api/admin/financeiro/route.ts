import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/admin/financeiro?from=ISO&to=ISO — P&L over a date range.
//
// Revenue is recognised when an order is DELIVERED (entregue) within the range
// (by delivered_at, falling back to created_at). COGS comes from the order's
// line items (plates × unit_cost snapshot). Per-order extra costs come from
// pedidos.other_costs. Fixed recurring costs are prorated across the range by
// converting each to a daily equivalent. Everything is best-effort so a missing
// migration 023 yields zeros rather than an error.

const DAY = 86_400_000;

function dailyEquivalent(amount: number, cadence: string): number {
  if (cadence === "daily") return amount;
  if (cadence === "weekly") return amount / 7;
  return amount / 30; // monthly
}

function clampDays(rangeStart: number, rangeEnd: number, costStart: number, costEnd: number): number {
  const s = Math.max(rangeStart, costStart);
  const e = Math.min(rangeEnd, costEnd);
  if (e <= s) return 0;
  return (e - s) / DAY;
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const from = fromStr ? new Date(fromStr) : defFrom;
  const to = toStr ? new Date(toStr) : now;
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const rangeDays = Math.max(1, (toMs - fromMs) / DAY);

  const sb = supabaseAdmin();

  // 1) Completed orders in range.
  let completed: Array<{ id: string; total: number | null; other_costs?: Array<{ amount?: number }>; delivered_at: string | null; created_at: string; client_name: string }> = [];
  try {
    const { data } = await sb
      .from("pedidos")
      .select("id, total, other_costs, delivered_at, created_at, client_name, status")
      .eq("status", "entregue");
    completed = ((data ?? []) as typeof completed & Array<{ status: string }>).filter((p) => {
      const ts = new Date(p.delivered_at || p.created_at).getTime();
      return ts >= fromMs && ts <= toMs;
    });
  } catch { completed = []; }

  // 2) Line items → COGS per order.
  const ids = completed.map((p) => p.id);
  const cogsByOrder: Record<string, number> = {};
  let ordersWithoutCost = 0;
  if (ids.length > 0) {
    try {
      const { data: items } = await sb
        .from("pedido_items")
        .select("pedido_id, plates, unit_cost")
        .in("pedido_id", ids);
      for (const it of (items ?? []) as Array<{ pedido_id: string; plates: number; unit_cost: number | null }>) {
        cogsByOrder[it.pedido_id] = (cogsByOrder[it.pedido_id] ?? 0) + (it.plates || 0) * (Number(it.unit_cost) || 0);
      }
    } catch { /* no items table */ }
  }

  let revenue = 0, cogs = 0, orderCosts = 0;
  const perOrder = completed.map((p) => {
    const rev = Number(p.total) || 0;
    const c = cogsByOrder[p.id] ?? 0;
    const oc = Array.isArray(p.other_costs) ? p.other_costs.reduce((s, x) => s + (Number(x?.amount) || 0), 0) : 0;
    if (!(p.id in cogsByOrder)) ordersWithoutCost++;
    revenue += rev; cogs += c; orderCosts += oc;
    const profit = rev - c - oc;
    return {
      id: p.id, client_name: p.client_name, when: p.delivered_at || p.created_at,
      revenue: rev, cogs: c, other_costs: oc, profit,
      margin: rev > 0 ? Math.round((profit / rev) * 100) : 0,
      below_cost: rev > 0 && profit < 0,
    };
  });

  // 3) Fixed costs prorated across the range.
  let fixedTotal = 0;
  const fixedBreakdown: Array<{ name: string; cadence: string; amount: number; prorated: number }> = [];
  try {
    const { data: fc } = await sb.from("fixed_costs").select("*").eq("active", true);
    for (const f of (fc ?? []) as Array<{ name: string; amount: number; cadence: string; started_at: string | null; ended_at: string | null }>) {
      const cs = f.started_at ? new Date(f.started_at).getTime() : -Infinity;
      const ce = f.ended_at ? new Date(f.ended_at).getTime() : Infinity;
      const days = f.started_at || f.ended_at ? clampDays(fromMs, toMs, cs, ce) : rangeDays;
      const prorated = dailyEquivalent(Number(f.amount) || 0, f.cadence) * days;
      fixedTotal += prorated;
      fixedBreakdown.push({ name: f.name, cadence: f.cadence, amount: Number(f.amount) || 0, prorated });
    }
  } catch { /* no fixed_costs table */ }

  // 4) Current stock valuation (point-in-time).
  let stockValue = 0;
  try {
    const { data: prods } = await sb.from("products").select("stock_on_hand, cost_price");
    for (const p of (prods ?? []) as Array<{ stock_on_hand: number; cost_price: number | null }>) {
      stockValue += (p.stock_on_hand || 0) * (Number(p.cost_price) || 0);
    }
  } catch { /* no stock columns */ }

  const grossProfit = revenue - cogs - orderCosts;
  const netProfit = grossProfit - fixedTotal;

  return NextResponse.json({
    range: { from: from.toISOString(), to: to.toISOString(), days: Math.round(rangeDays) },
    revenue,
    cogs,
    order_costs: orderCosts,
    gross_profit: grossProfit,
    gross_margin: revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0,
    fixed_costs: fixedTotal,
    fixed_breakdown: fixedBreakdown,
    net_profit: netProfit,
    net_margin: revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0,
    completed_count: completed.length,
    orders_without_cost: ordersWithoutCost,
    stock_value: stockValue,
    per_order: perOrder.sort((a, b) => b.revenue - a.revenue),
  });
}
