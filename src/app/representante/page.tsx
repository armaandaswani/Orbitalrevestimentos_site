"use client";

import React, { useState } from "react";

interface SalesRepInfo {
  id: string;
  name: string;
  referral_code: string;
  commission_type: "percentage" | "fixed";
  commission_value: number;
}

interface CouponUse {
  id: string;
  coupon_code: string;
  space: string | null;
  product_name: string | null;
  product_code: string | null;
  area_m2: number | null;
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

  const uniquePartners = new Set(uses.map((u) => u.coupon_code)).size;
  const confirmedCommission = uses
    .filter((u) => u.sale_status === "concluido")
    .reduce((a, u) => a + (u.sales_rep_commission_owed || 0), 0);
  const pendingCommission = uses
    .filter((u) => u.sale_status === "em_orcamento" || u.sale_status === null)
    .reduce((a, u) => a + (u.sales_rep_commission_owed || 0), 0);

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
              Comissões confirmadas
            </p>
            <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal">
              {fmt(confirmedCommission)}
            </p>
          </div>
          <div className="bg-white border border-[#e2e2e2] px-6 py-5">
            <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">
              Em aberto
            </p>
            <p className="font-[var(--font-noto-serif)] text-yellow-700 text-3xl font-normal">
              {fmt(pendingCommission)}
            </p>
          </div>
        </div>

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
                    "Cupom (parceiro)",
                    "Produto",
                    "Espaço",
                    "Área (m²)",
                    "Desconto aplicado",
                    "Comissão parceiro",
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
                      <td className="px-4 py-3 text-xs text-[#43474e] font-semibold tracking-wider">
                        {u.coupon_code || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#43474e]">
                        <p className="font-semibold">{u.product_name || "—"}</p>
                        {u.product_code && (
                          <p className="text-[#74777f]">{u.product_code}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#43474e]">{u.space || "—"}</td>
                      <td className="px-4 py-3 text-xs text-[#43474e]">{u.area_m2 ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-green-700 font-semibold">
                        {u.discount_applied ? fmt(u.discount_applied) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#43474e]">
                        {u.commission_owed ? fmt(u.commission_owed) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#002045] font-semibold">
                        {st === "concluido" && u.sales_rep_commission_owed != null
                          ? fmt(u.sales_rep_commission_owed)
                          : st === "cancelado"
                          ? <span className="text-[#74777f] font-normal">Cancelado</span>
                          : u.sales_rep_commission_owed != null
                          ? <span className="text-yellow-700">{fmt(u.sales_rep_commission_owed)} (pend.)</span>
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-[10px] font-bold tracking-wide ${stMeta.cls}`}>
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
