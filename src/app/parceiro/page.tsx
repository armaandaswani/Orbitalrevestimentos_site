"use client";

import React, { useState, useEffect } from "react";

interface PartnerInfo {
  id: string;
  name: string;
  coupon_code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
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
  plates: number | null;
  commission_owed: number | null;
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

type LoginView = "login" | "forgot" | "reset";

export default function ParceiroPage() {
  // ── Auth state ──────────────────────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Login view: "login" | "forgot" | "reset" ───────────────────────────────
  const [loginView, setLoginView] = useState<LoginView>("login");

  // ── Forgot password state ──────────────────────────────────────────────────
  const [forgotCoupon, setForgotCoupon] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  // ── Reset password state ───────────────────────────────────────────────────
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");

  // ── Dashboard state ────────────────────────────────────────────────────────
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [uses, setUses] = useState<CouponUse[]>([]);
  const [usesLoading, setUsesLoading] = useState(false);

  // ── Change password state ──────────────────────────────────────────────────
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState("");
  const [cpSuccess, setCpSuccess] = useState("");

  // ── On mount: check for ?reset=TOKEN ──────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset");
    if (token) {
      setResetToken(token);
      setLoginView("reset");
    }
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    const res = await fetch("/api/parceiro/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coupon_code: couponCode, portal_password: password }),
    });

    const json = await res.json();
    setLoginLoading(false);

    if (!res.ok) {
      setLoginError(json.error || "Erro ao fazer login.");
      return;
    }

