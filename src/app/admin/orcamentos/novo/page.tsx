"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "../../AdminShell";
import { btnGhost, btnPrimary, inputCls, labelCls } from "../../ui";
import { DEFAULT_PANEL_WIDTH_M, DEFAULT_PANEL_HEIGHT_M, panelGrid } from "@/lib/render-prompt";
import { APPLICATION_LABELS, applicationReasonLabel, materialDisplayName, type ApplicationType } from "@/lib/orcamento-materials";
import type { OrcamentoBreakdown } from "@/lib/orcamento-pricing";

/**
 * Criar um orçamento direto pelo painel, sem passar pelo simulador do cliente.
 *
 * O admin informa as MEDIDAS e o sistema faz o resto: placas pela mesma conta do
 * simulador (panelGrid, que considera o recorte real), preço pela tabela do
 * produto em varejo ou atacado, e os materiais de instalação conforme o tipo de
 * aplicação de cada ambiente. Toda quantidade continua editável à mão.
 */

interface Product { id: string; code: string; name: string; linha: string; price: number; render_panel_width_m?: number | null; render_panel_height_m?: number | null }
interface PricingRow { linha: string; special_price: number; public_price: number }
interface Partner { id: string; name: string; coupon_code: string; status: string }

interface Row {
  key: string;
  spaceName: string;
  productId: string;
  applicationType: ApplicationType;
  mode: "lxa" | "m2";
  width: string;
  height: string;
  sqm: string;
  /** null = segue o cálculo; número = o admin fixou à mão. */
  platesOverride: number | null;
}

const newRow = (): Row => ({
  key: Math.random().toString(36).slice(2),
  spaceName: "", productId: "", applicationType: "parede",
  mode: "lxa", width: "", height: "", sqm: "", platesOverride: null,
});

const num = (s: string) => Number(String(s ?? "").replace(",", "."));

