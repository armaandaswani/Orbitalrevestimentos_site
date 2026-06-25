"use client";

import React, { useState, useEffect, useCallback } from "react";

interface StockProduct {
  id: string;
  name: string;
  code: string | null;
  linha: string | null;
  price: number | null;
  cost_price: number | null;
  stock_on_hand: number;
  stock_reserved: number;
  reorder_point: number;
  available: number;
  stock_value: number;
  low: boolean;
  is_active: boolean;
}

interface Movement {
  id: string;
  kind: string;
  on_hand_delta: number;
  reserved_delta: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  pedido_id: string | null;
}

const KIND_LABEL: Record<string, string> = {
  manual_in: "Entrada", manual_out: "Saída", adjust: "Ajuste",
  reserve: "Reservado", release: "Liberado", consume: "Baixa (entregue)", return: "Devolução",
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

  async function move(productId: string, kind: "manual_in" | "manual_out" | "adjust", qty: number, reason: string) {
    const res = await fetch("/api/admin/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, kind, qty, reason }),
    });
    if (res.ok) {
      await fetchStock();
      if (expandedId === productId) loadMovements(productId, true);
    } else {
      const j = await res.json().catch(() => null);
      alert(j?.error || "Falha ao registrar movimento.");
    }
  }

  async function patchProduct(productId: string, patch: { cost_price?: number; reorder_point?: number }) {
    setProducts((cur) => cur.map((p) => (p.id === productId ? { ...p, ...patch } : p)));
    await fetch(`/api/admin/stock/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(() => fetchStock()).catch(() => {});
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
          { label: "Placas em estoque", value: String(products.reduce((s, p) => s + p.stock_on_hand, 0)), sub: `${products.reduce((s, p) => s + p.stock_reserved, 0)} reservadas` },
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
              onMove={(kind, qty, reason) => move(p.id, kind, qty, reason)}
              onPatch={(patch) => patchProduct(p.id, patch)}
            />
          ))}
          {visible.length === 0 && <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhum modelo.</p>}
        </div>
      )}
    </div>
  );
}

function StockRow({
  p, expanded, movements, onToggle, onMove, onPatch,
}: {
  p: StockProduct;
  expanded: boolean;
  movements: Movement[] | null;
  onToggle: () => void;
  onMove: (kind: "manual_in" | "manual_out" | "adjust", qty: number, reason: string) => void;
  onPatch: (patch: { cost_price?: number; reorder_point?: number }) => void;
}) {
  const [mode, setMode] = useState<"manual_in" | "manual_out" | "adjust" | null>(null);
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");

  function submit() {
    const n = Number(qty);
    if (!Number.isFinite(n) || n < 0) return;
    onMove(mode!, n, reason);
    setMode(null); setQty(""); setReason("");
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
              <Stat label="Valor" value={p.cost_price ? fmtBRL(p.stock_value) : "—"} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {(["manual_in", "manual_out", "adjust"] as const).map((k) => (
              <button key={k} onClick={() => { setMode(mode === k ? null : k); setQty(""); setReason(""); }}
                className={`text-[10px] uppercase tracking-[0.06em] font-bold font-[var(--font-inter)] px-2.5 py-1.5 border transition-colors ${mode === k ? "bg-[#002045] text-white border-[#002045]" : "border-[#e2e2e2] text-[#002045] hover:border-[#002045]"}`}>
                {k === "manual_in" ? "+ Entrada" : k === "manual_out" ? "− Saída" : "Ajustar"}
              </button>
            ))}
          </div>
        </div>

        {mode && (
          <div className="flex flex-wrap items-center gap-2 mt-3 bg-[#fafafa] border border-[#f0f0f0] px-3 py-2.5">
            <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus
              placeholder={mode === "adjust" ? "Nova contagem" : "Placas"}
              className="w-28 border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)"
              className="flex-1 min-w-[140px] border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
            <button onClick={submit} className="bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] px-4 py-1.5 hover:bg-[#1a365d]">Confirmar</button>
            <button onClick={() => setMode(null)} className="text-[#74777f] text-xs px-2 py-1.5 hover:text-[#002045]">Cancelar</button>
          </div>
        )}

        {/* Cost + reorder editing */}
        <div className="flex flex-wrap items-center gap-4 mt-3">
          <label className="flex items-center gap-2 text-[11px] font-[var(--font-inter)] text-[#74777f]">
            Custo/placa
            <input type="number" min="0" defaultValue={p.cost_price ?? ""} placeholder="—"
              onBlur={(e) => { const v = Number(e.target.value); if (e.target.value !== "" && v !== p.cost_price) onPatch({ cost_price: v }); }}
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
                    {m.reason ? `· ${m.reason}` : ""}
                  </span>
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
