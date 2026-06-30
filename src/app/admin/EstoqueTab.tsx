"use client";

import React, { useState, useEffect, useCallback } from "react";

interface StockProduct {
  id: string;
  name: string;
  code: string | null;
  linha: string | null;
  price: number | null;
  cost_price: number | null;
  sale_unit: string | null;
  stock_on_hand: number;
  stock_reserved: number;
  reorder_point: number;
  available: number;
  stock_value: number;
  low: boolean;
  is_active: boolean;
}

type ManualExitType = "sale" | "loss" | "sample" | "internal";

interface Movement {
  id: string;
  kind: string;
  on_hand_delta: number;
  reserved_delta: number;
  reason: string | null;
  manual_exit_type?: ManualExitType | null;
  sale_amount?: number | null;
  created_by: string | null;
  created_at: string;
  pedido_id: string | null;
  // The order's CURRENT stock_state (not this movement's own kind) — tells us
  // whether THIS reservation is still the live one, or has since been
  // delivered/released by a later movement. Without it, every historical
  // "reserve" row looks cancellable even when only one (at most) still is.
  pedido_stock_state?: string | null;
}

const KIND_LABEL: Record<string, string> = {
  manual_in: "Entrada", manual_out: "Saída", adjust: "Ajuste",
  reserve: "Reservado", release: "Liberado", consume: "Baixa (entregue)", return: "Devolução",
};
const EXIT_LABEL: Record<ManualExitType, string> = {
  sale: "Venda avulsa",
  loss: "Perda/quebra",
  sample: "Amostra",
  internal: "Uso interno",
};

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function EstoqueTab() {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [movements, setMovements] = useState<Record<string, Movement[]>>({});
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/stock");
    const j = await res.json();
    if (res.ok) {
      setProducts(j.products ?? []);
      setTotalValue(j.total_value ?? 0);
    } else {
      setError(j.error || "Falha ao carregar o estoque.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  async function move(
    productId: string,
    kind: "manual_in" | "manual_out" | "adjust",
    qty: number,
    reason: string,
    opts?: { manual_exit_type?: ManualExitType | null; sale_amount?: number | null }
  ) {
    const res = await fetch("/api/admin/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, kind, qty, reason, ...opts }),
    });
    if (res.ok) {
      await fetchStock();
      if (expandedId === productId) loadMovements(productId, true);
    } else {
      const j = await res.json().catch(() => null);
      alert(j?.error || "Falha ao registrar movimento.");
    }
  }

  async function patchProduct(productId: string, patch: { price?: number | null; cost_price?: number | null; sale_unit?: string; reorder_point?: number }) {
    setProducts((cur) => cur.map((p) => (p.id === productId ? { ...p, ...patch } : p)));
    await fetch(`/api/admin/stock/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(() => fetchStock()).catch(() => {});
  }

  // Cancels a still-active reservation (frees it back to "available") without
  // touching the order's items or other fields. Server-side guards against
  // double-releasing one that's already been freed or consumed.
  async function cancelReservation(productId: string, pedidoId: string) {
    if (!confirm("Cancelar esta reserva e devolver a quantidade para disponível?")) return;
    const res = await fetch("/api/admin/stock/release-reservation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedido_id: pedidoId }),
    });
    if (res.ok) {
      await fetchStock();
      loadMovements(productId, true);
    } else {
      const j = await res.json().catch(() => null);
      alert(j?.error || "Falha ao cancelar a reserva.");
    }
  }

  const loadMovements = useCallback(async (productId: string, force = false) => {
    if (!force && movements[productId]) return;
    const res = await fetch(`/api/admin/stock/${productId}`);
    if (res.ok) {
      const data = await res.json();
      setMovements((cur) => ({ ...cur, [productId]: data }));
    }
  }, [movements]);

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    loadMovements(id);
  }

  const lowCount = products.filter((p) => p.low).length;
  const visible = products.filter((p) => {
    if (lowOnly && !p.low) return false;
    const q = search.trim().toLowerCase();
    if (q && !(`${p.name} ${p.code ?? ""}`.toLowerCase().includes(q))) return false;
    return true;
  });

  return (
    <div className="mb-10">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Modelos", value: String(products.length), sub: "" },
          { label: "Itens em estoque", value: String(products.reduce((s, p) => s + p.stock_on_hand, 0)), sub: `${products.reduce((s, p) => s + p.stock_reserved, 0)} reservados` },
          { label: "Valor do estoque", value: fmtBRL(totalValue), sub: "a preço de custo" },
          { label: "Abaixo do mínimo", value: String(lowCount), sub: lowCount > 0 ? "repor" : "ok" },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-[#e2e2e2] px-4 py-3">
            <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">{m.label}</p>
            <p className="text-[#002045] text-lg font-[var(--font-noto-serif)] mt-0.5">{m.value}</p>
            {m.sub && <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)]">{m.sub}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar modelo…"
          className="flex-1 min-w-[160px] border border-[#e2e2e2] px-3 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
        <label className="flex items-center gap-2 text-xs font-[var(--font-inter)] text-[#43474e]">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Só abaixo do mínimo
        </label>
        <button onClick={fetchStock} className="text-[11px] uppercase font-bold font-[var(--font-inter)] border border-[#e2e2e2] px-3 py-2 hover:border-[#002045] text-[#002045]">Atualizar</button>
      </div>

      {error && <p className="text-red-600 text-sm font-[var(--font-inter)] mb-4">{error}</p>}
      {loading ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
      ) : (
        <div className="space-y-3">
          {visible.map((p) => (
            <StockRow
              key={p.id}
              p={p}
              expanded={expandedId === p.id}
              movements={movements[p.id] ?? null}
              onToggle={() => toggleExpand(p.id)}
              onMove={(kind, qty, reason, opts) => move(p.id, kind, qty, reason, opts)}
              onPatch={(patch) => patchProduct(p.id, patch)}
              onCancelReservation={(pedidoId) => cancelReservation(p.id, pedidoId)}
            />
          ))}
          {visible.length === 0 && <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhum modelo.</p>}
        </div>
      )}
    </div>
  );
}

function StockRow({
  p, expanded, movements, onToggle, onMove, onPatch, onCancelReservation,
}: {
  p: StockProduct;
  expanded: boolean;
  movements: Movement[] | null;
  onToggle: () => void;
  onMove: (kind: "manual_in" | "manual_out" | "adjust", qty: number, reason: string, opts?: { manual_exit_type?: ManualExitType | null; sale_amount?: number | null }) => void;
  onPatch: (patch: { price?: number | null; cost_price?: number | null; sale_unit?: string; reorder_point?: number }) => void;
  onCancelReservation: (pedidoId: string) => void;
}) {
  const [mode, setMode] = useState<"manual_in" | "manual_out" | "adjust" | null>(null);
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [exitType, setExitType] = useState<ManualExitType>("loss");
  const [saleAmount, setSaleAmount] = useState("");
  const unitProfit = p.price != null && p.cost_price != null ? p.price - p.cost_price : null;
  const unitMargin = p.price && unitProfit != null ? Math.round((unitProfit / p.price) * 100) : null;
  const qtyNumber = Number(qty);
  const suggestedSaleAmount = Number.isFinite(qtyNumber) && qtyNumber > 0 ? qtyNumber * (Number(p.price) || 0) : 0;

  function submit() {
    const n = Number(qty);
    if (!Number.isFinite(n) || n < 0) return;
    const manualOpts = mode === "manual_out"
      ? {
          manual_exit_type: exitType,
          sale_amount: exitType === "sale" ? Number(saleAmount || suggestedSaleAmount || 0) : null,
        }
      : undefined;
    onMove(mode!, n, reason, manualOpts);
    setMode(null); setQty(""); setReason(""); setSaleAmount(""); setExitType("loss");
  }

  return (
    <div className={`bg-white border ${p.low ? "border-l-4 border-l-amber-500 border-[#e2e2e2]" : "border-[#e2e2e2]"}`}>
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{p.name}</span>
              {p.code && <span className="text-[#74777f] text-[11px] font-[var(--font-inter)]">{p.code}</span>}
              {p.low && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800">Abaixo do mínimo</span>}
              {!p.is_active && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-500">Inativo</span>}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
              <Stat label="Em estoque" value={String(p.stock_on_hand)} strong />
              <Stat label="Reservado" value={String(p.stock_reserved)} />
              <Stat label="Disponível" value={String(p.available)} strong tone={p.available <= 0 ? "danger" : "ok"} />
              <Stat label={`Venda/${p.sale_unit || "placa"}`} value={p.price != null ? fmtBRL(p.price) : "—"} />
              <Stat label="Margem" value={unitMargin != null ? `${fmtBRL(unitProfit!)} · ${unitMargin}%` : "—"} />
              <Stat label="Valor estoque" value={p.cost_price ? fmtBRL(p.stock_value) : "—"} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {(["manual_in", "manual_out", "adjust"] as const).map((k) => (
              <button key={k} onClick={() => { setMode(mode === k ? null : k); setQty(""); setReason(""); setSaleAmount(""); setExitType("loss"); }}
                className={`text-[10px] uppercase tracking-[0.06em] font-bold font-[var(--font-inter)] px-2.5 py-1.5 border transition-colors ${mode === k ? "bg-[#002045] text-white border-[#002045]" : "border-[#e2e2e2] text-[#002045] hover:border-[#002045]"}`}>
                {k === "manual_in" ? "+ Entrada" : k === "manual_out" ? "− Saída" : "Ajustar"}
              </button>
            ))}
          </div>
        </div>

        {mode && (
          <div className="flex flex-wrap items-center gap-2 mt-3 bg-[#fafafa] border border-[#f0f0f0] px-3 py-2.5">
            <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus
              placeholder={mode === "adjust" ? "Nova contagem" : "Quantidade"}
              className="w-28 border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
            {mode === "manual_out" && (
              <>
                <select value={exitType} onChange={(e) => setExitType(e.target.value as ManualExitType)}
                  className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
                  <option value="sale">Venda avulsa</option>
                  <option value="loss">Perda/quebra</option>
                  <option value="sample">Amostra</option>
                  <option value="internal">Uso interno</option>
                </select>
                {exitType === "sale" && (
                  <input type="number" min="0" step="0.01" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)}
                    placeholder={suggestedSaleAmount ? `Venda ${fmtBRL(suggestedSaleAmount)}` : "Valor da venda"}
                    className="w-36 border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                )}
              </>
            )}
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)"
              className="flex-1 min-w-[140px] border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
            <button onClick={submit} className="bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] px-4 py-1.5 hover:bg-[#1a365d]">Confirmar</button>
            <button onClick={() => setMode(null)} className="text-[#74777f] text-xs px-2 py-1.5 hover:text-[#002045]">Cancelar</button>
          </div>
        )}

        {/* Pricing + reorder editing */}
        <div className="flex flex-wrap items-center gap-4 mt-3">
          <label className="flex items-center gap-2 text-[11px] font-[var(--font-inter)] text-[#74777f]">
            Preço venda/{p.sale_unit || "placa"}
            <input type="number" min="0" step="0.01" defaultValue={p.price ?? ""} placeholder="—"
              onBlur={(e) => {
                const raw = e.target.value.trim();
                const v = raw === "" ? null : Number(raw);
                if ((v === null && p.price !== null) || (typeof v === "number" && Number.isFinite(v) && v !== p.price)) onPatch({ price: v });
              }}
              className="w-28 border border-[#e2e2e2] px-2 py-1 text-xs text-[#002045] focus:outline-none focus:border-[#002045]" />
          </label>
          <label className="flex items-center gap-2 text-[11px] font-[var(--font-inter)] text-[#74777f]">
            Unidade venda
            <input defaultValue={p.sale_unit || "placa"} placeholder="placa"
              onBlur={(e) => {
                const v = e.target.value.trim() || "placa";
                if (v !== (p.sale_unit || "placa")) onPatch({ sale_unit: v });
              }}
              className="w-24 border border-[#e2e2e2] px-2 py-1 text-xs text-[#002045] focus:outline-none focus:border-[#002045]" />
          </label>
          <label className="flex items-center gap-2 text-[11px] font-[var(--font-inter)] text-[#74777f]">
            Custo/{p.sale_unit || "placa"}
            <input type="number" min="0" step="0.01" defaultValue={p.cost_price ?? ""} placeholder="—"
              onBlur={(e) => {
                const raw = e.target.value.trim();
                const v = raw === "" ? null : Number(raw);
                if ((v === null && p.cost_price !== null) || (typeof v === "number" && Number.isFinite(v) && v !== p.cost_price)) onPatch({ cost_price: v });
              }}
              className="w-24 border border-[#e2e2e2] px-2 py-1 text-xs text-[#002045] focus:outline-none focus:border-[#002045]" />
          </label>
          <label className="flex items-center gap-2 text-[11px] font-[var(--font-inter)] text-[#74777f]">
            Estoque mínimo
            <input type="number" min="0" defaultValue={p.reorder_point || ""} placeholder="0"
              onBlur={(e) => { const v = Number(e.target.value || 0); if (v !== p.reorder_point) onPatch({ reorder_point: v }); }}
              className="w-20 border border-[#e2e2e2] px-2 py-1 text-xs text-[#002045] focus:outline-none focus:border-[#002045]" />
          </label>
          <button onClick={onToggle} className="ml-auto text-[11px] text-[#002045] font-bold font-[var(--font-inter)] hover:underline">
            {expanded ? "Ocultar movimentos ▲" : "Ver movimentos ▼"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#e2e2e2] px-4 py-3 bg-[#fafafa]">
          {!movements ? (
            <p className="text-[#74777f] text-xs font-[var(--font-inter)]">Carregando...</p>
          ) : movements.length === 0 ? (
            <p className="text-[#74777f] text-xs font-[var(--font-inter)]">Nenhum movimento registrado.</p>
          ) : (
            <div className="space-y-1.5">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 text-xs font-[var(--font-inter)]">
                  <span className="text-[#002045] font-semibold w-28">{KIND_LABEL[m.kind] ?? m.kind}</span>
                  <span className="text-[#43474e] flex-1">
                    {m.on_hand_delta !== 0 && <span className={m.on_hand_delta > 0 ? "text-green-700" : "text-red-700"}>{m.on_hand_delta > 0 ? "+" : ""}{m.on_hand_delta} estoque </span>}
                    {m.reserved_delta !== 0 && <span className="text-blue-700">{m.reserved_delta > 0 ? "+" : ""}{m.reserved_delta} reserva </span>}
                    {m.manual_exit_type && <span>· {EXIT_LABEL[m.manual_exit_type]} </span>}
                    {m.manual_exit_type === "sale" && m.sale_amount != null && <span>· {fmtBRL(Number(m.sale_amount) || 0)} </span>}
                    {m.reason ? `· ${m.reason}` : ""}
                  </span>
                  {m.kind === "reserve" && m.pedido_id && (
                    m.pedido_stock_state === "reserved" ? (
                      <button
                        onClick={() => onCancelReservation(m.pedido_id as string)}
                        className="text-[#b42318] font-bold hover:underline whitespace-nowrap"
                        title="Cancelar esta reserva e devolver ao disponível"
                      >
                        Cancelar reserva
                      </button>
                    ) : (
                      // This reservation has already been delivered or
                      // released by a later movement — nothing to cancel.
                      <span className="text-[#b0b0b0] whitespace-nowrap" title="Esta reserva já foi liberada ou baixada">
                        (já resolvida)
                      </span>
                    )
                  )}
                  <span className="text-[#b0b0b0] whitespace-nowrap">{fmtDateTime(m.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "ok" | "danger" }) {
  const color = tone === "danger" ? "text-red-600" : tone === "ok" ? "text-[#2f5429]" : "text-[#002045]";
  return (
    <div>
      <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">{label}</p>
      <p className={`${strong ? "font-semibold" : ""} ${color} text-sm font-[var(--font-inter)] mt-0.5`}>{value}</p>
    </div>
  );
}
