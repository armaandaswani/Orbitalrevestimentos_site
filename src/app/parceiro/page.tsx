"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

interface PartnerInfo {
  id: string;
  name: string;
  coupon_code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  commission_type: "percentage" | "fixed";
  commission_value: number;
  profession: string | null;
  has_special_table: boolean | null;
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
  partner_commission_paid_at: string | null;
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

const PROFESSIONS = [
  "Arquiteto e Urbanista",
  "Designer de interiores",
  "Construtor",
  "Engenheiro civil",
  "Corretor de imóveis",
  "Lojista / revendedor",
];

const SPECIAL_PRICES: Record<string, number> = { Classic: 399, Brilliance: 429, Elegance: 459 };
const NORMAL_PRICES: Record<string, number> = { Classic: 559, Brilliance: 589, Elegance: 649 };
const PLATE_M2 = 3.48;

interface SpecialProduct {
  code: string;
  name: string;
  linha: "Classic" | "Brilliance" | "Elegance";
  img: string;
}

const SPECIAL_PRODUCTS: SpecialProduct[] = [
  { code: "ORB-003", name: "Bege Travertino",           linha: "Classic",    img: "/images/catalogue/classic-bege-travertino-orb001.jpeg" },
  { code: "ORB-001", name: "Terracota",                 linha: "Classic",    img: "/images/catalogue/classic-terracota-orb003.jpeg" },
  { code: "ORB-006", name: "Branco Calacatta",          linha: "Classic",    img: "/images/catalogue/classic-branco-calacatta-orb006.jpeg" },
  { code: "ORB-005", name: "Bronze Armani",             linha: "Brilliance", img: "/images/catalogue/brilliance-bronze-armani-orb005.jpeg" },
  { code: "ORB-007", name: "Bianco Statuario Venato",   linha: "Brilliance", img: "/images/catalogue/brilliance-bianco-statuario-venato-orb007.jpeg" },
  { code: "ORB-008", name: "Bianco Oro Supremo",        linha: "Brilliance", img: "/images/catalogue/brilliance-bianco-oro-supremo-orb008.jpeg" },
  { code: "ORB-009", name: "Gris Pietra",               linha: "Brilliance", img: "/images/catalogue/brilliance-gris-pietra-orb009.jpeg" },
  { code: "ORB-012", name: "Arabescato Orobico Bianco", linha: "Brilliance", img: "/images/catalogue/brilliance-arabescato-orobico-bianco-orb012.jpeg" },
  { code: "ORB-013", name: "Calacatta Oro",             linha: "Brilliance", img: "/images/catalogue/brilliance-calacatta-oro-orb013.jpeg" },
  { code: "ORB-014", name: "Calacatta Michelangelo",    linha: "Brilliance", img: "/images/catalogue/brilliance-calacatta-michelangelo-orb014.jpeg" },
  { code: "ORB-015", name: "Carrara Gioia",             linha: "Brilliance", img: "/images/catalogue/brilliance-carrara-gioia-orb015.jpeg" },
  { code: "ORB-002", name: "Imbuia",                    linha: "Elegance",   img: "/images/catalogue/elegance-imbuia-orb002.jpeg" },
  { code: "ORB-004", name: "Louro Freijó",              linha: "Elegance",   img: "/images/catalogue/elegance-louro-freijo-orb004.jpeg" },
  { code: "ORB-010", name: "Carvalho Natural",          linha: "Elegance",   img: "/images/catalogue/elegance-carvalho-natural-orb010.jpeg" },
  { code: "ORB-011", name: "Carvalho Branco",           linha: "Elegance",   img: "/images/catalogue/elegance-carvalho-branco-orb011.jpeg" },
];

export default function ParceiroPage() {
  // ── Auth state ──────────────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Login view: "login" | "forgot" | "reset" ───────────────────────────────
  const [loginView, setLoginView] = useState<LoginView>("login");

  // ── Forgot password state ──────────────────────────────────────────────────
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

  // ── Profession gate state ──────────────────────────────────────────────────
  const [profInput, setProfInput] = useState("");
  const [profOther, setProfOther] = useState("");
  const [profLoading, setProfLoading] = useState(false);
  const [profError, setProfError] = useState("");

  // ── Portal tab state ───────────────────────────────────────────────────────
  const [portalTab, setPortalTab] = useState<"portal" | "commissions" | "special">("portal");
  const [copied, setCopied] = useState(false);
  const [hasNewUses, setHasNewUses] = useState(false);

  // ── Special table / simulator state ───────────────────────────────────────
  const [sqLinha, setSqLinha] = useState<"Classic" | "Brilliance" | "Elegance" | "">("");
  const [sqSelectedProduct, setSqSelectedProduct] = useState<SpecialProduct | null>(null);
  const [sqMode, setSqMode] = useState<"dimensions" | "m2" | "plates">("dimensions");
  const [sqWidth, setSqWidth] = useState("");
  const [sqHeight, setSqHeight] = useState("");
  const [sqM2Input, setSqM2Input] = useState("");
  const [sqQty, setSqQty] = useState("");
  const [sqShowMargin, setSqShowMargin] = useState(false);

  // ── Special table scroll refs ───────────────────────────────────────────
  const sqProductSectionRef = useRef<HTMLDivElement>(null);
  const sqCalcSectionRef = useRef<HTMLDivElement>(null);
  const sqWidthRef = useRef<HTMLInputElement>(null);
  const sqHeightRef = useRef<HTMLInputElement>(null);
  const sqM2Ref = useRef<HTMLInputElement>(null);
  const sqQtyRef = useRef<HTMLInputElement>(null);

  // ── Password visibility state ──────────────────────────────────────────────
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showResetPw, setShowResetPw] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCpCurrent, setShowCpCurrent] = useState(false);
  const [showCpNew, setShowCpNew] = useState(false);
  const [showCpConfirm, setShowCpConfirm] = useState(false);

  // ── Session constants ──────────────────────────────────────────────────────
  const SESSION_KEY = "orbital_partner_session";
  const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

  // ── On mount: restore session from localStorage + check ?reset=TOKEN ──────
  useEffect(() => {
    // Restore saved session if still valid
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const { partner: saved, savedAt } = JSON.parse(raw) as { partner: PartnerInfo; savedAt: number };
        if (Date.now() - savedAt < SESSION_TTL_MS) {
          setPartner(saved);
          fetchUses(saved.coupon_code);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }

    const params = new URLSearchParams(window.location.search);

    // ?rep=CODE → redirect to registration form on /parcerias
    const rep = params.get("rep");
    if (rep) {
      window.location.replace(`/parcerias?rep=${encodeURIComponent(rep)}`);
      return;
    }

    // Check for ?reset=TOKEN
    const token = params.get("reset");
    if (token) {
      setResetToken(token);
      setLoginView("reset");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── fetchUses ──────────────────────────────────────────────────────────────
  const fetchUses = useCallback(async (code: string) => {
    setUsesLoading(true);
    const res = await fetch(`/api/coupons/use?coupon_code=${encodeURIComponent(code)}`);
    if (res.ok) setUses(await res.json());
    setUsesLoading(false);
  }, []);

  // ── Refresh session timestamp every 5 min while partner is active ─────────
  useEffect(() => {
    if (!partner) return;
    const t = setInterval(() => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          localStorage.setItem(SESSION_KEY, JSON.stringify({ ...parsed, savedAt: Date.now() }));
        }
      } catch { /* ignore */ }
    }, 5 * 60 * 1000); // every 5 minutes
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  // ── 30-second polling when logged in ──────────────────────────────────────
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!partner?.coupon_code) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    pollingRef.current = setInterval(() => {
      fetchUses(partner.coupon_code);
    }, 30000);
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [partner?.coupon_code, fetchUses]);

  // ── "Novo" badge: watch uses for new entries since last visit ─────────────
  useEffect(() => {
    if (!partner || uses.length === 0) return;
    try {
      const key = `orbital_partner_last_visit_${partner.coupon_code}`;
      const lastVisit = localStorage.getItem(key);
      if (lastVisit) {
        const hasNew = uses.some(u => u.created_at > lastVisit);
        setHasNewUses(hasNew);
      }
    } catch { /* ignore */ }
  }, [uses, partner]);

  function markPortalVisited() {
    if (!partner) return;
    try {
      const key = `orbital_partner_last_visit_${partner.coupon_code}`;
      localStorage.setItem(key, new Date().toISOString());
      setHasNewUses(false);
    } catch { /* ignore */ }
  }

  // ── Auto-focus calc input when mode changes (only once product chosen) ────
  useEffect(() => {
    if (!sqSelectedProduct) return;
    const t = setTimeout(() => {
      if (sqMode === "dimensions") sqWidthRef.current?.focus();
      else if (sqMode === "m2") sqM2Ref.current?.focus();
      else if (sqMode === "plates") sqQtyRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqMode]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    const res = await fetch("/api/parceiro/auth", {
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

    const partnerData = json as PartnerInfo;
    setPartner(partnerData);
    fetchUses(partnerData.coupon_code);
    // Persist session for 7 days
    localStorage.setItem(SESSION_KEY, JSON.stringify({ partner: partnerData, savedAt: Date.now() }));
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotError("");
    setForgotMessage("");
    setForgotLoading(true);

    const res = await fetch("/api/parceiro/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail }),
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

  async function handleProfessionSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfError("");
    const selectedValue = profInput === "Outro" ? profOther.trim() : profInput;
    if (!selectedValue) {
      setProfError("Por favor, selecione ou informe sua profissão.");
      return;
    }
    if (!partner) return;
    setProfLoading(true);
    const res = await fetch(`/api/partners/${partner.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profession: selectedValue }),
    });
    const json = await res.json();
    setProfLoading(false);
    if (!res.ok) {
      setProfError(json.error || "Erro ao salvar profissão.");
      return;
    }
    setPartner({ ...partner, profession: selectedValue });
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const concludedUses = uses.filter((u) => u.sale_status === "concluido");
  const totalCommission = concludedUses.reduce((a, u) => a + (u.commission_owed || 0), 0);
  const pendingCommission = uses
    .filter((u) => u.sale_status === "em_orcamento" || u.sale_status === null)
    .reduce((a, u) => a + (u.commission_owed || 0), 0);

  // Special table computed values
  const sqAreaCalc =
    sqMode === "dimensions"
      ? (parseFloat(sqWidth) || 0) * (parseFloat(sqHeight) || 0)
      : sqMode === "m2"
      ? parseFloat(sqM2Input) || 0
      : 0;
  const sqQtyNum =
    sqMode === "plates"
      ? parseInt(sqQty) || 0
      : Math.ceil(sqAreaCalc / PLATE_M2) || 0;
  const sqArea = sqMode === "plates" ? sqQtyNum * PLATE_M2 : sqAreaCalc;
  const sqSpecialPrice = sqLinha ? SPECIAL_PRICES[sqLinha] : 0;
  const sqNormalPrice = sqLinha ? NORMAL_PRICES[sqLinha] : 0;
  const sqTotal = sqQtyNum * sqSpecialPrice;
  const sqSavingsPerPlate = sqNormalPrice - sqSpecialPrice;
  const sqTotalSavings = sqQtyNum * sqSavingsPerPlate;

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
                    <div className="relative">
                      <input
                        required
                        type={showResetPw ? "text" : "password"}
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        className="w-full border border-[#e2e2e2] px-4 py-3 pr-10 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                        autoFocus
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={showResetPw ? "Ocultar senha" : "Mostrar senha"}
                        onClick={() => setShowResetPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] transition-colors"
                      >
                        {showResetPw ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                      Confirmar Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showResetConfirm ? "text" : "password"}
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        className="w-full border border-[#e2e2e2] px-4 py-3 pr-10 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={showResetConfirm ? "Ocultar senha" : "Mostrar senha"}
                        onClick={() => setShowResetConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] transition-colors"
                      >
                        {showResetConfirm ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
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
                    onClick={() => { setLoginView("login"); setForgotMessage(""); setForgotEmail(""); }}
                    className="text-[#002045] text-xs font-[var(--font-inter)] underline underline-offset-2"
                  >
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                      E-mail cadastrado
                    </label>
                    <input
                      required
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      placeholder="seu@email.com"
                      autoFocus
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
                    E-mail
                  </label>
                  <input
                    required
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showLoginPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-[#e2e2e2] px-4 py-3 pr-10 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={showLoginPw ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setShowLoginPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] transition-colors"
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
              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setLoginView("forgot"); setLoginError(""); }}
                  className="text-[#74777f] text-xs font-[var(--font-inter)] underline underline-offset-2 hover:text-[#002045] transition-colors"
                >
                  Esqueci minha senha
                </button>
                <a
                  href="/representante"
                  className="text-[#74777f] text-xs font-[var(--font-inter)] hover:text-[#002045] transition-colors"
                >
                  É representante comercial?{" "}
                  <span className="underline underline-offset-2">Acesse aqui</span>
                </a>
              </div>
            </>
          )}

        </div>
      </div>
    );
  }

  // ── Profession gate ────────────────────────────────────────────────────────
  if (!partner.profession) {
    return (
      <div className="min-h-screen bg-[#f5f5f3] flex items-center justify-center px-4">
        <div className="bg-white border border-[#e2e2e2] p-10 w-full max-w-sm">
          <div className="mb-6">
            <p className="text-[#002045] font-[var(--font-noto-serif)] text-2xl font-normal mb-1">
              Complete seu cadastro
            </p>
            <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
              Olá, {partner.name}. Para continuar, precisamos saber sua profissão.
            </p>
          </div>
          <form onSubmit={handleProfessionSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                Profissão *
              </label>
              <select
                required
                value={profInput}
                onChange={(e) => { setProfInput(e.target.value); if (e.target.value !== "Outro") setProfOther(""); }}
                className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
              >
                <option value="">— Selecionar —</option>
                {PROFESSIONS.map((prof) => (
                  <option key={prof} value={prof}>{prof}</option>
                ))}
                <option value="Outro">Outro</option>
              </select>
              {profInput === "Outro" && (
                <input
                  type="text"
                  required
                  value={profOther}
                  onChange={(e) => setProfOther(e.target.value)}
                  placeholder="Especifique sua profissão"
                  className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] mt-2"
                />
              )}
            </div>
            {profError && (
              <p className="text-red-600 text-sm font-[var(--font-inter)]">{profError}</p>
            )}
            <button
              type="submit"
              disabled={profLoading}
              className="w-full bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
            >
              {profLoading ? "Salvando..." : "Confirmar e entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f5f3] pt-20">
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
          onClick={() => { setPartner(null); setUses([]); setLoginEmail(""); setPassword(""); setCpSuccess(""); setPortalTab("portal"); localStorage.removeItem(SESSION_KEY); }}
          className="text-white/60 hover:text-white text-xs font-[var(--font-inter)] uppercase tracking-widest transition-colors"
        >
          Sair
        </button>
      </div>

      {/* Tab bar — always visible */}
      <div className="bg-white border-b border-[#e2e2e2]">
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <div className="flex gap-0">
            {([
              { key: "portal", label: "Meu Portal" },
              { key: "commissions", label: "Comissões" },
              ...(partner.has_special_table ? [{ key: "special", label: "Tabela Especial ★" }] : []),
            ] as { key: "portal" | "commissions" | "special"; label: string }[]).map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setPortalTab(t.key);
                  if (t.key === "portal") markPortalVisited();
                }}
                className={`relative px-6 py-3 text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] transition-colors border-b-2 -mb-px ${portalTab === t.key ? "border-[#002045] text-[#002045]" : "border-transparent text-[#74777f] hover:text-[#002045]"}`}
              >
                {t.label}
                {t.key === "portal" && hasNewUses && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Meu Portal tab ── */}
      {portalTab === "portal" && (
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

          {/* Referral link */}
          <div className="bg-white border border-[#e2e2e2] px-5 py-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[#74777f] text-[9px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Seu link de indicação</p>
              <p className="text-[#43474e] text-xs font-[var(--font-inter)] truncate">
                orbitalrevestimentos.com.br/simulador?cupom={partner.coupon_code}
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`https://orbitalrevestimentos.com.br/simulador?cupom=${partner.coupon_code}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={`flex-shrink-0 text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 transition-colors ${copied ? "bg-green-600 text-white" : "bg-[#002045] text-white hover:bg-[#1a365d]"}`}
            >
              {copied ? "Copiado! ✓" : "Copiar link"}
            </button>
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
                  <div className="relative">
                    <input
                      required
                      type={showCpCurrent ? "text" : "password"}
                      value={cpCurrent}
                      onChange={(e) => setCpCurrent(e.target.value)}
                      className="w-full border border-[#e2e2e2] px-4 py-2.5 pr-10 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      autoFocus
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={showCpCurrent ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setShowCpCurrent((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] transition-colors"
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
                  <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showCpNew ? "text" : "password"}
                      value={cpNew}
                      onChange={(e) => setCpNew(e.target.value)}
                      className="w-full border border-[#e2e2e2] px-4 py-2.5 pr-10 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={showCpNew ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setShowCpNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] transition-colors"
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
                  <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showCpConfirm ? "text" : "password"}
                      value={cpConfirm}
                      onChange={(e) => setCpConfirm(e.target.value)}
                      className="w-full border border-[#e2e2e2] px-4 py-2.5 pr-10 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={showCpConfirm ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setShowCpConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] transition-colors"
                    >
                      {showCpConfirm ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-[#e2e2e2] px-4 py-4">
              <p className="text-[#74777f] text-[9px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Em orçamento</p>
              <p className="font-[var(--font-noto-serif)] text-yellow-700 text-2xl font-normal">
                {uses.filter((u) => u.sale_status === "em_orcamento" || u.sale_status === null).length}
              </p>
            </div>
            <div className="bg-white border border-[#e2e2e2] px-4 py-4">
              <p className="text-[#74777f] text-[9px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Vendas concluídas</p>
              <p className="font-[var(--font-noto-serif)] text-[#002045] text-2xl font-normal">
                {uses.filter((u) => u.sale_status === "concluido").length}
              </p>
            </div>
            <div className="bg-white border border-[#e2e2e2] px-4 py-4">
              <p className="text-[#74777f] text-[9px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Comissão confirmada</p>
              <p className="font-[var(--font-noto-serif)] text-green-700 text-2xl font-normal">{fmt(totalCommission)}</p>
            </div>
            <div className="bg-white border border-[#e2e2e2] px-4 py-4">
              <p className="text-[#74777f] text-[9px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Comissão pendente</p>
              <p className="font-[var(--font-noto-serif)] text-amber-600 text-2xl font-normal">{fmt(pendingCommission)}</p>
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
            <>
              {/* Mobile card list — hidden on sm+ */}
              <div className="sm:hidden bg-white border border-[#e2e2e2] divide-y divide-[#f0f0f0]">
                {uses.map((u) => {
                  const st = u.sale_status || "em_orcamento";
                  const stMeta = STATUS_LABELS[st] || STATUS_LABELS.em_orcamento;
                  return (
                    <div key={u.id} className="px-4 py-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-[#002045] text-sm font-[var(--font-inter)]">{u.product_name || "—"}</p>
                          {u.product_code && <p className="text-[#74777f] text-xs mt-0.5">{u.product_code}</p>}
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full flex-shrink-0 ml-2 ${stMeta.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st === "concluido" ? "bg-green-600" : st === "cancelado" ? "bg-red-500" : "bg-yellow-500"}`} />
                          {stMeta.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        <div>
                          <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">Data</p>
                          <p className="text-[#43474e] text-xs font-[var(--font-inter)] mt-0.5">{new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <div>
                          <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">Cliente</p>
                          <p className="text-[#43474e] text-xs font-[var(--font-inter)] mt-0.5">{u.architect_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">Espaço</p>
                          <p className="text-[#43474e] text-xs font-[var(--font-inter)] mt-0.5">{u.space || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">Placas</p>
                          <p className="text-[#43474e] text-xs font-[var(--font-inter)] mt-0.5">{String(u.plates ?? "—")}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop table — hidden on mobile */}
              <div className="hidden sm:block bg-white border border-[#e2e2e2] overflow-x-auto">
                <table className="w-full text-sm font-[var(--font-inter)]">
                  <thead>
                    <tr className="border-b border-[#e2e2e2]">
                      {["Data", "Cliente", "Produto", "Espaço", "Placas", "Status"].map((h) => (
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
          )}
        </div>
      )}

      {/* ── Comissões tab ── */}
      {portalTab === "commissions" && (
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-white border border-[#e2e2e2] px-6 py-5">
              <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Comissão confirmada</p>
              <p className="font-[var(--font-noto-serif)] text-green-700 text-3xl font-normal">{fmt(totalCommission)}</p>
              <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-1">em {concludedUses.length} venda{concludedUses.length !== 1 ? "s" : ""} concluída{concludedUses.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-white border border-[#e2e2e2] px-6 py-5">
              <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Comissão pendente</p>
              <p className="font-[var(--font-noto-serif)] text-amber-600 text-3xl font-normal">{fmt(pendingCommission)}</p>
              <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-1">aguardando conclusão das vendas</p>
            </div>
          </div>

          {/* Commission card list — no table, no horizontal scroll */}
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-4">Detalhamento</h2>
          {uses.filter(u => u.sale_status !== "cancelado" && u.commission_owed != null).length === 0 ? (
            <div className="bg-white border border-[#e2e2e2] px-6 py-10 text-center">
              <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhuma comissão registrada ainda.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#e2e2e2] divide-y divide-[#f0f0f0]">
              {uses.filter(u => u.sale_status !== "cancelado" && u.commission_owed != null).map(u => {
                const st = u.sale_status || "em_orcamento";
                const isPaid = !!u.partner_commission_paid_at;
                return (
                  <div key={u.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)] leading-tight">{u.product_name || "—"}</p>
                      <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-0.5">{u.architect_name || "—"} · {u.space || "—"} · {new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-base font-bold font-[var(--font-noto-serif)] ${st === "concluido" ? "text-green-700" : "text-amber-600"}`}>
                        {fmt(u.commission_owed!)}
                      </p>
                      {st === "concluido" ? (
                        isPaid
                          ? <span className="inline-block mt-1 bg-green-100 text-green-800 px-2 py-0.5 text-[10px] font-bold tracking-wide">✓ Pago</span>
                          : <span className="inline-block mt-1 bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[10px] font-bold tracking-wide">A receber</span>
                      ) : (
                        <span className="inline-block mt-1 bg-yellow-50 text-yellow-700 px-2 py-0.5 text-[10px] font-bold tracking-wide">Pendente</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mt-4">
            O status de pagamento é atualizado pela Orbital após confirmação da transferência.
          </p>
        </div>
      )}

      {/* ── Special Table tab ── */}
      {portalTab === "special" && (
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">

          {/* Exclusive header */}
          <div className="bg-[#002045] px-6 py-5 mb-8">
            <p className="text-[#a1d494] text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] mb-1">
              Acesso exclusivo
            </p>
            <p className="text-white font-[var(--font-noto-serif)] text-xl font-normal">
              Condições especiais para {partner.name.split(" ")[0]}
            </p>
          </div>

          {/* Price table */}
          <div className="mb-4">
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-4">
              Tabela de Preços — Compra Direta
            </h2>
            <div className="bg-white border border-[#e2e2e2] overflow-hidden">
              {[
                { linha: "Classic", finish: "Mármore Fosco", special: 399, normal: 559 },
                { linha: "Brilliance", finish: "Mármore Polido", special: 429, normal: 589 },
                { linha: "Elegance", finish: "Madeira Texturizada", special: 459, normal: 649 },
              ].map((row, i) => (
                <div key={row.linha} className={`flex items-center justify-between px-6 py-4 ${i < 2 ? "border-b border-[#f0f0f0]" : ""}`}>
                  <div>
                    <p className="font-semibold text-[#002045] font-[var(--font-inter)]">{row.linha}</p>
                    <p className="text-[#74777f] text-xs font-[var(--font-inter)]">{row.finish}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#002045] font-bold text-lg font-[var(--font-noto-serif)]">R$ {row.special}/placa</p>
                    <p className="text-[#74777f] text-xs font-[var(--font-inter)]">Ref. público: <span className="line-through">R$ {row.normal}</span></p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-2">Placa: 2,9m × 1,2m × 5mm · 3,48 m² por placa</p>
          </div>

          {/* Important notes */}
          <div className="bg-[#fffbea] border border-[#e6c84a] px-5 py-4 mb-8">
            <p className="text-[#6b5000] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-2">
              Observações importantes
            </p>
            <ul className="text-[#6b5000] text-xs font-[var(--font-inter)] space-y-1 leading-relaxed">
              <li>· Material apenas — sem entrega inclusa</li>
              <li>· Retirada no depósito da Orbital</li>
              <li>· Não repassar como tabela pública</li>
              <li>· Sujeito a disponibilidade de estoque</li>
            </ul>
          </div>

          {/* Quote simulator */}
          <div className="bg-white border border-[#e2e2e2] p-6 sm:p-8">
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-6">
              Simulador de Orçamento
            </h2>

            {/* Line cards */}
            <div className="mb-6">
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-3">
                Linha *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: "Classic",    finish: "Mármore Fosco",        price: 399, bg: "bg-[#f0eeeb]" },
                  { key: "Brilliance", finish: "Mármore Polido",       price: 429, bg: "bg-[#e8ecf0]" },
                  { key: "Elegance",   finish: "Madeira Texturizada",  price: 459, bg: "bg-[#ede8e0]" },
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      setSqLinha(m.key as "Classic" | "Brilliance" | "Elegance");
                      setSqSelectedProduct(null);
                      setTimeout(() => sqProductSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                    }}
                    className={`text-left p-4 border-2 transition-all ${
                      sqLinha === m.key
                        ? "border-[#002045] bg-[#eef2f8]"
                        : "border-[#e2e2e2] bg-white hover:border-[#002045]/40"
                    }`}
                  >
                    <div className={`w-full h-7 mb-3 ${m.bg}`} />
                    <p className="font-bold text-[#002045] text-sm font-[var(--font-inter)]">{m.key}</p>
                    <p className="text-[#74777f] text-xs font-[var(--font-inter)]">{m.finish}</p>
                    <p className="text-[#002045] font-bold text-sm font-[var(--font-inter)] mt-1.5">R$ {m.price}/placa</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Product selection grid — shown once a line is chosen */}
            {sqLinha && (
              <div ref={sqProductSectionRef} className="mb-6 scroll-mt-24">
                <p className="text-[#43474e] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-4">
                  Acabamentos {sqLinha}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 min-[400px]:grid-cols-4">
                  {SPECIAL_PRODUCTS.filter((p) => p.linha === sqLinha).map((product) => {
                    const active = sqSelectedProduct?.code === product.code;
                    return (
                      <div
                        key={product.code}
                        className={`border overflow-hidden transition-all ${
                          active ? "border-[#002045]" : "border-[#e2e2e2] hover:border-[#1a365d]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSqSelectedProduct(product);
                            setTimeout(() => sqCalcSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                          }}
                          className="relative w-full overflow-hidden bg-[#f7f7f5] block"
                        >
                          <div className="relative w-full" style={{ aspectRatio: "812/988" }}>
                            <Image
                              src={product.img}
                              alt={product.name}
                              fill
                              className="object-contain"
                            />
                          </div>
                          {active && <div className="absolute inset-0 bg-[#002045]/10" />}
                          {active && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-white flex items-center justify-center shadow-sm">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#002045" strokeWidth="3">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </div>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSqSelectedProduct(product);
                            setTimeout(() => sqCalcSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                          }}
                          className="p-2 w-full text-left"
                        >
                          <p className={`text-[10px] font-bold font-[var(--font-inter)] leading-tight ${active ? "text-[#002045]" : "text-[#43474e]"}`}>
                            {product.name}
                          </p>
                          <p className="text-[9px] text-[#9e9e9e] font-[var(--font-inter)] mt-0.5">{product.code}</p>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Calculation mode toggle + inputs */}
            <div ref={sqCalcSectionRef} className="scroll-mt-24">

            {/* Calculation mode toggle */}
            <div className="mb-5">
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                Calcular por
              </label>
              <div className="flex border border-[#e2e2e2] w-fit overflow-hidden">
                {([
                  { key: "dimensions", label: "Larg × Alt" },
                  { key: "m2",         label: "M² total" },
                  { key: "plates",     label: "Nº de placas" },
                ] as const).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSqMode(m.key)}
                    className={`px-4 py-2 text-xs font-bold font-[var(--font-inter)] transition-colors whitespace-nowrap ${
                      sqMode === m.key
                        ? "bg-[#002045] text-white"
                        : "bg-white text-[#74777f] hover:bg-[#f5f5f3]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input based on mode */}
            <div className="mb-6">
              {sqMode === "dimensions" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                      Largura (m) *
                    </label>
                    <input
                      ref={sqWidthRef}
                      type="text"
                      inputMode="decimal"
                      value={sqWidth}
                      onChange={(e) => setSqWidth(e.target.value.replace(",", "."))}
                      onBlur={() => { if (sqWidth) sqHeightRef.current?.focus(); }}
                      placeholder="ex: 4.5"
                      className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                      Altura (m) *
                    </label>
                    <input
                      ref={sqHeightRef}
                      type="text"
                      inputMode="decimal"
                      value={sqHeight}
                      onChange={(e) => setSqHeight(e.target.value.replace(",", "."))}
                      placeholder="ex: 2.8"
                      className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                    />
                  </div>
                  {sqWidth && sqHeight && sqAreaCalc > 0 && (
                    <p className="col-span-2 text-[#74777f] text-xs font-[var(--font-inter)]">
                      Área: {sqAreaCalc.toFixed(2)} m² → {sqQtyNum} placa{sqQtyNum !== 1 ? "s" : ""} necessária{sqQtyNum !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}
              {sqMode === "m2" && (
                <div>
                  <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                    Área total (m²) *
                  </label>
                  <input
                    ref={sqM2Ref}
                    type="text"
                    inputMode="decimal"
                    value={sqM2Input}
                    onChange={(e) => setSqM2Input(e.target.value.replace(",", "."))}
                    placeholder="ex: 12.6"
                    className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                  />
                  {sqM2Input && sqAreaCalc > 0 && (
                    <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-2">
                      {sqAreaCalc.toFixed(2)} m² → {sqQtyNum} placa{sqQtyNum !== 1 ? "s" : ""} necessária{sqQtyNum !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}
              {sqMode === "plates" && (
                <div>
                  <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                    Número de placas *
                  </label>
                  <input
                    ref={sqQtyRef}
                    type="text"
                    inputMode="numeric"
                    value={sqQty}
                    onChange={(e) => setSqQty(e.target.value.replace(/\D/g, ""))}
                    placeholder="ex: 10"
                    className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                  />
                  {sqQtyNum > 0 && (
                    <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-2">
                      Cobre aproximadamente {(sqQtyNum * PLATE_M2).toFixed(2)} m²
                    </p>
                  )}
                </div>
              )}
            </div>

            </div>{/* end sqCalcSectionRef div */}

            {/* Results */}
            {sqLinha && sqQtyNum > 0 && (
              <div className="border-t border-[#e2e2e2] pt-6">
                {/* Summary card */}
                <div className="bg-[#002045] px-6 py-6 mb-4">
                  <p className="text-[#a1d494] text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] mb-4">
                    Resumo do orçamento
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-white/50 text-[10px] font-[var(--font-inter)] mb-0.5">Linha</p>
                      <p className="text-white font-semibold font-[var(--font-inter)]">{sqLinha}</p>
                    </div>
                    {sqSelectedProduct && (
                      <div>
                        <p className="text-white/50 text-[10px] font-[var(--font-inter)] mb-0.5">Produto</p>
                        <p className="text-white font-semibold font-[var(--font-inter)] text-sm leading-tight">{sqSelectedProduct.name}</p>
                        <p className="text-white/50 text-[10px] font-[var(--font-inter)]">{sqSelectedProduct.code}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-white/50 text-[10px] font-[var(--font-inter)] mb-0.5">Qtd. de placas</p>
                      <p className="text-white font-semibold font-[var(--font-inter)]">{sqQtyNum} placa{sqQtyNum !== 1 ? "s" : ""}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-[10px] font-[var(--font-inter)] mb-0.5">Área coberta</p>
                      <p className="text-white font-semibold font-[var(--font-inter)]">{sqArea.toFixed(2)} m²</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-[10px] font-[var(--font-inter)] mb-0.5">Valor unitário</p>
                      <p className="text-white font-semibold font-[var(--font-inter)]">R$ {sqSpecialPrice}/placa</p>
                    </div>
                  </div>
                  <div className="border-t border-white/15 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold font-[var(--font-inter)]">Total do material</span>
                      <span className="text-white text-2xl font-[var(--font-noto-serif)]">{fmt(sqTotal)}</span>
                    </div>
                  </div>
                  <div className="bg-white/10 border border-white/20 px-4 py-3 mt-4">
                    <p className="text-white/70 text-[11px] font-[var(--font-inter)] leading-relaxed">
                      Retirada no depósito · Sem entrega inclusa · Sujeito a estoque
                    </p>
                  </div>
                </div>

                {/* Margin/advantage section */}
                <button
                  onClick={() => setSqShowMargin(!sqShowMargin)}
                  className="flex items-center gap-2 text-[#3b6934] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] mb-4 hover:text-[#002045] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`transition-transform duration-200 ${sqShowMargin ? "rotate-180" : ""}`}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  {sqShowMargin ? "Ocultar" : "Ver"} sua condição especial neste orçamento
                </button>

                {sqShowMargin && (
                  <div className="bg-[#f0f9eb] border border-[#3b6934]/30 px-6 py-5">
                    <p className="text-[#3b6934] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-4">
                      Sua condição especial neste orçamento
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm font-[var(--font-inter)]">
                        <span className="text-[#43474e]">Sua condição — {sqQtyNum} placa{sqQtyNum !== 1 ? "s" : ""} × R$ {sqSpecialPrice}</span>
                        <span className="text-[#002045] font-bold">{fmt(sqTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-[var(--font-inter)]">
                        <span className="text-[#74777f]">Referência tabela normal — × R$ {sqNormalPrice}</span>
                        <span className="text-[#74777f]">{fmt(sqQtyNum * sqNormalPrice)}</span>
                      </div>
                      <div className="border-t border-[#3b6934]/20 pt-3 flex items-center justify-between">
                        <span className="text-[#3b6934] font-bold font-[var(--font-inter)] text-sm">Economia operacional estimada</span>
                        <span className="text-[#3b6934] font-bold text-lg font-[var(--font-noto-serif)]">{fmt(sqTotalSavings)}</span>
                      </div>
                    </div>
                    <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mt-4 leading-relaxed">
                      Esta é a diferença entre sua condição especial de parceiro e a tabela de referência. Não deve ser comunicada como margem ao cliente final.
                    </p>
                  </div>
                )}

                {/* WhatsApp CTA */}
                <a
                  href={`https://wa.me/5592988150149?text=${encodeURIComponent(
                    `Olá! Sou ${partner.name}, parceiro Orbital (cupom ${partner.coupon_code}).\n\nGostaria de solicitar um orçamento:\n\n` +
                    `• Linha: ${sqLinha}\n` +
                    (sqSelectedProduct ? `• Produto: ${sqSelectedProduct.name} (${sqSelectedProduct.code})\n` : "") +
                    `• Qtd.: ${sqQtyNum} placa${sqQtyNum !== 1 ? "s" : ""}\n` +
                    `• Área coberta: ${sqArea.toFixed(2)} m²\n` +
                    `• Total (tabela especial): ${fmt(sqTotal)}\n\n` +
                    `Aguardo confirmação de estoque.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 w-full flex items-center justify-center gap-3 bg-[#25d366] hover:bg-[#1ebe5d] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-4 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Enviar orçamento para Orbital
                </a>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
