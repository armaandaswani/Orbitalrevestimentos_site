"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, Card, KpiCard, StatusBadge, EmptyState, Spinner, SectionLabel, inputCls, btnPrimary, btnGhost, fmtBRL, cardCls, thCls } from "./ui";

// ─── Custos & Margens ────────────────────────────────────────────────────────
// Two jobs in one tab:
//  1. Build the LANDED cost of each product (FOB + frete + impostos + outros)
//     and apply it as the official cost_price (the number every downstream P&L
//     already reads).
//  2. See the margin of each product at BOTH price tiers — varejo (price) and
//     atacado (line_pricing.special_price by linha) — with below-cost flags,
//     plus a what-if panel to test hypothetical prices/costs and a global
//     cost-shock preview (+X% on every landed cost).

interface Product {
  id: string;
  name: string;
  code: string | null;
  linha: string | null;
  sale_unit: string;
  price: number | null;
  cost_price: number | null;
  supplier_name: string | null;
  fob_cost: number | null;
  freight_cost: number | null;
  duty_cost: number | null;
  other_import_cost: number | null;
  stock_on_hand: number;
}
interface PricingRow { linha: string; special_price: number; public_price: number }

const num = (v: unknown) => (Number(v) || 0);
const landedOf = (p: Product) => num(p.fob_cost) + num(p.freight_cost) + num(p.duty_cost) + num(p.other_import_cost);
const marginPct = (price: number, cost: number) => (price > 0 ? ((price - cost) / price) * 100 : 0);

function MoneyInput({ value, onChange, placeholder }: { value: number | null; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      placeholder={placeholder ?? "0"}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] text-right focus:outline-none focus:border-[#002045]"
    />
  );
}

