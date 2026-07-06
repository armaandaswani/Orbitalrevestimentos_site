"use client";

import React, { useState, useEffect, useCallback } from "react";

interface TaxBreakdown { pis: number; cofins: number; irpj: number; csll: number; icms: number; total: number }
interface PerOrder {
  id: string; client_name: string; when: string;
  revenue: number; cogs: number; other_costs: number; discount?: number; freight?: number;
  freight_is_revenue?: boolean; freight_revenue?: number;
  taxes?: TaxBreakdown; opex?: number; profit: number; margin: number; below_cost: boolean;
}
interface FixedBreakdown { name: string; cadence: string; amount: number; prorated: number }
interface MonthPoint { month: string; revenue: number; cogs: number; order_costs: number; fixed: number; commissions?: number; inventory_losses?: number; taxes?: number; opex?: number; net: number }
interface PnL {
  range: { from: string; to: string; days: number };
  revenue: number; gross_revenue?: number; discounts?: number; cogs: number; order_costs: number;
  taxes?: TaxBreakdown; opex?: number; tax_rates?: { pis: number; cofins: number; irpj: number; csll: number; opex: number };
  gross_profit: number; gross_margin: number;
  fixed_costs: number; fixed_breakdown: FixedBreakdown[];
  commissions?: number; partner_commissions?: number; rep_commissions?: number; manual_sales?: number; inventory_losses?: number;
  net_profit: number; net_margin: number;
  completed_count: number; sales_count?: number; orders_without_cost: number; orders_without_price: number; stock_value: number;
  monthly?: MonthPoint[];
  per_order: PerOrder[];
}
interface FixedCost {
  id: string; name: string; amount: number; cadence: "daily" | "weekly" | "monthly"; active: boolean;
  weekday: number | null; month_day: number | null; started_at: string | null; ended_at: string | null; notes: string | null;
}

const CADENCE_LABEL: Record<string, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" };
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtDate(s: string) { return new Date(s).toLocaleDateString("pt-BR"); }
function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

