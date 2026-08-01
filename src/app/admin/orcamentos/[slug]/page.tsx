"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "../../AdminShell";
import { btnGhost, btnPrimary } from "../../ui";
import {
  APPLICATION_LABELS,
  applicationReasonLabel,
  materialDisplayName,
  type ApplicationType,
} from "@/lib/orcamento-materials";
import type { OrcamentoBreakdown } from "@/lib/orcamento-pricing";

/**
 * Materiais de instalação de um orçamento: tipo de aplicação por espaço e
 * ajuste manual das quantidades calculadas (§9).
 *
 * O cálculo técnico continua visível ao lado do ajuste — falta de estoque vira
 * aviso, nunca reduz a quantidade que a obra precisa.
 */

interface QuoteSpace {
  spaceName?: string; plates?: number; applicationType?: ApplicationType | null;
}
interface Quote {
  slug: string; spaces: QuoteSpace[]; total_plates: number | null;
  material_total: number | null; material_discounted: number | null;
  client_name: string | null;
  material_overrides?: { signature: string; quantities: Record<string, number> } | null;
}

const APP_TYPES: ApplicationType[] = ["parede", "teto", "forro"];

export default function OrcamentoMateriaisPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [pricing, setPricing] = useState<OrcamentoBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});

  const price = useCallback(async (q: Quote) => {
    const plates = q.total_plates ?? (q.spaces ?? []).reduce((s, sp) => s + (sp.plates ?? 0), 0);
    const subtotal = q.material_discounted ?? q.material_total ?? 0;
    if (plates <= 0) { setPricing(null); return; }
    const b = await fetch("/api/orcamento/pricing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plates, pricePerPlate: subtotal / plates,
        spaces: (q.spaces ?? []).map((sp) => ({ plates: sp.plates, applicationType: sp.applicationType })),
        materialOverrides: q.material_overrides ?? null,
      }),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setPricing(b);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const q = await fetch(`/api/quotes/${slug}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!alive) return;
      if (!q) { setLoading(false); return; }
      setQuote(q);
      await price(q);
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug, price]);

  async function persist(patch: Partial<Quote>) {
    if (!quote) return;
    setBusy(true); setErr(null); setMsg(null);
    const next = { ...quote, ...patch };
    setQuote(next);
    const res = await fetch(`/api/quotes/${slug}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    }).catch(() => null);
    if (!res || !res.ok) setErr(`Não foi possível salvar${res ? ` (${res.status})` : ""}.`);
    await price(next);
    setBusy(false);
  }

  /** Troca o tipo de um espaço — recalcula tudo e descarta ajuste manual antigo. */
  function setSpaceType(i: number, t: ApplicationType) {
    if (!quote) return;
    const spaces = quote.spaces.map((sp, idx) => (idx === i ? { ...sp, applicationType: t } : sp));
    persist({ spaces, material_overrides: null });
    setDraft({});
    setMsg("Tipo de aplicação alterado — os materiais foram recalculados.");
  }

  function saveOverrides() {
    if (!quote || !pricing) return;
    const quantities: Record<string, number> = {};
    for (const m of pricing.materials) {
      const v = draft[m.code];
      if (v !== undefined && v !== m.quantity) quantities[m.code] = v;
    }
    if (Object.keys(quantities).length === 0) { setMsg("Nada a ajustar."); return; }
    persist({ material_overrides: { signature: pricing.materialsSignature, quantities } });
    setMsg("Ajuste manual salvo. Ele vale até o número de placas ou o tipo de aplicação mudar.");
  }

  function clearOverrides() {
    setDraft({});
    persist({ material_overrides: null });
    setMsg("Ajuste manual removido — voltou ao cálculo automático.");
  }

  if (loading) {
    return <AdminShell active="orcamentos" breadcrumb={[{ label: "Orçamentos" }]} title="Carregando…"><div /></AdminShell>;
  }
  if (!quote) {
    return (
      <AdminShell active="orcamentos" breadcrumb={[{ label: "Orçamentos", href: "/admin?tab=orcamentos" }]} title="Orçamento não encontrado">
        <Link href="/admin?tab=orcamentos" className="text-[#002045] underline text-sm font-[var(--font-inter)]">Voltar</Link>
      </AdminShell>
    );
  }

  const hasOverride = !!quote.material_overrides;
  const sec = "bg-white border border-[#e2e2e2] mb-6";
  const secHead = "px-4 sm:px-5 py-3.5 border-b border-[#f0f0f0]";

  return (
    <AdminShell
      active="orcamentos"
      breadcrumb={[{ label: "Orçamentos", href: "/admin?tab=orcamentos" }, { label: quote.client_name || slug }]}
      title={quote.client_name || "Orçamento"}
      action={<Link href="/admin/orcamentos/materiais" className={btnGhost}>Parâmetros do cálculo</Link>}
    >
      {err && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm font-[var(--font-inter)]">{err}</div>}
      {msg && <div className="mb-4 bg-[#eef5ec] border border-[#cfe3ca] text-[#2c5226] px-4 py-2.5 text-sm font-[var(--font-inter)]">{msg}</div>}

      {/* ── Espaços ─────────────────────────────────────────────────────────── */}
      <section className={sec}>
        <div className={secHead}>
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-lg">Tipo de aplicação por espaço</h2>
          <p className="text-[#74777f] text-[12px] font-[var(--font-inter)] mt-0.5">
            Parede leva cola PU-40. Teto e forro levam cola de contato e espuma expansiva.
          </p>
        </div>
        <div className="p-4 sm:p-5 space-y-3">
          {(quote.spaces ?? []).map((sp, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f0f0] pb-3 last:border-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-[var(--font-inter)] text-[#002045] text-sm font-semibold">{sp.spaceName || `Espaço ${i + 1}`}</p>
                <p className="text-[#74777f] text-[11px] font-[var(--font-inter)]">{sp.plates ?? 0} placa(s)</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {APP_TYPES.map((t) => {
                  const on = (sp.applicationType ?? "parede") === t;
                  return (
                    <button key={t} type="button" disabled={busy} onClick={() => setSpaceType(i, t)}
                      className={`text-[11px] tracking-[0.06em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border transition-colors disabled:opacity-50 ${on ? "bg-[#002045] text-white border-[#002045]" : "bg-white text-[#43474e] border-[#e2e2e2] hover:border-[#002045]"}`}>
                      {APPLICATION_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {(quote.spaces ?? []).length === 0 && (
            <p className="text-[#a0a3a8] text-sm font-[var(--font-inter)]">Este orçamento não tem espaços salvos.</p>
          )}
        </div>
      </section>

      {/* ── Materiais ───────────────────────────────────────────────────────── */}
      <section className={sec}>
        <div className={secHead}>
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-lg">Materiais calculados</h2>
          <p className="text-[#74777f] text-[12px] font-[var(--font-inter)] mt-0.5">
            Ajuste a quantidade quando o projeto exigir exceção técnica. Zero remove o item.
          </p>
        </div>
        <div className="p-4 sm:p-5">
          {!pricing || pricing.materials.length === 0 ? (
            <p className="text-[#a0a3a8] text-sm font-[var(--font-inter)]">Nenhum material calculado.</p>
          ) : (
            <>
              <div className="space-y-3">
                {pricing.materials.map((m) => {
                  const stock = pricing.stockChecks.find((s) => s.code === m.code);
                  return (
                    <div key={m.code} className="border-b border-[#f0f0f0] pb-3 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-[var(--font-inter)] text-[#002045] text-sm font-semibold">
                            {materialDisplayName(m)}
                            {m.overridden && (
                              <span className="ml-2 text-[9px] tracking-[0.1em] uppercase font-bold px-1.5 py-0.5 bg-amber-100 text-amber-900">Ajustado à mão</span>
                            )}
                          </p>
                          <p className="text-[#74777f] text-[11px] font-[var(--font-inter)]">
                            Calculado automaticamente para {applicationReasonLabel(m.reasons).toLowerCase() || "—"} · {m.technical}
                          </p>
                          <p className="text-[#a0a3a8] text-[11px] font-[var(--font-inter)]">
                            {m.unitPrice > 0 ? `R$ ${m.unitPrice} por ${m.unit} · total R$ ${m.total}` : "sem preço cadastrado"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">
                            {m.unit}s
                          </label>
                          <input type="number" min="0" step="1"
                            value={draft[m.code] ?? m.quantity}
                            onChange={(e) => setDraft((d) => ({ ...d, [m.code]: Math.max(0, Number(e.target.value) || 0) }))}
                            className="w-20 border border-[#e2e2e2] px-2 py-1.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                        </div>
                      </div>
                      {stock && !stock.sufficient && (
                        <p className="mt-1.5 text-[12px] font-[var(--font-inter)] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1.5">
                          Estoque insuficiente — necessário {stock.required}, disponível {stock.available}, faltam {stock.missing}.
                          A quantidade técnica não foi reduzida.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2 mt-5">
                <button onClick={saveOverrides} disabled={busy} className={btnPrimary}>Salvar ajuste</button>
                {hasOverride && (
                  <button onClick={clearOverrides} disabled={busy} className={btnGhost}>Voltar ao cálculo automático</button>
                )}
              </div>
              {hasOverride && (
                <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mt-2">
                  Há ajuste manual salvo. Ele é descartado automaticamente se o número de placas ou o
                  tipo de aplicação mudar — o painel avisa quando isso acontecer.
                </p>
              )}
            </>
          )}

          {[...(pricing?.warnings ?? []), ...(pricing?.adminWarnings ?? [])].length > 0 && (
            <ul className="mt-4 space-y-1">
              {[...pricing!.warnings, ...pricing!.adminWarnings].map((w, i) => (
                <li key={i} className="text-[12px] font-[var(--font-inter)] text-amber-800">• {w}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