export default function NovoOrcamentoPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pricing, setPricing] = useState<Record<string, PricingRow>>({});
  const [partners, setPartners] = useState<Partner[]>([]);

  const [tier, setTier] = useState<"varejo" | "atacado">("varejo");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [partnerId, setPartnerId] = useState("");

  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [rawBreakdown, setBreakdown] = useState<OrcamentoBreakdown | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [p, pr, pa] = await Promise.all([
        fetch("/api/products?all=true").then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/admin/pricing").then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/admin/partners").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);
      setProducts(Array.isArray(p) ? p : []);
      const map: Record<string, PricingRow> = {};
      for (const r of (Array.isArray(pr) ? pr : []) as PricingRow[]) map[r.linha] = r;
      setPricing(map);
      setPartners(Array.isArray(pa) ? pa.filter((x: Partner) => x.status === "active") : []);
    })();
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  /** Preço por placa: atacado usa o preço especial da linha (aba Preços). */
  const unitPrice = useCallback((prod: Product | undefined): number => {
    if (!prod) return 0;
    if (tier === "atacado") return pricing[prod.linha]?.special_price ?? prod.price;
    return prod.price;
  }, [tier, pricing]);

  /** Placas de uma linha — mesma conta do simulador; override manual vence. */
  const platesOf = useCallback((r: Row): number => {
    if (r.platesOverride != null) return r.platesOverride;
    const prod = productById.get(r.productId);
    const pw = Number(prod?.render_panel_width_m) || DEFAULT_PANEL_WIDTH_M;
    const ph = Number(prod?.render_panel_height_m) || DEFAULT_PANEL_HEIGHT_M;
    if (r.mode === "lxa") {
      const w = num(r.width), h = num(r.height);
      if (!(w > 0 && h > 0)) return 0;
      return panelGrid(w, h, pw, ph).count;
    }
    const m2 = num(r.sqm);
    return m2 > 0 ? Math.max(1, Math.ceil(m2 / (pw * ph))) : 0;
  }, [productById]);

  const areaOf = useCallback((r: Row): number => {
    if (r.mode === "lxa") {
      const w = num(r.width), h = num(r.height);
      return w > 0 && h > 0 ? Number((w * h).toFixed(2)) : 0;
    }
    return num(r.sqm) > 0 ? Number(num(r.sqm).toFixed(2)) : 0;
  }, []);

  const totals = useMemo(() => {
    let plates = 0, material = 0, area = 0;
    for (const r of rows) {
      const p = platesOf(r);
      plates += p;
      area += areaOf(r);
      material += p * unitPrice(productById.get(r.productId));
    }
    return { plates, material: Math.round(material * 100) / 100, area: Number(area.toFixed(2)) };
  }, [rows, platesOf, areaOf, unitPrice, productById]);

  // Composição autoritativa (frete, desconto, parcelas e materiais de
  // instalação) vem do motor — a tela nunca recalcula regra comercial.
  useEffect(() => {
    if (totals.plates <= 0) return; // sem escrever estado no ciclo do efeito
    let cancelled = false;
    fetch("/api/orcamento/pricing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plates: totals.plates,
        pricePerPlate: totals.material / totals.plates,
        spaces: rows.map((r) => ({ plates: platesOf(r), applicationType: r.applicationType })).filter((s) => s.plates > 0),
      }),
    }).then((r) => (r.ok ? r.json() : null)).then((b) => { if (!cancelled) setBreakdown(b); }).catch(() => {});
    return () => { cancelled = true; };
  }, [rows, totals, platesOf]);

  // Sem placas não há composição válida: derivar evita apagar estado dentro do efeito.
  const breakdown = totals.plates > 0 ? rawBreakdown : null;

  const setRow = (key: string, patch: Partial<Row>) =>
    setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const ready = rows.some((r) => r.productId && platesOf(r) > 0) && clientName.trim().length > 0;

  async function save() {
    setSaving(true); setErr(null);
    const partner = partners.find((p) => p.id === partnerId);
    const spaces = rows
      .filter((r) => r.productId && platesOf(r) > 0)
      .map((r) => {
        const prod = productById.get(r.productId)!;
        const plates = platesOf(r);
        const price = unitPrice(prod);
        return {
          spaceName: r.spaceName.trim() || APPLICATION_LABELS[r.applicationType],
          productCode: prod.code, productName: prod.name, productImg: "", linha: prod.linha,
          plates, area: areaOf(r),
          dimLabel: r.mode === "lxa" && num(r.width) > 0 && num(r.height) > 0
            ? `${num(r.width)}m × ${num(r.height)}m` : `${areaOf(r).toFixed(2)} m²`,
          pricePerPlate: price, total: Math.round(plates * price * 100) / 100,
          measurementType: r.mode === "lxa" ? "dimensions" : "square_meters",
          width: r.mode === "lxa" ? num(r.width) || null : null,
          height: r.mode === "lxa" ? num(r.height) || null : null,
          squareMeters: r.mode === "m2" ? num(r.sqm) || null : areaOf(r),
          applicationType: r.applicationType,
        };
      });

    const res = await fetch("/api/quotes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partner_id: partner?.id ?? null,
        partner_name: partner?.name ?? null,
        coupon_code: partner?.coupon_code ?? null,
        spaces,
        total_plates: totals.plates,
        total_area_m2: totals.area,
        material_total: totals.material,
        material_discounted: totals.material,
        client_name: clientName.trim() || null,
        client_email: clientEmail.trim() || null,
        client_phone: clientPhone.trim() || null,
      }),
    }).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) { setErr(`Não foi possível criar o orçamento${res ? ` (HTTP ${res.status})` : ""}.`); return; }
    const j = await res.json().catch(() => null);
    if (!j?.slug) { setErr("O orçamento foi criado, mas o servidor não devolveu o link."); return; }
    setCreated(j.slug);
  }

  const sec = "bg-white border border-[#e2e2e2] mb-6";
  const secHead = "px-4 sm:px-5 py-3.5 border-b border-[#f0f0f0]";
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (created) {
    return (
      <AdminShell active="orcamentos" breadcrumb={[{ label: "Orçamentos", href: "/admin?tab=orcamentos" }, { label: "Novo" }]} title="Orçamento criado">
        <div className="bg-[#eef5ec] border border-[#cfe3ca] px-5 py-5">
          <p className="text-[#2c5226] font-[var(--font-inter)] text-sm font-bold mb-2">Pronto — o link do cliente já existe.</p>
          <p className="text-[#43474e] text-sm font-[var(--font-inter)] mb-4 break-all">/orcamento/{created}</p>
          <div className="flex flex-wrap gap-2">
            <a href={`/orcamento/${created}`} target="_blank" rel="noopener noreferrer" className={btnPrimary}>Abrir orçamento</a>
            <Link href={`/admin/orcamentos/${created}`} className={btnGhost}>Materiais de instalação</Link>
            <button onClick={() => { setCreated(null); setRows([newRow()]); setClientName(""); setClientEmail(""); setClientPhone(""); }} className={btnGhost}>
              Criar outro
            </button>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      active="orcamentos"
      breadcrumb={[{ label: "Orçamentos", href: "/admin?tab=orcamentos" }, { label: "Novo orçamento" }]}
      title="Novo orçamento"
      action={<button onClick={save} disabled={!ready || saving} className={btnPrimary}>{saving ? "Criando…" : "Criar orçamento"}</button>}
    >
      {err && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm font-[var(--font-inter)]">{err}</div>}

      <p className="text-[#74777f] text-[13px] font-[var(--font-inter)] mb-6 max-w-3xl">
        Informe as medidas: o sistema calcula as placas pela mesma conta do simulador, aplica o preço
        de tabela e monta os materiais de instalação. Qualquer quantidade pode ser corrigida à mão.
      </p>

      {/* ── Cliente ─────────────────────────────────────────────────────────── */}
      <section className={sec}>
        <div className={secHead}><h2 className="font-[var(--font-noto-serif)] text-[#002045] text-lg">1 · Cliente</h2></div>
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><label className={labelCls}>Nome *</label><input value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>E-mail</label><input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Telefone</label><input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={inputCls} /></div>
          <div>
            <label className={labelCls}>Parceiro (cupom)</label>
            <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className={inputCls}>
              <option value="">— nenhum —</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.coupon_code})</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* ── Ambientes ───────────────────────────────────────────────────────── */}
      <section className={sec}>
        <div className={secHead}>
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-lg">2 · Ambientes</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">Tabela de preço:</span>
            {(["varejo", "atacado"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTier(t)}
                className={`text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border transition-colors ${tier === t ? "bg-[#002045] text-white border-[#002045]" : "text-[#74777f] border-[#e2e2e2] hover:border-[#002045]"}`}>
                {t}
              </button>
            ))}
            {tier === "atacado" && <span className="text-[10px] text-[#74777f] font-[var(--font-inter)]">Usa o preço especial da linha (aba Preços)</span>}
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {rows.map((r) => {
            const prod = productById.get(r.productId);
            const plates = platesOf(r);
            const price = unitPrice(prod);
            const auto = r.platesOverride == null;
            return (
              <div key={r.key} className="border border-[#e2e2e2] p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Ambiente</label>
                    <input value={r.spaceName} onChange={(e) => setRow(r.key, { spaceName: e.target.value })}
                      placeholder="Ex.: Sala, Lavabo…" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Modelo *</label>
                    <select value={r.productId} onChange={(e) => setRow(r.key, { productId: e.target.value, platesOverride: null })} className={inputCls}>
                      <option value="">— selecione —</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Aplicação</label>
                    <div className="flex gap-1.5">
                      {(["parede", "teto", "forro"] as ApplicationType[]).map((t) => (
                        <button key={t} type="button" onClick={() => setRow(r.key, { applicationType: t })}
                          className={`flex-1 text-[10px] tracking-[0.06em] uppercase font-bold font-[var(--font-inter)] px-2 py-2.5 border transition-colors ${r.applicationType === t ? "bg-[#002045] text-white border-[#002045]" : "text-[#43474e] border-[#e2e2e2] hover:border-[#002045]"}`}>
                          {APPLICATION_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex gap-1.5">
                    {([["lxa", "Largura × altura"], ["m2", "m²"]] as const).map(([m, label]) => (
                      <button key={m} type="button" onClick={() => setRow(r.key, { mode: m, platesOverride: null })}
                        className={`text-[10px] tracking-[0.06em] uppercase font-bold font-[var(--font-inter)] px-2.5 py-2 border transition-colors ${r.mode === m ? "bg-[#002045] text-white border-[#002045]" : "text-[#74777f] border-[#e2e2e2] hover:border-[#002045]"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {r.mode === "lxa" ? (
                    <>
                      <input type="number" min="0" step="0.01" value={r.width} onChange={(e) => setRow(r.key, { width: e.target.value, platesOverride: null })}
                        placeholder="largura (m)" className="w-28 border border-[#e2e2e2] px-2 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                      <span className="text-[#74777f] pb-2">×</span>
                      <input type="number" min="0" step="0.01" value={r.height} onChange={(e) => setRow(r.key, { height: e.target.value, platesOverride: null })}
                        placeholder="altura (m)" className="w-28 border border-[#e2e2e2] px-2 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    </>
                  ) : (
                    <input type="number" min="0" step="0.01" value={r.sqm} onChange={(e) => setRow(r.key, { sqm: e.target.value, platesOverride: null })}
                      placeholder="m²" className="w-28 border border-[#e2e2e2] px-2 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                  )}

                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">Placas</label>
                    <input type="number" min="0" step="1" value={plates || ""}
                      onChange={(e) => setRow(r.key, { platesOverride: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-20 border border-[#e2e2e2] px-2 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    {!auto && (
                      <button type="button" onClick={() => setRow(r.key, { platesOverride: null })}
                        className="text-[10px] font-bold font-[var(--font-inter)] text-[#1e5fb4] hover:underline">auto</button>
                    )}
                  </div>

                  <button type="button" onClick={() => setRows((cur) => (cur.length > 1 ? cur.filter((x) => x.key !== r.key) : cur))}
                    className="ml-auto text-[#b42318] text-lg leading-none px-2 pb-1" title="Remover ambiente">×</button>
                </div>

                {prod && plates > 0 && (
                  <p className="text-[11px] font-[var(--font-inter)] text-[#74777f]">
                    {plates} placa{plates !== 1 ? "s" : ""} × {fmt(price)} = <strong className="text-[#002045]">{fmt(plates * price)}</strong>
                    {" · "}≈ {areaOf(r).toFixed(2)} m²
                    {auto ? " · calculado pelas medidas" : " · quantidade fixada à mão"}
                    {price <= 0 && <span className="text-amber-700"> · modelo sem preço cadastrado</span>}
                  </p>
                )}
              </div>
            );
          })}

          <button type="button" onClick={() => setRows((cur) => [...cur, newRow()])}
            className="text-[11px] font-bold font-[var(--font-inter)] text-[#002045] hover:underline">
            + Adicionar ambiente
          </button>
        </div>
      </section>

      {/* ── Resumo ──────────────────────────────────────────────────────────── */}
      <section className={sec}>
        <div className={secHead}><h2 className="font-[var(--font-noto-serif)] text-[#002045] text-lg">3 · Resumo</h2></div>
        <div className="p-4 sm:p-5">
          {totals.plates === 0 ? (
            <p className="text-[#a0a3a8] text-sm font-[var(--font-inter)]">Informe ao menos um ambiente com modelo e medidas.</p>
          ) : (
            <div className="space-y-2 text-[13px] font-[var(--font-inter)]">
              <div className="flex justify-between"><span className="text-[#43474e]">{totals.plates} placa(s) · {totals.area.toFixed(2)} m²</span><span className="text-[#002045] font-semibold">{fmt(totals.material)}</span></div>

              {(breakdown?.materials ?? []).filter((m) => m.quantity > 0).map((m) => (
                <div key={m.code} className="flex justify-between">
                  <span className="text-[#43474e]">
                    {materialDisplayName(m)} — {m.quantity} {m.unit}{m.quantity !== 1 ? "s" : ""}
                    <span className="text-[#a0a3a8]"> · auto para {applicationReasonLabel(m.reasons).toLowerCase()}</span>
                  </span>
                  <span className="text-[#002045]">{m.unitPrice > 0 ? fmt(m.total) : "—"}</span>
                </div>
              ))}

              {breakdown && (
                <>
                  <div className="flex justify-between"><span className="text-[#43474e]">Frete</span><span className="text-[#002045]">{breakdown.frete.free ? "Grátis" : fmt(breakdown.frete.value)}</span></div>
                  <div className="flex justify-between border-t border-[#e2e2e2] pt-2 mt-2 font-bold">
                    <span className="text-[#002045]">Total</span><span className="text-[#002045]">{fmt(breakdown.totalFull)}</span>
                  </div>
                </>
              )}

              {[...(breakdown?.warnings ?? []), ...(breakdown?.adminWarnings ?? [])].map((w, i) => (
                <p key={i} className="text-[12px] text-amber-800">• {w}</p>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={!ready || saving} className={btnPrimary}>{saving ? "Criando…" : "Criar orçamento"}</button>
        <Link href="/admin?tab=orcamentos" className={btnGhost}>Cancelar</Link>
        {!ready && <p className="text-[#74777f] text-[12px] font-[var(--font-inter)] self-center">Falta o nome do cliente e ao menos um ambiente com modelo e medidas.</p>}
      </div>
    </AdminShell>
  );
}
