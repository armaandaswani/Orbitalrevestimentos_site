"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, Card, KpiCard, StatusBadge, EmptyState, Spinner, SectionLabel, inputCls, labelCls, btnPrimary, btnGhost, fmtBRL, cardCls } from "./ui";
import { computeImportCosts, type Currency } from "@/lib/import-costs";

// ─── Compras & Importação ────────────────────────────────────────────────────
// 1. Live FX header (RMB/USD/BRL, auto-updated, editable override).
// 2. Sugestões de compra from products below the reorder point.
// 3. Purchase orders with the multi-currency IMPORT CALCULATOR (product priced
//    in USD or RMB, freight in USD, Brazilian costs+taxes in BRL → landed cost
//    per unit in BRL, live) and a Receber flow that gives the shipment into the
//    stock ledger and updates each product's cost.

const PO_STATUS: Record<string, { label: string; tone: "gray" | "blue" | "yellow" | "green" | "red" }> = {
  draft: { label: "Rascunho", tone: "gray" },
  ordered: { label: "Pedido feito", tone: "blue" },
  in_transit: { label: "Em trânsito", tone: "yellow" },
  received: { label: "Recebido", tone: "green" },
  cancelled: { label: "Cancelado", tone: "red" },
};
const STATUS_FLOW = ["draft", "ordered", "in_transit", "received"] as const;

interface Fx { usd_brl: number | null; cny_brl: number | null; cny_usd: number | null; updated_at: string | null; source: string; stale: boolean }
interface StockProduct { id: string; name: string; code: string | null; available: number; reorder_point: number; stock_on_hand: number; low: boolean; cost_price: number | null }
interface Supplier { id: string; name: string; country: string | null; lead_time_days: number | null }
interface POItem { id?: string; product_id: string | null; product_name: string | null; qty: number; unit_price: number | null; unit_currency: Currency }
interface PO {
  id: string; supplier_id: string | null; supplier_name?: string | null; reference: string | null; status: string;
  fx_usd_brl: number | null; fx_cny_brl: number | null; freight_usd: number | null;
  storage_cost: number | null; broker_cost: number | null; transport_cost: number | null; other_cost: number | null;
  icms_rate: number | null; fti_rate: number | null; expected_arrival: string | null; created_at: string; items: POItem[];
}
type PODraft = Partial<PO> & { _isNew?: boolean; items: POItem[] };

const num = (v: unknown) => Number(v) || 0;

function emptyDraft(fx: Fx): PODraft {
  return {
    _isNew: true, reference: "", supplier_id: null, status: "draft",
    fx_usd_brl: fx.usd_brl, fx_cny_brl: fx.cny_brl, freight_usd: null,
    storage_cost: null, broker_cost: null, transport_cost: null, other_cost: null,
    icms_rate: 0.07, fti_rate: 0.01, expected_arrival: null,
    items: [{ product_id: null, product_name: null, qty: 0, unit_price: null, unit_currency: "USD" }],
  };
}

