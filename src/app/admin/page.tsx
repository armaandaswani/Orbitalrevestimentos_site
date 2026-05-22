"use client";

import React, { useState, useEffect, useCallback } from "react";

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
  status: "active" | "inactive";
  created_at: string;
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
  created_at: string;
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "orbital2025";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  coupon_code: "",
  discount_type: "percentage" as "percentage" | "fixed",
  discount_value: 0,
  commission_type: "percentage" as "percentage" | "fixed",
  commission_value: 0,
  portal_password: "",
  status: "active" as "active" | "inactive",
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
  const [tab, setTab] = useState<"partners" | "history">("partners");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [uses, setUses] = useState<CouponUse[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  // New partner created — show WhatsApp link
  const [newlyCreated, setNewlyCreated] = useState<Partner | null>(null);
  // History filter
  const [filterPartner, setFilterPartner] = useState<string>("all");

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  useEffect(() => {
    const stored = sessionStorage.getItem("orbital_admin_auth");
    if (stored === "1") setAuthed(true);
  }, []);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/partners");
    if (res.ok) setPartners(await res.json());
    setLoading(false);
  }, []);

  const fetchUses = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/coupons/use");
    if (res.ok) setUses(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authed || !supabaseConfigured) return;
    if (tab === "partners") fetchPartners();
    else fetchUses();
  }, [authed, tab, supabaseConfigured, fetchPartners, fetchUses]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pw === ADMIN_PW) {
      sessionStorage.setItem("orbital_admin_auth", "1");
      setAuthed(true);
    } else {
      setPwError("Senha incorreta.");
    }
  }

  function startCreate() {
    setEditingId(null);
    setNewlyCreated(null);
    setForm({ ...emptyForm });
    setFormError("");
    setShowForm(true);
  }

  function startEdit(p: Partner) {
    setEditingId(p.id);
    setNewlyCreated(null);
    setForm({
      name: p.name,
      email: p.email || "",
      phone: p.phone || "",
      coupon_code: p.coupon_code,
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      commission_type: p.commission_type,
      commission_value: p.commission_value,
      portal_password: p.portal_password || "",
      status: p.status,
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    const payload = {
      ...form,
      coupon_code: form.coupon_code.toUpperCase(),
      portal_password: form.portal_password || null,
    };

    let res: Response;
    if (editingId) {
      res = await fetch(`/api/partners/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const json = await res.json();
    setFormLoading(false);

    if (!res.ok) {
      setFormError(json.error || "Erro desconhecido.");
      return;
    }

    setShowForm(false);
    if (!editingId) {
      setNewlyCreated(json as Partner);
    }
    fetchPartners();
  }

  async function toggleStatus(p: Partner) {
    await fetch(`/api/partners/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: p.status === "active" ? "inactive" : "active" }),
    });
    fetchPartners();
  }

  async function deletePartner(p: Partner) {
    if (!confirm(`Excluir parceiro ${p.name}? Isso também remove o histórico de usos.`)) return;
    await fetch(`/api/partners/${p.id}`, { method: "DELETE" });
    setNewlyCreated(null);
    fetchPartners();
  }

  async function updateSaleStatus(useId: string, sale_status: string) {
    await fetch(`/api/coupons/use/${useId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sale_status }),
    });
    setUses((prev) =>
      prev.map((u) => (u.id === useId ? { ...u, sale_status: sale_status as CouponUse["sale_status"] } : u))
    );
  }

  const filteredUses = filterPartner === "all"
    ? uses
    : uses.filter((u) => u.coupon_code === filterPartner);

  const concludedUses = filteredUses.filter((u) => u.sale_status === "concluido");
  const totalSales = concludedUses.reduce((a, u) => a + (u.material_discounted || 0), 0);
  const totalCommission = concludedUses.reduce((a, u) => a + (u.commission_owed || 0), 0);
  const pendingCommission = filteredUses
    .filter((u) => u.sale_status === "em_orcamento" || u.sale_status === null)
    .reduce((a, u) => a + (u.commission_owed || 0), 0);

  function buildWALink(p: Partner) {
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://orbitalrevestimentos.com.br";
    const discountLabel = p.discount_type === "percentage"
      ? `${p.discount_value}% de desconto`
      : `R$ ${p.discount_value} de desconto`;
    const lines = [
      `Olá ${p.name}! 👋`,
      ``,
      `Seu cupom Orbital foi criado com sucesso:`,
      ``,
      `🎟 Código: *${p.coupon_code}*`,
      `💰 ${discountLabel} para seus clientes`,
      ``,
      `Acesse seu painel de parceiro em:`,
      `${siteUrl}/parceiro`,
    ];
    if (p.portal_password) lines.push(`🔑 Senha: ${p.portal_password}`);
    return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#f5f5f3] flex items-center justify-center px-4">
        <div className="bg-white border border-[#e2e2e2] p-10 w-full max-w-sm">
          <p className="text-[#002045] font-[var(--font-noto-serif)] text-2xl font-normal mb-6">
            Orbital Admin
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                Senha
              </label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full border border-[#e2e2e2] px-4 py-3 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                autoFocus
              />
            </div>
            {pwError && <p className="text-red-600 text-sm font-[var(--font-inter)]">{pwError}</p>}
            <button
              type="submit"
              className="w-full bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-[#1a365d] transition-colors"
            >
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
        <p className="text-white font-[var(--font-noto-serif)] text-xl">Orbital Admin</p>
        <button
          onClick={() => { sessionStorage.removeItem("orbital_admin_auth"); setAuthed(false); }}
          className="text-white/60 hover:text-white text-xs font-[var(--font-inter)] uppercase tracking-widest transition-colors"
        >
          Sair
        </button>
      </div>

      {!supabaseConfigured && (
        <div className="max-w-4xl mx-auto px-8 pt-10">
          <div className="bg-yellow-50 border border-yellow-300 px-6 py-5 text-yellow-900 text-sm font-[var(--font-inter)]">
            Configure as variáveis de ambiente do Supabase (<code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>) para usar o painel admin.
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="flex gap-1 mb-8 border-b border-[#e2e2e2]">
          {(["partners", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-[#002045] text-[#002045]"
                  : "border-transparent text-[#74777f] hover:text-[#002045]"
              }`}
            >
              {t === "partners" ? "Parceiros" : "Histórico"}
            </button>
          ))}
        </div>

        {/* ─── PARTNERS TAB ─── */}
        {tab === "partners" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Parceiros</h2>
              <button
                onClick={startCreate}
                className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors"
              >
                + Novo Parceiro
              </button>
            </div>

            {/* WhatsApp link after creation */}
            {newlyCreated && !showForm && (
              <div className="bg-green-50 border border-green-200 px-6 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-green-900 text-sm font-[var(--font-inter)] font-semibold mb-0.5">
                    Parceiro criado com sucesso!
                  </p>
                  <p className="text-green-700 text-xs font-[var(--font-inter)]">
                    Cupom: <strong>{newlyCreated.coupon_code}</strong>
                    {newlyCreated.portal_password && (
                      <> · Senha: <strong>{newlyCreated.portal_password}</strong></>
                    )}
                  </p>
                </div>
                <a
                  href={buildWALink(newlyCreated)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25d366] text-white text-xs tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#1db954] transition-colors whitespace-nowrap"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Enviar via WhatsApp
                </a>
              </div>
            )}

            {showForm && (
              <div className="bg-white border border-[#e2e2e2] p-8 mb-6">
                <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-lg font-normal mb-6">
                  {editingId ? "Editar Parceiro" : "Novo Parceiro"}
                </h3>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Nome *</label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Código do Cupom *</label>
                      <input
                        required
                        value={form.coupon_code}
                        onChange={(e) => setForm({ ...form, coupon_code: e.target.value.toUpperCase() })}
                        className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] uppercase"
                        placeholder="ex: ARQLIMA10"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Email</label>
                      <input
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        type="email"
                        className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Telefone</label>
                      <input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Tipo de Desconto</label>
                      <select
                        value={form.discount_type}
                        onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percentage" | "fixed" })}
                        className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      >
                        <option value="percentage">Porcentagem (%)</option>
                        <option value="fixed">Valor fixo (R$)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                        Valor do Desconto {form.discount_type === "percentage" ? "(%)" : "(R$)"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.discount_value}
                        onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Tipo de Comissão</label>
                      <select
                        value={form.commission_type}
                        onChange={(e) => setForm({ ...form, commission_type: e.target.value as "percentage" | "fixed" })}
                        className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      >
                        <option value="percentage">Porcentagem (%)</option>
                        <option value="fixed">Valor fixo (R$)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                        Valor da Comissão {form.commission_type === "percentage" ? "(%)" : "(R$)"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.commission_value}
                        onChange={(e) => setForm({ ...form, commission_value: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">
                        Senha do Portal <span className="normal-case text-[#74777f] font-normal">(acesso parceiro)</span>
                      </label>
                      <input
                        value={form.portal_password}
                        onChange={(e) => setForm({ ...form, portal_password: e.target.value })}
                        className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                        placeholder="Deixe em branco para sem acesso"
                      />
                    </div>
                    {editingId && (
                      <div>
                        <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-2">Status</label>
                        <select
                          value={form.status}
                          onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}
                          className="w-full border border-[#e2e2e2] px-4 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                        >
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo</option>
                        </select>
                      </div>
                    )}
                  </div>
                  {formError && <p className="text-red-600 text-sm font-[var(--font-inter)] mb-4">{formError}</p>}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50"
                    >
                      {formLoading ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="text-[#74777f] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 border border-[#e2e2e2] hover:border-[#74777f] transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
            ) : (
              <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
                <table className="w-full text-sm font-[var(--font-inter)]">
                  <thead>
                    <tr className="border-b border-[#e2e2e2]">
                      {["Nome", "Cupom", "Desconto", "Comissão", "Senha Portal", "Status", "Ações"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {partners.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-[#74777f]">
                          Nenhum parceiro cadastrado.
                        </td>
                      </tr>
                    ) : (
                      partners.map((p) => (
                        <tr key={p.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-[#002045]">{p.name}</p>
                            {p.email && <p className="text-xs text-[#74777f]">{p.email}</p>}
                          </td>
                          <td className="px-5 py-4">
                            <span className="bg-[#eef2f8] text-[#002045] px-2 py-1 text-xs font-bold tracking-wider">
                              {p.coupon_code}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-[#43474e]">
                            {p.discount_type === "percentage" ? `${p.discount_value}%` : fmt(p.discount_value)}
                          </td>
                          <td className="px-5 py-4 text-[#43474e]">
                            {p.commission_type === "percentage" ? `${p.commission_value}%` : fmt(p.commission_value)}
                          </td>
                          <td className="px-5 py-4 text-xs text-[#74777f]">
                            {p.portal_password ? (
                              <span className="font-mono text-[#43474e]">{p.portal_password}</span>
                            ) : (
                              <span className="italic">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-1 text-[10px] font-bold tracking-wider ${
                              p.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {p.status === "active" ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => startEdit(p)}
                                className="text-[#1a365d] text-xs font-semibold hover:text-[#002045] transition-colors"
                              >
                                Editar
                              </button>
                              <span className="text-[#e2e2e2]">|</span>
                              <button
                                onClick={() => toggleStatus(p)}
                                className="text-[#74777f] text-xs font-semibold hover:text-[#002045] transition-colors"
                              >
                                {p.status === "active" ? "Desativar" : "Ativar"}
                              </button>
                              <span className="text-[#e2e2e2]">|</span>
                              <button
                                onClick={() => deletePartner(p)}
                                className="text-red-500 text-xs font-semibold hover:text-red-700 transition-colors"
                              >
                                Excluir
                              </button>
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

        {/* ─── HISTORY TAB ─── */}
        {tab === "history" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Histórico de Usos</h2>
              <div className="flex items-center gap-2">
                <label className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] whitespace-nowrap">
                  Filtrar por parceiro:
                </label>
                <select
                  value={filterPartner}
                  onChange={(e) => setFilterPartner(e.target.value)}
                  className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] min-w-[160px]"
                >
                  <option value="all">Todos</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.coupon_code}>
                      {p.name} ({p.coupon_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white border border-[#e2e2e2] px-6 py-5">
                <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Total de usos</p>
                <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal">{filteredUses.length}</p>
              </div>
              <div className="bg-white border border-[#e2e2e2] px-6 py-5">
                <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Vendas concluídas</p>
                <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal">{fmt(totalSales)}</p>
              </div>
              <div className="bg-white border border-[#e2e2e2] px-6 py-5">
                <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Comissões devidas</p>
                <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal">{fmt(totalCommission)}</p>
              </div>
              <div className="bg-white border border-[#e2e2e2] px-6 py-5">
                <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Comissões em aberto</p>
                <p className="font-[var(--font-noto-serif)] text-yellow-700 text-3xl font-normal">{fmt(pendingCommission)}</p>
              </div>
            </div>

            {loading ? (
              <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
            ) : (
              <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
                <table className="w-full text-sm font-[var(--font-inter)]">
                  <thead>
                    <tr className="border-b border-[#e2e2e2]">
                      {["Data", "Cupom", "Produto", "Espaço", "Área (m²)", "Placas", "Material orig.", "Desconto", "Comissão", "Status"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.1em] uppercase font-bold text-[#74777f] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUses.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-8 text-center text-[#74777f]">
                          Nenhum uso registrado.
                        </td>
                      </tr>
                    ) : (
                      filteredUses.map((u) => {
                        const st = u.sale_status || "em_orcamento";
                        const stMeta = STATUS_LABELS[st] || STATUS_LABELS.em_orcamento;
                        return (
                          <tr key={u.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                            <td className="px-4 py-3 text-xs text-[#43474e] whitespace-nowrap">
                              {new Date(u.created_at).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="px-4 py-3">
                              <span className="bg-[#eef2f8] text-[#002045] px-2 py-0.5 text-xs font-bold tracking-wider">
                                {u.coupon_code}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#43474e]">
                              <p className="font-semibold">{u.product_name}</p>
                              <p className="text-[#74777f]">{u.product_code}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#43474e]">{u.space || "—"}</td>
                            <td className="px-4 py-3 text-xs text-[#43474e]">{u.area_m2 ?? "—"}</td>
                            <td className="px-4 py-3 text-xs text-[#43474e]">{u.plates ?? "—"}</td>
                            <td className="px-4 py-3 text-xs text-[#43474e]">{u.material_total ? fmt(u.material_total) : "—"}</td>
                            <td className="px-4 py-3 text-xs text-green-700 font-semibold">
                              {u.discount_applied ? fmt(u.discount_applied) : "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-[#002045] font-semibold">
                              {u.commission_owed ? fmt(u.commission_owed) : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={st}
                                onChange={(e) => updateSaleStatus(u.id, e.target.value)}
                                className={`text-[10px] font-bold tracking-wide px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#002045] ${stMeta.cls}`}
                              >
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
