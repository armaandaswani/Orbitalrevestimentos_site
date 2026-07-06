import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/admin/reports?from=ISO&to=ISO — business intelligence over a range.
//
// Four reports, all derived from the same authoritative sources the P&L uses
// (delivered pedidos + their line items, the stock ledger), so numbers here
// reconcile with Financeiro:
//   1. Rentabilidade por produto — units/revenue/cost/profit/margin, ranked.
//   2. Vendas por mês — revenue + profit trend.
//   3. Vendas por parceiro / representante — attributed sales + margin.
//   4. Giro de estoque — consumption velocity → "acaba em X dias".
//
// Everything is best-effort: a missing migration yields an empty section, never
// a failed report.

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

async function safe<T>(p: PromiseLike<T>, fallback: T): Promise<T> {
  try {
    const r = await p;
    return r ?? fallback;
  } catch {
    return fallback;
  }
}

interface PedidoRow {
  id: string;
  total: number | null;
  discount_amount: number | null;
  freight_amount: number | null;
  freight_is_revenue: boolean | null;
  delivered_at: string | null;
  created_at: string;
  partner_id: string | null;
  partner_name: string | null;
  sales_rep_id: string | null;
  status: string;
}

interface ItemRow {
  pedido_id: string;
  product_id: string | null;
  product_name: string | null;
  plates: number | null;
  unit_cost: number | null;
  unit_price: number | null;
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1); // trailing 12 months
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const from = fromStr ? new Date(fromStr) : defFrom;
  const to = toStr ? new Date(toStr) : now;
  const fromMs = from.getTime();
  const toMs = to.getTime();

  // Velocity window: how many days of history to average consumption over.
  const velWindow = Math.max(7, Math.min(365, Number(searchParams.get("velocity_days")) || 90));

  const db = supabaseAdmin();

  // ── 1) Delivered orders in range + their line items ────────────────────────
  const delivered = (await safe(
    db
      .from("pedidos")
      .select("id, total, discount_amount, freight_amount, freight_is_revenue, delivered_at, created_at, partner_id, partner_name, sales_rep_id, status")
      .eq("status", "entregue"),
    { data: [] as PedidoRow[] } as never
  ) as { data: PedidoRow[] | null }).data ?? [];

  const inRange = delivered.filter((p) => {
    const ts = new Date(p.delivered_at || p.created_at).getTime();
    return ts >= fromMs && ts <= toMs;
  });
  const ids = inRange.map((p) => p.id);

  const items = ids.length
    ? (
        (await safe(
          db
            .from("pedido_items")
            .select("pedido_id, product_id, product_name, plates, unit_cost, unit_price")
            .in("pedido_id", ids),
          { data: [] as ItemRow[] } as never
        )) as { data: ItemRow[] | null }
      ).data ?? []
    : [];

  // Per-order item revenue/cost (line-based), so order-level revenue matches the
  // P&L definition: item revenue − discount (+ freight when it counts as revenue).
  const itemRevByOrder: Record<string, number> = {};
  const itemCostByOrder: Record<string, number> = {};
  for (const it of items) {
    const plates = Number(it.plates) || 0;
    itemRevByOrder[it.pedido_id] = (itemRevByOrder[it.pedido_id] ?? 0) + plates * (Number(it.unit_price) || 0);
    itemCostByOrder[it.pedido_id] = (itemCostByOrder[it.pedido_id] ?? 0) + plates * (Number(it.unit_cost) || 0);
  }

  const orderRevenue = (p: PedidoRow): number => {
    const itemRev = itemRevByOrder[p.id] ?? 0;
    const discount = Math.max(0, Number(p.discount_amount) || 0);
    const freight = Math.max(0, Number(p.freight_amount) || 0);
    const freightRev = p.freight_is_revenue ? freight : 0;
    return itemRev > 0
      ? Math.max(0, itemRev - discount + freightRev)
      : Math.max(0, (Number(p.total) || 0) - (p.freight_is_revenue ? 0 : freight));
  };

  // ── 2) Rentabilidade por produto (line items, delivered orders) ────────────
  const prodAgg: Record<string, { name: string; units: number; revenue: number; cost: number; orders: Set<string> }> = {};
  for (const it of items) {
    const key = (it.product_id as string) || `name:${it.product_name || "—"}`;
    const plates = Number(it.plates) || 0;
    const a = (prodAgg[key] ||= { name: it.product_name || "—", units: 0, revenue: 0, cost: 0, orders: new Set() });
    a.units += plates;
    a.revenue += plates * (Number(it.unit_price) || 0);
    a.cost += plates * (Number(it.unit_cost) || 0);
    a.orders.add(it.pedido_id);
  }
  const byProduct = Object.entries(prodAgg)
    .map(([id, a]) => {
      const profit = a.revenue - a.cost;
      return {
        product_id: id.startsWith("name:") ? null : id,
        name: a.name,
        units: a.units,
        orders: a.orders.size,
        revenue: a.revenue,
        cost: a.cost,
        profit,
        margin: a.revenue > 0 ? Math.round((profit / a.revenue) * 100) : 0,
      };
    })
    .sort((x, y) => y.profit - x.profit);

  // ── 3) Vendas por mês ──────────────────────────────────────────────────────
  const monthAgg: Record<string, { month: string; revenue: number; cost: number; orders: number }> = {};
  // Seed every month in the window so gaps render as zero.
  {
    const d = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (d <= end) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthAgg[k] = { month: k, revenue: 0, cost: 0, orders: 0 };
      d.setMonth(d.getMonth() + 1);
    }
  }
  for (const p of inRange) {
    const k = monthKey(p.delivered_at || p.created_at);
    const m = (monthAgg[k] ||= { month: k, revenue: 0, cost: 0, orders: 0 });
    m.revenue += orderRevenue(p);
    m.cost += itemCostByOrder[p.id] ?? 0;
    m.orders += 1;
  }
  const byMonth = Object.values(monthAgg)
    .map((m) => ({ ...m, profit: m.revenue - m.cost }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // ── 4) Vendas por parceiro / representante ─────────────────────────────────
  // Resolve rep names (partner name is snapshotted on the order already).
  const repIds = Array.from(new Set(inRange.map((p) => p.sales_rep_id).filter(Boolean))) as string[];
  const repNameById: Record<string, string> = {};
  if (repIds.length) {
    const reps = ((await safe(db.from("sales_reps").select("id, name").in("id", repIds), { data: [] } as never)) as { data: Array<{ id: string; name: string }> | null }).data ?? [];
    for (const r of reps) repNameById[r.id] = r.name;
  }

  const partnerAgg: Record<string, { name: string; revenue: number; cost: number; orders: number }> = {};
  const repAgg: Record<string, { name: string; revenue: number; cost: number; orders: number }> = {};
  for (const p of inRange) {
    const rev = orderRevenue(p);
    const cost = itemCostByOrder[p.id] ?? 0;
    const pKey = p.partner_id || (p.partner_name ? `name:${p.partner_name}` : "__direct__");
    const pName = p.partner_name || (p.partner_id ? "Parceiro" : "Venda direta");
    const pa = (partnerAgg[pKey] ||= { name: pName, revenue: 0, cost: 0, orders: 0 });
    pa.revenue += rev; pa.cost += cost; pa.orders += 1;

    if (p.sales_rep_id) {
      const ra = (repAgg[p.sales_rep_id] ||= { name: repNameById[p.sales_rep_id] || "Representante", revenue: 0, cost: 0, orders: 0 });
      ra.revenue += rev; ra.cost += cost; ra.orders += 1;
    }
  }
  const toRanked = (agg: Record<string, { name: string; revenue: number; cost: number; orders: number }>) =>
    Object.values(agg)
      .map((a) => ({ ...a, profit: a.revenue - a.cost, margin: a.revenue > 0 ? Math.round(((a.revenue - a.cost) / a.revenue) * 100) : 0 }))
      .sort((x, y) => y.revenue - x.revenue);
  const byPartner = toRanked(partnerAgg);
  const byRep = toRanked(repAgg);

  // ── 5) Giro de estoque (consumption velocity) ──────────────────────────────
  const velFrom = new Date(Date.now() - velWindow * DAY).toISOString();
  const moves = ((await safe(
    db
      .from("stock_movements")
      .select("product_id, kind, on_hand_delta, created_at")
      .in("kind", ["consume", "manual_out"])
      .gte("created_at", velFrom),
    { data: [] } as never
  )) as { data: Array<{ product_id: string; kind: string; on_hand_delta: number; created_at: string }> | null }).data ?? [];

  const consumedByProduct: Record<string, number> = {};
  for (const m of moves) {
    if (!m.product_id) continue;
    consumedByProduct[m.product_id] = (consumedByProduct[m.product_id] ?? 0) + Math.abs(Number(m.on_hand_delta) || 0);
  }

  const products = ((await safe(
    db.from("products").select("id, name, code, sale_unit, stock_on_hand, reorder_point"),
    { data: [] } as never
  )) as { data: Array<{ id: string; name: string; code: string | null; sale_unit: string | null; stock_on_hand: number | null; reorder_point: number | null }> | null }).data ?? [];

  const velocity = products
    .map((p) => {
      const consumed = consumedByProduct[p.id] ?? 0;
      const perDay = consumed / velWindow;
      const onHand = Number(p.stock_on_hand) || 0;
      // Days until stock hits zero at the current rate. null = no movement (idle).
      const daysToEmpty = perDay > 0 ? Math.round(onHand / perDay) : null;
      return {
        product_id: p.id,
        name: p.name,
        code: p.code,
        unit: p.sale_unit || "un",
        on_hand: onHand,
        reorder_point: Number(p.reorder_point) || 0,
        consumed_window: consumed,
        per_day: Math.round(perDay * 100) / 100,
        days_to_empty: daysToEmpty,
      };
    })
    // Surface the ones actually moving first, soonest-to-run-out at the top.
    .filter((v) => v.consumed_window > 0 || v.on_hand > 0)
    .sort((a, b) => {
      if (a.days_to_empty == null && b.days_to_empty == null) return b.consumed_window - a.consumed_window;
      if (a.days_to_empty == null) return 1;
      if (b.days_to_empty == null) return -1;
      return a.days_to_empty - b.days_to_empty;
    });

  // Totals for the header KPIs.
  const totalRevenue = inRange.reduce((s, p) => s + orderRevenue(p), 0);
  const totalCost = inRange.reduce((s, p) => s + (itemCostByOrder[p.id] ?? 0), 0);

  return NextResponse.json({
    range: { from: from.toISOString(), to: to.toISOString(), velocity_days: velWindow },
    totals: {
      orders: inRange.length,
      revenue: totalRevenue,
      cost: totalCost,
      profit: totalRevenue - totalCost,
      margin: totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100) : 0,
    },
    by_product: byProduct,
    by_month: byMonth,
    by_partner: byPartner,
    by_rep: byRep,
    velocity,
  });
}