export default function FinanceiroTab() {
  const today = new Date();
  const [from, setFrom] = useState(ymd(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(ymd(today));
  const [pnl, setPnl] = useState<PnL | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixed, setFixed] = useState<FixedCost[]>([]);
  const [openTax, setOpenTax] = useState<string | null>(null); // per-order tax breakdown row

  const fetchPnl = useCallback(async () => {
    setLoading(true);
    const f = new Date(`${from}T00:00:00`).toISOString();
    const t = new Date(`${to}T23:59:59`).toISOString();
    const res = await fetch(`/api/admin/financeiro?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`);
    if (res.ok) setPnl(await res.json());
    setLoading(false);
  }, [from, to]);

  const fetchFixed = useCallback(async () => {
    const res = await fetch("/api/admin/fixed-costs");
    if (res.ok) setFixed(await res.json());
  }, []);

  useEffect(() => { fetchPnl(); }, [fetchPnl]);
  useEffect(() => { fetchFixed(); }, [fetchFixed]);

  function preset(which: "this_month" | "last_month" | "year") {
    const n = new Date();
    if (which === "this_month") { setFrom(ymd(new Date(n.getFullYear(), n.getMonth(), 1))); setTo(ymd(n)); }
    else if (which === "last_month") { setFrom(ymd(new Date(n.getFullYear(), n.getMonth() - 1, 1))); setTo(ymd(new Date(n.getFullYear(), n.getMonth(), 0))); }
    else { setFrom(ymd(new Date(n.getFullYear(), 0, 1))); setTo(ymd(n)); }
  }

  // ── Fixed cost form ──
  const [fName, setFName] = useState("");
  const [fAmount, setFAmount] = useState("");
  const [fCadence, setFCadence] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [fWeekday, setFWeekday] = useState(3); // default quarta
  const [fMonthDay, setFMonthDay] = useState(1);
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);
  const [editFixed, setEditFixed] = useState<Partial<FixedCost>>({});

  function resetEditFixed() {
    setEditingFixedId(null);
    setEditFixed({});
  }

  function startEditFixed(c: FixedCost) {
    setEditingFixedId(c.id);
    setEditFixed({
      name: c.name,
      amount: c.amount,
      cadence: c.cadence,
      weekday: c.weekday ?? 3,
      month_day: c.month_day ?? 1,
      active: c.active,
      notes: c.notes,
    });
  }

  function cadenceDetail(c: Pick<FixedCost, "cadence" | "weekday" | "month_day">) {
    if (c.cadence === "weekly") return c.weekday != null ? ` (${WEEKDAYS[c.weekday]})` : " (sem dia definido)";
    if (c.cadence === "monthly") return c.month_day != null ? ` (dia ${c.month_day})` : " (dia 1)";
    return "";
  }

  async function addFixed() {
    const amount = Number(fAmount);
    if (!fName.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const res = await fetch("/api/admin/fixed-costs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fName.trim(),
        amount,
        cadence: fCadence,
        weekday: fCadence === "weekly" ? fWeekday : undefined,
        month_day: fCadence === "monthly" ? fMonthDay : undefined,
      }),
    });
    if (res.ok) { setFName(""); setFAmount(""); fetchFixed(); fetchPnl(); }
    else { const j = await res.json().catch(() => null); alert(j?.error || "Falha ao adicionar."); }
  }
  async function saveFixedEdit(c: FixedCost) {
    const cadence = (editFixed.cadence ?? c.cadence) as FixedCost["cadence"];
    const amount = Number(editFixed.amount);
    const payload = {
      name: String(editFixed.name ?? c.name).trim(),
      amount,
      cadence,
      weekday: cadence === "weekly" ? Number(editFixed.weekday ?? c.weekday ?? 3) : null,
      month_day: cadence === "monthly" ? Number(editFixed.month_day ?? c.month_day ?? 1) : null,
      notes: typeof editFixed.notes === "string" ? editFixed.notes : c.notes,
    };
    if (!payload.name || !Number.isFinite(payload.amount) || payload.amount < 0) return;
    const res = await fetch(`/api/admin/fixed-costs/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      alert(j?.error || "Falha ao editar.");
      return;
    }
    resetEditFixed();
    fetchFixed();
    fetchPnl();
  }
  async function toggleFixed(c: FixedCost) {
    await fetch(`/api/admin/fixed-costs/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !c.active }) });
    fetchFixed(); fetchPnl();
  }
  async function delFixed(c: FixedCost) {
    if (!confirm(`Remover "${c.name}"?`)) return;
    await fetch(`/api/admin/fixed-costs/${c.id}`, { method: "DELETE" });
    fetchFixed(); fetchPnl();
  }

  return (
    <div className="mb-10">
      {/* Range controls */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <p className="text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)] text-[#74777f] mb-1">De</p>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Até</p>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
        </div>
        <div className="flex gap-1">
          {([["this_month", "Este mês"], ["last_month", "Mês passado"], ["year", "Ano"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => preset(k)} className="text-[10px] uppercase font-bold font-[var(--font-inter)] border border-[#e2e2e2] px-2 py-1.5 hover:border-[#002045] text-[#002045]">{label}</button>
          ))}
        </div>
      </div>

      {loading || !pnl ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
      ) : (
        <>
          {/* P&L cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <PnlCard
              label="Receita líquida"
              value={fmtBRL(pnl.revenue)}
              sub={pnl.orders_without_price > 0 ? `${pnl.orders_without_price} sem preço de venda` : `${pnl.completed_count} pedido${pnl.completed_count !== 1 ? "s" : ""} entregue${pnl.completed_count !== 1 ? "s" : ""}`}
              subTone={pnl.orders_without_price > 0 ? "warn" : undefined}
            />
            <PnlCard label="CMV (custo placas)" value={fmtBRL(pnl.cogs)} sub={pnl.orders_without_cost > 0 ? `${pnl.orders_without_cost} sem custo` : "todos com custo"} subTone={pnl.orders_without_cost > 0 ? "warn" : undefined} />
            <PnlCard label="Comissões a pagar" value={fmtBRL(pnl.commissions ?? 0)} sub={`parceiros ${fmtBRL(pnl.partner_commissions ?? 0)} · reps ${fmtBRL(pnl.rep_commissions ?? 0)}`} />
            <PnlCard label="Lucro líquido" value={fmtBRL(pnl.net_profit)} sub={`${pnl.net_margin}% margem`} tone={pnl.net_profit >= 0 ? "good" : "bad"} big />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <PnlCard label="Impostos" value={fmtBRL(pnl.taxes?.total ?? 0)} sub="PIS/COFINS/IRPJ/CSLL/ICMS" />
            <PnlCard label="Custos operacionais" value={fmtBRL(pnl.opex ?? 0)} sub={`${pnl.tax_rates?.opex ?? 7}% da receita`} />
            <PnlCard label="Custos do pedido" value={fmtBRL(pnl.order_costs)} sub="mão de obra, perdas e extras" />
            <PnlCard label="Custos fixos" value={fmtBRL(pnl.fixed_costs)} sub={`${pnl.range.days} dias`} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <PnlCard label="Lucro bruto" value={fmtBRL(pnl.gross_profit)} sub={`${pnl.gross_margin}% margem`} tone={pnl.gross_profit >= 0 ? "good" : "bad"} />
            <PnlCard label="Descontos abatidos" value={fmtBRL(pnl.discounts ?? 0)} sub={`bruto ${fmtBRL(pnl.gross_revenue ?? pnl.revenue)}`} />
            <PnlCard label="Perdas/uso estoque" value={fmtBRL(pnl.inventory_losses ?? 0)} sub="sem receita vinculada" />
            <PnlCard label="Vendas avulsas" value={fmtBRL(pnl.manual_sales ?? 0)} sub="saídas manuais como venda" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <PnlCard label="Ticket médio" value={fmtBRL((pnl.sales_count ?? pnl.completed_count) ? pnl.revenue / (pnl.sales_count ?? pnl.completed_count) : 0)} sub="por venda (inclui avulsas)" />
            <PnlCard label="Valor em estoque" value={fmtBRL(pnl.stock_value)} sub="a preço de custo (atual)" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <MonthlyTrend data={pnl.monthly ?? []} />
            <Composition pnl={pnl} />
          </div>

          {/* Fixed costs management */}
          <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] mb-3">Custos fixos recorrentes</h3>
          <div className="bg-white border border-[#e2e2e2] mb-8">
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[#f0f0f0]">
              <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Nome (ex: Aluguel)" className="flex-1 min-w-[140px] border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
              <input type="number" min="0" value={fAmount} onChange={(e) => setFAmount(e.target.value)} placeholder="Valor" className="w-28 border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
              <select value={fCadence} onChange={(e) => setFCadence(e.target.value as "daily" | "weekly" | "monthly")} className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
                <option value="daily">Diário</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option>
              </select>
              {fCadence === "weekly" && (
                <select value={fWeekday} onChange={(e) => setFWeekday(Number(e.target.value))} className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
                  {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}</option>)}
                </select>
              )}
              {fCadence === "monthly" && (
                <select value={fMonthDay} onChange={(e) => setFMonthDay(Number(e.target.value))} className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
                  {MONTH_DAYS.map((d) => <option key={d} value={d}>Dia {d}</option>)}
                </select>
              )}
              <button onClick={addFixed} className="bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] px-4 py-1.5 hover:bg-[#1a365d]">Adicionar</button>
            </div>
            {fixed.length === 0 ? (
              <p className="text-[#74777f] text-xs font-[var(--font-inter)] px-4 py-3">Nenhum custo fixo cadastrado.</p>
            ) : (
              <div className="divide-y divide-[#f5f5f3]">
                {fixed.map((c) => (
                  <div key={c.id} className={`px-4 py-2.5 ${!c.active ? "opacity-50" : ""}`}>
                    {editingFixedId === c.id ? (
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_120px_130px_150px_auto] gap-2 items-center">
                        <input
                          value={String(editFixed.name ?? "")}
                          onChange={(e) => setEditFixed((cur) => ({ ...cur, name: e.target.value }))}
                          className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                        />
                        <input
                          type="number"
                          min="0"
                          value={String(editFixed.amount ?? "")}
                          onChange={(e) => setEditFixed((cur) => ({ ...cur, amount: Number(e.target.value) }))}
                          className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                        />
                        <select
                          value={(editFixed.cadence ?? c.cadence) as FixedCost["cadence"]}
                          onChange={(e) => setEditFixed((cur) => ({ ...cur, cadence: e.target.value as FixedCost["cadence"] }))}
                          className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                        >
                          <option value="daily">Diário</option>
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensal</option>
                        </select>
                        {(editFixed.cadence ?? c.cadence) === "weekly" ? (
                          <select
                            value={Number(editFixed.weekday ?? c.weekday ?? 3)}
                            onChange={(e) => setEditFixed((cur) => ({ ...cur, weekday: Number(e.target.value) }))}
                            className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                          >
                            {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}</option>)}
                          </select>
                        ) : (editFixed.cadence ?? c.cadence) === "monthly" ? (
                          <select
                            value={Number(editFixed.month_day ?? c.month_day ?? 1)}
                            onChange={(e) => setEditFixed((cur) => ({ ...cur, month_day: Number(e.target.value) }))}
                            className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                          >
                            {MONTH_DAYS.map((d) => <option key={d} value={d}>Dia {d}</option>)}
                          </select>
                        ) : <span className="text-[10px] text-[#74777f] font-[var(--font-inter)]">Conta todos os dias</span>}
                        <div className="flex justify-end gap-3">
                          <button onClick={() => saveFixedEdit(c)} className="text-[10px] font-bold font-[var(--font-inter)] text-[#1e5fb4] hover:underline">Salvar</button>
                          <button onClick={resetEditFixed} className="text-[10px] font-bold font-[var(--font-inter)] text-[#74777f] hover:underline">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-[#002045] font-[var(--font-inter)] flex-1">{c.name}</span>
                        <span className="text-xs text-[#43474e] font-[var(--font-inter)]">{fmtBRL(c.amount)} · {CADENCE_LABEL[c.cadence]}{cadenceDetail(c)}</span>
                        <button onClick={() => startEditFixed(c)} className="text-[10px] font-bold font-[var(--font-inter)] text-[#1e5fb4] hover:underline">Editar</button>
                        <button onClick={() => toggleFixed(c)} className="text-[10px] font-bold font-[var(--font-inter)] text-[#1e5fb4] hover:underline">{c.active ? "Pausar" : "Ativar"}</button>
                        <button onClick={() => delFixed(c)} className="text-[#b42318] hover:text-[#7a1610]" title="Remover">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Per-order margin */}
          <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] mb-3">Margem por pedido entregue</h3>
          {pnl.per_order.length === 0 ? (
            <div className="bg-white border border-[#e2e2e2] px-5 py-6 text-center">
              <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhum pedido entregue neste período.</p>
            </div>
          ) : (
            <>
            <div className="hidden md:block bg-white border border-[#e2e2e2]">
              <table className="w-full text-sm font-[var(--font-inter)]">
                <thead>
                  <tr className="border-b border-[#e2e2e2] bg-[#fafafa]">
                    {["Cliente", "Data", "Receita", "Frete", "Desc.", "Custo placas", "Impostos", "Extras", "Lucro", "Margem", ""].map((h, i) => (
                      <th key={i} className="text-left px-4 py-2 text-[9px] tracking-[0.12em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pnl.per_order.map((o) => {
                    const t = o.taxes;
                    const taxTotal = (t?.total ?? 0) + (o.opex ?? 0);
                    const open = openTax === o.id;
                    return (
                      <React.Fragment key={o.id}>
                        <tr className="border-b border-[#f5f5f3]">
                          <td className="px-4 py-2 text-xs font-semibold text-[#002045]">{o.client_name}{o.below_cost && <span className="ml-2 text-[9px] font-bold px-1 py-0.5 bg-red-50 text-red-600">abaixo do custo</span>}</td>
                          <td className="px-4 py-2 text-xs text-[#74777f] whitespace-nowrap">{fmtDate(o.when)}</td>
                          <td className="px-4 py-2 text-xs text-[#43474e]">{fmtBRL(o.revenue)}</td>
                          <td className="px-4 py-2 text-xs text-[#43474e] whitespace-nowrap">
                            {o.freight ? (
                              <span>
                                {fmtBRL(o.freight)}
                                <span className={`block text-[9px] font-bold uppercase tracking-[0.08em] ${o.freight_is_revenue ? "text-[#2f5429]" : "text-[#74777f]"}`}>
                                  {o.freight_is_revenue ? "receita" : "pass-through"}
                                </span>
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-2 text-xs text-[#43474e]">{o.discount ? fmtBRL(o.discount) : "—"}</td>
                          <td className="px-4 py-2 text-xs text-[#43474e]">{o.cogs ? fmtBRL(o.cogs) : "—"}</td>
                          <td className="px-4 py-2 text-xs text-[#43474e]">{taxTotal ? fmtBRL(taxTotal) : "—"}</td>
                          <td className="px-4 py-2 text-xs text-[#43474e]">{o.other_costs ? fmtBRL(o.other_costs) : "—"}</td>
                          <td className={`px-4 py-2 text-xs font-semibold ${o.profit >= 0 ? "text-[#2f5429]" : "text-red-600"}`}>{fmtBRL(o.profit)}</td>
                          <td className={`px-4 py-2 text-xs font-semibold ${o.profit >= 0 ? "text-[#2f5429]" : "text-red-600"}`}>{o.margin}%</td>
                          <td className="px-4 py-2 text-right">
                            {t && (
                              <button onClick={() => setOpenTax(open ? null : o.id)} className="text-[#1e5fb4] text-[11px] font-bold font-[var(--font-inter)] hover:underline whitespace-nowrap">
                                Impostos {open ? "▲" : "▾"}
                              </button>
                            )}
                          </td>
                        </tr>
                        {open && t && (
                          <tr className="bg-[#fafafa] border-b border-[#f5f5f3]">
                            <td colSpan={11} className="px-4 py-3">
                              <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                                {[
                                  ["PIS", t.pis], ["COFINS", t.cofins], ["IRPJ", t.irpj], ["CSLL", t.csll], ["ICMS", t.icms],
                                  ["Custos operac.", o.opex ?? 0],
                                ].map(([label, val]) => (
                                  <span key={label as string} className="text-[11px] font-[var(--font-inter)] text-[#43474e]">
                                    <span className="text-[#74777f] uppercase tracking-wider text-[9px] font-bold mr-1">{label}</span>{fmtBRL(val as number)}
                                  </span>
                                ))}
                                <span className="text-[11px] font-[var(--font-inter)] text-[#002045] font-bold">
                                  <span className="text-[#74777f] uppercase tracking-wider text-[9px] mr-1">Total impostos+operac.</span>{fmtBRL(taxTotal)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {pnl.per_order.map((o) => {
                const t = o.taxes;
                const taxTotal = (t?.total ?? 0) + (o.opex ?? 0);
                const open = openTax === o.id;
                return (
                  <div key={o.id} className="bg-white border border-[#e2e2e2] p-4">
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#002045] truncate">{o.client_name}</p>
                        <p className="text-[11px] text-[#74777f]">{fmtDate(o.when)}</p>
                        {o.below_cost && <span className="inline-block mt-1 text-[9px] font-bold px-1 py-0.5 bg-red-50 text-red-600">abaixo do custo</span>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${o.profit >= 0 ? "text-[#2f5429]" : "text-red-600"}`}>{fmtBRL(o.profit)}</p>
                        <p className={`text-[11px] font-semibold ${o.profit >= 0 ? "text-[#2f5429]" : "text-red-600"}`}>{o.margin}% margem</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-[var(--font-inter)]">
                      <span className="text-[#74777f]">Receita</span><span className="text-right text-[#43474e]">{fmtBRL(o.revenue)}</span>
                      <span className="text-[#74777f]">Frete</span><span className="text-right text-[#43474e]">{o.freight ? `${fmtBRL(o.freight)} ${o.freight_is_revenue ? "(receita)" : "(pass-through)"}` : "—"}</span>
                      <span className="text-[#74777f]">Desconto</span><span className="text-right text-[#43474e]">{o.discount ? fmtBRL(o.discount) : "—"}</span>
                      <span className="text-[#74777f]">Custo placas</span><span className="text-right text-[#43474e]">{o.cogs ? fmtBRL(o.cogs) : "—"}</span>
                      <span className="text-[#74777f]">Impostos</span><span className="text-right text-[#43474e]">{taxTotal ? fmtBRL(taxTotal) : "—"}</span>
                      <span className="text-[#74777f]">Extras</span><span className="text-right text-[#43474e]">{o.other_costs ? fmtBRL(o.other_costs) : "—"}</span>
                    </div>
                    {t && (
                      <div className="mt-2.5 pt-2.5 border-t border-[#f0f0f0]">
                        <button onClick={() => setOpenTax(open ? null : o.id)} className="text-[#1e5fb4] text-[11px] font-bold font-[var(--font-inter)] hover:underline">Impostos {open ? "▲" : "▾"}</button>
                        {open && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                            {[["PIS", t.pis], ["COFINS", t.cofins], ["IRPJ", t.irpj], ["CSLL", t.csll], ["ICMS", t.icms], ["Custos operac.", o.opex ?? 0]].map(([label, val]) => (
                              <span key={label as string} className="text-[11px] font-[var(--font-inter)] text-[#43474e]"><span className="text-[#74777f] uppercase tracking-wider text-[9px] font-bold mr-1">{label}</span>{fmtBRL(val as number)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </>
          )}
          {pnl.orders_without_cost > 0 && (
            <p className="text-[#b4791e] text-[11px] font-[var(--font-inter)] mt-3">
              {pnl.orders_without_cost} pedido(s) entregue(s) sem itens de custo cadastrados — o lucro deles está superestimado. Defina o custo/placa no Estoque e registre os modelos no pedido para precisão.
            </p>
          )}
          {pnl.orders_without_price > 0 && (
            <p className="text-[#b4791e] text-[11px] font-[var(--font-inter)] mt-2">
              {pnl.orders_without_price} pedido(s) entregue(s) sem total e sem preço de venda nos itens — a receita deles está incompleta. Defina o preço venda/placa no Estoque ou preencha o valor total do pedido.
            </p>
          )}
        </>
      )}
    </div>
  );
}

const MONTH_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return `${MONTH_ABBR[Number(mo) - 1] ?? mo}/${y.slice(2)}`;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-[var(--font-inter)] text-[#74777f]">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} /> {label}
    </span>
  );
}

// Revenue vs net-profit bars per month — dependency-free.
function MonthlyTrend({ data }: { data: MonthPoint[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.revenue, Math.abs(d.net))));
  return (
    <div className="bg-white border border-[#e2e2e2] p-4">
      <p className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#002045] mb-3">Receita × lucro por mês</p>
      {data.length === 0 ? (
        <p className="text-[#b0b0b0] text-xs font-[var(--font-inter)] py-8 text-center">Sem dados no período.</p>
      ) : (
        <>
          <div className="flex items-end gap-2 h-40 overflow-x-auto">
            {data.map((d) => (
              <div key={d.month} className="flex flex-col items-center gap-1 flex-1 min-w-[40px]">
                <div className="flex items-end gap-1 h-32 w-full justify-center">
                  <div title={`Receita ${fmtBRL(d.revenue)}`} style={{ height: `${(d.revenue / max) * 100}%` }} className="w-3.5 bg-[#002045] rounded-t-sm transition-all" />
                  <div title={`Líquido ${fmtBRL(d.net)}`} style={{ height: `${(Math.abs(d.net) / max) * 100}%` }} className={`w-3.5 rounded-t-sm transition-all ${d.net >= 0 ? "bg-[#2f5429]" : "bg-red-500"}`} />
                </div>
                <span className="text-[9px] text-[#74777f] font-[var(--font-inter)] whitespace-nowrap">{monthLabel(d.month)}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3"><Legend color="#002045" label="Receita" /><Legend color="#2f5429" label="Lucro líquido" /></div>
        </>
      )}
    </div>
  );
}

// Where the revenue goes: stacked composition bar.
function Composition({ pnl }: { pnl: PnL }) {
  const profit = Math.max(0, pnl.net_profit);
  const commissions = pnl.commissions ?? 0;
  const inventoryLosses = pnl.inventory_losses ?? 0;
  const base = pnl.revenue > 0 ? pnl.revenue : pnl.cogs + pnl.order_costs + pnl.fixed_costs + commissions + inventoryLosses + profit;
  const segs = [
    { v: pnl.cogs, color: "#8a5a12", label: "CMV" },
    { v: pnl.order_costs, color: "#b4791e", label: "Custos pedido" },
    { v: pnl.fixed_costs, color: "#74777f", label: "Custos fixos" },
    { v: commissions, color: "#9f4a54", label: "Comissões" },
    { v: inventoryLosses, color: "#c2410c", label: "Perdas estoque" },
    { v: profit, color: "#2f5429", label: "Lucro" },
  ].filter((s) => s.v > 0);
  return (
    <div className="bg-white border border-[#e2e2e2] p-4">
      <p className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#002045] mb-3">Composição da receita</p>
      {base <= 0 ? (
        <p className="text-[#b0b0b0] text-xs font-[var(--font-inter)] py-8 text-center">Sem dados no período.</p>
      ) : (
        <>
          <div className="flex w-full h-7 rounded-sm overflow-hidden">
            {segs.map((s) => (
              <div key={s.label} title={`${s.label}: ${fmtBRL(s.v)}`} style={{ width: `${(s.v / base) * 100}%`, background: s.color }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {segs.map((s) => <Legend key={s.label} color={s.color} label={`${s.label} ${Math.round((s.v / base) * 100)}%`} />)}
          </div>
          {pnl.net_profit < 0 && <p className="text-red-600 text-[11px] font-[var(--font-inter)] mt-2">Prejuízo de {fmtBRL(Math.abs(pnl.net_profit))} no período.</p>}
        </>
      )}
    </div>
  );
}

function PnlCard({ label, value, sub, tone, subTone, big }: { label: string; value: string; sub?: string; tone?: "good" | "bad"; subTone?: "warn"; big?: boolean }) {
  const valColor = tone === "good" ? "text-[#2f5429]" : tone === "bad" ? "text-red-600" : "text-[#002045]";
  return (
    <div className={`bg-white border ${big ? "border-[#002045] border-l-4" : "border-[#e2e2e2]"} px-4 py-3`}>
      <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">{label}</p>
      <p className={`${valColor} ${big ? "text-2xl" : "text-lg"} font-[var(--font-noto-serif)] mt-0.5`}>{value}</p>
      {sub && <p className={`text-[10px] font-[var(--font-inter)] ${subTone === "warn" ? "text-[#b4791e]" : "text-[#b0b0b0]"}`}>{sub}</p>}
    </div>
  );
}