export default function CustosTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [migrationMissing, setMigrationMissing] = useState(false);
  // Local draft of the cost-breakdown fields per product (before "Aplicar").
  const [drafts, setDrafts] = useState<Record<string, Partial<Product>>>({});
  const [view, setView] = useState<"custos" | "margens">("custos");
  const [costShock, setCostShock] = useState(0); // % applied to landed cost in the margin view

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/custos");
      const j = await res.json().catch(() => null);
      if (res.ok && j?.products) {
        setProducts(j.products);
        setPricing(j.pricing ?? []);
        setError(null);
      } else {
        setError(j?.error || `HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
    }
    setLoading(false);
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const pricingByLinha = useMemo(() => {
    const m: Record<string, PricingRow> = {};
    for (const r of pricing) m[r.linha] = r;
    return m;
  }, [pricing]);

  const draftOf = (p: Product): Product => ({ ...p, ...drafts[p.id] });
  const setField = (id: string, field: keyof Product, raw: string) => {
    const v = field === "supplier_name" ? raw : raw === "" ? null : Number(raw);
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [field]: v as never } }));
  };

  async function save(p: Product, extra?: Partial<Product>) {
    setSavingId(p.id);
    const merged = { ...draftOf(p), ...extra };
    const payload = {
      id: p.id,
      supplier_name: merged.supplier_name,
      fob_cost: merged.fob_cost,
      freight_cost: merged.freight_cost,
      duty_cost: merged.duty_cost,
      other_import_cost: merged.other_import_cost,
      ...(extra?.cost_price !== undefined ? { cost_price: extra.cost_price } : {}),
    };
    try {
      const res = await fetch("/api/admin/custos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j) {
        if (j._migrationMissing) setMigrationMissing(true);
        setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...j } : x)));
        setDrafts((d) => { const c = { ...d }; delete c[p.id]; return c; });
      } else {
        alert(j?.error || "Falha ao salvar.");
        if (res.status === 503) setMigrationMissing(true);
      }
    } catch { alert("Falha de rede ao salvar."); }
    setSavingId(null);
  }

  // ── Summary KPIs ──
  const summary = useMemo(() => {
    let below = 0, noCost = 0, totalStockValue = 0;
    for (const p of products) {
      const cost = num(p.cost_price);
      if (cost <= 0) noCost++;
      const price = num(p.price);
      if (cost > 0 && price > 0 && price < cost) below++;
      totalStockValue += cost * num(p.stock_on_hand);
    }
    return { below, noCost, totalStockValue, count: products.length };
  }, [products]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Custos & Margens" subtitle="Carregando…" />
        <div className="flex justify-center py-16"><Spinner /></div>
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <PageHeader title="Custos & Margens" />
        <EmptyState title="Não foi possível carregar" hint={error} action={<button onClick={fetchData} className={btnPrimary}>Tentar novamente</button>} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Custos & Margens"
        subtitle="Monte o custo real de cada produto e veja a margem no varejo e no atacado."
        actions={
          <div className="flex gap-2">
            {(["custos", "margens"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 border transition-colors ${view === v ? "bg-[#002045] text-white border-[#002045]" : "text-[#74777f] border-[#e2e2e2] hover:border-[#002045] hover:text-[#002045]"}`}
              >
                {v === "custos" ? "Custos" : "Margens"}
              </button>
            ))}
          </div>
        }
      />

      {migrationMissing && (
        <div className="mb-6 bg-yellow-50 border border-yellow-300 px-4 py-3 text-yellow-900 text-xs font-[var(--font-inter)]">
          Rode a migração <b>038</b> no Supabase para salvar a composição de custo (FOB, frete, impostos). Enquanto isso, só o custo final é salvo.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Produtos" value={summary.count} />
        <KpiCard label="Sem custo definido" value={summary.noCost} tone={summary.noCost > 0 ? "warn" : "good"} hint="informe o custo p/ ver margem" />
        <KpiCard label="Abaixo do custo" value={summary.below} tone={summary.below > 0 ? "bad" : "good"} hint="preço menor que o custo" />
        <KpiCard label="Valor em estoque" value={fmtBRL(summary.totalStockValue)} hint="ao custo atual" />
      </div>

      {view === "custos" ? (
        <Card title="Composição de custo por produto" padded={false}>
          {/* Mobile: card per product */}
          <div className="md:hidden divide-y divide-[#f0f0f0]">
            {products.map((p) => {
              const d = draftOf(p);
              const landed = landedOf(d);
              const dirty = !!drafts[p.id];
              const applied = num(p.cost_price) > 0 && Math.abs(num(p.cost_price) - landed) < 0.005;
              return (
                <div key={p.id} className="p-4">
                  <p className="text-sm font-semibold text-[#002045]">{p.name}</p>
                  <p className="text-[10px] text-[#74777f] mb-3">{[p.code, p.linha].filter(Boolean).join(" · ") || "—"}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className="block text-[9px] uppercase tracking-wider font-bold text-[#74777f] mb-1">FOB</span><MoneyInput value={d.fob_cost ?? null} onChange={(v) => setField(p.id, "fob_cost", v)} /></label>
                    <label className="block"><span className="block text-[9px] uppercase tracking-wider font-bold text-[#74777f] mb-1">Frete</span><MoneyInput value={d.freight_cost ?? null} onChange={(v) => setField(p.id, "freight_cost", v)} /></label>
                    <label className="block"><span className="block text-[9px] uppercase tracking-wider font-bold text-[#74777f] mb-1">Imposto</span><MoneyInput value={d.duty_cost ?? null} onChange={(v) => setField(p.id, "duty_cost", v)} /></label>
                    <label className="block"><span className="block text-[9px] uppercase tracking-wider font-bold text-[#74777f] mb-1">Outros</span><MoneyInput value={d.other_import_cost ?? null} onChange={(v) => setField(p.id, "other_import_cost", v)} /></label>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f0f0f0]">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider font-bold text-[#74777f]">Custo total</p>
                      <p className="text-sm font-bold text-[#002045]">{landed > 0 ? fmtBRL(landed) : "—"}</p>
                      <p className="text-[10px] text-[#74777f]">atual: {num(p.cost_price) > 0 ? fmtBRL(num(p.cost_price)) : "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {dirty && <button onClick={() => save(p)} disabled={savingId === p.id} className="text-[11px] text-[#74777f] font-bold hover:text-[#002045]">Salvar</button>}
                      {landed > 0 && !applied ? (
                        <button onClick={() => save(p, { cost_price: landed })} disabled={savingId === p.id} className="text-[11px] text-[#3b6934] font-bold hover:underline">Aplicar como custo →</button>
                      ) : applied ? (
                        <StatusBadge tone="green">custo aplicado</StatusBadge>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm font-[var(--font-inter)]">
              <thead>
                <tr>
                  {["Produto", "FOB", "Frete", "Imposto", "Outros", "Custo total", "Custo atual", ""].map((h) => (
                    <th key={h} className={`${thCls} ${h && h !== "Produto" ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const d = draftOf(p);
                  const landed = landedOf(d);
                  const dirty = !!drafts[p.id];
                  const applied = num(p.cost_price) > 0 && Math.abs(num(p.cost_price) - landed) < 0.005;
                  return (
                    <tr key={p.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] align-middle">
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-semibold text-[#002045]">{p.name}</p>
                        <p className="text-[10px] text-[#74777f]">{[p.code, p.linha].filter(Boolean).join(" · ") || "—"}</p>
                      </td>
                      <td className="px-2 py-2.5 w-24"><MoneyInput value={d.fob_cost ?? null} onChange={(v) => setField(p.id, "fob_cost", v)} /></td>
                      <td className="px-2 py-2.5 w-24"><MoneyInput value={d.freight_cost ?? null} onChange={(v) => setField(p.id, "freight_cost", v)} /></td>
                      <td className="px-2 py-2.5 w-24"><MoneyInput value={d.duty_cost ?? null} onChange={(v) => setField(p.id, "duty_cost", v)} /></td>
                      <td className="px-2 py-2.5 w-24"><MoneyInput value={d.other_import_cost ?? null} onChange={(v) => setField(p.id, "other_import_cost", v)} /></td>
                      <td className="px-3 py-2.5 text-right text-xs font-bold text-[#002045] whitespace-nowrap">{landed > 0 ? fmtBRL(landed) : "—"}</td>
                      <td className="px-3 py-2.5 text-right text-xs whitespace-nowrap">
                        {num(p.cost_price) > 0 ? fmtBRL(num(p.cost_price)) : <span className="text-[#b0b0b0]">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {dirty && (
                          <button onClick={() => save(p)} disabled={savingId === p.id} className="text-[10px] text-[#74777f] font-bold hover:text-[#002045] mr-3">Salvar</button>
                        )}
                        {landed > 0 && !applied ? (
                          <button onClick={() => save(p, { cost_price: landed })} disabled={savingId === p.id} className="text-[10px] text-[#3b6934] font-bold hover:underline">Aplicar como custo →</button>
                        ) : applied ? (
                          <StatusBadge tone="green">custo aplicado</StatusBadge>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <SectionLabel>Simular choque de custo</SectionLabel>
            <div className="flex items-center gap-2">
              {[0, 5, 10, 20, 30].map((v) => (
                <button
                  key={v}
                  onClick={() => setCostShock(v)}
                  className={`text-[10px] font-bold font-[var(--font-inter)] px-3 py-1.5 border transition-colors ${costShock === v ? "bg-[#002045] text-white border-[#002045]" : "text-[#74777f] border-[#e2e2e2] hover:border-[#002045]"}`}
                >
                  +{v}%
                </button>
              ))}
            </div>
            {costShock > 0 && <span className="text-[11px] text-[#74777f] font-[var(--font-inter)]">Custo simulado +{costShock}% (não altera nada salvo)</span>}
          </div>
          <Card title="Margem por produto — varejo e atacado" padded={false}>
            {/* Mobile: card per product */}
            <div className="md:hidden divide-y divide-[#f0f0f0]">
              {products.map((p) => {
                const baseCost = num(p.cost_price);
                const cost = baseCost * (1 + costShock / 100);
                const varejo = num(p.price);
                const rate = p.linha ? pricingByLinha[p.linha] : undefined;
                const atacado = rate ? num(rate.special_price) : 0;
                const noCost = baseCost <= 0;
                const mVarejo = marginPct(varejo, cost);
                const mAtacado = marginPct(atacado, cost);
                const marginCell = (price: number, m: number) => {
                  if (noCost) return <span className="text-[10px] text-[#b0b0b0]">defina o custo</span>;
                  if (price <= 0) return <span className="text-[#b0b0b0]">—</span>;
                  const tone = m < 0 ? "red" : m < 20 ? "yellow" : "green";
                  return <StatusBadge tone={tone}>{m.toFixed(0)}%</StatusBadge>;
                };
                return (
                  <div key={p.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#002045] truncate">{p.name}</p>
                        <p className="text-[10px] text-[#74777f]">{[p.code, p.linha].filter(Boolean).join(" · ") || "—"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-[#74777f]">Custo</p>
                        <p className="text-xs text-[#002045]">{noCost ? "—" : fmtBRL(cost)}</p>
                        {costShock > 0 && !noCost && <p className="text-[9px] text-[#74777f]">base {fmtBRL(baseCost)}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-[#74777f]">Varejo</p>
                        <p className="text-xs text-[#002045] mb-1">{varejo > 0 ? fmtBRL(varejo) : "—"}</p>
                        {marginCell(varejo, mVarejo)}
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-[#74777f]">Atacado</p>
                        <p className="text-xs text-[#002045] mb-1">{atacado > 0 ? fmtBRL(atacado) : "sem tabela"}</p>
                        {marginCell(atacado, mAtacado)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm font-[var(--font-inter)]">
                <thead>
                  <tr>
                    {["Produto", "Custo", "Varejo", "Margem varejo", "Atacado", "Margem atacado"].map((h) => (
                      <th key={h} className={`${thCls} ${h !== "Produto" ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const baseCost = num(p.cost_price);
                    const cost = baseCost * (1 + costShock / 100);
                    const varejo = num(p.price);
                    const rate = p.linha ? pricingByLinha[p.linha] : undefined;
                    const atacado = rate ? num(rate.special_price) : 0;
                    const noCost = baseCost <= 0;
                    const mVarejo = marginPct(varejo, cost);
                    const mAtacado = marginPct(atacado, cost);
                    const marginCell = (price: number, m: number) => {
                      if (noCost) return <span className="text-[#b0b0b0]">defina o custo</span>;
                      if (price <= 0) return <span className="text-[#b0b0b0]">—</span>;
                      const tone = m < 0 ? "red" : m < 20 ? "yellow" : "green";
                      return <StatusBadge tone={tone}>{m.toFixed(0)}%</StatusBadge>;
                    };
                    return (
                      <tr key={p.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                        <td className="px-4 py-2.5">
                          <p className="text-xs font-semibold text-[#002045]">{p.name}</p>
                          <p className="text-[10px] text-[#74777f]">{[p.code, p.linha].filter(Boolean).join(" · ") || "—"}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs whitespace-nowrap">
                          {noCost ? <span className="text-[#b0b0b0]">—</span> : (
                            <>
                              {fmtBRL(cost)}
                              {costShock > 0 && <span className="block text-[9px] text-[#74777f]">base {fmtBRL(baseCost)}</span>}
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-[#002045] whitespace-nowrap">{varejo > 0 ? fmtBRL(varejo) : "—"}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">{marginCell(varejo, mVarejo)}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-[#002045] whitespace-nowrap">{atacado > 0 ? fmtBRL(atacado) : <span className="text-[#b0b0b0]">sem tabela</span>}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">{marginCell(atacado, mAtacado)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="text-[11px] text-[#74777f] font-[var(--font-inter)] mt-3">
            Varejo = preço do produto. Atacado = preço especial da linha (aba <b>Tabela de Preços</b>). Margem = (preço − custo) ÷ preço.
          </p>
        </>
      )}

      {products.length === 0 && (
        <div className="mt-6">
          <EmptyState title="Nenhum produto ativo" hint="Cadastre produtos na aba Produtos para calcular custos e margens." />
        </div>
      )}
    </div>
  );
}