    setPartner(json as PartnerInfo);
    fetchUses(json.coupon_code);
  }

  async function fetchUses(code: string) {
    setUsesLoading(true);
    const res = await fetch(`/api/coupons/use?coupon_code=${encodeURIComponent(code)}`);
    if (res.ok) setUses(await res.json());
    setUsesLoading(false);
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotError("");
    setForgotMessage("");
    setForgotLoading(true);

    const res = await fetch("/api/parceiro/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coupon_code: forgotCoupon, email: forgotEmail }),
    });

    const json = await res.json();
    setForgotLoading(false);

    if (!res.ok) {
      setForgotError(json.error || "Erro ao processar solicitação.");
      return;
    }

    setForgotMessage(json.message || "Se o email estiver correto, você receberá as instruções em breve.");
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("As senhas não coincidem.");
      return;
    }

    setResetLoading(true);

    const res = await fetch("/api/parceiro/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, new_password: resetNewPassword }),
    });

    const json = await res.json();
    setResetLoading(false);

    if (!res.ok) {
      setResetError(json.error || "Erro ao redefinir senha.");
      return;
    }

    setResetSuccess(true);
    // Clear the ?reset= param from the URL
    window.history.replaceState({}, "", window.location.pathname);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setCpError("");
    setCpSuccess("");

    if (cpNew !== cpConfirm) {
      setCpError("As senhas não coincidem.");
      return;
    }

    if (!partner) return;
    setCpLoading(true);

    const res = await fetch("/api/parceiro/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coupon_code: partner.coupon_code,
        current_password: cpCurrent,
        new_password: cpNew,
      }),
    });

    const json = await res.json();
    setCpLoading(false);

    if (!res.ok) {
      setCpError(json.error || "Erro ao alterar senha.");
      return;
    }

    setCpSuccess("Senha alterada com sucesso!");
    setCpCurrent("");
    setCpNew("");
    setCpConfirm("");
    setShowChangePassword(false);
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const concludedUses = uses.filter((u) => u.sale_status === "concluido");
  const totalCommission = concludedUses.reduce((a, u) => a + (u.commission_owed || 0), 0);
  const pendingCommission = uses
    .filter((u) => u.sale_status === "em_orcamento" || u.sale_status === null)
    .reduce((a, u) => a + (u.commission_owed || 0), 0);

  // ── Auth screens ──────────────────────────────────────────────────────────
  if (!partner) {
    return (
      <div className="min-h-screen bg-[#f5f5f3] flex items-center justify-center px-4">
        <div className="bg-white border border-[#e2e2e2] p-10 w-full max-w-sm">

          {/* ── Reset password view ── */}
          {loginView === "reset" && (
            <>
              <div className="mb-6">
                <p className="text-[#002045] font-[var(--font-noto-serif)] text-2xl font-normal mb-1">
                  Redefinir Senha
                </p>
                <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
                  Orbital Revestimentos
                </p>
              </div>

              {resetSuccess ? (
                <div className="space-y-4">
                  <p className="text-green-700 text-sm font-[var(--font-inter)]">
                    Senha redefinida com sucesso! Faça login.
                  </p>
                  <button
                    onClick={() => { setLoginView("login"); setResetSuccess(false); }}
                    className="text-[#002045] text-xs font-[var(--font-inter)] underline underline-offset-2"
                  >
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                      Nova Senha
                    </label>
                    <input
                      required
                      type="password"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                      Confirmar Nova Senha
                    </label>
                    <input
                      required
                      type="password"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                    />
                  </div>
                  {resetError && (
                    <p className="text-red-600 text-sm font-[var(--font-inter)]">{resetError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
                  >
                    {resetLoading ? "Redefinindo..." : "Redefinir Senha"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginView("login")}
                    className="w-full text-center text-[#74777f] text-xs font-[var(--font-inter)] underline underline-offset-2 mt-1"
                  >
                    Voltar ao login
                  </button>
                </form>
              )}
            </>
          )}

          {/* ── Forgot password view ── */}
          {loginView === "forgot" && (
            <>
              <div className="mb-6">
                <p className="text-[#002045] font-[var(--font-noto-serif)] text-2xl font-normal mb-1">
                  Esqueci minha senha
                </p>
                <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
                  Orbital Revestimentos
                </p>
              </div>

              {forgotMessage ? (
                <div className="space-y-4">
                  <p className="text-green-700 text-sm font-[var(--font-inter)]">{forgotMessage}</p>
                  <button
                    onClick={() => { setLoginView("login"); setForgotMessage(""); setForgotCoupon(""); setForgotEmail(""); }}
                    className="text-[#002045] text-xs font-[var(--font-inter)] underline underline-offset-2"
                  >
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                      Código do Cupom
                    </label>
                    <input
                      required
                      value={forgotCoupon}
                      onChange={(e) => setForgotCoupon(e.target.value.toUpperCase())}
                      className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] uppercase tracking-widest"
                      placeholder="EX: ARQLIMA10"
                      autoCapitalize="characters"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                      Email
                    </label>
                    <input
                      required
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      placeholder="seu@email.com"
                    />
                  </div>
                  {forgotError && (
                    <p className="text-red-600 text-sm font-[var(--font-inter)]">{forgotError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
                  >
                    {forgotLoading ? "Enviando..." : "Enviar instruções"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginView("login"); setForgotError(""); }}
                    className="w-full text-center text-[#74777f] text-xs font-[var(--font-inter)] underline underline-offset-2 mt-1"
                  >
                    Voltar ao login
                  </button>
                </form>
              )}
            </>
          )}

          {/* ── Login view ── */}
          {loginView === "login" && (
            <>
              <div className="mb-6">
                <p className="text-[#002045] font-[var(--font-noto-serif)] text-2xl font-normal mb-1">
                  Portal do Parceiro
                </p>
                <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
                  Orbital Revestimentos
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                    Código do Cupom
                  </label>
                  <input
                    required
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] uppercase tracking-widest"
                    placeholder="EX: ARQLIMA10"
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
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setLoginView("forgot"); setLoginError(""); }}
                  className="text-[#74777f] text-xs font-[var(--font-inter)] underline underline-offset-2 hover:text-[#002045] transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      {/* Header */}
      <div className="bg-[#002045] px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-white font-[var(--font-noto-serif)] text-lg leading-tight">
            Olá, {partner.name}
          </p>
          <p className="text-white/60 text-xs font-[var(--font-inter)] tracking-wider mt-0.5">
            Cupom: <strong className="text-white">{partner.coupon_code}</strong>
          </p>
        </div>
        <button
          onClick={() => { setPartner(null); setUses([]); setCouponCode(""); setPassword(""); setCpSuccess(""); }}
          className="text-white/60 hover:text-white text-xs font-[var(--font-inter)] uppercase tracking-widest transition-colors"
        >
          Sair
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        {/* Partner info card */}
        <div className="bg-white border border-[#e2e2e2] px-6 py-5 mb-4">
          <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-3">
            Seu cupom
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <span className="bg-[#eef2f8] text-[#002045] px-4 py-2 text-xl font-bold tracking-[0.2em] font-[var(--font-inter)]">
                {partner.coupon_code}
              </span>
            </div>
            <div className="text-sm font-[var(--font-inter)] text-[#43474e]">
              <p>Compartilhe seu cupom com clientes para aplicar o desconto automaticamente.</p>
            </div>
          </div>
        </div>

        {/* Change password section */}
        <div className="bg-white border border-[#e2e2e2] px-6 py-4 mb-8">
          <button
            type="button"
            onClick={() => {
              setShowChangePassword((v) => !v);
              setCpError("");
              setCpSuccess("");
              setCpCurrent("");
              setCpNew("");
              setCpConfirm("");
            }}
            className="flex items-center gap-2 text-[#002045] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] hover:opacity-70 transition-opacity"
          >
            <span>{showChangePassword ? "▲" : "▼"}</span>
            Alterar Senha
          </button>

          {showChangePassword && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-3 max-w-sm">
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">
                  Senha Atual
                </label>
                <input
                  required
                  type="password"
                  value={cpCurrent}
                  onChange={(e) => setCpCurrent(e.target.value)}
                  className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">
                  Nova Senha
                </label>
                <input
                  required
                  type="password"
                  value={cpNew}
                  onChange={(e) => setCpNew(e.target.value)}
                  className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">
                  Confirmar Nova Senha
                </label>
                <input
                  required
                  type="password"
                  value={cpConfirm}
                  onChange={(e) => setCpConfirm(e.target.value)}
                  className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                />
              </div>
              {cpError && (
                <p className="text-red-600 text-sm font-[var(--font-inter)]">{cpError}</p>
              )}
              <button
                type="submit"
                disabled={cpLoading}
                className="bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
              >
                {cpLoading ? "Salvando..." : "Salvar"}
              </button>
            </form>
          )}

          {cpSuccess && !showChangePassword && (
            <p className="mt-3 text-green-700 text-sm font-[var(--font-inter)]">{cpSuccess}</p>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-[#e2e2e2] px-6 py-5">
            <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">
              Total de usos
            </p>
            <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal">
              {uses.length}
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

        {/* Usage history */}
        <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-4">
          Histórico de usos
        </h2>

        {usesLoading ? (
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
        ) : uses.length === 0 ? (
          <div className="bg-white border border-[#e2e2e2] px-6 py-10 text-center">
            <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
              Nenhum uso registrado ainda. Compartilhe seu cupom com clientes!
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
            <table className="w-full text-sm font-[var(--font-inter)]">
              <thead>
                <tr className="border-b border-[#e2e2e2]">
                  {["Data", "Cliente", "Produto", "Espaço", "Placas", "Comissão", "Status"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.1em] uppercase font-bold text-[#74777f] whitespace-nowrap">
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
                      <td className="px-4 py-3 text-xs text-[#43474e]">{u.architect_name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-[#43474e]">
                        <p className="font-semibold">{u.product_name || "—"}</p>
                        {u.product_code && <p className="text-[#74777f]">{u.product_code}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#43474e]">{u.space || "—"}</td>
                      <td className="px-4 py-3 text-xs text-[#43474e]">{u.plates ?? "—"}</td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {st === "cancelado"
                          ? <span className="text-[#74777f] font-normal">—</span>
                          : st === "concluido" && u.commission_owed != null
                          ? <span className="text-green-700 font-bold">{fmt(u.commission_owed)}</span>
                          : u.commission_owed != null
                          ? <span className="text-yellow-700">{fmt(u.commission_owed)} (pend.)</span>
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
