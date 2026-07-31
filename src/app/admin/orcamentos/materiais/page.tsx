"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "../../AdminShell";
import { btnPrimary, inputCls, labelCls } from "../../ui";
import {
  APPLICATION_LABELS,
  DEFAULT_MATERIALS_CONFIG,
  type AdhesivePackage,
  type ApplicationType,
  type MaterialsConfig,
} from "@/lib/orcamento-materials";

/**
 * Parâmetros do cálculo automático de materiais de instalação (§13).
 *
 * Ficam no banco, não no código: mudar o consumo por placa ou trocar a embalagem
 * de cola não deve exigir deploy. Preço, estoque e nome de cada material são
 * editados no cadastro do produto — aqui só as REGRAS.
 */

interface ProductRow { code: string; name: string; price: number; sale_unit?: string | null; stock_on_hand?: number; stock_reserved?: number }

const APP_TYPES: ApplicationType[] = ["parede", "teto", "forro"];

export default function MateriaisConfigPage() {
  const [cfg, setCfg] = useState<MaterialsConfig | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, p] = await Promise.all([
        fetch("/api/admin/orcamento-config").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/api/products?all=true").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);
      if (!alive) return;
      setCfg({
        pu40TubesPerPanel: Number(c?.pu40TubesPerPanel ?? DEFAULT_MATERIALS_CONFIG.pu40TubesPerPanel),
        adhesiveLitersPerPanel: Number(c?.adhesiveLitersPerPanel ?? DEFAULT_MATERIALS_CONFIG.adhesiveLitersPerPanel),
        foamTubesPerPanel: Number(c?.foamTubesPerPanel ?? DEFAULT_MATERIALS_CONFIG.foamTubesPerPanel),
        adhesivePackages: Array.isArray(c?.adhesivePackages) && c.adhesivePackages.length ? c.adhesivePackages : DEFAULT_MATERIALS_CONFIG.adhesivePackages,
        foamCode: String(c?.foamCode ?? DEFAULT_MATERIALS_CONFIG.foamCode),
        pu40Code: String(c?.pu40Code ?? DEFAULT_MATERIALS_CONFIG.pu40Code),
        pu40AppliesTo: Array.isArray(c?.pu40AppliesTo) && c.pu40AppliesTo.length ? c.pu40AppliesTo : DEFAULT_MATERIALS_CONFIG.pu40AppliesTo,
        adhesiveAppliesTo: Array.isArray(c?.adhesiveAppliesTo) && c.adhesiveAppliesTo.length ? c.adhesiveAppliesTo : DEFAULT_MATERIALS_CONFIG.adhesiveAppliesTo,
      });
      setProducts(Array.isArray(p) ? p : []);
    })();
    return () => { alive = false; };
  }, []);

  const set = (patch: Partial<MaterialsConfig>) => setCfg((c) => (c ? { ...c, ...patch } : c));

  const toggleApp = (key: "pu40AppliesTo" | "adhesiveAppliesTo", t: ApplicationType) => {
    if (!cfg) return;
    const cur = cfg[key];
    set({ [key]: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t] } as Partial<MaterialsConfig>);
  };

  const setPkg = (i: number, patch: Partial<AdhesivePackage>) => {
    if (!cfg) return;
    set({ adhesivePackages: cfg.adhesivePackages.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  };

  async function save() {
    if (!cfg) return;
    setSaving(true); setErr(null); setMsg(null);
    const res = await fetch("/api/admin/orcamento-config", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg),
    }).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) { setErr(`Não foi possível salvar${res ? ` (${res.status})` : ""}.`); return; }
    setMsg("Parâmetros salvos. Os próximos orçamentos já usam estes valores.");
  }

  if (!cfg) {
    return <AdminShell active="orcamentos" breadcrumb={[{ label: "Orçamentos" }]} title="Materiais de instalação"><p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando…</p></AdminShell>;
  }

  const byCode = new Map(products.map((p) => [p.code, p]));
  const materialCodes = [cfg.pu40Code, ...cfg.adhesivePackages.map((p) => p.code), cfg.foamCode];

  const sec = "bg-white border border-[#e2e2e2] mb-6";
  const secHead = "px-4 sm:px-5 py-3.5 border-b border-[#f0f0f0]";

  return (
    <AdminShell
      active="orcamentos"
      breadcrumb={[{ label: "Orçamentos", href: "/admin?tab=orcamentos" }, { label: "Materiais de instalação" }]}
      title="Materiais de instalação"
      action={<button onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Salvando…" : "Salvar parâmetros"}</button>}
    >
      {err && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm font-[var(--font-inter)]">{err}</div>}
      {msg && <div className="mb-4 bg-[#eef5ec] border border-[#cfe3ca] text-[#2c5226] px-4 py-2.5 text-sm font-[var(--font-inter)]">{msg}</div>}

      <p className="text-[#74777f] text-[13px] font-[var(--font-inter)] mb-6 max-w-3xl">
        O orçamento calcula sozinho os materiais de instalação a partir do tipo de aplicação de cada
        espaço. Aqui ficam as <strong>regras</strong>. Preço, estoque e nome de cada material são
        editados no cadastro do produto.
      </p>

      {/* ── Consumo ─────────────────────────────────────────────────────────── */}
      <section className={sec}>
        <div className={secHead}>
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-lg">Consumo por placa</h2>
        </div>
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Cola PU-40 (tubos por placa)</label>
            <input type="number" step="0.05" min="0" value={cfg.pu40TubesPerPanel}
              onChange={(e) => set({ pu40TubesPerPanel: Number(e.target.value) || 0 })} className={inputCls} />
            <p className="text-[#a0a3a8] text-[11px] font-[var(--font-inter)] mt-1">Arredondado para cima. Padrão: 1,5.</p>
          </div>
          <div>
            <label className={labelCls}>Cola de contato (litros por placa)</label>
            <input type="number" step="0.01" min="0" value={cfg.adhesiveLitersPerPanel}
              onChange={(e) => set({ adhesiveLitersPerPanel: Number(e.target.value) || 0 })} className={inputCls} />
            <p className="text-[#a0a3a8] text-[11px] font-[var(--font-inter)] mt-1">Vira embalagens inteiras. Padrão: 0,25.</p>
          </div>
          <div>
            <label className={labelCls}>Espuma expansiva (tubos por placa)</label>
            <input type="number" step="0.05" min="0" value={cfg.foamTubesPerPanel}
              onChange={(e) => set({ foamTubesPerPanel: Number(e.target.value) || 0 })} className={inputCls} />
            <p className="text-[#a0a3a8] text-[11px] font-[var(--font-inter)] mt-1">Arredondado para cima. Padrão: 0,75.</p>
          </div>
        </div>
      </section>

      {/* ── Quais aplicações disparam cada regra ────────────────────────────── */}
      <section className={sec}>
        <div className={secHead}>
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-lg">Quando cada material entra</h2>
          <p className="text-[#74777f] text-[12px] font-[var(--font-inter)] mt-0.5">
            Um tipo de aplicação em nenhuma das listas não recebe material automático.
          </p>
        </div>
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {([["pu40AppliesTo", "Cola PU-40"], ["adhesiveAppliesTo", "Cola de contato + espuma"]] as const).map(([key, title]) => (
            <div key={key}>
              <p className={labelCls}>{title}</p>
              <div className="flex flex-wrap gap-1.5">
                {APP_TYPES.map((t) => {
                  const on = cfg[key].includes(t);
                  return (
                    <button key={t} type="button" onClick={() => toggleApp(key, t)}
                      className={`text-[11px] tracking-[0.06em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border transition-colors ${on ? "bg-[#002045] text-white border-[#002045]" : "bg-white text-[#43474e] border-[#e2e2e2] hover:border-[#002045]"}`}>
                      {APPLICATION_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Embalagens de cola ──────────────────────────────────────────────── */}
      <section className={sec}>
        <div className={secHead}>
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-lg">Embalagens de cola de contato</h2>
          <p className="text-[#74777f] text-[12px] font-[var(--font-inter)] mt-0.5">
            O sistema calcula o volume real e compara as combinações: nunca fecha com cola a menos,
            e entre as que servem escolhe a mais barata.
          </p>
        </div>
        <div className="p-4 sm:p-5 space-y-3">
          {cfg.adhesivePackages.map((p, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end border-b border-[#f0f0f0] pb-3 last:border-0 last:pb-0">
              <div>
                <label className={labelCls}>Produto</label>
                <select value={p.code} onChange={(e) => setPkg(i, { code: e.target.value })} className={inputCls}>
                  <option value={p.code}>{p.code}</option>
                  {products.filter((x) => x.code !== p.code).map((x) => <option key={x.code} value={x.code}>{x.code} — {x.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Litros</label>
                <input type="number" step="0.1" min="0" value={p.liters}
                  onChange={(e) => setPkg(i, { liters: Number(e.target.value) || 0 })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Rótulo no orçamento</label>
                <input value={p.label} onChange={(e) => setPkg(i, { label: e.target.value })} className={inputCls} />
              </div>
              <div className="text-[12px] font-[var(--font-inter)] text-[#43474e] pb-2.5">
                {byCode.get(p.code)
                  ? (byCode.get(p.code)!.price > 0
                      ? `R$ ${byCode.get(p.code)!.price} · rende ${(p.liters / (cfg.adhesiveLitersPerPanel || 1)).toFixed(1)} placas`
                      : "sem preço cadastrado")
                  : "produto não encontrado"}
              </div>
            </div>
          ))}
          <button type="button"
            onClick={() => set({ adhesivePackages: [...cfg.adhesivePackages, { code: "", liters: 0, label: "" }] })}
            className="text-[11px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] text-[#002045] hover:underline">
            + Adicionar embalagem
          </button>
        </div>
      </section>

      {/* ── Situação dos produtos ───────────────────────────────────────────── */}
      <section className={sec}>
        <div className={secHead}>
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-lg">Produtos usados no cálculo</h2>
          <p className="text-[#74777f] text-[12px] font-[var(--font-inter)] mt-0.5">
            Sem preço cadastrado, a escolha da embalagem passa a ser pela menor sobra em vez do menor custo.
          </p>
        </div>
        <div className="p-4 sm:p-5 space-y-2">
          {materialCodes.map((code) => {
            const p = byCode.get(code);
            const disp = p ? Math.max(0, (p.stock_on_hand ?? 0) - (p.stock_reserved ?? 0)) : 0;
            return (
              <div key={code} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f0f0] pb-2 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-[var(--font-inter)] text-[#002045] text-sm font-semibold">{p?.name ?? code}</p>
                  <p className="text-[#74777f] text-[11px] font-[var(--font-inter)]">
                    {code}{p?.sale_unit ? ` · ${p.sale_unit}` : ""} · estoque disponível {disp}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[12px] font-[var(--font-inter)] font-semibold ${p && p.price > 0 ? "text-[#002045]" : "text-amber-700"}`}>
                    {p ? (p.price > 0 ? `R$ ${p.price}` : "sem preço") : "não cadastrado"}
                  </span>
                  <Link href="/admin?tab=produtos" className="text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045]">
                    Editar
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </AdminShell>
  );
}
