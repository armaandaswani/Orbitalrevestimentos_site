"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

interface Partner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  coupon_code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  commission_type: "percentage" | "fixed";
  commission_value: number;
  portal_password: string | null;
  status: "active" | "inactive" | "pending";
  is_self_registered: boolean | null;
  sales_rep_referral_code: string | null;
  created_at: string;
  birthday: string | null;
}

interface SalesRep {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  referral_code: string;
  commission_type: "percentage" | "fixed";
  commission_value: number;
  portal_password: string | null;
  status: "active" | "inactive";
  created_at: string;
  birthday: string | null;
}

interface CouponUse {
  id: string;
  partner_id: string;
  coupon_code: string;
  space: string | null;
  product_name: string | null;
  product_code: string | null;
  area_m2: number | null;
  plates: number | null;
  material_total: number | null;
  material_discounted: number | null;
  discount_applied: number | null;
  commission_owed: number | null;
  architect_name: string | null;
  sale_status: "em_orcamento" | "concluido" | "cancelado" | null;
  sales_rep_referral_code: string | null;
  sales_rep_commission_owed: number | null;
  created_at: string;
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "orbital2025";

const emptyPartnerForm = {
  name: "", email: "", phone: "", coupon_code: "",
  discount_type: "percentage" as "percentage" | "fixed",
  discount_value: 0,
  commission_type: "percentage" as "percentage" | "fixed",
  commission_value: 0,
  portal_password: "",
  status: "active" as "active" | "inactive" | "pending",
  sales_rep_referral_code: "",
  birthday: "",
};

const emptyRepForm = {
  name: "", email: "", phone: "", referral_code: "",
  commission_type: "percentage" as "percentage" | "fixed",
  commission_value: 5,
  portal_password: "",
  status: "active" as "active" | "inactive",
  birthday: "",
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  em_orcamento: { label: "Em orçamento", cls: "bg-yellow-100 text-yellow-800" },
  concluido:    { label: "Concluído",    cls: "bg-green-100 text-green-800"  },
  cancelado:    { label: "Cancelado",    cls: "bg-red-100 text-red-700"      },
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [tab, setTab] = useState<"partners" | "representantes" | "history">("partners");

  // Partners
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [partnerForm, setPartnerForm] = useState({ ...emptyPartnerForm });
  const [partnerFormError, setPartnerFormError] = useState("");
  const [partnerFormLoading, setPartnerFormLoading] = useState(false);
  const [newlyCreatedPartner, setNewlyCreatedPartner] = useState<Partner | null>(null);
  // Approval form for pending partners
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 10,
    commission_type: "percentage" as "percentage" | "fixed",
    commission_value: 5,
    portal_password: "",
  });
  const [approvalLoading, setApprovalLoading] = useState(false);

  // Sales reps
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [loadingReps, setLoadingReps] = useState(false);
  const [showRepForm, setShowRepForm] = useState(false);
  const [editingRepId, setEditingRepId] = useState<string | null>(null);
  const [repForm, setRepForm] = useState({ ...emptyRepForm });
  const [repFormError, setRepFormError] = useState("");
  const [repFormLoading, setRepFormLoading] = useState(false);

  // History
  const [uses, setUses] = useState<CouponUse[]>([]);
  const [loadingUses, setLoadingUses] = useState(false);
  const [filterPartner, setFilterPartner] = useState<string>("all");
  const [filterRep, setFilterRep] = useState<string>("all");

  // Change admin password
  const [cpOpen, setCpOpen] = useState(false);
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpError, setCpError] = useState("");
  const [cpSuccess, setCpSuccess] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  useEffect(() => {
    const stored = sessionStorage.getItem("orbital_admin_auth");
    if (stored === "1") setAuthed(true);
  }, []);

  const fetchPartners = useCallback(async () => {
    setLoadingPartners(true);
    const res = await fetch("/api/partners");
    if (res.ok) setPartners(await res.json());
    setLoadingPartners(false);
  }, []);

  const fetchReps = useCallback(async () => {
    setLoadingReps(true);
    const res = await fetch("/api/sales-reps");
    if (res.ok) setSalesReps(await res.json());
    setLoadingReps(false);
  }, []);

  const fetchUses = useCallback(async () => {
    setLoadingUses(true);
    const res = await fetch("/api/coupons/use");
    if (res.ok) setUses(await res.json());
    setLoadingUses(false);
  }, []);

  useEffect(() => {
    if (!authed || !supabaseConfigured) return;
    fetchPartners();
    fetchReps();
    fetchUses();
  }, [authed, tab, supabaseConfigured, fetchPartners, fetchReps, fetchUses]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pw === ADMIN_PW) {
      sessionStorage.setItem("orbital_admin_auth", "1");
      setAuthed(true);
    } else {
      setPwError("Senha incorreta.");
    }
  }

  async function handleAdminChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setCpError("");
    if (cpNew !== cpConfirm) { setCpError("As senhas não coincidem."); return; }
    if (cpNew.length < 6) { setCpError("A nova senha deve ter pelo menos 6 caracteres."); return; }
    setCpLoading(true);
    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: cpCurrent, new_password: cpNew }),
    });
    const json = await res.json();
    setCpLoading(false);
    if (!res.ok) { setCpError(json.error || "Erro ao alterar senha."); return; }
    setCpSuccess(true);
    setCpCurrent(""); setCpNew(""); setCpConfirm("");
    setTimeout(() => { setCpOpen(false); setCpSuccess(false); }, 2000);
  }

  // ── Partners ─────────────────────────────
  function startCreatePartner() {
    setEditingPartnerId(null);
    setNewlyCreatedPartner(null);
    setPartnerForm({ ...emptyPartnerForm });
    setPartnerFormError("");
    setShowPartnerForm(true);
  }

  function startEditPartner(p: Partner) {
    setEditingPartnerId(p.id);
    setNewlyCreatedPartner(null);
    setPartnerForm({
      name: p.name, email: p.email || "", phone: p.phone || "",
      coupon_code: p.coupon_code,
      discount_type: p.discount_type, discount_value: p.discount_value,
      commission_type: p.commission_type, commission_value: p.commission_value,
      portal_password: p.portal_password || "",
      status: p.status,
      sales_rep_referral_code: p.sales_rep_referral_code || "",
      birthday: p.birthday ? p.birthday.split("T")[0] : "",
    });
    setPartnerFormError("");
    setShowPartnerForm(true);
  }

  async function handlePartnerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPartnerFormError("");
    setPartnerFormLoading(true);
    const payload = { ...partnerForm, coupon_code: partnerForm.coupon_code.toUpperCase(), portal_password: partnerForm.portal_password || null, sales_rep_referral_code: partnerForm.sales_rep_referral_code || null };
    let res: Response;
    if (editingPartnerId) {
      res = await fetch(`/api/partners/${editingPartnerId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      res = await fetch("/api/partners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    const json = await res.json();
    setPartnerFormLoading(false);
    if (!res.ok) { setPartnerFormError(json.error || "Erro desconhecido."); return; }
    setShowPartnerForm(false);
    if (!editingPartnerId) setNewlyCreatedPartner(json as Partner);
    fetchPartners();
  }

  async function approvePartner(p: Partner) {
    setApprovalLoading(true);
    await fetch(`/api/partners/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...approvalForm, portal_password: approvalForm.portal_password || null, status: "active" }),
    });
    setApprovalLoading(false);
    setApprovingId(null);
    fetchPartners();
  }

  async function rejectPartner(p: Partner) {
    if (!confirm(`Rejeitar cadastro de ${p.name}? O parceiro será removido.`)) return;
    await fetch(`/api/partners/${p.id}`, { method: "DELETE" });
    fetchPartners();
  }

  async function togglePartnerStatus(p: Partner) {
    await fetch(`/api/partners/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: p.status === "active" ? "inactive" : "active" }) });
    fetchPartners();
  }

  async function deletePartner(p: Partner) {
    if (!confirm(`Excluir parceiro ${p.name}? Isso também remove o histórico de usos.`)) return;
    await fetch(`/api/partners/${p.id}`, { method: "DELETE" });
    setNewlyCreatedPartner(null);
    fetchPartners();
  }

  function buildWALink(p: Partner) {
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://orbitalrevestimentos.com.br";
    const discountLabel = p.discount_type === "percentage" ? `${p.discount_value}% de desconto` : `R$ ${p.discount_value} de desconto`;
    const lines = [`Olá ${p.name}! 👋`, ``, `Seu cupom Orbital foi aprovado:`, ``, `🎟 Código: *${p.coupon_code}*`, `💰 ${discountLabel} para seus clientes`, ``, `Acesse seu painel em:`, `${siteUrl}/parceiro`];
    if (p.portal_password) lines.push(`🔑 Senha: ${p.portal_password}`);
    const text = encodeURIComponent(lines.join("\n"));
    if (p.phone) {
      const digits = p.phone.replace(/\D/g, "");
      const phoneWithCountry = digits.startsWith("55") ? digits : `55${digits}`;
      return `https://wa.me/${phoneWithCountry}?text=${text}`;
    }
    return `https://wa.me/?text=${text}`;
  }

  // ── Sales Reps ───────────────────────────
  function startCreateRep() {
    setEditingRepId(null);
    setRepForm({ ...emptyRepForm });
    setRepFormError("");
    setShowRepForm(true);
  }

  function startEditRep(r: SalesRep) {
    setEditingRepId(r.id);
    setRepForm({
      name: r.name, email: r.email || "", phone: r.phone || "",
      referral_code: r.referral_code,
      commission_type: r.commission_type, commission_value: r.commission_value,
      portal_password: r.portal_password || "",
      status: r.status,
      birthday: r.birthday ? r.birthday.split("T")[0] : "",
    });
    setRepFormError("");
    setShowRepForm(true);
  }

  async function handleRepSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRepFormError("");
    setRepFormLoading(true);
    const payload = { ...repForm, referral_code: repForm.referral_code.toUpperCase(), portal_password: repForm.portal_password || null };
    let res: Response;
    if (editingRepId) {
      res = await fetch(`/api/sales-reps/${editingRepId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      res = await fetch("/api/sales-reps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    const json = await res.json();
    setRepFormLoading(false);
    if (!res.ok) { setRepFormError(json.error || "Erro desconhecido."); return; }
    setShowRepForm(false);
    fetchReps();
  }

  async function toggleRepStatus(r: SalesRep) {
    await fetch(`/api/sales-reps/${r.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: r.status === "active" ? "inactive" : "active" }) });
    fetchReps();
  }

  async function deleteRep(r: SalesRep) {
    if (!confirm(`Excluir representante ${r.name}?`)) return;
    await fetch(`/api/sales-reps/${r.id}`, { method: "DELETE" });
    fetchReps();
  }

  // ── History ──────────────────────────────
  async function updateSaleStatus(useId: string, sale_status: string) {
    const res = await fetch(`/api/coupons/use/${useId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sale_status }) });
    if (res.ok) {
      const updated = await res.json();
      setUses((prev) => prev.map((u) => (u.id === useId ? { ...u, ...updated } : u)));
    }
  }

  const pendingPartners = partners.filter((p) => p.status === "pending");
  const activePartners = partners.filter((p) => p.status !== "pending");

  // Partner rankings (from completed coupon uses)
  const partnerRanking = useMemo(() => {
    const byCode: Record<string, { total: number; count: number; values: number[] }> = {};
    for (const u of uses) {
      if (u.sale_status !== "concluido" || !u.coupon_code) continue;
      if (!byCode[u.coupon_code]) byCode[u.coupon_code] = { total: 0, count: 0, values: [] };
      const v = u.material_discounted || 0;
      byCode[u.coupon_code].total += v;
      byCode[u.coupon_code].count++;
      if (v > 0) byCode[u.coupon_code].values.push(v);
    }
    return Object.entries(byCode).map(([code, s]) => {
      const p = activePartners.find((p) => p.coupon_code === code);
      const sorted = [...s.values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      return { code, name: p?.name || code, total: s.total, count: s.count, median };
    }).sort((a, b) => b.total - a.total);
  }, [uses, activePartners]);

  const [repRankSort, setRepRankSort] = useState<"total" | "count" | "median">("total");
  const [rankSortPartner, setRankSortPartner] = useState<"total" | "count" | "median">("total");
  const [rankRepPartner, setRankRepPartner] = useState<string>("all");

  const repRanking = useMemo(() => {
    const byCode: Record<string, { total: number; count: number; values: number[] }> = {};
    for (const u of uses) {
      if (u.sale_status !== "concluido" || !u.sales_rep_referral_code) continue;
      const code = u.sales_rep_referral_code;
      if (!byCode[code]) byCode[code] = { total: 0, count: 0, values: [] };
      const v = u.material_discounted || 0;
      byCode[code].total += v;
      byCode[code].count++;
      if (v > 0) byCode[code].values.push(v);
    }
    const rows = Object.entries(byCode).map(([code, s]) => {
      const r = salesReps.find((r) => r.referral_code === code);
      const sorted = [...s.values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) / 2);
      const partnerCount = partners.filter((p) => p.sales_rep_referral_code === code).length;
      return { code, name: r?.name || code, total: s.total, count: s.count, median, partnerCount };
    });
    if (repRankSort === "count") rows.sort((a, b) => b.count - a.count);
    else if (repRankSort === "median") rows.sort((a, b) => b.median - a.median);
    else rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [uses, salesReps, partners, repRankSort]);

  // Upcoming birthdays this month
  const upcomingBirthdays = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    return activePartners
      .filter((p) => {
        if (!p.birthday) return false;
        return new Date(p.birthday).getUTCMonth() + 1 === thisMonth;
      })
      .sort((a, b) => new Date(a.birthday!).getUTCDate() - new Date(b.birthday!).getUTCDate());
  }, [activePartners]);

  // Upcoming rep birthdays this month
  const upcomingRepBirthdays = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    return salesReps
      .filter((r) => {
        if (!r.birthday) return false;
        return new Date(r.birthday).getUTCMonth() + 1 === thisMonth;
      })
      .sort((a, b) => new Date(a.birthday!).getUTCDate() - new Date(b.birthday!).getUTCDate());
  }, [salesReps]);

  const filteredUses = uses.filter((u) => {
    if (filterPartner !== "all" && u.coupon_code !== filterPartner) return false;
    if (filterRep !== "all" && u.sales_rep_referral_code !== filterRep) return false;
    return true;
  });
  const concludedUses = filteredUses.filter((u) => u.sale_status === "concluido");
  const totalSales = concludedUses.reduce((a, u) => a + (u.material_discounted || 0), 0);
  const totalCommission = concludedUses.reduce((a, u) => a + (u.commission_owed || 0), 0);
  const totalRepCommission = concludedUses.reduce((a, u) => a + (u.sales_rep_commission_owed || 0), 0);
  const pendingCommission = filteredUses.filter((u) => !u.sale_status || u.sale_status === "em_orcamento").reduce((a, u) => a + (u.commission_owed || 0), 0);

  const inputCls = "w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]";
  const labelCls = "block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2";

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f5f5f3] flex items-center justify-center px-4">
        <div className="bg-white border border-[#e2e2e2] p-10 w-full max-w-sm">
          <p className="text-[#002045] font-[var(--font-noto-serif)] text-2xl font-normal mb-6">Orbital Admin</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={labelCls}>Senha</label>
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} autoFocus />
            </div>
            {pwError && <p className="text-red-600 text-sm font-[var(--font-inter)]">{pwError}</p>}
            <button type="submit" className="w-full bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#1a365d] transition-colors">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      <div className="bg-[#002045] px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-white font-[var(--font-noto-serif)] text-xl">Orbital Admin</p>
          {pendingPartners.length > 0 && (
            <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold font-[var(--font-inter)] px-2 py-0.5 tracking-wider">
              {pendingPartners.length} PENDENTE{pendingPartners.length > 1 ? "S" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setCpOpen(!cpOpen); setCpError(""); setCpSuccess(false); }}
            className="text-white/60 hover:text-white text-xs font-[var(--font-inter)] uppercase tracking-widest transition-colors"
          >
            Alterar senha
          </button>
          <button onClick={() => { sessionStorage.removeItem("orbital_admin_auth"); setAuthed(false); }} className="text-white/60 hover:text-white text-xs font-[var(--font-inter)] uppercase tracking-widest transition-colors">
            Sair
          </button>
        </div>
      </div>

      {cpOpen && (
        <div className="bg-[#001530] border-b border-[#1a365d] px-8 py-5">
          {cpSuccess ? (
            <p className="text-green-400 text-sm font-[var(--font-inter)]">Senha alterada com sucesso.</p>
          ) : (
            <form onSubmit={handleAdminChangePassword} className="flex flex-wrap items-end gap-4">
              {["Senha atual", "Nova senha", "Confirmar nova senha"].map((lbl, i) => (
                <div key={lbl}>
                  <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-white/50 mb-1">{lbl}</label>
                  <input
                    required
                    type="password"
                    value={[cpCurrent, cpNew, cpConfirm][i]}
                    onChange={(e) => [setCpCurrent, setCpNew, setCpConfirm][i](e.target.value)}
                    className="border border-[#1a365d] bg-[#002045] text-white px-3 py-2 text-sm font-[var(--font-inter)] focus:outline-none focus:border-white/40 w-44"
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1">
                {cpError && <p className="text-red-400 text-xs font-[var(--font-inter)]">{cpError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={cpLoading}
                    className="bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-2 hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    {cpLoading ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCpOpen(false)}
                    className="text-white/50 text-xs font-[var(--font-inter)] px-4 py-2 border border-white/20 hover:border-white/40 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {!supabaseConfigured && (
        <div className="max-w-4xl mx-auto px-8 pt-10">
          <div className="bg-yellow-50 border border-yellow-300 px-6 py-5 text-yellow-900 text-sm font-[var(--font-inter)]">
            Configure as variáveis de ambiente do Supabase para usar o painel admin.
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex gap-1 mb-8 border-b border-[#e2e2e2]">
          {(["partners", "representantes", "history"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-6 py-3 text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] transition-colors border-b-2 -mb-px flex items-center gap-2 ${tab === t ? "border-[#002045] text-[#002045]" : "border-transparent text-[#74777f] hover:text-[#002045]"}`}>
              {t === "partners" ? "Parceiros" : t === "representantes" ? "Representantes" : "Histórico"}
              {t === "partners" && pendingPartners.length > 0 && (
                <span className="bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {pendingPartners.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══ PARTNERS TAB ═══ */}
        {tab === "partners" && (
          <div>
            {/* Pending approvals */}
            {pendingPartners.length > 0 && (
              <div className="mb-8">
                <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-yellow-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
                  Aguardando aprovação ({pendingPartners.length})
                </h3>
                <div className="space-y-3">
                  {pendingPartners.map((p) => (
                    <div key={p.id} className="bg-white border border-yellow-200 px-6 py-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#002045] font-[var(--font-inter)]">{p.name}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                            {p.email && <p className="text-xs text-[#74777f] font-[var(--font-inter)]">{p.email}</p>}
                            {p.phone && <p className="text-xs text-[#74777f] font-[var(--font-inter)]">{p.phone}</p>}
                            {p.sales_rep_referral_code && (
                              <p className="text-xs text-[#002045] font-[var(--font-inter)]">
                                Rep: <strong>{p.sales_rep_referral_code}</strong>
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-[#74777f] font-[var(--font-inter)] mt-0.5">
                            Cupom gerado: <span className="font-bold text-[#002045] tracking-wider">{p.coupon_code}</span> ·{" "}
                            {new Date(p.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => { setApprovingId(approvingId === p.id ? null : p.id); setApprovalForm({ discount_type: "percentage", discount_value: 10, commission_type: "percentage", commission_value: 5, portal_password: p.portal_password || "" }); }}
                            className="bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] tracking-[0.08em] uppercase px-4 py-2 hover:bg-[#1a365d] transition-colors">
                            Aprovar
                          </button>
                          <button onClick={() => rejectPartner(p)} className="border border-red-300 text-red-600 text-xs font-bold font-[var(--font-inter)] tracking-[0.08em] uppercase px-4 py-2 hover:bg-red-50 transition-colors">
                            Rejeitar
                          </button>
                        </div>
                      </div>
                      {/* Approval form */}
                      {approvingId === p.id && (
                        <div className="mt-4 pt-4 border-t border-yellow-100">
                          <p className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-3">Definir condições para aprovação</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                            <div>
                              <label className={labelCls}>Tipo desconto</label>
                              <select value={approvalForm.discount_type} onChange={(e) => setApprovalForm({ ...approvalForm, discount_type: e.target.value as "percentage" | "fixed" })} className={inputCls}>
                                <option value="percentage">% Porcentagem</option>
                                <option value="fixed">R$ Fixo</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelCls}>Desconto {approvalForm.discount_type === "percentage" ? "(%)" : "(R$)"}</label>
                              <input type="number" min="0" step="0.01" value={approvalForm.discount_value} onChange={(e) => setApprovalForm({ ...approvalForm, discount_value: parseFloat(e.target.value) || 0 })} className={inputCls} />
                            </div>
                            <div>
                              <label className={labelCls}>Tipo comissão</label>
                              <select value={approvalForm.commission_type} onChange={(e) => setApprovalForm({ ...approvalForm, commission_type: e.target.value as "percentage" | "fixed" })} className={inputCls}>
                                <option value="percentage">% Porcentagem</option>
                                <option value="fixed">R$ Fixo</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelCls}>Comissão {approvalForm.commission_type === "percentage" ? "(%)" : "(R$)"}</label>
                              <input type="number" min="0" step="0.01" value={approvalForm.commission_value} onChange={(e) => setApprovalForm({ ...approvalForm, commission_value: parseFloat(e.target.value) || 0 })} className={inputCls} />
                            </div>
                          </div>
                          <div className="mb-3 max-w-xs">
                            <label className={labelCls}>Senha do portal</label>
                            <input value={approvalForm.portal_password} onChange={(e) => setApprovalForm({ ...approvalForm, portal_password: e.target.value })} className={inputCls} placeholder="Opcional" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => approvePartner(p)} disabled={approvalLoading}
                              className="bg-green-700 text-white text-xs font-bold font-[var(--font-inter)] tracking-[0.08em] uppercase px-5 py-2 hover:bg-green-800 transition-colors disabled:opacity-50">
                              {approvalLoading ? "Aprovando..." : "Confirmar aprovação"}
                            </button>
                            <button onClick={() => setApprovingId(null)} className="text-[#74777f] text-xs font-bold font-[var(--font-inter)] px-4 py-2 border border-[#e2e2e2] hover:border-[#74777f] transition-colors">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Birthdays this month */}
            {upcomingBirthdays.length > 0 && (
              <div className="mb-8">
                <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] mb-3 flex items-center gap-2">
                  🎂 Aniversários em {new Date().toLocaleString("pt-BR", { month: "long" })}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {upcomingBirthdays.map((p) => {
                    const bday = new Date(p.birthday!);
                    const day = bday.getUTCDate();
                    const now = new Date();
                    const isToday = bday.getUTCDate() === now.getDate() && bday.getUTCMonth() === now.getMonth();
                    const age = now.getFullYear() - bday.getUTCFullYear();
                    return (
                      <div key={p.id} className={`px-4 py-3 border text-sm font-[var(--font-inter)] ${isToday ? "border-yellow-300 bg-yellow-50" : "border-[#e2e2e2] bg-white"}`}>
                        <span className="font-bold text-[#002045]">{day < 10 ? `0${day}` : day}</span>
                        <span className="text-[#74777f] text-xs ml-1">— {p.name}</span>
                        <span className="text-[#74777f] text-xs ml-1">({age} anos)</span>
                        {isToday && <span className="ml-2 text-yellow-700 text-xs font-bold">HOJE!</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Partner rankings */}
            {(() => {
              const [pRankSort, setPRankSort] = [rankSortPartner, setRankSortPartner];
              const [pRankRep, setPRankRep] = [rankRepPartner, setRankRepPartner];
              const filtered = pRankRep === "all" ? partnerRanking : partnerRanking.filter((r) => {
                const p = activePartners.find((ap) => ap.coupon_code === r.code);
                return p?.sales_rep_referral_code === pRankRep;
              });
              const sorted = [...filtered].sort((a, b) => pRankSort === "count" ? b.count - a.count : pRankSort === "median" ? b.median - a.median : b.total - a.total);
              return (
                <div className="mb-8">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045]">
                      Ranking de Parceiros — vendas concluídas
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      {salesReps.length > 0 && (
                        <select value={pRankRep} onChange={(e) => setPRankRep(e.target.value)} className="border border-[#e2e2e2] px-3 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
                          <option value="all">Todos os representantes</option>
                          {salesReps.map((r) => <option key={r.id} value={r.referral_code}>{r.name}</option>)}
                        </select>
                      )}
                      {(["total", "count", "median"] as const).map((s) => (
                        <button key={s} onClick={() => setPRankSort(s)} className={`text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border transition-colors ${pRankSort === s ? "bg-[#002045] text-white border-[#002045]" : "text-[#74777f] border-[#e2e2e2] hover:border-[#002045] hover:text-[#002045]"}`}>
                          {s === "total" ? "Valor" : s === "count" ? "Qtd." : "Ticket Médio"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
                    <table className="w-full text-sm font-[var(--font-inter)]">
                      <thead>
                        <tr className="border-b border-[#e2e2e2]">
                          {["#", "Parceiro", "Cupom", "Rep.", "Total vendido", "Vendas", "Ticket médio"].map((h) => (
                            <th key={h} className="text-left px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.length === 0 ? (
                          <tr><td colSpan={7} className="px-5 py-8 text-center text-[#74777f] text-sm">Nenhuma venda concluída registrada ainda.</td></tr>
                        ) : sorted.map((r, i) => {
                          const p = activePartners.find((ap) => ap.coupon_code === r.code);
                          const rep = p?.sales_rep_referral_code ? salesReps.find((sr) => sr.referral_code === p.sales_rep_referral_code) : null;
                          return (
                            <tr key={r.code} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                              <td className="px-5 py-3 font-bold text-[#002045]">{i + 1}°</td>
                              <td className="px-5 py-3 font-semibold text-[#002045]">{r.name}</td>
                              <td className="px-5 py-3"><span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider">{r.code}</span></td>
                              <td className="px-5 py-3 text-xs text-[#74777f]">{rep ? rep.name : "—"}</td>
                              <td className="px-5 py-3 font-semibold text-green-700">{fmt(r.total)}</td>
                              <td className="px-5 py-3 text-[#43474e]">{r.count}</td>
                              <td className="px-5 py-3 text-[#43474e]">{r.median > 0 ? fmt(r.median) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Active partners */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Parceiros</h2>
              <button onClick={startCreatePartner} className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors">
                + Novo Parceiro
              </button>
            </div>

            {newlyCreatedPartner && !showPartnerForm && (
              <div className="bg-green-50 border border-green-200 px-6 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-green-900 text-sm font-[var(--font-inter)] font-semibold mb-0.5">Parceiro criado!</p>
                  <p className="text-green-700 text-xs font-[var(--font-inter)]">
                    Cupom: <strong>{newlyCreatedPartner.coupon_code}</strong>
                    {newlyCreatedPartner.portal_password && <> · Senha: <strong>{newlyCreatedPartner.portal_password}</strong></>}
                  </p>
                </div>
                <a href={buildWALink(newlyCreatedPartner)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25d366] text-white text-xs tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#1db954] transition-colors whitespace-nowrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Enviar via WhatsApp
                </a>
              </div>
            )}

            {showPartnerForm && (
              <div className="bg-white border border-[#e2e2e2] p-8 mb-6">
                <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-lg font-normal mb-6">{editingPartnerId ? "Editar Parceiro" : "Novo Parceiro"}</h3>
                <form onSubmit={handlePartnerSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div><label className={labelCls}>Nome *</label><input required value={partnerForm.name} onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} className={inputCls} /></div>
                    <div><label className={labelCls}>Código do Cupom *</label><input required value={partnerForm.coupon_code} onChange={(e) => setPartnerForm({ ...partnerForm, coupon_code: e.target.value.toUpperCase() })} className={inputCls + " uppercase"} placeholder="ex: ARQLIMA10" /></div>
                    <div><label className={labelCls}>Email</label><input value={partnerForm.email} onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })} type="email" className={inputCls} /></div>
                    <div><label className={labelCls}>Telefone</label><input value={partnerForm.phone} onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })} className={inputCls} /></div>
                    <div><label className={labelCls}>Data de Nascimento *</label><input required type="date" value={partnerForm.birthday || ""} onChange={(e) => setPartnerForm({ ...partnerForm, birthday: e.target.value })} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Tipo de Desconto</label>
                      <select value={partnerForm.discount_type} onChange={(e) => setPartnerForm({ ...partnerForm, discount_type: e.target.value as "percentage" | "fixed" })} className={inputCls}>
                        <option value="percentage">Porcentagem (%)</option><option value="fixed">Valor fixo (R$)</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Valor do Desconto {partnerForm.discount_type === "percentage" ? "(%)" : "(R$)"}</label><input type="number" min="0" step="0.01" value={partnerForm.discount_value} onChange={(e) => setPartnerForm({ ...partnerForm, discount_value: parseFloat(e.target.value) || 0 })} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Tipo de Comissão</label>
                      <select value={partnerForm.commission_type} onChange={(e) => setPartnerForm({ ...partnerForm, commission_type: e.target.value as "percentage" | "fixed" })} className={inputCls}>
                        <option value="percentage">Porcentagem (%)</option><option value="fixed">Valor fixo (R$)</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Valor da Comissão {partnerForm.commission_type === "percentage" ? "(%)" : "(R$)"}</label><input type="number" min="0" step="0.01" value={partnerForm.commission_value} onChange={(e) => setPartnerForm({ ...partnerForm, commission_value: parseFloat(e.target.value) || 0 })} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Representante Comercial</label>
                      <select value={partnerForm.sales_rep_referral_code} onChange={(e) => setPartnerForm({ ...partnerForm, sales_rep_referral_code: e.target.value })} className={inputCls}>
                        <option value="">— Nenhum —</option>
                        {salesReps.filter((r) => r.status === "active").map((r) => (
                          <option key={r.id} value={r.referral_code}>{r.name} ({r.referral_code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Senha do Portal <span className="normal-case font-normal">(acesso parceiro)</span></label>
                      <input value={partnerForm.portal_password} onChange={(e) => setPartnerForm({ ...partnerForm, portal_password: e.target.value })} className={inputCls} placeholder="Deixe em branco para sem acesso" />
                    </div>
                    {editingPartnerId && (
                      <div>
                        <label className={labelCls}>Status</label>
                        <select value={partnerForm.status} onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value as "active" | "inactive" | "pending" })} className={inputCls}>
                          <option value="active">Ativo</option><option value="inactive">Inativo</option><option value="pending">Pendente</option>
                        </select>
                      </div>
                    )}
                  </div>
                  {partnerFormError && <p className="text-red-600 text-sm font-[var(--font-inter)] mb-4">{partnerFormError}</p>}
                  <div className="flex gap-3">
                    <button type="submit" disabled={partnerFormLoading} className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50">
                      {partnerFormLoading ? "Salvando..." : "Salvar"}
                    </button>
                    <button type="button" onClick={() => setShowPartnerForm(false)} className="text-[#74777f] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 border border-[#e2e2e2] hover:border-[#74777f] transition-colors">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loadingPartners ? <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p> : (
              <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
                <table className="w-full text-sm font-[var(--font-inter)]">
                  <thead>
                    <tr className="border-b border-[#e2e2e2]">
                      {["Nome", "Cupom", "Desconto", "Comissão", "Rep", "Senha Portal", "Status", "Ações"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activePartners.length === 0 ? (
                      <tr><td colSpan={8} className="px-5 py-8 text-center text-[#74777f]">Nenhum parceiro cadastrado.</td></tr>
                    ) : (
                      activePartners.map((p) => (
                        <tr key={p.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                          <td className="px-5 py-4"><p className="font-semibold text-[#002045]">{p.name}</p>{p.email && <p className="text-xs text-[#74777f]">{p.email}</p>}</td>
                          <td className="px-5 py-4"><span className="bg-[#eef2f8] text-[#002045] px-2 py-1 text-xs font-bold tracking-wider">{p.coupon_code}</span></td>
                          <td className="px-5 py-4 text-[#43474e]">{p.discount_type === "percentage" ? `${p.discount_value}%` : fmt(p.discount_value)}</td>
                          <td className="px-5 py-4 text-[#43474e]">{p.commission_type === "percentage" ? `${p.commission_value}%` : fmt(p.commission_value)}</td>
                          <td className="px-5 py-4 text-xs text-[#74777f]">
                            {p.sales_rep_referral_code
                              ? (() => { const r = salesReps.find((r) => r.referral_code === p.sales_rep_referral_code); return r ? <span title={r.referral_code}>{r.name}</span> : p.sales_rep_referral_code; })()
                              : "—"}
                          </td>
                          <td className="px-5 py-4 text-xs text-[#74777f]">{p.portal_password ? <span className="font-mono text-[#43474e]">{p.portal_password}</span> : <span className="italic">—</span>}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-1 text-[10px] font-bold tracking-wider ${p.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                              {p.status === "active" ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2 flex-wrap">
                              <button onClick={() => startEditPartner(p)} className="text-[#1a365d] text-xs font-semibold hover:text-[#002045]">Editar</button>
                              <span className="text-[#e2e2e2]">|</span>
                              <button onClick={() => togglePartnerStatus(p)} className="text-[#74777f] text-xs font-semibold hover:text-[#002045]">{p.status === "active" ? "Desativar" : "Ativar"}</button>
                              <span className="text-[#e2e2e2]">|</span>
                              <button onClick={() => deletePartner(p)} className="text-red-500 text-xs font-semibold hover:text-red-700">Excluir</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ REPRESENTANTES TAB ═══ */}
        {tab === "representantes" && (
          <div>
            {/* Rep birthdays this month */}
            {upcomingRepBirthdays.length > 0 && (
              <div className="mb-8">
                <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] mb-3 flex items-center gap-2">
                  🎂 Aniversários em {new Date().toLocaleString("pt-BR", { month: "long" })}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {upcomingRepBirthdays.map((r) => {
                    const bday = new Date(r.birthday!);
                    const day = bday.getUTCDate();
                    const now = new Date();
                    const isToday = bday.getUTCDate() === now.getDate() && bday.getUTCMonth() === now.getMonth();
                    const age = now.getFullYear() - bday.getUTCFullYear();
                    return (
                      <div key={r.id} className={`px-4 py-3 border text-sm font-[var(--font-inter)] ${isToday ? "border-yellow-300 bg-yellow-50" : "border-[#e2e2e2] bg-white"}`}>
                        <span className="font-bold text-[#002045]">{day < 10 ? `0${day}` : day}</span>
                        <span className="text-[#74777f] text-xs ml-1">— {r.name}</span>
                        <span className="text-[#74777f] text-xs ml-1">({age} anos)</span>
                        {isToday && <span className="ml-2 text-yellow-700 text-xs font-bold">HOJE!</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rep ranking */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045]">
                  Ranking de Representantes — vendas concluídas
                </h3>
                <div className="flex items-center gap-2">
                  {(["total", "count", "median"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setRepRankSort(s)}
                      className={`text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border transition-colors ${repRankSort === s ? "bg-[#002045] text-white border-[#002045]" : "text-[#74777f] border-[#e2e2e2] hover:border-[#002045] hover:text-[#002045]"}`}
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
                      {["#", "Representante", "Código", "Parceiros", "Total gerado", "Vendas", "Ticket médio"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {repRanking.length === 0 ? (
                      <tr><td colSpan={7} className="px-5 py-8 text-center text-[#74777f] text-sm">Nenhuma venda concluída registrada ainda.</td></tr>
                    ) : repRanking.map((r, i) => (
                      <tr key={r.code} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                        <td className="px-5 py-3 font-bold text-[#002045]">{i + 1}°</td>
                        <td className="px-5 py-3 font-semibold text-[#002045]">{r.name}</td>
                        <td className="px-5 py-3"><span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider">{r.code}</span></td>
                        <td className="px-5 py-3 text-[#43474e]">{r.partnerCount}</td>
                        <td className="px-5 py-3 font-semibold text-green-700">{fmt(r.total)}</td>
                        <td className="px-5 py-3 text-[#43474e]">{r.count}</td>
                        <td className="px-5 py-3 text-[#43474e]">{r.median > 0 ? fmt(r.median) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Representantes Comerciais</h2>
              <button onClick={startCreateRep} className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors">
                + Novo Representante
              </button>
            </div>

            {showRepForm && (
              <div className="bg-white border border-[#e2e2e2] p-8 mb-6">
                <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-lg font-normal mb-6">{editingRepId ? "Editar Representante" : "Novo Representante"}</h3>
                <form onSubmit={handleRepSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div><label className={labelCls}>Nome *</label><input required value={repForm.name} onChange={(e) => setRepForm({ ...repForm, name: e.target.value })} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Código de Referência *</label>
                      <input required value={repForm.referral_code} onChange={(e) => setRepForm({ ...repForm, referral_code: e.target.value.toUpperCase() })} className={inputCls + " uppercase"} placeholder="ex: REP_JOAO" />
                      <p className="text-[10px] text-[#74777f] font-[var(--font-inter)] mt-1">Parceiros usam este código ao se cadastrar</p>
                    </div>
                    <div><label className={labelCls}>Email</label><input value={repForm.email} onChange={(e) => setRepForm({ ...repForm, email: e.target.value })} type="email" className={inputCls} /></div>
                    <div><label className={labelCls}>Telefone</label><input value={repForm.phone} onChange={(e) => setRepForm({ ...repForm, phone: e.target.value })} className={inputCls} /></div>
                    <div><label className={labelCls}>Data de Nascimento *</label><input required type="date" value={repForm.birthday || ""} onChange={(e) => setRepForm({ ...repForm, birthday: e.target.value })} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Tipo de Comissão</label>
                      <select value={repForm.commission_type} onChange={(e) => setRepForm({ ...repForm, commission_type: e.target.value as "percentage" | "fixed" })} className={inputCls}>
                        <option value="percentage">Porcentagem (% da venda)</option><option value="fixed">Valor fixo (R$)</option>
                      </select>
                    </div>
                    <div><label className={labelCls}>Comissão {repForm.commission_type === "percentage" ? "(%)" : "(R$)"}</label><input type="number" min="0" step="0.01" value={repForm.commission_value} onChange={(e) => setRepForm({ ...repForm, commission_value: parseFloat(e.target.value) || 0 })} className={inputCls} /></div>
                    <div>
                      <label className={labelCls}>Senha do Portal <span className="normal-case font-normal">(acesso representante)</span></label>
                      <input value={repForm.portal_password} onChange={(e) => setRepForm({ ...repForm, portal_password: e.target.value })} className={inputCls} placeholder="Deixe em branco para sem acesso" />
                    </div>
                    {editingRepId && (
                      <div>
                        <label className={labelCls}>Status</label>
                        <select value={repForm.status} onChange={(e) => setRepForm({ ...repForm, status: e.target.value as "active" | "inactive" })} className={inputCls}>
                          <option value="active">Ativo</option><option value="inactive">Inativo</option>
                        </select>
                      </div>
                    )}
                  </div>
                  {repFormError && <p className="text-red-600 text-sm font-[var(--font-inter)] mb-4">{repFormError}</p>}
                  <div className="flex gap-3">
                    <button type="submit" disabled={repFormLoading} className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50">
                      {repFormLoading ? "Salvando..." : "Salvar"}
                    </button>
                    <button type="button" onClick={() => setShowRepForm(false)} className="text-[#74777f] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 border border-[#e2e2e2] hover:border-[#74777f] transition-colors">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loadingReps ? <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p> : (
              <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
                <table className="w-full text-sm font-[var(--font-inter)]">
                  <thead>
                    <tr className="border-b border-[#e2e2e2]">
                      {["Nome", "Código Ref.", "Comissão", "Parceiros", "Senha Portal", "Status", "Ações"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {salesReps.length === 0 ? (
                      <tr><td colSpan={7} className="px-5 py-8 text-center text-[#74777f]">Nenhum representante cadastrado.</td></tr>
                    ) : (
                      salesReps.map((r) => {
                        const repPartnerCount = partners.filter((p) => p.sales_rep_referral_code === r.referral_code).length;
                        return (
                          <tr key={r.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                            <td className="px-5 py-4"><p className="font-semibold text-[#002045]">{r.name}</p>{r.email && <p className="text-xs text-[#74777f]">{r.email}</p>}</td>
                            <td className="px-5 py-4"><span className="bg-[#eef2f8] text-[#002045] px-2 py-1 text-xs font-bold tracking-wider">{r.referral_code}</span></td>
                            <td className="px-5 py-4 text-[#43474e]">{r.commission_type === "percentage" ? `${r.commission_value}%` : fmt(r.commission_value)} <span className="text-xs text-[#74777f]">da venda</span></td>
                            <td className="px-5 py-4 text-[#43474e] font-semibold">{repPartnerCount}</td>
                            <td className="px-5 py-4 text-xs text-[#74777f]">{r.portal_password ? <span className="font-mono text-[#43474e]">{r.portal_password}</span> : <span className="italic">—</span>}</td>
                            <td className="px-5 py-4">
                              <span className={`px-2 py-1 text-[10px] font-bold tracking-wider ${r.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                                {r.status === "active" ? "Ativo" : "Inativo"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex gap-2">
                                <button onClick={() => startEditRep(r)} className="text-[#1a365d] text-xs font-semibold hover:text-[#002045]">Editar</button>
                                <span className="text-[#e2e2e2]">|</span>
                                <button onClick={() => toggleRepStatus(r)} className="text-[#74777f] text-xs font-semibold hover:text-[#002045]">{r.status === "active" ? "Desativar" : "Ativar"}</button>
                                <span className="text-[#e2e2e2]">|</span>
                                <button onClick={() => deleteRep(r)} className="text-red-500 text-xs font-semibold hover:text-red-700">Excluir</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ HISTORY TAB ═══ */}
        {tab === "history" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Histórico de Usos</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] whitespace-nowrap">Parceiro:</label>
                  <select value={filterPartner} onChange={(e) => setFilterPartner(e.target.value)} className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] min-w-[140px]">
                    <option value="all">Todos</option>
                    {partners.filter((p) => p.status === "active").map((p) => (
                      <option key={p.id} value={p.coupon_code}>{p.name} ({p.coupon_code})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] whitespace-nowrap">Representante:</label>
                  <select value={filterRep} onChange={(e) => setFilterRep(e.target.value)} className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] min-w-[140px]">
                    <option value="all">Todos</option>
                    {salesReps.map((r) => (
                      <option key={r.id} value={r.referral_code}>{r.name} ({r.referral_code})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white border border-[#e2e2e2] px-6 py-5">
                <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Total de usos</p>
                <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal">{filteredUses.length}</p>
              </div>
              <div className="bg-white border border-[#e2e2e2] px-6 py-5">
                <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Vendas concluídas</p>
                <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal">{fmt(totalSales)}</p>
              </div>
              <div className="bg-white border border-[#e2e2e2] px-6 py-5">
                <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Comissão parceiros</p>
                <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal">{fmt(totalCommission)}</p>
              </div>
              <div className="bg-white border border-[#e2e2e2] px-6 py-5">
                <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Comissão representantes</p>
                <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal">{fmt(totalRepCommission)}</p>
              </div>
            </div>

            {loadingUses ? <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p> : (
              <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
                <table className="w-full text-sm font-[var(--font-inter)]">
                  <thead>
                    <tr className="border-b border-[#e2e2e2]">
                      {["Data", "Cupom", "Rep.", "Produto", "Espaço", "Área", "Material", "Desconto", "Com. Parceiro", "Com. Rep.", "Status"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.1em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUses.length === 0 ? (
                      <tr><td colSpan={11} className="px-5 py-8 text-center text-[#74777f]">Nenhum uso registrado.</td></tr>
                    ) : (
                      filteredUses.map((u) => {
                        const st = u.sale_status || "em_orcamento";
                        const stMeta = STATUS_LABELS[st] || STATUS_LABELS.em_orcamento;
                        return (
                          <tr key={u.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                            <td className="px-4 py-3 text-xs text-[#43474e] whitespace-nowrap">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                            <td className="px-4 py-3"><span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider">{u.coupon_code}</span></td>
                            <td className="px-4 py-3 text-xs text-[#74777f]">{u.sales_rep_referral_code || "—"}</td>
                            <td className="px-4 py-3 text-xs text-[#43474e]"><p className="font-semibold">{u.product_name}</p><p className="text-[#74777f]">{u.product_code}</p></td>
                            <td className="px-4 py-3 text-xs text-[#43474e]">{u.space || "—"}</td>
                            <td className="px-4 py-3 text-xs text-[#43474e]">{u.area_m2 ?? "—"}</td>
                            <td className="px-4 py-3 text-xs text-[#43474e]">{u.material_total ? fmt(u.material_total) : "—"}</td>
                            <td className="px-4 py-3 text-xs text-green-700 font-semibold">{u.discount_applied ? fmt(u.discount_applied) : "—"}</td>
                            <td className="px-4 py-3 text-xs text-[#002045] font-semibold">{u.commission_owed ? fmt(u.commission_owed) : "—"}</td>
                            <td className="px-4 py-3 text-xs text-[#1a365d] font-semibold">{u.sales_rep_commission_owed ? fmt(u.sales_rep_commission_owed) : "—"}</td>
                            <td className="px-4 py-3">
                              <select value={st} onChange={(e) => updateSaleStatus(u.id, e.target.value)} className={`text-[10px] font-bold tracking-wide px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#002045] ${stMeta.cls}`}>
                                <option value="em_orcamento">Em orçamento</option>
                                <option value="concluido">Concluído</option>
                                <option value="cancelado">Cancelado</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
