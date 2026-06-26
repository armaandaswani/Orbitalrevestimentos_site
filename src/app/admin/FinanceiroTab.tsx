"use client";

import React, { useState, useEffect, useCallback } from "react";

interface PerOrder {
  id: string; client_name: string; when: string;
  revenue: number; cogs: number; other_costs: number; profit: number; margin: number; below_cost: boolean;
}
interface FixedBreakdown { name: string; cadence: string; amount: number; prorated: number }
interface PnL {
  range: { from: string; to: string; days: number };
  revenue: number; cogs: number; order_costs: number;
  gross_profit: number; gross_margin: number;
  fixed_costs: number; fixed_breakdown: FixedBreakdown[];
  net_profit: number; net_margin: number;
  completed_count: number; orders_without_cost: number; orders_without_price: number; stock_value: number;
  per_order: PerOrder[];
}
interface FixedCost {
  id: string; name: string; amount: number; cadence: "daily" | "weekly" | "monthly"; active: boolean;
  started_at: string | null; ended_at: string | null; notes: string | null;
}

const CADENCE_LABEL: Record<string, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" };

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

  async function addFixed() {
    const amount = Number(fAmount);
    if (!fName.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const res = await fetch("/api/admin/fixed-costs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fName.trim(), amount, cadence: fCadence }),
    });
    if (res.ok) { setFName(""); setFAmount(""); fetchFixed(); fetchPnl(); }
    else { const j = await res.json().catch(() => null); alert(j?.error || "Falha ao adicionar."); }
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
              label="Receita"
              value={fmtBRL(pnl.revenue)}
              sub={pnl.orders_without_price > 0 ? `${pnl.orders_without_price} sem preço de venda` : `${pnl.completed_count} pedido${pnl.completed_count !== 1 ? "s" : ""} entregue${pnl.completed_count !== 1 ? "s" : ""}`}
              subTone={pnl.orders_without_price > 0 ? "warn" : undefined}
            />
            <PnlCard label="CMV (custo placas)" value={fmtBRL(pnl.cogs)} sub={pnl.orders_without_cost > 0 ? `${pnl.orders_without_cost} sem custo` : "todos com custo"} subTone={pnl.orders_without_cost > 0 ? "warn" : undefined} />
            <PnlCard label="Custos fixos (rateado)" value={fmtBRL(pnl.fixed_costs)} sub={`${pnl.range.days} dias`} />
            <PnlCard label="Lucro líquido" value={fmtBRL(pnl.net_profit)} sub={`${pnl.net_margin}% margem`} tone={pnl.net_profit >= 0 ? "good" : "bad"} big />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <PnlCard label="Custos do pedido" value={fmtBRL(pnl.order_costs)} sub="frete, mão de obra…" />
            <PnlCard label="Lucro bruto" value={fmtBRL(pnl.gross_profit)} sub={`${pnl.gross_margin}% margem`} tone={pnl.gross_profit >= 0 ? "good" : "bad"} />
            <PnlCard label="Valor em estoque" value={fmtBRL(pnl.stock_value)} sub="a preço de custo (atual)" />
            <PnlCard label="Ticket médio" value={fmtBRL(pnl.completed_count ? pnl.revenue / pnl.completed_count : 0)} sub="por pedido entregue" />
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
              <button onClick={addFixed} className="bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] px-4 py-1.5 hover:bg-[#1a365d]">Adicionar</button>
            </div>
            {fixed.length === 0 ? (
              <p className="text-[#74777f] text-xs font-[var(--font-inter)] px-4 py-3">Nenhum custo fixo cadastrado.</p>
            ) : (
              <div className="divide-y divide-[#f5f5f3]">
                {fixed.map((c) => (
                  <div key={c.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${!c.active ? "opacity-50" : ""}`}>
                    <span className="text-xs font-semibold text-[#002045] font-[var(--font-inter)] flex-1">{c.name}</span>
                    <span className="text-xs text-[#43474e] font-[var(--font-inter)]">{fmtBRL(c.amount)} · {CADENCE_LABEL[c.cadence]}</span>
                    <button onClick={() => toggleFixed(c)} className="text-[10px] font-bold font-[var(--font-inter)] text-[#1e5fb4] hover:underline">{c.active ? "Pausar" : "Ativar"}</button>
                    <button onClick={() => delFixed(c)} className="text-[#b42318] hover:text-[#7a1610]" title="Remover">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                    </button>
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
            <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
              <table className="w-full text-sm font-[var(--font-inter)]">
                <thead>
                  <tr className="border-b border-[#e2e2e2] bg-[#fafafa]">
                    {["Cliente", "Data", "Receita", "Custo placas", "Outros", "Lucro", "Margem"].map((h) => (
                      <th key={h} className="text-left px-4 py-2 text-[9px] tracking-[0.12em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pnl.per_order.map((o) => (
                    <tr key={o.id} className="border-b border-[#f5f5f3]">
                      <td className="px-4 py-2 text-xs font-semibold text-[#002045]">{o.client_name}{o.below_cost && <span className="ml-2 text-[9px] font-bold px-1 py-0.5 bg-red-50 text-red-600">abaixo do custo</span>}</td>
                      <td className="px-4 py-2 text-xs text-[#74777f] whitespace-nowrap">{fmtDate(o.when)}</td>
                      <td className="px-4 py-2 text-xs text-[#43474e]">{fmtBRL(o.revenue)}</td>
                      <td className="px-4 py-2 text-xs text-[#43474e]">{o.cogs ? fmtBRL(o.cogs) : "—"}</td>
                      <td className="px-4 py-2 text-xs text-[#43474e]">{o.other_costs ? fmtBRL(o.other_costs) : "—"}</td>
                      <td className={`px-4 py-2 text-xs font-semibold ${o.profit >= 0 ? "text-[#2f5429]" : "text-red-600"}`}>{fmtBRL(o.profit)}</td>
                      <td className={`px-4 py-2 text-xs font-semibold ${o.profit >= 0 ? "text-[#2f5429]" : "text-red-600"}`}>{o.margin}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
