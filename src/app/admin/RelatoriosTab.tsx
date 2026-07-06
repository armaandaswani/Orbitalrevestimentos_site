"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, Card, KpiCard, StatusBadge, EmptyState, Spinner, btnPrimary, thCls, fmtBRL } from "./ui";

// ─── Relatórios ──────────────────────────────────────────────────────────────
// Read-only business intelligence over the delivered-order history + stock
// ledger (same sources as the P&L, so figures reconcile):
//   · Rentabilidade por produto — o que realmente dá lucro.
//   · Vendas por mês — tendência de receita e lucro.
//   · Vendas por parceiro / representante — quem traz resultado.
//   · Giro de estoque — "acaba em X dias" no ritmo atual.

interface ProductRow { product_id: string | null; name: string; units: number; orders: number; revenue: number; cost: number; profit: number; margin: number }
interface MonthRow { month: string; revenue: number; cost: number; profit: number; orders: number }
interface PartyRow { name: string; revenue: number; cost: number; profit: number; margin: number; orders: number }
interface VelocityRow { product_id: string; name: string; code: string | null; unit: string; on_hand: number; reorder_point: number; consumed_window: number; per_day: number; days_to_empty: number | null }
interface ReportData {
  range: { from: string; to: string; velocity_days: number };
  totals: { orders: number; revenue: number; cost: number; profit: number; margin: number };
  by_product: ProductRow[];
  by_month: MonthRow[];
  by_partner: PartyRow[];
  by_rep: PartyRow[];
  velocity: VelocityRow[];
}

const PERIODS = [
  { key: "3m", label: "3 meses", months: 3 },
  { key: "6m", label: "6 meses", months: 6 },
  { key: "12m", label: "12 meses", months: 12 },
] as const;

