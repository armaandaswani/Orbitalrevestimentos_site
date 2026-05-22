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
  status: "active" as "active" | "inactive",
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
    setForm({ ...emptyForm });
    setFormError("");
    setShowForm(true);
  }

  function startEdit(p: Partner) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      email: p.email || "",
      phone: p.phone || "",
      coupon_code: p.coupon_code,
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      commission_type: p.commission_type,
      commission_value: p.commission_value,
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
    fetchPartners();
  }

  const totalSales = uses.reduce((a, u) => a + (u.material_discounted || 0), 0);
  const totalCommission = uses.reduce((a, u) => a + (u.commission_owed || 0), 0);

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
                      {["Nome", "Cupom", "Desconto", "Comissão", "Status", "Ações"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {partners.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-[#74777f]">
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
                            <div className="flex gap-2">
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

        {tab === "history" && (
          <div>
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-6">Histórico de Usos</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white border border-[#e2e2e2] px-6 py-5">
                <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Total de usos</p>
                <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal">{uses.length}</p>
              </div>
              <div className="bg-white border border-[#e2e2e2] px-6 py-5">
                <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Total em vendas</p>
                <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal">{fmt(totalSales)}</p>
              </div>
              <div className="bg-white border border-[#e2e2e2] px-6 py-5">
                <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Comissões devidas</p>
                <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal">{fmt(totalCommission)}</p>
              </div>
            </div>

            {loading ? (
              <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
            ) : (
              <div className="bg-white border border-[#e2e2e2] overflow-x-auto">
                <table className="w-full text-sm font-[var(--font-inter)]">
                  <thead>
                    <tr className="border-b border-[#e2e2e2]">
                      {["Data", "Cupom", "Produto", "Espaço", "Área (m²)", "Placas", "Material orig.", "Desconto", "Comissão"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.1em] uppercase font-bold text-[#74777f] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uses.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-8 text-center text-[#74777f]">
                          Nenhum uso registrado.
                        </td>
                      </tr>
                    ) : (
                      uses.map((u) => (
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
                        </tr>
                      ))
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
