"use client";

import React, { useState, useMemo } from "react";

interface SalesRepInfo {
  id: string;
  name: string;
  referral_code: string;
  commission_type: "percentage" | "fixed";
  commission_value: number;
  birthday: string | null;
}

interface CouponUse {
  id: string;
  coupon_code: string;
  partner_name: string | null;
  space: string | null;
  product_name: string | null;
  product_code: string | null;
  area_m2: number | null;
  plates: number | null;
  material_total: number | null;
  material_discounted: number | null;
  discount_applied: number | null;
  commission_owed: number | null;
  sales_rep_commission_owed: number | null;
  sales_rep_referral_code: string | null;
  architect_name: string | null;
  sale_status: "em_orcamento" | "concluido" | "cancelado" | null;
  created_at: string;
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  em_orcamento: { label: "Em orçamento", cls: "bg-yellow-100 text-yellow-800" },
  concluido:    { label: "Concluído",    cls: "bg-green-100 text-green-800"  },
  cancelado:    { label: "Cancelado",    cls: "bg-red-100 text-red-700"      },
};

export default function RepresentantePage() {
  const [referralCode, setReferralCode] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [salesRep, setSalesRep] = useState<SalesRepInfo | null>(null);
  const [uses, setUses] = useState<CouponUse[]>([]);
  const [usesLoading, setUsesLoading] = useState(false);

  const [cpOpen, setCpOpen] = useState(false);
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpError, setCpError] = useState("");
  const [cpSuccess, setCpSuccess] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);

  // Birthday gate
  const [bdayInput, setBdayInput] = useState("");
  const [bdayError, setBdayError] = useState("");
  const [bdayLoading, setBdayLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    const res = await fetch("/api/representante/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referral_code: referralCode, portal_password: password }),
    });

    const json = await res.json();
    setLoginLoading(false);

    if (!res.ok) {
      setLoginError(json.error || "Erro ao fazer login.");
      return;
    }

    setSalesRep(json as SalesRepInfo);
    fetchUses(json.referral_code);
  }

  async function fetchUses(code: string) {
    setUsesLoading(true);
    const res = await fetch(`/api/coupons/use?sales_rep_code=${encodeURIComponent(code)}`);
    if (res.ok) setUses(await res.json());
    setUsesLoading(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setCpError("");
    if (cpNew !== cpConfirm) { setCpError("As senhas não coincidem."); return; }
    if (cpNew.length < 6) { setCpError("A nova senha deve ter pelo menos 6 caracteres."); return; }
    setCpLoading(true);
    const res = await fetch("/api/representante/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referral_code: salesRep!.referral_code, current_password: cpCurrent, new_password: cpNew }),
    });
    const json = await res.json();
    setCpLoading(false);
    if (!res.ok) { setCpError(json.error || "Erro ao alterar senha."); return; }
    setCpSuccess(true);
    setCpCurrent(""); setCpNew(""); setCpConfirm("");
    setTimeout(() => setCpOpen(false), 2000);
  }

  async function handleSaveBirthday(e: React.FormEvent) {
    e.preventDefault();
    if (!bdayInput) { setBdayError("Informe sua data de nascimento."); return; }
    setBdayLoading(true);
    setBdayError("");
    const res = await fetch(`/api/sales-reps/${salesRep!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthday: bdayInput }),
    });
    setBdayLoading(false);
    if (!res.ok) { setBdayError("Erro ao salvar. Tente novamente."); return; }
    setSalesRep({ ...salesRep!, birthday: bdayInput });
  }

  const uniquePartners = new Set(uses.map((u) => u.coupon_code)).size;
  const confirmedCommission = uses
    .filter((u) => u.sale_status === "concluido")
    .reduce((a, u) => a + (u.sales_rep_commission_owed || 0), 0);
  const pendingCommission = uses
    .filter((u) => u.sale_status === "em_orcamento" || u.sale_status === null)
    .reduce((a, u) => a + (u.sales_rep_commission_owed || 0), 0);

  const [partnerRankSort, setPartnerRankSort] = useState<"total" | "count" | "median">("total");

  const partnerRanking = useMemo(() => {
    const byCode: Record<string, { total: number; count: number; values: number[]; name: string }> = {};
    for (const u of uses) {
      if (u.sale_status !== "concluido" || !u.coupon_code) continue;
      if (!byCode[u.coupon_code]) byCode[u.coupon_code] = { total: 0, count: 0, values: [], name: u.partner_name || u.coupon_code };
      const v = u.material_discounted || 0;
      byCode[u.coupon_code].total += v;
      byCode[u.coupon_code].count++;
      if (v > 0) byCode[u.coupon_code].values.push(v);
    }
    const rows = Object.entries(byCode).map(([code, s]) => {
      const sorted = [...s.values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) / 2);
      return { code, name: s.name, total: s.total, count: s.count, median };
    });
    if (partnerRankSort === "count") rows.sort((a, b) => b.count - a.count);
    else if (partnerRankSort === "median") rows.sort((a, b) => b.median - a.median);
    else rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [uses, partnerRankSort]);

  // Birthday gate — shown after login if birthday is missing
  if (salesRep && !salesRep.birthday) {
    return (
      <div className="min-h-screen bg-[#f5f5f3] flex items-center justify-center px-4">
        <div className="bg-white border border-[#e2e2e2] p-10 w-full max-w-sm">
          <div className="mb-6">
            <p className="text-[#002045] font-[var(--font-noto-serif)] text-2xl font-normal mb-1">
              Complete seu cadastro
            </p>
            <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
              Olá, {salesRep.name}. Para continuar, precisamos da sua data de nascimento.
            </p>
          </div>
          <form onSubmit={handleSaveBirthday} className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                Data de Nascimento *
              </label>
              <input
                required
                type="date"
                value={bdayInput}
                onChange={(e) => setBdayInput(e.target.value)}
                className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
              />
            </div>
            {bdayError && (
              <p className="text-red-600 text-sm font-[var(--font-inter)]">{bdayError}</p>
            )}
            <button
              type="submit"
              disabled={bdayLoading}
              className="w-full bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
            >
              {bdayLoading ? "Salvando..." : "Confirmar e entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!salesRep) {
    return (
      <div className="min-h-screen bg-[#f5f5f3] flex items-center justify-center px-4">
        <div className="bg-white border border-[#e2e2e2] p-10 w-full max-w-sm">
          <div className="mb-6">
            <p className="text-[#002045] font-[var(--font-noto-serif)] text-2xl font-normal mb-1">
              Portal do Representante
            </p>
            <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
              Orbital Revestimentos
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                Código de Indicação
              </label>
              <input
                required
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] uppercase tracking-widest"
                placeholder="EX: JOAO"
                autoCapitalize="characters"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                Senha
              </label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
              />
            </div>
            {loginError && (
              <p className="text-red-600 text-sm font-[var(--font-inter)]">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
            >
              {loginLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      {/* Header */}
      <div className="bg-[#002045] px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-white font-[var(--font-noto-serif)] text-lg leading-tight">
            Olá, {salesRep.name}
          </p>
          <p className="text-white/60 text-xs font-[var(--font-inter)] tracking-wider mt-0.5">
            Código: <strong className="text-white">{salesRep.referral_code}</strong>
          </p>
        </div>
        <button
          onClick={() => { setSalesRep(null); setUses([]); setReferralCode(""); setPassword(""); }}
          className="text-white/60 hover:text-white text-xs font-[var(--font-inter)] uppercase tracking-widest transition-colors"
        >
          Sair
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-[#e2e2e2] px-6 py-5">
            <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">
              Parceiros indicados
            </p>
            <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal">
              {uniquePartners}
            </p>
          </div>
          <div className="bg-white border border-[#e2e2e2] px-6 py-5">
            <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">
              Vendas concluídas
            </p>
            <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal">
              {uses.filter((u) => u.sale_status === "concluido").length}
            </p>
          </div>
          <div className="bg-white border border-[#e2e2e2] px-6 py-5">
            <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">
              Em orçamento
            </p>
            <p className="font-[var(--font-noto-serif)] text-yellow-700 text-3xl font-normal">
              {uses.filter((u) => u.sale_status === "em_orcamento" || u.sale_status === null).length}
            </p>
          </div>
        </div>

        {/* Change password */}
        <div className="bg-white border border-[#e2e2e2] mb-6">
          <button
            onClick={() => { setCpOpen(!cpOpen); setCpError(""); setCpSuccess(false); }}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <span className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">
              Alterar Senha
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#74777f" strokeWidth="2"
              className={`transition-transform duration-200 ${cpOpen ? "rotate-180" : ""}`}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {cpOpen && (
            <div className="border-t border-[#e2e2e2] px-6 py-5">
              {cpSuccess ? (
                <p className="text-green-600 text-sm font-[var(--font-inter)]">Senha alterada com sucesso.</p>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
                  {["Senha atual", "Nova senha", "Confirmar nova senha"].map((lbl, i) => (
                    <div key={lbl}>
                      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">{lbl}</label>
                      <input
                        required
                        type="password"
                        value={[cpCurrent, cpNew, cpConfirm][i]}
                        onChange={(e) => [setCpCurrent, setCpNew, setCpConfirm][i](e.target.value)}
                        className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      />
                    </div>
                  ))}
                  {cpError && <p className="text-red-600 text-xs font-[var(--font-inter)]">{cpError}</p>}
                  <button
                    type="submit"
                    disabled={cpLoading}
                    className="bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
                  >
                    {cpLoading ? "Salvando..." : "Salvar nova senha"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Partner ranking */}
        {partnerRanking.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">
                Ranking de Parceiros
              </h2>
              <div className="flex items-center gap-2">
                {(["total", "count", "median"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setPartnerRankSort(s)}
                    className={`text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border transition-colors ${partnerRankSort === s ? "bg-[#002045] text-white border-[#002045]" : "text-[#74777f] border-[#e2e2e2] hover:border-[#002045] hover:text-[#002045]"}`}
                  >
                    {s === "total" ? "Valor" : s === "count" ? "Qtd." : "Ticket Médio"}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
              <table className="w-full text-sm font-[var(--font-inter)]">
                <thead>
                  <tr className="border-b border-[#e2e2e2]">
                    {["#", "Parceiro", "Cupom", "Total gerado", "Vendas", "Ticket médio"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {partnerRanking.map((p, i) => (
                    <tr key={p.code} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                      <td className="px-5 py-3 font-bold text-[#002045]">{i + 1}°</td>
                      <td className="px-5 py-3 font-semibold text-[#002045]">{p.name}</td>
                      <td className="px-5 py-3"><span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider">{p.code}</span></td>
                      <td className="px-5 py-3 font-semibold text-green-700">{fmt(p.total)}</td>
                      <td className="px-5 py-3 text-[#43474e]">{p.count}</td>
                      <td className="px-5 py-3 text-[#43474e]">{p.median > 0 ? fmt(p.median) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Usage history */}
        <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-4">
          Histórico de vendas
        </h2>

        {usesLoading ? (
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
        ) : uses.length === 0 ? (
          <div className="bg-white border border-[#e2e2e2] px-6 py-10 text-center">
            <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
              Nenhuma venda registrada ainda. Indique parceiros para começar!
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
            <table className="w-full text-sm font-[var(--font-inter)]">
              <thead>
                <tr className="border-b border-[#e2e2e2]">
                  {[
                    "Data",
                    "Cupom",
                    "Parceiro",
                    "Espaço",
                    "Placas",
                    "Sua comissão",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[10px] tracking-[0.1em] uppercase font-bold text-[#74777f] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uses.map((u) => {
                  const st = u.sale_status || "em_orcamento";
                  const stMeta = STATUS_LABELS[st] || STATUS_LABELS.em_orcamento;
                  return (
                    <tr key={u.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                      <td className="px-4 py-3 text-xs text-[#43474e] whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold tracking-wider text-[#002045]">
                        {u.coupon_code || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#43474e]">
                        {u.partner_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#43474e]">{u.space || "—"}</td>
                      <td className="px-4 py-3 text-xs text-[#43474e]">{u.plates ?? "—"}</td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {st === "cancelado"
                          ? <span className="text-[#74777f] font-normal">—</span>
                          : st === "concluido" && u.sales_rep_commission_owed != null
                          ? <span className="text-[#002045]">{fmt(u.sales_rep_commission_owed)}</span>
                          : u.sales_rep_commission_owed != null
                          ? <span className="text-yellow-700">{fmt(u.sales_rep_commission_owed)} (pend.)</span>
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wide rounded-full ${stMeta.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            st === "concluido" ? "bg-green-600" : st === "cancelado" ? "bg-red-500" : "bg-yellow-500"
                          }`} />
                          {stMeta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