function monthLabel(m: string): string {
  const [y, mo] = m.split("-");
  const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${names[Number(mo) - 1] ?? mo}/${y.slice(2)}`;
}

function marginTone(m: number): "red" | "yellow" | "green" {
  return m < 0 ? "red" : m < 20 ? "yellow" : "green";
}

export default function RelatoriosTab() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("12m");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const months = PERIODS.find((p) => p.key === period)?.months ?? 12;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const params = new URLSearchParams({ from: from.toISOString(), to: now.toISOString() });
    try {
      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      const j = await res.json().catch(() => null);
      if (res.ok && j) {
        setData(j);
        setError(null);
      } else {
        setError(j?.error || `HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
    }
    setLoading(false);
  }, [period]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const maxMonthRev = useMemo(() => Math.max(1, ...(data?.by_month ?? []).map((m) => m.revenue)), [data]);

  if (loading && !data) {
    return (
      <div>
        <PageHeader title="Relatórios" subtitle="Carregando…" />
        <div className="flex justify-center py-16"><Spinner /></div>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div>
        <PageHeader title="Relatórios" />
        <EmptyState title="Não foi possível carregar" hint={error} action={<button onClick={fetchData} className={btnPrimary}>Tentar novamente</button>} />
      </div>
    );
  }
  if (!data) return null;

  const empty = data.totals.orders === 0;

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="O que dá lucro, quem vende, e quando cada produto acaba — sobre os pedidos entregues."
        actions={
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 border transition-colors ${period === p.key ? "bg-[#002045] text-white border-[#002045]" : "text-[#74777f] border-[#e2e2e2] hover:border-[#002045] hover:text-[#002045]"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Header KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Pedidos entregues" value={data.totals.orders} hint="no período" />
        <KpiCard label="Receita" value={fmtBRL(data.totals.revenue)} hint="líquida de descontos" />
        <KpiCard label="Lucro bruto" value={fmtBRL(data.totals.profit)} tone={data.totals.profit >= 0 ? "good" : "bad"} hint="receita − custo dos produtos" />
        <KpiCard label="Margem" value={`${data.totals.margin}%`} tone={data.totals.margin < 0 ? "bad" : data.totals.margin < 20 ? "warn" : "good"} hint="lucro ÷ receita" />
      </div>

      {empty ? (
        <EmptyState
          title="Sem pedidos entregues no período"
          hint="Assim que você marcar pedidos como entregues, os relatórios de rentabilidade, vendas e giro de estoque aparecem aqui. O giro de estoque usa as saídas de estoque dos últimos 90 dias."
        />
      ) : (
        <div className="space-y-6">
          {/* Vendas por mês */}
          <Card title="Vendas por mês">
            <div className="flex items-end gap-2 h-40 mb-2">
              {data.by_month.map((m) => {
                const h = Math.round((m.revenue / maxMonthRev) * 100);
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={`${monthLabel(m.month)} · ${fmtBRL(m.revenue)} receita · ${fmtBRL(m.profit)} lucro · ${m.orders} pedido(s)`}>
                    <span className="text-[9px] text-[#74777f] font-[var(--font-inter)] mb-1 whitespace-nowrap">{m.revenue > 0 ? fmtBRL(m.revenue) : ""}</span>
                    <div className="w-full bg-[#eef2f8] relative" style={{ height: `${Math.max(h, m.revenue > 0 ? 4 : 0)}%` }}>
                      <div className="absolute inset-x-0 bottom-0 bg-[#002045]" style={{ height: `${m.revenue > 0 ? Math.max(0, Math.round((m.profit / m.revenue) * 100)) : 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              {data.by_month.map((m) => (
                <span key={m.month} className="flex-1 text-center text-[9px] text-[#74777f] font-[var(--font-inter)] whitespace-nowrap min-w-0 overflow-hidden">{monthLabel(m.month)}</span>
              ))}
            </div>
            <p className="text-[11px] text-[#74777f] font-[var(--font-inter)] mt-3">Barra clara = receita · faixa escura = proporção de lucro. Passe o mouse para ver os valores.</p>
          </Card>

          {/* Rentabilidade por produto */}
          <Card title="Rentabilidade por produto" padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-[var(--font-inter)]">
                <thead>
                  <tr>
                    {["Produto", "Unid.", "Pedidos", "Receita", "Custo", "Lucro", "Margem"].map((h) => (
                      <th key={h} className={`${thCls} ${h !== "Produto" ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.by_product.map((p, i) => (
                    <tr key={p.product_id ?? `n${i}`} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] text-[#b0b0b0] font-bold mr-2">{i + 1}</span>
                        <span className="text-xs font-semibold text-[#002045]">{p.name}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-[#43474e] whitespace-nowrap">{p.units}</td>
                      <td className="px-3 py-2.5 text-right text-xs text-[#43474e] whitespace-nowrap">{p.orders}</td>
                      <td className="px-3 py-2.5 text-right text-xs text-[#002045] whitespace-nowrap">{fmtBRL(p.revenue)}</td>
                      <td className="px-3 py-2.5 text-right text-xs text-[#74777f] whitespace-nowrap">{fmtBRL(p.cost)}</td>
                      <td className={`px-3 py-2.5 text-right text-xs font-bold whitespace-nowrap ${p.profit < 0 ? "text-red-600" : "text-[#002045]"}`}>{fmtBRL(p.profit)}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap"><StatusBadge tone={marginTone(p.margin)}>{p.margin}%</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-4 py-3 text-[11px] text-[#74777f] font-[var(--font-inter)] border-t border-[#f0f0f0]">Receita e custo por item de pedido entregue (antes de descontos e frete no nível do pedido).</p>
          </Card>

          {/* Parceiro + Representante lado a lado */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card title="Vendas por parceiro" padded={false}>
              {data.by_partner.length === 0 ? (
                <p className="px-5 py-6 text-xs text-[#74777f] font-[var(--font-inter)]">Sem vendas atribuídas a parceiros no período.</p>
              ) : (
                <table className="w-full text-sm font-[var(--font-inter)]">
                  <thead>
                    <tr>{["Parceiro", "Pedidos", "Receita", "Margem"].map((h) => (<th key={h} className={`${thCls} ${h !== "Parceiro" ? "text-right" : ""}`}>{h}</th>))}</tr>
                  </thead>
                  <tbody>
                    {data.by_partner.map((r, i) => (
                      <tr key={`${r.name}${i}`} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                        <td className="px-4 py-2.5 text-xs font-semibold text-[#002045]">{r.name}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-[#43474e]">{r.orders}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-[#002045] whitespace-nowrap">{fmtBRL(r.revenue)}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap"><StatusBadge tone={marginTone(r.margin)}>{r.margin}%</StatusBadge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
            <Card title="Vendas por representante" padded={false}>
              {data.by_rep.length === 0 ? (
                <p className="px-5 py-6 text-xs text-[#74777f] font-[var(--font-inter)]">Sem vendas atribuídas a representantes no período.</p>
              ) : (
                <table className="w-full text-sm font-[var(--font-inter)]">
                  <thead>
                    <tr>{["Representante", "Pedidos", "Receita", "Margem"].map((h) => (<th key={h} className={`${thCls} ${h !== "Representante" ? "text-right" : ""}`}>{h}</th>))}</tr>
                  </thead>
                  <tbody>
                    {data.by_rep.map((r, i) => (
                      <tr key={`${r.name}${i}`} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                        <td className="px-4 py-2.5 text-xs font-semibold text-[#002045]">{r.name}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-[#43474e]">{r.orders}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-[#002045] whitespace-nowrap">{fmtBRL(r.revenue)}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap"><StatusBadge tone={marginTone(r.margin)}>{r.margin}%</StatusBadge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          {/* Giro de estoque */}
          <Card title={`Giro de estoque — consumo dos últimos ${data.range.velocity_days} dias`} padded={false}>
            {data.velocity.length === 0 ? (
              <p className="px-5 py-6 text-xs text-[#74777f] font-[var(--font-inter)]">Sem dados de estoque para calcular o giro.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-[var(--font-inter)]">
                  <thead>
                    <tr>
                      {["Produto", "Em estoque", "Consumo/dia", "Saiu no período", "Acaba em"].map((h) => (
                        <th key={h} className={`${thCls} ${h !== "Produto" ? "text-right" : ""}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.velocity.map((v) => {
                      const d = v.days_to_empty;
                      const tone = d == null ? "gray" : d <= 14 ? "red" : d <= 45 ? "yellow" : "green";
                      const label = d == null ? "sem giro" : d <= 0 ? "esgotado" : `${d} dias`;
                      return (
                        <tr key={v.product_id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                          <td className="px-4 py-2.5">
                            <p className="text-xs font-semibold text-[#002045]">{v.name}</p>
                            {v.code && <p className="text-[10px] text-[#74777f]">{v.code}</p>}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-[#43474e] whitespace-nowrap">{v.on_hand} {v.unit}</td>
                          <td className="px-3 py-2.5 text-right text-xs text-[#43474e] whitespace-nowrap">{v.per_day > 0 ? v.per_day : "—"}</td>
                          <td className="px-3 py-2.5 text-right text-xs text-[#74777f] whitespace-nowrap">{v.consumed_window}</td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap"><StatusBadge tone={tone}>{label}</StatusBadge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="px-4 py-3 text-[11px] text-[#74777f] font-[var(--font-inter)] border-t border-[#f0f0f0]">Consumo/dia = saídas (vendas + baixas) ÷ {data.range.velocity_days} dias. &quot;Acaba em&quot; projeta o estoque atual nesse ritmo. Produtos parados aparecem como &quot;sem giro&quot;.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