export default function ComprasTab() {
  const [fx, setFx] = useState<Fx>({ usd_brl: null, cny_brl: null, cny_usd: null, updated_at: null, source: "…", stale: false });
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pos, setPos] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationMissing, setMigrationMissing] = useState(false);
  const [draft, setDraft] = useState<PODraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [newSupplier, setNewSupplier] = useState("");

  const fetchFx = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/fx");
      const j = await r.json();
      if (j) setFx(j);
    } catch { /* manual rates remain */ }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [stockR, supR, poR] = await Promise.all([
        fetch("/api/admin/stock").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/admin/suppliers").then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/admin/purchase-orders").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);
      if (stockR?.products) setProducts(stockR.products);
      setSuppliers(Array.isArray(supR) ? supR : []);
      setPos(Array.isArray(poR) ? poR : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchFx(); fetchAll(); }, [fetchFx, fetchAll]);
  // Refresh FX every 10 min while the tab is open.
  useEffect(() => {
    const t = setInterval(fetchFx, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [fetchFx]);

  const lowStock = useMemo(() => products.filter((p) => p.low), [products]);

  const productById = useCallback((id: string | null) => products.find((p) => p.id === id) ?? null, [products]);

  // ── Live cost preview for the open draft ──
  const preview = useMemo(() => {
    if (!draft) return null;
    return computeImportCosts({
      fx: { usd_brl: num(draft.fx_usd_brl), cny_brl: num(draft.fx_cny_brl) },
      items: draft.items.map((it) => ({ qty: num(it.qty), unit_price: num(it.unit_price), unit_currency: it.unit_currency })),
      freight_usd: draft.freight_usd, storage_cost: draft.storage_cost, broker_cost: draft.broker_cost,
      transport_cost: draft.transport_cost, other_cost: draft.other_cost, icms_rate: draft.icms_rate, fti_rate: draft.fti_rate,
    });
  }, [draft]);

  function openNew(seedItems?: POItem[]) {
    const d = emptyDraft(fx);
    if (seedItems && seedItems.length > 0) d.items = seedItems;
    setDraft(d);
  }
  function openEdit(po: PO) {
    setDraft({ ...po, items: po.items.length > 0 ? po.items : [{ product_id: null, product_name: null, qty: 0, unit_price: null, unit_currency: "USD" }] });
  }

  function setField<K extends keyof PODraft>(k: K, v: PODraft[K]) {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  }
  function setItem(idx: number, patch: Partial<POItem>) {
    setDraft((d) => (d ? { ...d, items: d.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) } : d));
  }
  function addItem() {
    setDraft((d) => (d ? { ...d, items: [...d.items, { product_id: null, product_name: null, qty: 0, unit_price: null, unit_currency: "USD" }] } : d));
  }
  function removeItem(idx: number) {
    setDraft((d) => (d ? { ...d, items: d.items.filter((_, i) => i !== idx) } : d));
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    const payload = {
      supplier_id: draft.supplier_id ?? null, reference: draft.reference ?? null,
      fx_usd_brl: draft.fx_usd_brl, fx_cny_brl: draft.fx_cny_brl, freight_usd: draft.freight_usd,
      storage_cost: draft.storage_cost, broker_cost: draft.broker_cost, transport_cost: draft.transport_cost,
      other_cost: draft.other_cost, icms_rate: draft.icms_rate, fti_rate: draft.fti_rate,
      expected_arrival: draft.expected_arrival || null,
      items: draft.items.filter((it) => it.product_id || (it.qty && it.qty > 0)),
    };
    try {
      const res = draft._isNew
        ? await fetch("/api/admin/purchase-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch(`/api/admin/purchase-orders/${draft.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await res.json().catch(() => null);
      if (res.ok) { setDraft(null); await fetchAll(); }
      else { if (res.status === 503) setMigrationMissing(true); alert(j?.error || "Falha ao salvar."); }
    } catch { alert("Falha de rede."); }
    setSaving(false);
  }

  async function setStatus(po: PO, status: string) {
    await fetch(`/api/admin/purchase-orders/${po.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await fetchAll();
  }

  async function receive(po: PO, updateCosts: boolean) {
    if (!confirm(`Dar entrada no estoque de "${po.reference || "PO"}"? Isso soma as quantidades ao estoque${updateCosts ? " e atualiza o custo de cada produto" : ""}.`)) return;
    const res = await fetch(`/api/admin/purchase-orders/${po.id}?action=receive`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updateCosts }),
    });
    const j = await res.json().catch(() => null);
    if (res.ok) await fetchAll();
    else alert(j?.error || "Falha ao receber.");
  }

  async function delPo(po: PO) {
    if (!confirm("Excluir este pedido de compra?")) return;
    await fetch(`/api/admin/purchase-orders/${po.id}`, { method: "DELETE" });
    await fetchAll();
  }

  async function addSupplier() {
    const name = newSupplier.trim();
    if (!name) return;
    const res = await fetch("/api/admin/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const j = await res.json().catch(() => null);
    if (res.ok && j?.id) { setSuppliers((s) => [...s, j]); setDraft((d) => (d ? { ...d, supplier_id: j.id } : d)); setNewSupplier(""); }
    else { if (res.status === 503) setMigrationMissing(true); alert(j?.error || "Falha ao adicionar fornecedor."); }
  }

  if (loading) {
    return (<div><PageHeader title="Compras & Importação" subtitle="Carregando…" /><div className="flex justify-center py-16"><Spinner /></div></div>);
  }

  const fxLabel = (r: number | null) => (r ? r.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : "—");

  return (
    <div>
      <PageHeader
        title="Compras & Importação"
        subtitle="Planeje compras a partir do estoque e calcule o custo de importação em tempo real."
        actions={<button onClick={() => openNew()} className={btnPrimary}>+ Novo pedido de compra</button>}
      />

      {error && <div className="mb-4 bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-xs font-[var(--font-inter)]">{error}</div>}
      {migrationMissing && (
        <div className="mb-6 bg-yellow-50 border border-yellow-300 px-4 py-3 text-yellow-900 text-xs font-[var(--font-inter)]">
          Rode a migração <b>039</b> (compras/importação) no Supabase para salvar fornecedores e pedidos de compra.
        </div>
      )}

      {/* ── Live FX ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Dólar (USD → BRL)" value={fxLabel(fx.usd_brl)} hint={fx.stale ? "cotação indisponível — informe manual" : `fonte: ${fx.source}`} tone={fx.usd_brl ? "default" : "warn"} />
        <KpiCard label="Yuan / RMB (CNY → BRL)" value={fxLabel(fx.cny_brl)} hint={fx.cny_usd ? `1 USD ≈ ${(1 / fx.cny_usd).toFixed(2)} RMB` : "—"} tone={fx.cny_brl ? "default" : "warn"} />
        <div className={`${cardCls} border-l-4 border-l-[#002045] p-5 flex flex-col justify-between`}>
          <div>
            <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1.5">Cotações</p>
            <p className="text-xs text-[#43474e] font-[var(--font-inter)]">{fx.updated_at ? `Atualizado ${new Date(fx.updated_at).toLocaleString("pt-BR")}` : "—"}</p>
          </div>
          <button onClick={fetchFx} className="text-[10px] tracking-widest uppercase font-bold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors text-left mt-2">↺ Atualizar cotação</button>
        </div>
      </div>

      {/* ── Sugestões de compra ── */}
      <Card title={`Sugestões de compra (${lowStock.length})`} className="mb-6" padded={false}
        action={lowStock.length > 0 ? (
          <button
            onClick={() => openNew(lowStock.map((p) => ({ product_id: p.id, product_name: p.name, qty: Math.max(1, p.reorder_point * 2 - p.available), unit_price: null, unit_currency: "USD" as Currency })))}
            className="text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#3b6934] hover:underline"
          >Gerar pedido com todos →</button>
        ) : undefined}
      >
        {lowStock.length === 0 ? (
          <p className="px-5 py-6 text-xs text-[#74777f] font-[var(--font-inter)]">Todos os produtos estão acima do estoque mínimo. 🎉</p>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {lowStock.map((p) => {
              const suggest = Math.max(1, p.reorder_point * 2 - p.available);
              return (
                <div key={p.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#002045] truncate">{p.name}</p>
                    <p className="text-[10px] text-[#74777f]">{p.code} · {p.available} disp. · mín {p.reorder_point}</p>
                  </div>
                  <span className="text-xs text-[#43474e] font-[var(--font-inter)]">sugestão: <b>{suggest}</b></span>
                  <button
                    onClick={() => openNew([{ product_id: p.id, product_name: p.name, qty: suggest, unit_price: null, unit_currency: "USD" }])}
                    className="text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#3b6934] hover:underline flex-shrink-0"
                  >Comprar →</button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Purchase orders ── */}
      <Card title={`Pedidos de compra (${pos.length})`} padded={false}>
        {pos.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-[#74777f] font-[var(--font-inter)]">Nenhum pedido de compra. Crie um a partir de uma sugestão ou do botão acima.</p>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {pos.map((po) => {
              const meta = PO_STATUS[po.status] ?? PO_STATUS.draft;
              const totals = computeImportCosts({
                fx: { usd_brl: num(po.fx_usd_brl), cny_brl: num(po.fx_cny_brl) },
                items: po.items.map((it) => ({ qty: num(it.qty), unit_price: num(it.unit_price), unit_currency: it.unit_currency })),
                freight_usd: po.freight_usd, storage_cost: po.storage_cost, broker_cost: po.broker_cost,
                transport_cost: po.transport_cost, other_cost: po.other_cost, icms_rate: po.icms_rate, fti_rate: po.fti_rate,
              });
              return (
                <div key={po.id} className="px-5 py-3.5 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[#002045] truncate">{po.reference || "PO sem referência"}</p>
                      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                    </div>
                    <p className="text-[10px] text-[#74777f]">
                      {[po.supplier_name, `${po.items.length} ${po.items.length === 1 ? "item" : "itens"}`, po.expected_arrival ? `chega ${new Date(po.expected_arrival).toLocaleDateString("pt-BR")}` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#002045]">{fmtBRL(totals.grandTotalBRL)}</p>
                    <p className="text-[9px] text-[#74777f]">custo total estimado</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => openEdit(po)} className="text-[10px] text-[#002045] font-bold hover:underline">Abrir</button>
                    {po.status !== "received" && po.status !== "cancelled" && (
                      <button onClick={() => receive(po, true)} className="text-[10px] text-[#3b6934] font-bold hover:underline">Receber →</button>
                    )}
                    <button onClick={() => delPo(po)} className="text-[10px] text-red-500 font-bold hover:underline">Excluir</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Editor modal ── */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl my-6" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#002045] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <p className="text-white font-[var(--font-noto-serif)] text-lg">{draft._isNew ? "Novo pedido de compra" : (draft.reference || "Pedido de compra")}</p>
              <button onClick={() => setDraft(null)} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Header fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Referência</label>
                  <input className={inputCls} value={draft.reference ?? ""} onChange={(e) => setField("reference", e.target.value)} placeholder="ex: Container BAMBOO 11/2026" />
                </div>
                <div>
                  <label className={labelCls}>Fornecedor</label>
                  <div className="flex gap-2">
                    <select className={inputCls} value={draft.supplier_id ?? ""} onChange={(e) => setField("supplier_id", e.target.value || null)}>
                      <option value="">Sem fornecedor</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2 mt-1.5">
                    <input className={`${inputCls} text-xs py-1.5`} value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} placeholder="Novo fornecedor…" />
                    <button type="button" onClick={addSupplier} className={`${btnGhost} px-3 py-1.5 text-[10px]`}>+ Add</button>
                  </div>
                </div>
              </div>

              {/* FX + rates */}
              <div className="border border-[#e2e2e2] p-3">
                <SectionLabel>Câmbio e impostos (deste pedido)</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  <div><label className={labelCls}>USD → BRL</label><input type="number" className={inputCls} value={draft.fx_usd_brl ?? ""} onChange={(e) => setField("fx_usd_brl", e.target.value === "" ? null : Number(e.target.value))} /></div>
                  <div><label className={labelCls}>RMB → BRL</label><input type="number" className={inputCls} value={draft.fx_cny_brl ?? ""} onChange={(e) => setField("fx_cny_brl", e.target.value === "" ? null : Number(e.target.value))} /></div>
                  <div><label className={labelCls}>ICMS %</label><input type="number" className={inputCls} value={draft.icms_rate != null ? draft.icms_rate * 100 : ""} onChange={(e) => setField("icms_rate", e.target.value === "" ? null : Number(e.target.value) / 100)} /></div>
                  <div><label className={labelCls}>FTI %</label><input type="number" className={inputCls} value={draft.fti_rate != null ? draft.fti_rate * 100 : ""} onChange={(e) => setField("fti_rate", e.target.value === "" ? null : Number(e.target.value) / 100)} /></div>
                </div>
                <button type="button" onClick={() => setDraft((d) => (d ? { ...d, fx_usd_brl: fx.usd_brl, fx_cny_brl: fx.cny_brl } : d))} className="text-[10px] tracking-widest uppercase font-bold font-[var(--font-inter)] text-[#3b6934] hover:underline mt-2">↺ Usar cotação ao vivo (USD {fxLabel(fx.usd_brl)} · RMB {fxLabel(fx.cny_brl)})</button>
              </div>

              {/* Items */}
              <div className="border border-[#e2e2e2] p-3">
                <SectionLabel>Itens</SectionLabel>
                <div className="space-y-2 mt-2">
                  {draft.items.map((it, idx) => {
                    const line = preview?.lines[idx];
                    return (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <select
                          className={`${inputCls} flex-1 min-w-[160px] py-1.5 text-xs`}
                          value={it.product_id ?? ""}
                          onChange={(e) => { const p = productById(e.target.value); setItem(idx, { product_id: e.target.value || null, product_name: p?.name ?? it.product_name }); }}
                        >
                          <option value="">— produto —</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>)}
                        </select>
                        <input type="number" className={`${inputCls} w-20 py-1.5 text-xs text-right`} placeholder="qtd" value={it.qty || ""} onChange={(e) => setItem(idx, { qty: Number(e.target.value) || 0 })} />
                        <input type="number" className={`${inputCls} w-24 py-1.5 text-xs text-right`} placeholder="preço" value={it.unit_price ?? ""} onChange={(e) => setItem(idx, { unit_price: e.target.value === "" ? null : Number(e.target.value) })} />
                        <select className={`${inputCls} w-20 py-1.5 text-xs`} value={it.unit_currency} onChange={(e) => setItem(idx, { unit_currency: e.target.value as Currency })}>
                          <option value="USD">USD</option>
                          <option value="CNY">RMB</option>
                          <option value="BRL">BRL</option>
                        </select>
                        <span className="text-[10px] text-[#74777f] w-24 text-right">{line && line.landedUnitBRL > 0 ? `${fmtBRL(line.landedUnitBRL)}/un` : ""}</span>
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-lg leading-none px-1">×</button>
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={addItem} className="text-[10px] tracking-widest uppercase font-bold font-[var(--font-inter)] text-[#002045] hover:underline mt-2">+ Adicionar item</button>
              </div>

              {/* Shipment costs */}
              <div className="border border-[#e2e2e2] p-3">
                <SectionLabel>Frete e despesas</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  <div><label className={labelCls}>Frete (USD)</label><input type="number" className={inputCls} value={draft.freight_usd ?? ""} onChange={(e) => setField("freight_usd", e.target.value === "" ? null : Number(e.target.value))} /></div>
                  <div><label className={labelCls}>Armazenagem (BRL)</label><input type="number" className={inputCls} value={draft.storage_cost ?? ""} onChange={(e) => setField("storage_cost", e.target.value === "" ? null : Number(e.target.value))} /></div>
                  <div><label className={labelCls}>Despachante (BRL)</label><input type="number" className={inputCls} value={draft.broker_cost ?? ""} onChange={(e) => setField("broker_cost", e.target.value === "" ? null : Number(e.target.value))} /></div>
                  <div><label className={labelCls}>Transporte (BRL)</label><input type="number" className={inputCls} value={draft.transport_cost ?? ""} onChange={(e) => setField("transport_cost", e.target.value === "" ? null : Number(e.target.value))} /></div>
                  <div><label className={labelCls}>SISCOMEX/outros (BRL)</label><input type="number" className={inputCls} value={draft.other_cost ?? ""} onChange={(e) => setField("other_cost", e.target.value === "" ? null : Number(e.target.value))} /></div>
                  <div><label className={labelCls}>Chegada prevista</label><input type="date" className={inputCls} value={draft.expected_arrival ?? ""} onChange={(e) => setField("expected_arrival", e.target.value || null)} /></div>
                </div>
              </div>

              {/* Live cost summary */}
              {preview && (
                <div className="bg-[#002045] p-5 text-white">
                  <p className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#86a0cd] mb-3">Custo de importação estimado (BRL)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm font-[var(--font-inter)]">
                    <div className="flex justify-between"><span className="text-white/60">FOB (produtos)</span><span>{fmtBRL(preview.fobTotalBRL)}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Frete</span><span>{fmtBRL(preview.freightBRL)}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">ICMS</span><span>{fmtBRL(preview.icmsBRL)}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">FTI</span><span>{fmtBRL(preview.ftiBRL)}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Despesas</span><span>{fmtBRL(preview.otherBRL)}</span></div>
                    <div className="flex justify-between border-t border-white/15 pt-2 mt-1 sm:col-span-3">
                      <span className="font-bold">Custo total</span>
                      <span className="font-[var(--font-noto-serif)] text-xl">{fmtBRL(preview.grandTotalBRL)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Status + actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                {!draft._isNew && draft.id && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#74777f] uppercase tracking-wider font-bold font-[var(--font-inter)]">Status:</span>
                    {STATUS_FLOW.map((s) => (
                      <button key={s} onClick={() => draft.id && setStatus(draft as PO, s)} className={`text-[10px] font-bold px-2.5 py-1 border transition-colors ${draft.status === s ? "bg-[#002045] text-white border-[#002045]" : "text-[#74777f] border-[#e2e2e2] hover:border-[#002045]"}`}>{PO_STATUS[s].label}</button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 ml-auto">
                  <button onClick={() => setDraft(null)} className={btnGhost}>Cancelar</button>
                  <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Salvando…" : draft._isNew ? "Criar pedido" : "Salvar"}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
