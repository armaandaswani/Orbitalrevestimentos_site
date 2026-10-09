"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import RepAgendaTab from "./RepAgendaTab";
import RepCrmTab from "./RepCrmTab";
import RepMeetingPrompts from "./RepMeetingPrompts";
import ConvidarParceiro from "./ConvidarParceiro";
import ComissoesLista, { type ComissaoItem } from "@/components/ComissoesLista";

interface SalesRepInfo {
  id: string;
  name: string;
  referral_code: string;
  commission_type: "percentage" | "fixed";
  commission_value: number;
  birthday: string | null;
}

interface LinkedPartner {
  id: string;
  name: string;
  profession: string | null;
  status: "active" | "inactive" | "pending";
  is_self_registered?: boolean | null;
  coupon_code: string;
  created_at: string;
  total_sales: number;
  sales_count: number;
  last_sale_at: string | null;
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
  rep_commission_paid_at: string | null;
  rep_commission_cancelled_at?: string | null;
  rep_commission_received_at?: string | null;
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  em_orcamento: { label: "Em orçamento", cls: "bg-yellow-100 text-yellow-800" },
  concluido:    { label: "Concluído",    cls: "bg-green-100 text-green-800"  },
  cancelado:    { label: "Cancelado",    cls: "bg-red-100 text-red-700"      },
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Sem venda nos últimos 30 dias (ou nunca vendeu). */
function partnerIsIdle(p: LinkedPartner) {
  return p.sales_count === 0 || !p.last_sale_at || Date.now() - new Date(p.last_sale_at).getTime() > 30 * DAY_MS;
}

/** Status do parceiro para a representante: convite ainda não aceito aparece como "Convite enviado". */
function partnerStatusBadge(p: LinkedPartner): { label: string; cls: string } {
  if (p.status === "active") return { label: "Ativo", cls: "bg-green-100 text-green-800" };
  if (p.status === "pending") {
    return p.is_self_registered === false
      ? { label: "Convite enviado", cls: "bg-blue-50 text-[#0B1F45]" }
      : { label: "Pendente", cls: "bg-yellow-100 text-yellow-800" };
  }
  return { label: "Inativo", cls: "bg-gray-100 text-gray-600" };
}

export default function RepresentantePage() {
  const [loginEmail, setLoginEmail] = useState("");
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

  // ── Password visibility state ──────────────────────────────────────────────
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showCpCurrent, setShowCpCurrent] = useState(false);
  const [showCpNew, setShowCpNew] = useState(false);
  const [showCpConfirm, setShowCpConfirm] = useState(false);

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
      body: JSON.stringify({ email: loginEmail.trim(), portal_password: password }),
    });

    const json = await res.json();
    setLoginLoading(false);

    if (!res.ok) {
      setLoginError(json.error || "Erro ao fazer login.");
      return;
    }

    setSalesRep(json as SalesRepInfo);
    fetchUses(json.referral_code);
    fetchLinkedPartners(json.id);
  }

  async function fetchUses(code: string) {
    setUsesLoading(true);
    const res = await fetch(`/api/coupons/use?sales_rep_code=${encodeURIComponent(code)}`);
    if (res.ok) setUses(await res.json());
    setUsesLoading(false);
  }

  async function fetchLinkedPartners(salesRepId: string) {
    setPartnersLoading(true);
    const res = await fetch(`/api/representante/partners?sales_rep_id=${encodeURIComponent(salesRepId)}`);
    if (res.ok) {
      const data = await res.json();
      setLinkedPartners(data);
    }
    setPartnersLoading(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setCpError("");
    if (cpNew !== cpConfirm) { setCpError("As senhas não coincidem."); return; }
    if (cpNew.length < 8) { setCpError("A nova senha deve ter pelo menos 8 caracteres."); return; }
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

  function handleBdayChange(raw: string) {
    // Strip non-digits and auto-insert slashes for DD/MM/AAAA
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let masked = digits;
    if (digits.length > 4) masked = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
    else if (digits.length > 2) masked = digits.slice(0, 2) + "/" + digits.slice(2);
    setBdayInput(masked);
  }

  function bdayToISO(dmy: string): string {
    const [d, m, y] = dmy.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  async function handleSaveBirthday(e: React.FormEvent) {
    e.preventDefault();
    if (!bdayInput || bdayInput.length < 10) { setBdayError("Informe sua data de nascimento no formato DD/MM/AAAA."); return; }
    setBdayLoading(true);
    setBdayError("");
    const res = await fetch(`/api/sales-reps/${salesRep!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthday: bdayToISO(bdayInput) }),
    });
    setBdayLoading(false);
    if (!res.ok) { setBdayError("Erro ao salvar. Tente novamente."); return; }
    setSalesRep({ ...salesRep!, birthday: bdayToISO(bdayInput) });
  }

  // Auto-refresh data every 30 seconds while logged in
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!salesRep) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => {
      fetchUses(salesRep.referral_code);
      fetchLinkedPartners(salesRep.id);
    }, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [salesRep?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const uniquePartners = new Set(uses.map((u) => u.coupon_code)).size;
  const confirmedCommission = uses
    .filter((u) => u.sale_status === "concluido")
    .reduce((a, u) => a + (u.sales_rep_commission_owed || 0), 0);
  const pendingCommission = uses
    .filter((u) => u.sale_status === "em_orcamento" || u.sale_status === null)
    .reduce((a, u) => a + (u.sales_rep_commission_owed || 0), 0);

  const [partnerRankSort, setPartnerRankSort] = useState<"total" | "count" | "median">("total");
  const [repTab, setRepTab] = useState<"overview" | "commissions" | "partners" | "agenda" | "crm">("overview");
  const [linkedPartners, setLinkedPartners] = useState<LinkedPartner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<"all" | "active" | "pending" | "inactive" | "idle">("all");
  const [partnerSort, setPartnerSort] = useState<"total" | "name" | "count" | "last_sale" | "newest">("total");
  const [copied, setCopied] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("");

  // "Meus parceiros": busca, filtro e ordem (padrão: maior total gerado).
  const partnersView = useMemo(() => {
    const q = partnerSearch.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const list = linkedPartners.filter((p) => {
      if (partnerStatusFilter === "idle" ? !partnerIsIdle(p) : partnerStatusFilter !== "all" && p.status !== partnerStatusFilter) return false;
      if (!q) return true;
      return [p.name, p.coupon_code, p.profession || ""].some((t) =>
        t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)
      );
    });
    const byName = (a: LinkedPartner, b: LinkedPartner) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
    const time = (d: string | null) => (d ? new Date(d).getTime() : 0);
    return list.sort((a, b) => {
      switch (partnerSort) {
        case "name": return byName(a, b);
        case "count": return b.sales_count - a.sales_count || b.total_sales - a.total_sales || byName(a, b);
        case "last_sale": return time(b.last_sale_at) - time(a.last_sale_at) || byName(a, b);
        case "newest": return time(b.created_at) - time(a.created_at);
        default: return b.total_sales - a.total_sales || b.sales_count - a.sales_count || byName(a, b);
      }
    });
  }, [linkedPartners, partnerSearch, partnerStatusFilter, partnerSort]);

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
      <div className="min-h-screen bg-[#F6F5F2] pt-20 flex items-center justify-center px-4">
        <div className="bg-white border border-[#e2e2e2] p-10 w-full max-w-sm">
          <div className="mb-6">
            <p className="text-[#0B1F45] text-2xl font-normal mb-1">
              Complete seu cadastro
            </p>
            <p className="text-[#74777f] text-sm">
              Olá, {salesRep.name}. Para continuar, precisamos da sua data de nascimento.
            </p>
          </div>
          <form onSubmit={handleSaveBirthday} className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] mb-2">
                Data de Nascimento *
              </label>
              <input
                required
                type="text"
                placeholder="DD/MM/AAAA"
                value={bdayInput}
                onChange={(e) => handleBdayChange(e.target.value)}
                maxLength={10}
                className="w-full border border-[#e2e2e2] px-4 py-3 text-sm text-[#0B1F45] focus:outline-none focus:border-[#0B1F45]"
              />
            </div>
            {bdayError && (
              <p className="text-red-600 text-sm">{bdayError}</p>
            )}
            <button
              type="submit"
              disabled={bdayLoading}
              className="w-full bg-[#0B1F45] text-white text-xs tracking-[0.12em] uppercase font-bold px-6 py-3 hover:bg-[#2347A0] transition-colors disabled:opacity-50"
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
      <div className="min-h-screen bg-[#F6F5F2] pt-20 flex items-center justify-center px-4">
        <div className="bg-white border border-[#e2e2e2] p-10 w-full max-w-sm">
          <div className="mb-6">
            <p className="text-[#0B1F45] text-2xl font-normal mb-1">
              Portal do Representante
            </p>
            <p className="text-[#74777f] text-sm">
              Orbital Revestimentos
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] mb-2">
                E-mail
              </label>
              <input
                required
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full border border-[#e2e2e2] px-4 py-3 text-sm text-[#0B1F45] focus:outline-none focus:border-[#0B1F45]"
                placeholder="seu@email.com"
                autoComplete="email"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  required
                  type={showLoginPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[#e2e2e2] px-4 py-3 pr-10 text-sm text-[#0B1F45] focus:outline-none focus:border-[#0B1F45]"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showLoginPw ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowLoginPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#0B1F45] transition-colors"
                >
                  {showLoginPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            {loginError && (
              <p className="text-red-600 text-sm">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#0B1F45] text-white text-xs tracking-[0.12em] uppercase font-bold px-6 py-3 hover:bg-[#2347A0] transition-colors disabled:opacity-50"
            >
              {loginLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>
          <div className="mt-4 text-center">
            <a
              href="/parceiro"
              className="text-[#74777f] text-xs hover:text-[#0B1F45] transition-colors"
            >
              É parceiro?{" "}
              <span className="underline underline-offset-2">Acesse aqui</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F5F2] pt-20">
      {/* Header */}
      <div className="bg-[#0B1F45] px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-white text-lg leading-tight">
            Olá, {salesRep.name}
          </p>
          <p className="text-white/60 text-xs tracking-wider mt-0.5">
            Código: <strong className="text-white">{salesRep.referral_code}</strong>
          </p>
        </div>
        <button
          onClick={() => { fetch("/api/representante/auth", { method: "DELETE" }).catch(() => {}); setSalesRep(null); setUses([]); setLoginEmail(""); setPassword(""); setLinkedPartners([]); setRepTab("overview"); }}
          className="text-white/60 hover:text-white text-xs uppercase tracking-widest transition-colors"
        >
          Sair
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        {/* Referral link card */}
        {(() => {
          const referralUrl = `https://orbitalrevestimentos.com.br/parcerias?rep=${salesRep.referral_code}`;
          return (
            <div className="bg-white border border-[#e2e2e2] px-6 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold mb-1">
                  Seu link de indicação
                </p>
                <p className="text-[#0B1F45] text-sm truncate">{referralUrl}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-shrink-0 bg-[#0B1F45] text-white text-xs tracking-[0.1em] uppercase font-bold px-5 py-2.5 hover:bg-[#2347A0] transition-colors"
              >
                {copied ? "Copiado!" : "Copiar link"}
              </button>
            </div>
          );
        })()}

        {/* Proactive "a reunião aconteceu?" banners for past-due meetings */}
        <RepMeetingPrompts salesRepId={salesRep.id} repName={salesRep.name} />

        {/* Tab bar */}
        <div className="flex flex-wrap gap-x-1 mb-8 border-b border-[#e2e2e2]">
          {([
            { key: "overview", label: "Visão Geral" },
            { key: "commissions", label: "Comissões" },
            { key: "partners", label: `Meus Parceiros${linkedPartners.length > 0 ? ` (${linkedPartners.length})` : ""}` },
            { key: "agenda", label: "Agenda" },
            { key: "crm", label: "Meu CRM" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setRepTab(t.key)}
              className={`px-5 py-3 text-xs tracking-[0.1em] uppercase font-bold border-b-2 transition-colors -mb-px ${
                repTab === t.key
                  ? "border-[#0B1F45] text-[#0B1F45]"
                  : "border-transparent text-[#74777f] hover:text-[#0B1F45]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {repTab === "overview" && (<>
        {/* Summary cards — 4-card grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-[#e2e2e2] px-6 py-5">
            <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold mb-1">
              Parceiros indicados
            </p>
            <p className="text-[#0B1F45] text-3xl font-normal">
              {uniquePartners}
            </p>
          </div>
          <div className="bg-white border border-[#e2e2e2] px-6 py-5">
            <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold mb-1">
              Vendas concluídas
            </p>
            <p className="text-[#0B1F45] text-3xl font-normal">
              {uses.filter((u) => u.sale_status === "concluido").length}
            </p>
          </div>
          <div className="bg-white border border-[#e2e2e2] px-6 py-5">
            <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold mb-1">
              Comissão confirmada
            </p>
            <p className="text-green-700 text-2xl font-normal">
              {fmt(confirmedCommission)}
            </p>
          </div>
          <div className="bg-white border border-[#e2e2e2] px-6 py-5">
            <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold mb-1">
              Comissão pendente
            </p>
            <p className="text-amber-600 text-2xl font-normal">
              {fmt(pendingCommission)}
            </p>
          </div>
        </div>

        {/* Monthly commission bar chart */}
        {(() => {
          const confirmedUses = uses.filter((u) => u.sale_status === "concluido");
          if (confirmedUses.length === 0) return null;
          // Build last 6 months
          const now = new Date();
          const months: { key: string; label: string }[] = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
            months.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
          }
          const totals: Record<string, number> = {};
          for (const m of months) totals[m.key] = 0;
          for (const u of confirmedUses) {
            const d = new Date(u.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            if (key in totals) totals[key] += u.sales_rep_commission_owed || 0;
          }
          const maxVal = Math.max(...months.map((m) => totals[m.key]), 1);
          return (
            <div className="bg-white border border-[#e2e2e2] px-6 py-5 mb-8">
              <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold mb-4">
                Comissão confirmada — últimos 6 meses
              </p>
              <div className="flex items-end gap-3 h-16">
                {months.map((m) => {
                  const val = totals[m.key];
                  const heightPct = Math.round((val / maxVal) * 100);
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-sm"
                        style={{
                          backgroundColor: "#0B1F45",
                          height: `${Math.max(heightPct, val > 0 ? 4 : 2)}%`,
                          minHeight: "2px",
                          opacity: val > 0 ? 1 : 0.15,
                        }}
                        title={fmt(val)}
                      />
                      <span className="text-[#74777f] text-[10px]">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Change password */}
        <div className="bg-white border border-[#e2e2e2] mb-6">
          <button
            onClick={() => { setCpOpen(!cpOpen); setCpError(""); setCpSuccess(false); }}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f]">
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
                <p className="text-green-600 text-sm">Senha alterada com sucesso.</p>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] mb-1">Senha atual</label>
                    <div className="relative">
                      <input
                        required
                        type={showCpCurrent ? "text" : "password"}
                        value={cpCurrent}
                        onChange={(e) => setCpCurrent(e.target.value)}
                        className="w-full border border-[#e2e2e2] px-3 py-2.5 pr-10 text-sm text-[#0B1F45] focus:outline-none focus:border-[#0B1F45]"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={showCpCurrent ? "Ocultar senha" : "Mostrar senha"}
                        onClick={() => setShowCpCurrent((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#0B1F45] transition-colors"
                      >
                        {showCpCurrent ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] mb-1">Nova senha</label>
                    <div className="relative">
                      <input
                        required
                        type={showCpNew ? "text" : "password"}
                        value={cpNew}
                        onChange={(e) => setCpNew(e.target.value)}
                        className="w-full border border-[#e2e2e2] px-3 py-2.5 pr-10 text-sm text-[#0B1F45] focus:outline-none focus:border-[#0B1F45]"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={showCpNew ? "Ocultar senha" : "Mostrar senha"}
                        onClick={() => setShowCpNew((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#0B1F45] transition-colors"
                      >
                        {showCpNew ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] mb-1">Confirmar nova senha</label>
                    <div className="relative">
                      <input
                        required
                        type={showCpConfirm ? "text" : "password"}
                        value={cpConfirm}
                        onChange={(e) => setCpConfirm(e.target.value)}
                        className="w-full border border-[#e2e2e2] px-3 py-2.5 pr-10 text-sm text-[#0B1F45] focus:outline-none focus:border-[#0B1F45]"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={showCpConfirm ? "Ocultar senha" : "Mostrar senha"}
                        onClick={() => setShowCpConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#0B1F45] transition-colors"
                      >
                        {showCpConfirm ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  {cpError && <p className="text-red-600 text-xs">{cpError}</p>}
                  <button
                    type="submit"
                    disabled={cpLoading}
                    className="bg-[#0B1F45] text-white text-xs tracking-[0.12em] uppercase font-bold px-6 py-2.5 hover:bg-[#2347A0] transition-colors disabled:opacity-50"
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
              <h2 className="font-serif text-[#0B1F45] text-xl font-normal">
                Ranking de Parceiros
              </h2>
              <div className="flex items-center gap-2">
                {(["total", "count", "median"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setPartnerRankSort(s)}
                    className={`text-[10px] tracking-[0.08em] uppercase font-bold px-3 py-1.5 border transition-colors ${partnerRankSort === s ? "bg-[#0B1F45] text-white border-[#0B1F45]" : "text-[#74777f] border-[#e2e2e2] hover:border-[#0B1F45] hover:text-[#0B1F45]"}`}
                  >
                    {s === "total" ? "Valor" : s === "count" ? "Qtd." : "Ticket Médio"}
                  </button>
                ))}
              </div>
            </div>
            {/* Mobile card list — hidden on sm+ */}
            <div className="sm:hidden bg-white border border-[#e2e2e2] divide-y divide-[#f0f0f0]">
              {partnerRanking.map((p, i) => (
                <div key={p.code} className="px-4 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#0B1F45] text-base">{i + 1}°</span>
                      <span className="font-semibold text-[#0B1F45] text-sm">{p.name}</span>
                    </div>
                    <span className="bg-[#eef2f8] text-[#0B1F45] px-2 py-0.5 text-xs font-bold tracking-wider">{p.code}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold">Total</p>
                      <p className="text-green-700 text-xs font-semibold mt-0.5">{fmt(p.total)}</p>
                    </div>
                    <div>
                      <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold">Vendas</p>
                      <p className="text-[#43474e] text-xs mt-0.5">{p.count}</p>
                    </div>
                    <div>
                      <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold">Ticket Médio</p>
                      <p className="text-[#43474e] text-xs mt-0.5">{p.median > 0 ? fmt(p.median) : "—"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table — hidden on mobile */}
            <div className="hidden sm:block bg-white border border-[#e2e2e2] overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e2e2e2]">
                    {["#", "Parceiro", "Cupom", "Total gerado", "Vendas", "Ticket médio"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {partnerRanking.map((p, i) => (
                    <tr key={p.code} className="border-b border-[#f0f0f0] hover:bg-[#F6F5F2]">
                      <td className="px-5 py-3 font-bold text-[#0B1F45]">{i + 1}°</td>
                      <td className="px-5 py-3 font-semibold text-[#0B1F45]">{p.name}</td>
                      <td className="px-5 py-3"><span className="bg-[#eef2f8] text-[#0B1F45] px-2 py-0.5 text-xs font-bold tracking-wider">{p.code}</span></td>
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
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-serif text-[#0B1F45] text-xl font-normal">
            Histórico de vendas
          </h2>
        </div>
        {uses.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <label className="text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] whitespace-nowrap">Parceiro:</label>
            <select value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}
              className="border border-[#e2e2e2] px-3 py-1.5 text-xs text-[#0B1F45] focus:outline-none focus:border-[#0B1F45]">
              <option value="">Todos</option>
              {[...new Map(uses.map(u => [u.coupon_code, u.partner_name || u.coupon_code])).entries()].map(([code, name]) => (
                <option key={code} value={code}>{name} ({code})</option>
              ))}
            </select>
          </div>
        )}

        {(() => {
          const filteredHistoryUses = historyFilter ? uses.filter(u => u.coupon_code === historyFilter) : uses;
          return usesLoading ? (
          <p className="text-[#74777f] text-sm">Carregando...</p>
        ) : uses.length === 0 ? (
          <div className="bg-white border border-[#e2e2e2] px-6 py-10 text-center">
            <p className="text-[#74777f] text-sm">
              Nenhuma venda registrada ainda. Indique parceiros para começar!
            </p>
          </div>
        ) : (
          <>
            {/* Mobile card list — hidden on sm+ */}
            <div className="sm:hidden bg-white border border-[#e2e2e2] divide-y divide-[#f0f0f0]">
              {filteredHistoryUses.map((u) => {
                const st = u.sale_status || "em_orcamento";
                const stMeta = STATUS_LABELS[st] || STATUS_LABELS.em_orcamento;
                return (
                  <div key={u.id} className="px-4 py-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-[#0B1F45] text-sm">{u.partner_name || "—"}</p>
                        <p className="text-[#74777f] text-xs font-bold tracking-wider mt-0.5">{u.coupon_code || "—"}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full flex-shrink-0 ml-2 ${stMeta.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st === "concluido" ? "bg-green-600" : st === "cancelado" ? "bg-red-500" : "bg-yellow-500"}`} />
                        {stMeta.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div>
                        <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold">Data</p>
                        <p className="text-[#43474e] text-xs mt-0.5">{new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div>
                        <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold">Espaço</p>
                        <p className="text-[#43474e] text-xs mt-0.5">{u.space || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold">Placas</p>
                        <p className="text-[#43474e] text-xs mt-0.5">{String(u.plates ?? "—")}</p>
                      </div>
                      {st !== "cancelado" && u.sales_rep_commission_owed != null && (
                        <div>
                          <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold">Sua Comissão</p>
                          <p className={`text-xs font-semibold mt-0.5 ${st === "concluido" ? "text-[#0B1F45]" : "text-yellow-700"}`}>
                            {fmt(u.sales_rep_commission_owed)}{st !== "concluido" ? " (pend.)" : ""}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop table — hidden on mobile */}
            <div className="hidden sm:block bg-white border border-[#e2e2e2] overflow-x-auto">
              <table className="w-full text-sm">
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
                  {filteredHistoryUses.map((u) => {
                    const st = u.sale_status || "em_orcamento";
                    const stMeta = STATUS_LABELS[st] || STATUS_LABELS.em_orcamento;
                    return (
                      <tr key={u.id} className="border-b border-[#f0f0f0] hover:bg-[#F6F5F2]">
                        <td className="px-4 py-3 text-xs text-[#43474e] whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold tracking-wider text-[#0B1F45]">
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
                            ? <span className="text-[#0B1F45]">{fmt(u.sales_rep_commission_owed)}</span>
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
          </>
        );
        })()}
        </>)}

        {repTab === "commissions" && (
          <ComissoesLista
            party="rep"
            fmt={fmt}
            items={uses
              .filter((u) => u.sales_rep_commission_owed != null)
              .map((u): ComissaoItem => ({
                id: u.id,
                amount: u.sales_rep_commission_owed || 0,
                createdAt: u.created_at,
                saleStatus: u.sale_status,
                paidAt: u.rep_commission_paid_at,
                receivedAt: u.rep_commission_received_at ?? null,
                cancelledAt: u.rep_commission_cancelled_at ?? null,
                partnerName: u.partner_name || u.coupon_code || null,
                clientName: u.architect_name,
                product: u.product_name,
                space: u.space,
              }))}
            onReceivedChange={(id, receivedAt, paidAt) =>
              setUses((cur) => cur.map((u) => (u.id === id ? { ...u, rep_commission_received_at: receivedAt, rep_commission_paid_at: paidAt } : u)))
            }
          />
        )}

        {repTab === "partners" && (
          <div>
            <ConvidarParceiro onConvidado={() => fetchLinkedPartners(salesRep.id)} />
            {partnersLoading && linkedPartners.length === 0 ? (
              <p className="text-[#74777f] text-sm">Carregando parceiros...</p>
            ) : linkedPartners.length === 0 ? (
              <div className="bg-white border border-[#e2e2e2] px-6 py-10 text-center">
                <p className="text-[#74777f] text-sm">
                  Nenhum parceiro vinculado ainda.
                </p>
              </div>
            ) : (
              <>
                {/* Busca, filtro e ordem */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-3 mb-3">
                  <input
                    type="search"
                    value={partnerSearch}
                    onChange={(e) => setPartnerSearch(e.target.value)}
                    placeholder="Buscar por nome, cupom ou profissão"
                    aria-label="Buscar parceiro"
                    className="w-full min-w-0 border border-[#e2e2e2] bg-white px-3 py-2.5 text-sm text-[#0B1F45] focus:outline-none focus:border-[#0B1F45]"
                  />
                  <select
                    value={partnerStatusFilter}
                    onChange={(e) => setPartnerStatusFilter(e.target.value as typeof partnerStatusFilter)}
                    aria-label="Filtrar por status"
                    className="w-full border border-[#e2e2e2] bg-white px-3 py-2.5 text-sm text-[#0B1F45] focus:outline-none focus:border-[#0B1F45]"
                  >
                    <option value="all">Todos os status</option>
                    <option value="active">Ativos</option>
                    <option value="pending">Pendentes / convite enviado</option>
                    <option value="inactive">Inativos</option>
                    <option value="idle">Sem atividade (30 dias)</option>
                  </select>
                  <select
                    value={partnerSort}
                    onChange={(e) => setPartnerSort(e.target.value as typeof partnerSort)}
                    aria-label="Ordenar"
                    className="w-full border border-[#e2e2e2] bg-white px-3 py-2.5 text-sm text-[#0B1F45] focus:outline-none focus:border-[#0B1F45]"
                  >
                    <option value="total">Maior total gerado</option>
                    <option value="name">Nome (A–Z)</option>
                    <option value="count">Mais vendas</option>
                    <option value="last_sale">Venda mais recente</option>
                    <option value="newest">Cadastro mais recente</option>
                  </select>
                </div>
                <p className="text-[11px] text-[#74777f] mb-3">
                  {partnersView.length === linkedPartners.length
                    ? `${linkedPartners.length} parceiro${linkedPartners.length === 1 ? "" : "s"}`
                    : `${partnersView.length} de ${linkedPartners.length} parceiros`}
                  {" · "}Total gerado:{" "}
                  <strong className="text-[#0B1F45]">
                    {partnersView.reduce((a, p) => a + p.total_sales, 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                  </strong>
                </p>

                {partnersView.length === 0 ? (
                  <div className="bg-white border border-[#e2e2e2] px-6 py-8 text-center">
                    <p className="text-[#74777f] text-sm">Nenhum parceiro encontrado com esses filtros.</p>
                  </div>
                ) : (
                <>
                {/* Mobile card list — hidden on sm+ */}
                <div className="sm:hidden bg-white border border-[#e2e2e2] divide-y divide-[#f0f0f0]">
                  {partnersView.map((p) => {
                    const badge = partnerStatusBadge(p);
                    const isInactive = partnerIsIdle(p);
                    return (
                      <div key={p.id} className="px-4 py-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0B1F45] text-sm break-words">{p.name}</p>
                            <p className="text-[#74777f] text-[10px] mt-0.5">desde {new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-wide ${badge.cls}`}>{badge.label}</span>
                              {isInactive && p.status === "active" && <span className="inline-block bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold tracking-wide">Sem atividade</span>}
                            </div>
                            <span className="bg-[#eef2f8] text-[#0B1F45] px-2 py-0.5 text-xs font-bold tracking-wider">{p.coupon_code}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          <div>
                            <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold">Profissão</p>
                            <p className="text-[#43474e] text-xs mt-0.5">{p.profession || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold">Vendas</p>
                            <p className="text-[#43474e] text-xs mt-0.5">{p.sales_count}</p>
                          </div>
                          <div>
                            <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold">Total gerado</p>
                            <p className="text-[#0B1F45] text-xs font-semibold mt-0.5">
                              {p.total_sales > 0 ? p.total_sales.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold">Última venda</p>
                            <p className="text-[#43474e] text-xs mt-0.5">
                              {p.last_sale_at ? new Date(p.last_sale_at).toLocaleDateString("pt-BR") : <span className="italic text-[#b0b0b0]">Sem vendas</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Desktop table — hidden on mobile. Cabeçalhos com ▼ ordenam. */}
                <div className="hidden sm:block bg-white border border-[#e2e2e2] overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e2e2e2]">
                        {([
                          ["Parceiro", "name"],
                          ["Tipo", null],
                          ["Status", null],
                          ["Cupom", null],
                          ["Vendas", "count"],
                          ["Total gerado", "total"],
                          ["Última venda", "last_sale"],
                        ] as const).map(([h, key]) => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.1em] uppercase font-bold text-[#74777f] whitespace-nowrap">
                            {key ? (
                              <button
                                type="button"
                                onClick={() => setPartnerSort(key)}
                                className={`uppercase tracking-[0.1em] font-bold hover:text-[#0B1F45] ${partnerSort === key ? "text-[#0B1F45]" : ""}`}
                              >
                                {h}{partnerSort === key ? (key === "name" ? " ▲" : " ▼") : ""}
                              </button>
                            ) : h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {partnersView.map((p) => {
                        const badge = partnerStatusBadge(p);
                        const isInactive = partnerIsIdle(p);
                        return (
                        <tr key={p.id} className="border-b border-[#f0f0f0] hover:bg-[#F6F5F2]">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-[#0B1F45]">{p.name}</p>
                            <p className="text-[10px] text-[#74777f]">desde {new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#43474e]">
                            {p.profession || <span className="italic text-[#b0b0b0]">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-wide ${badge.cls}`}>{badge.label}</span>
                              {isInactive && p.status === "active" && <span className="inline-block bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold tracking-wide">Sem atividade</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-[#eef2f8] text-[#0B1F45] px-2 py-0.5 text-xs font-bold tracking-wider">{p.coupon_code}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#43474e]">{p.sales_count}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-[#0B1F45]">
                            {p.total_sales > 0 ? p.total_sales.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#43474e] whitespace-nowrap">
                            {p.last_sale_at ? new Date(p.last_sale_at).toLocaleDateString("pt-BR") : <span className="italic text-[#b0b0b0]">Sem vendas</span>}
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                </div>
                </>
                )}
              </>
            )}
          </div>
        )}

        {repTab === "agenda" && (
          <RepAgendaTab salesRepId={salesRep.id} linkedPartners={linkedPartners} onPartnersChanged={() => fetchLinkedPartners(salesRep.id)} />
        )}

        {repTab === "crm" && (
          <RepCrmTab salesRepId={salesRep.id} linkedPartners={linkedPartners} />
        )}
      </div>
    </div>
  );
}
