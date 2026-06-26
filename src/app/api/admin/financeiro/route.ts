import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { isMissingTable } from "@/lib/db-compat";
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

  // Tax rates (% of revenue), editable via query params, defaulting to the
  // accountant's effective rates. ICMS is per-product (products.icms_rate);
  // these four federal taxes + operational costs are flat on revenue.
  const rate = (key: string, def: number) => {
    const v = Number(searchParams.get(key));
    return Number.isFinite(v) && v >= 0 ? v : def;
  };
  const PIS = rate("pis", 0.65), COFINS = rate("cofins", 3), IRPJ = rate("irpj", 1.2), CSLL = rate("csll", 1.08), OPEX = rate("opex", 7);
  const fedRate = (PIS + COFINS + IRPJ + CSLL) / 100;
  const opexRate = OPEX / 100;

  const sb = supabaseAdmin();
  const monthKey = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

  // 1) Completed orders in range.
  let completed: Array<{
    id: string;
    total: number | null;
    discount_amount?: number | null;
    freight_amount?: number | null;
    other_costs?: Array<{ amount?: number }>;
    delivered_at: string | null;
    created_at: string;
    client_name: string;
  }> = [];
  try {
    const { data } = await sb
      .from("pedidos")
      .select("id, total, discount_amount, freight_amount, other_costs, delivered_at, created_at, client_name, status")
      .eq("status", "entregue");
    completed = ((data ?? []) as typeof completed & Array<{ status: string }>).filter((p) => {
      const ts = new Date(p.delivered_at || p.created_at).getTime();
      return ts >= fromMs && ts <= toMs;
    });
  } catch { completed = []; }

  // 2) Line items → COGS + sale-price fallback per order.
  const ids = completed.map((p) => p.id);
  const cogsByOrder: Record<string, number> = {};
  const itemRevenueByOrder: Record<string, number> = {};
  const icmsByOrder: Record<string, number> = {}; // R$ ICMS per order (per-line, by product rate)
  const missingCostByOrder: Record<string, boolean> = {};
  const missingPriceByOrder: Record<string, boolean> = {};
  let ordersWithoutCost = 0;
  let ordersWithoutPrice = 0;
  if (ids.length > 0) {
    try {
      const { data: items } = await sb
        .from("pedido_items")
        .select("pedido_id, product_id, plates, unit_cost, unit_price")
        .in("pedido_id", ids);
      const rows = (items ?? []) as Array<{ pedido_id: string; product_id: string | null; plates: number; unit_cost: number | null; unit_price: number | null }>;
      // ICMS rate per product (0% for plates under substituição, 7% for PU-40…).
      const icmsByProduct: Record<string, number> = {};
      const itemProductIds = Array.from(new Set(rows.map((r) => r.product_id).filter(Boolean))) as string[];
      if (itemProductIds.length > 0) {
        const { data: ip } = await sb.from("products").select("id, icms_rate").in("id", itemProductIds);
        for (const p of (ip ?? []) as Array<{ id: string; icms_rate: number | null }>) icmsByProduct[p.id] = Number(p.icms_rate) || 0;
      }
      for (const it of rows) {
        const plates = it.plates || 0;
        if (it.unit_cost == null) missingCostByOrder[it.pedido_id] = true;
        if (it.unit_price == null) missingPriceByOrder[it.pedido_id] = true;
        const lineRev = plates * (Number(it.unit_price) || 0);
        cogsByOrder[it.pedido_id] = (cogsByOrder[it.pedido_id] ?? 0) + plates * (Number(it.unit_cost) || 0);
        itemRevenueByOrder[it.pedido_id] = (itemRevenueByOrder[it.pedido_id] ?? 0) + lineRev;
        const icmsRate = it.product_id ? (icmsByProduct[it.product_id] ?? 0) : 0;
        icmsByOrder[it.pedido_id] = (icmsByOrder[it.pedido_id] ?? 0) + lineRev * (icmsRate / 100);
      }
    } catch { /* no items table */ }
  }

  let revenue = 0, cogs = 0, orderCosts = 0, discounts = 0;
  let taxesTotal = 0, opexTotal = 0;
  let taxPis = 0, taxCofins = 0, taxIrpj = 0, taxCsll = 0, taxIcms = 0;
  const taxesByMonth: Record<string, number> = {};
  const opexByMonth: Record<string, number> = {};
  // Compute the per-order tax/opex breakdown and roll it into the accumulators.
  const taxFor = (rev: number, icms: number, when: string) => {
    const pis = rev * (PIS / 100), cofins = rev * (COFINS / 100), irpj = rev * (IRPJ / 100), csll = rev * (CSLL / 100);
    const total = pis + cofins + irpj + csll + icms;
    const opex = rev * opexRate;
    taxPis += pis; taxCofins += cofins; taxIrpj += irpj; taxCsll += csll; taxIcms += icms;
    taxesTotal += total; opexTotal += opex;
    const k = monthKey(when);
    taxesByMonth[k] = (taxesByMonth[k] ?? 0) + total;
    opexByMonth[k] = (opexByMonth[k] ?? 0) + opex;
    return { taxes: { pis, cofins, irpj, csll, icms, total }, opex };
  };
  const perOrder = completed.map((p) => {
    const manualRev = Number(p.total) || 0;
    const itemRev = itemRevenueByOrder[p.id] ?? 0;
    const discount = Math.max(0, Number(p.discount_amount) || 0);
    const freight = Math.max(0, Number(p.freight_amount) || 0);
    const rev = itemRev > 0 ? Math.max(0, itemRev - discount + freight) : manualRev;
    const c = cogsByOrder[p.id] ?? 0;
    const oc = Array.isArray(p.other_costs) ? p.other_costs.reduce((s, x) => s + (Number(x?.amount) || 0), 0) : 0;
    if (missingCostByOrder[p.id] || !(p.id in cogsByOrder)) ordersWithoutCost++;
    if (manualRev <= 0 && (missingPriceByOrder[p.id] || !(p.id in itemRevenueByOrder))) ordersWithoutPrice++;
    revenue += rev; cogs += c; orderCosts += oc; discounts += discount;
    const when = p.delivered_at || p.created_at;
    const { taxes, opex } = taxFor(rev, icmsByOrder[p.id] ?? 0, when);
    const profit = rev - c - oc - taxes.total - opex;
    return {
      id: p.id, client_name: p.client_name, when,
      revenue: rev, cogs: c, other_costs: oc, discount, freight, taxes, opex, profit,
      margin: rev > 0 ? Math.round((profit / rev) * 100) : 0,
      below_cost: rev > 0 && profit < 0,
    };
  });

  // 2b) Manual stock exits that carry financial meaning.
  // sale: off-order revenue + COGS. loss/sample/internal: stock expense only.
  let manualSales = 0;
  let inventoryLosses = 0;
  const inventoryLossesByMonth: Record<string, number> = {};
  try {
    const { data: moves, error: movesErr } = await sb
      .from("stock_movements")
      .select("id, product_id, on_hand_delta, reason, created_at, manual_exit_type, sale_amount")
      .eq("kind", "manual_out")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString());

    if (!movesErr) {
      const rows = (moves ?? []) as Array<{
        id: string;
        product_id: string;
        on_hand_delta: number;
        reason: string | null;
        created_at: string;
        manual_exit_type: "sale" | "loss" | "sample" | "internal" | null;
        sale_amount: number | null;
      }>;
      const productIds = Array.from(new Set(rows.map((m) => m.product_id).filter(Boolean)));
      const productsById: Record<string, { name: string; price: number | null; cost_price: number | null; icms_rate: number | null }> = {};
      if (productIds.length > 0) {
        const { data: prods } = await sb.from("products").select("id, name, price, cost_price, icms_rate").in("id", productIds);
        for (const p of (prods ?? []) as Array<{ id: string; name: string; price: number | null; cost_price: number | null; icms_rate: number | null }>) {
          productsById[p.id] = { name: p.name, price: p.price, cost_price: p.cost_price, icms_rate: p.icms_rate };
        }
      }
      for (const m of rows) {
        if (!m.manual_exit_type) continue;
        const qty = Math.abs(Number(m.on_hand_delta) || 0);
        const product = productsById[m.product_id];
        const stockCost = qty * (Number(product?.cost_price) || 0);
        if (m.manual_exit_type === "sale") {
          const sale = Number(m.sale_amount) || qty * (Number(product?.price) || 0);
          const icms = sale * ((Number(product?.icms_rate) || 0) / 100);
          const { taxes, opex } = taxFor(sale, icms, m.created_at);
          const profit = sale - stockCost - taxes.total - opex;
          manualSales += sale;
          revenue += sale;
          cogs += stockCost;
          perOrder.push({
            id: `stock-${m.id}`,
            client_name: `Venda avulsa${product?.name ? ` · ${product.name}` : ""}`,
            when: m.created_at,
            revenue: sale,
            cogs: stockCost,
            other_costs: 0,
            discount: 0,
            freight: 0,
            taxes,
            opex,
            profit,
            margin: sale > 0 ? Math.round((profit / sale) * 100) : 0,
            below_cost: sale > 0 && profit < 0,
          });
        } else {
          inventoryLosses += stockCost;
          const k = monthKey(m.created_at);
          inventoryLossesByMonth[k] = (inventoryLossesByMonth[k] ?? 0) + stockCost;
        }
      }
    }
  } catch { /* migration 029 may not be installed yet */ }

  // 2c) Commissions owed on concluded coupon/direct sales in this period.
  let partnerCommissions = 0;
  let repCommissions = 0;
  const commissionsByMonth: Record<string, number> = {};
  try {
    const { data: uses } = await sb
      .from("coupon_uses")
      .select("id, commission_owed, sales_rep_commission_owed, sale_status, created_at")
      .eq("sale_status", "concluido")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString());
    const rows = (uses ?? []) as Array<{
      id: string;
      commission_owed: number | null;
      sales_rep_commission_owed: number | null;
      created_at: string;
    }>;
    const useIds = rows.map((u) => u.id);
    const repByUse: Record<string, number> = {};
    if (useIds.length > 0) {
      const { data: splitRows, error: splitErr } = await sb
        .from("coupon_use_commissions")
        .select("coupon_use_id, commission_owed")
        .in("coupon_use_id", useIds);
      if (!splitErr || !isMissingTable(splitErr)) {
        for (const r of (splitRows ?? []) as Array<{ coupon_use_id: string; commission_owed: number | null }>) {
          repByUse[r.coupon_use_id] = (repByUse[r.coupon_use_id] ?? 0) + (Number(r.commission_owed) || 0);
        }
      }
    }
    for (const u of rows) {
      const partner = Number(u.commission_owed) || 0;
      const rep = repByUse[u.id] != null ? repByUse[u.id] : (Number(u.sales_rep_commission_owed) || 0);
      partnerCommissions += partner;
      repCommissions += rep;
      const total = partner + rep;
      const k = monthKey(u.created_at);
      commissionsByMonth[k] = (commissionsByMonth[k] ?? 0) + total;
    }
  } catch { /* commissions are best-effort */ }
  const commissions = partnerCommissions + repCommissions;

  // 3) Fixed costs — fetched here, charged per calendar month in the loop below.
  //    A MONTHLY cost hits IN FULL for every month the range touches (it does
  //    not get prorated by day count — "é mensal e pronto"). Weekly/daily are
  //    proportional to the days in the range.
  type FixedRow = { name: string; amount: number; cadence: string; weekday: number | null; started_at: string | null; ended_at: string | null };
  let fixedRows: FixedRow[] = [];
  try {
    const { data: fc } = await sb.from("fixed_costs").select("*").eq("active", true);
    fixedRows = (fc ?? []) as FixedRow[];
  } catch { /* no fixed_costs table */ }
  const fixedAccum: Record<string, { name: string; cadence: string; amount: number; prorated: number }> = {};
  // Count how many times a given weekday (0=Sun..6=Sat) falls in [a,b).
  const countWeekday = (a: number, b: number, wd: number): number => {
    if (b <= a) return 0;
    let n = 0;
    // Walk day by day (each bucket is at most one month) at local noon.
    for (let t = new Date(a).setHours(12, 0, 0, 0); t < b; t += DAY) {
      if (t >= a && new Date(t).getDay() === wd) n++;
    }
    return n;
  };
  const fixedContribution = (f: FixedRow, mStart: number, mEnd: number): number => {
    const cs = f.started_at ? new Date(f.started_at).getTime() : -Infinity;
    const ce = f.ended_at ? new Date(f.ended_at).getTime() : Infinity;
    const es = Math.max(mStart, cs), ee = Math.min(mEnd, ce);
    if (ee <= es) return 0;
    const amt = Number(f.amount) || 0;
    if (f.cadence === "monthly") return amt; // full amount per month, always
    if (f.cadence === "weekly") {
      // Charge the full amount on each occurrence of the chosen weekday. If no
      // weekday set (legacy), fall back to weeks ≈ days/7.
      if (typeof f.weekday === "number") return amt * countWeekday(es, ee, f.weekday);
      return amt * (((ee - es) / DAY) / 7);
    }
    return amt * ((ee - es) / DAY); // daily: full amount per day
  };

  // Monthly series for trend charts: bucket completed-order revenue/COGS/costs
  // by delivery month, and prorate each active fixed cost into each month.
  const monthMap: Record<string, { month: string; revenue: number; cogs: number; order_costs: number; fixed: number; commissions: number; inventory_losses: number; taxes: number; opex: number; net: number }> = {};
  for (const o of perOrder) {
    const k = monthKey(o.when);
    const m = (monthMap[k] ||= { month: k, revenue: 0, cogs: 0, order_costs: 0, fixed: 0, commissions: 0, inventory_losses: 0, taxes: 0, opex: 0, net: 0 });
    m.revenue += o.revenue; m.cogs += o.cogs; m.order_costs += o.other_costs;
  }
  // Enumerate every month in [from,to] so empty months still show on the chart.
  { const d = new Date(from.getFullYear(), from.getMonth(), 1); const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (d <= end) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const m = (monthMap[k] ||= { month: k, revenue: 0, cogs: 0, order_costs: 0, fixed: 0, commissions: 0, inventory_losses: 0, taxes: 0, opex: 0, net: 0 });
      const mStart = Math.max(fromMs, new Date(d.getFullYear(), d.getMonth(), 1).getTime());
      const mEnd = Math.min(toMs, new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime());
      const mDays = Math.max(0, (mEnd - mStart) / DAY);
      for (const f of fixedRows) {
        const c = fixedContribution(f, mStart, mEnd);
        if (c <= 0) continue;
        m.fixed += c;
        const k = `${f.name}|${f.cadence}|${f.amount}`;
        (fixedAccum[k] ||= { name: f.name, cadence: f.cadence, amount: Number(f.amount) || 0, prorated: 0 }).prorated += c;
      }
      void mDays;
      d.setMonth(d.getMonth() + 1);
    }
  }
  for (const [k, amount] of Object.entries(commissionsByMonth)) {
    const m = (monthMap[k] ||= { month: k, revenue: 0, cogs: 0, order_costs: 0, fixed: 0, commissions: 0, inventory_losses: 0, taxes: 0, opex: 0, net: 0 });
    m.commissions += amount;
  }
  for (const [k, amount] of Object.entries(inventoryLossesByMonth)) {
    const m = (monthMap[k] ||= { month: k, revenue: 0, cogs: 0, order_costs: 0, fixed: 0, commissions: 0, inventory_losses: 0, taxes: 0, opex: 0, net: 0 });
    m.inventory_losses += amount;
  }
  for (const [k, amount] of Object.entries(taxesByMonth)) {
    const m = (monthMap[k] ||= { month: k, revenue: 0, cogs: 0, order_costs: 0, fixed: 0, commissions: 0, inventory_losses: 0, taxes: 0, opex: 0, net: 0 });
    m.taxes += amount;
  }
  for (const [k, amount] of Object.entries(opexByMonth)) {
    const m = (monthMap[k] ||= { month: k, revenue: 0, cogs: 0, order_costs: 0, fixed: 0, commissions: 0, inventory_losses: 0, taxes: 0, opex: 0, net: 0 });
    m.opex += amount;
  }
  const monthly = Object.values(monthMap)
    .map((m) => ({ ...m, net: m.revenue - m.cogs - m.order_costs - m.taxes - m.opex - m.fixed - m.commissions - m.inventory_losses }))
    .sort((a, b) => a.month.localeCompare(b.month));
  const fixedTotal = monthly.reduce((s, m) => s + m.fixed, 0);
  const fixedBreakdown = Object.values(fixedAccum);

  // 4) Current stock valuation (point-in-time).
  let stockValue = 0;
  try {
    const { data: prods } = await sb.from("products").select("stock_on_hand, cost_price");
    for (const p of (prods ?? []) as Array<{ stock_on_hand: number; cost_price: number | null }>) {
      stockValue += (p.stock_on_hand || 0) * (Number(p.cost_price) || 0);
    }
  } catch { /* no stock columns */ }

  // Gross profit is after COGS + order costs + taxes + operational costs;
  // net profit additionally absorbs fixed costs, commissions and stock losses.
  const grossProfit = revenue - cogs - orderCosts - taxesTotal - opexTotal;
  const netProfit = grossProfit - fixedTotal - commissions - inventoryLosses;

  return NextResponse.json({
    range: { from: from.toISOString(), to: to.toISOString(), days: Math.round(rangeDays) },
    revenue,
    gross_revenue: revenue + discounts,
    discounts,
    cogs,
    order_costs: orderCosts,
    taxes: { pis: taxPis, cofins: taxCofins, irpj: taxIrpj, csll: taxCsll, icms: taxIcms, total: taxesTotal },
    tax_rates: { pis: PIS, cofins: COFINS, irpj: IRPJ, csll: CSLL, opex: OPEX },
    opex: opexTotal,
    gross_profit: grossProfit,
    gross_margin: revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0,
    fixed_costs: fixedTotal,
    fixed_breakdown: fixedBreakdown,
    commissions,
    partner_commissions: partnerCommissions,
    rep_commissions: repCommissions,
    manual_sales: manualSales,
    inventory_losses: inventoryLosses,
    net_profit: netProfit,
    net_margin: revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0,
    completed_count: completed.length,
    orders_without_cost: ordersWithoutCost,
    orders_without_price: ordersWithoutPrice,
    stock_value: stockValue,
    monthly,
    per_order: perOrder.sort((a, b) => b.revenue - a.revenue),
  });
}
