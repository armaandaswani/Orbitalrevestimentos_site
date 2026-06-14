"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────
export type LeadSource = "website" | "partner" | "manual" | "whatsapp";
export type LeadStatus =
  | "novo"
  | "contatado"
  | "em_negociacao"
  | "orcamento"
  | "ganho"
  | "perdido";

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  status: LeadStatus;
  partner_id: string | null;
  partner_name: string | null;
  coupon_use_id: string | null;
  client_email_sequence_id: string | null;
  space: string | null;
  product_name: string | null;
  estimated_value: number | null;
  next_reminder_at: string | null;
  reminder_note: string | null;
  notes: string | null;
  smclick_contact_id: string | null;
  smclick_synced_at: string | null;
  reminder_sent_at: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Labels / styling ─────────────────────────────────────────────────────────
const STATUS_META: Record<LeadStatus, { label: string; cls: string }> = {
  novo: { label: "Novo", cls: "bg-blue-100 text-blue-800" },
  contatado: { label: "Contatado", cls: "bg-indigo-100 text-indigo-800" },
  em_negociacao: { label: "Em negociação", cls: "bg-yellow-100 text-yellow-800" },
  orcamento: { label: "Orçamento", cls: "bg-purple-100 text-purple-800" },
  ganho: { label: "Ganho", cls: "bg-green-100 text-green-800" },
  perdido: { label: "Perdido", cls: "bg-gray-200 text-gray-600" },
};
const STATUS_ORDER: LeadStatus[] = [
  "novo",
  "contatado",
  "em_negociacao",
  "orcamento",
  "ganho",
  "perdido",
];

const SOURCE_META: Record<LeadSource, { label: string; cls: string }> = {
  website: { label: "Site", cls: "bg-[#eef2f8] text-[#002045]" },
  partner: { label: "Parceiro", cls: "bg-green-100 text-green-800" },
  manual: { label: "Manual", cls: "bg-amber-100 text-amber-800" },
  whatsapp: { label: "WhatsApp", cls: "bg-emerald-100 text-emerald-800" },
};

function fmtBRL(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}
/** datetime-local value (YYYY-MM-DDTHH:mm) from an ISO string. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Relative reminder badge: overdue / hoje / future date. */
function reminderBadge(iso: string | null | undefined): { label: string; cls: string } | null {
  if (!iso) return null;
  const due = new Date(iso).getTime();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor((due - now) / dayMs);
  if (due < now) return { label: `Atrasado · ${fmtDate(iso)}`, cls: "text-red-700 font-bold" };
  if (days === 0) return { label: "Hoje", cls: "text-amber-700 font-bold" };
  if (days <= 2) return { label: `Em ${days}d · ${fmtDate(iso)}`, cls: "text-amber-700" };
  return { label: fmtDate(iso), cls: "text-[#74777f]" };
}

// Draft used by the create/edit modal.
type LeadDraft = Partial<Lead> & { _isNew?: boolean };

export default function LeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourceFilter, setSourceFilter] = useState<"all" | LeadSource>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");
  const [search, setSearch] = useState("");

  const [draft, setDraft] = useState<LeadDraft | null>(null);
  const [saving, setSaving] = useState(false);

  // SM Click bulk sync
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // SM Click manual WhatsApp send
  const [waLead, setWaLead] = useState<Lead | null>(null);
  const [waMessage, setWaMessage] = useState("");
  const [waSending, setWaSending] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/leads");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data)) {
        setLeads(data);
      } else {
        const msg =
          res.status === 401
            ? "sessão de admin expirada ou inválida (401) — faça login novamente"
            : data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : `HTTP ${res.status}`;
        setError(`Falha ao carregar leads (/api/admin/leads): ${msg}`);
      }
    } catch (e) {
      setError(`Falha ao carregar leads: ${e instanceof Error ? e.message : "erro de rede"}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const sourceCounts = useMemo(() => {
    const c = { all: leads.length, website: 0, partner: 0, manual: 0, whatsapp: 0 } as Record<string, number>;
    for (const l of leads) c[l.source] = (c[l.source] ?? 0) + 1;
    return c;
  }, [leads]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (s) {
        const hay = `${l.name} ${l.email ?? ""} ${l.phone ?? ""} ${l.partner_name ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [leads, sourceFilter, statusFilter, search]);

  const stats = useMemo(() => {
    const novos = filtered.filter((l) => l.status === "novo").length;
    const negoc = filtered.filter((l) => l.status === "em_negociacao" || l.status === "orcamento").length;
    const ganhos = filtered.filter((l) => l.status === "ganho").length;
    const valor = filtered
      .filter((l) => l.status !== "perdido")
      .reduce((a, l) => a + (l.estimated_value ?? 0), 0);
    const lembretes = filtered.filter(
      (l) => l.next_reminder_at && new Date(l.next_reminder_at).getTime() <= Date.now()
    ).length;
    return { novos, negoc, ganhos, valor, lembretes };
  }, [filtered]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  async function patchLead(id: string, patch: Partial<Lead>) {
    // optimistic
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        await fetchLeads(); // revert to server truth
      } else {
        const updated = await res.json().catch(() => null);
        if (updated && typeof updated === "object" && "id" in updated) {
          setLeads((prev) => prev.map((l) => (l.id === id ? (updated as Lead) : l)));
        }
      }
    } catch {
      await fetchLeads();
    }
  }

  async function bulkSync() {
    if (syncing) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/smclick/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlyUnsynced: true }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) {
        setSyncResult(
          `${d.pushed} enviado(s) ao SM Click · ${d.skipped} ignorado(s)` +
            (d.failed ? ` · ${d.failed} falha(s)` : "") +
            (d.capped ? " · limite por execução atingido, rode novamente" : "")
        );
        await fetchLeads();
      } else {
        setSyncResult(`Erro: ${d?.error ?? `HTTP ${res.status}`}`);
      }
    } catch (e) {
      setSyncResult(`Erro: ${e instanceof Error ? e.message : "rede"}`);
    }
    setSyncing(false);
  }

  async function sendWhatsApp() {
    if (!waLead || !waMessage.trim() || waSending) return;
    setWaSending(true);
    setWaError(null);
    try {
      const res = await fetch(`/api/admin/leads/${waLead.id}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: waMessage.trim() }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) {
        setWaLead(null);
        setWaMessage("");
      } else {
        setWaError(d?.error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      setWaError(e instanceof Error ? e.message : "erro de rede");
    }
    setWaSending(false);
  }

  async function deleteLead(id: string) {
    if (!confirm("Excluir este lead permanentemente? Esta ação não pode ser desfeita.")) return;
    const res = await fetch(`/api/admin/leads/${id}`, { method: "DELETE" });
    if (res.ok) setLeads((prev) => prev.filter((l) => l.id !== id));
    else await fetchLeads();
  }

  async function saveDraft() {
    if (!draft || !draft.name?.trim()) return;
    setSaving(true);
    const payload = {
      name: draft.name?.trim(),
      email: draft.email ?? null,
      phone: draft.phone ?? null,
      status: draft.status ?? "novo",
      space: draft.space ?? null,
      product_name: draft.product_name ?? null,
      estimated_value: draft.estimated_value ?? null,
      next_reminder_at: draft.next_reminder_at ?? null,
      reminder_note: draft.reminder_note ?? null,
      notes: draft.notes ?? null,
    };
    try {
      if (draft._isNew) {
        const res = await fetch("/api/admin/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setLeads((prev) => [created as Lead, ...prev]);
          setDraft(null);
        } else {
          const d = await res.json().catch(() => null);
          alert(`Erro ao salvar: ${d?.error ?? res.status}`);
        }
      } else if (draft.id) {
        await patchLead(draft.id, payload);
        setDraft(null);
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Leads / CRM</h2>
            {!loading && (
              <span className="bg-[#eef2f8] text-[#002045] text-[10px] font-bold font-[var(--font-inter)] tracking-wider px-2 py-0.5">
                {filtered.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={bulkSync}
              disabled={syncing}
              title="Envia os leads ainda não sincronizados para o SM Click como contatos do WhatsApp"
              className="border border-[#25d366] text-[#128c3e] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#eafaf0] transition-colors disabled:opacity-50"
            >
              {syncing ? "Sincronizando…" : "↗ Sincronizar SM Click"}
            </button>
            <button
              onClick={() => setDraft({ _isNew: true, status: "novo" })}
              className="bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors"
            >
              + Novo lead
            </button>
          </div>
        </div>

        {syncResult && (
          <div className="bg-[#eafaf0] border border-[#bce7cd] text-[#128c3e] text-xs font-[var(--font-inter)] px-4 py-2 flex items-center justify-between gap-3">
            <span>{syncResult}</span>
            <button onClick={() => setSyncResult(null)} className="text-[#128c3e]/60 hover:text-[#128c3e] text-base leading-none">×</button>
          </div>
        )}

        {/* Source segmentation */}
        <div className="flex flex-wrap gap-2">
          {([
            ["all", "Todos"],
            ["website", "Site (de fora)"],
            ["partner", "Parceiros"],
            ["whatsapp", "WhatsApp"],
            ["manual", "Manual"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSourceFilter(key)}
              className={`px-4 py-2 text-xs font-bold font-[var(--font-inter)] tracking-wide border transition-colors ${
                sourceFilter === key
                  ? "bg-[#002045] text-white border-[#002045]"
                  : "bg-white text-[#74777f] border-[#e2e2e2] hover:text-[#002045]"
              }`}
            >
              {label}
              <span className="ml-2 opacity-70">{sourceCounts[key] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, telefone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] min-w-[240px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | LeadStatus)}
            className="border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
          >
            <option value="all">Todos os estágios</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {[
            { label: "Total", value: filtered.length, sub: "leads" },
            { label: "Novos", value: stats.novos, sub: "sem contato" },
            { label: "Em negociação", value: stats.negoc, sub: "ativos" },
            { label: "Valor potencial", value: fmtBRL(stats.valor), sub: "exceto perdidos" },
            { label: "Lembretes", value: stats.lembretes, sub: "vencidos/hoje" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#e2e2e2] px-4 py-3">
              <p className="text-[9px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">{s.label}</p>
              <p className="text-lg font-semibold font-[var(--font-noto-serif)] text-[#002045] mt-0.5 leading-none">{s.value}</p>
              <p className="text-[9px] text-[#b0b0b0] font-[var(--font-inter)] mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 px-6 py-8 text-center">
          <p className="text-red-800 text-sm font-semibold font-[var(--font-inter)]">Não foi possível carregar os leads</p>
          <p className="text-red-700 text-xs font-[var(--font-inter)] mt-1 break-words">{error}</p>
          <button
            onClick={fetchLeads}
            className="mt-4 inline-block border border-red-300 text-red-800 px-4 py-2 text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] hover:bg-red-100 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#e2e2e2] px-6 py-12 text-center">
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
            {leads.length === 0
              ? "Nenhum lead ainda. Novos orçamentos do site e de parceiros aparecem aqui automaticamente, ou adicione um manualmente."
              : "Nenhum lead corresponde aos filtros."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-[#e2e2e2]">
            <table className="w-full text-sm font-[var(--font-inter)] table-fixed">
              <colgroup>
                <col style={{ width: "9%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#e2e2e2]">
                  {["Data", "Lead", "Origem", "Estágio", "Valor", "Lembrete", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] tracking-[0.1em] uppercase font-bold text-[#74777f]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const sm = SOURCE_META[l.source];
                  const rb = reminderBadge(l.next_reminder_at);
                  const waHref = l.phone ? `https://wa.me/55${l.phone.replace(/\D/g, "")}` : null;
                  return (
                    <tr key={l.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] align-top">
                      <td className="px-4 py-3">
                        <p className="text-xs text-[#74777f]">{fmtDate(l.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#002045] text-xs truncate">{l.name}</p>
                        {l.email && <p className="text-[10px] text-[#74777f] truncate">{l.email}</p>}
                        <div className="flex items-center gap-2 mt-0.5">
                          {waHref && (
                            <a href={waHref} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[#3b6934] font-bold hover:underline">
                              WhatsApp
                            </a>
                          )}
                          {l.partner_name && <span className="text-[9px] text-[#74777f]">via {l.partner_name}</span>}
                        </div>
                        {(l.product_name || l.space) && (
                          <p className="text-[9px] text-[#b0b0b0] mt-0.5 truncate">{[l.space, l.product_name].filter(Boolean).join(" · ")}</p>
                        )}
                        {l.last_contacted_at && (
                          <p className="text-[9px] text-[#3b6934] mt-0.5">Último contato: {fmtDate(l.last_contacted_at)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 ${sm.cls}`}>{sm.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={l.status}
                          onChange={(e) => patchLead(l.id, { status: e.target.value as LeadStatus })}
                          className={`text-[10px] font-bold font-[var(--font-inter)] border-0 px-2 py-1 cursor-pointer focus:outline-none ${STATUS_META[l.status].cls}`}
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>{STATUS_META[s].label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-[#002045] font-semibold">{fmtBRL(l.estimated_value)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {rb ? (
                          <p className={`text-[10px] ${rb.cls}`}>{rb.label}</p>
                        ) : (
                          <span className="text-[10px] text-[#b0b0b0]">—</span>
                        )}
                        {l.reminder_note && <p className="text-[9px] text-[#74777f] mt-0.5 truncate">{l.reminder_note}</p>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {l.phone && (
                          <button
                            onClick={() => { setWaLead(l); setWaMessage(""); setWaError(null); }}
                            title="Enviar mensagem via SM Click"
                            className="text-[10px] text-[#128c3e] font-bold hover:underline mr-3"
                          >
                            WhatsApp
                          </button>
                        )}
                        <button onClick={() => setDraft({ ...l })} className="text-[10px] text-[#002045] font-bold hover:underline mr-3">Editar</button>
                        <button onClick={() => deleteLead(l.id)} className="text-[10px] text-red-600 font-bold hover:underline">Excluir</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((l) => {
              const sm = SOURCE_META[l.source];
              const rb = reminderBadge(l.next_reminder_at);
              return (
                <div key={l.id} className="bg-white border border-[#e2e2e2] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#002045] text-sm truncate">{l.name}</p>
                      {l.email && <p className="text-[11px] text-[#74777f] truncate">{l.email}</p>}
                    </div>
                    <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 ${sm.cls}`}>{sm.label}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <select
                      value={l.status}
                      onChange={(e) => patchLead(l.id, { status: e.target.value as LeadStatus })}
                      className={`text-[10px] font-bold border-0 px-2 py-1 ${STATUS_META[l.status].cls}`}
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>{STATUS_META[s].label}</option>
                      ))}
                    </select>
                    <span className="text-xs text-[#002045] font-semibold">{fmtBRL(l.estimated_value)}</span>
                  </div>
                  {rb && <p className={`text-[10px] mt-2 ${rb.cls}`}>⏰ {rb.label}</p>}
                  {l.last_contacted_at && (
                    <p className="text-[10px] text-[#3b6934] mt-1">Último contato: {fmtDate(l.last_contacted_at)}</p>
                  )}
                  <div className="flex gap-4 mt-3 pt-3 border-t border-[#f0f0f0]">
                    {l.phone && (
                      <button onClick={() => { setWaLead(l); setWaMessage(""); setWaError(null); }} className="text-[10px] text-[#128c3e] font-bold">WhatsApp</button>
                    )}
                    <button onClick={() => setDraft({ ...l })} className="text-[10px] text-[#002045] font-bold">Editar</button>
                    <button onClick={() => deleteLead(l.id)} className="text-[10px] text-red-600 font-bold">Excluir</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* WhatsApp send modal (SM Click) */}
      {waLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !waSending && setWaLead(null)}>
          <div className="bg-white w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#128c3e] px-6 py-4 flex items-center justify-between">
              <p className="text-white font-[var(--font-noto-serif)] text-lg">Enviar WhatsApp</p>
              <button onClick={() => !waSending && setWaLead(null)} className="text-white/70 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-[#74777f] font-[var(--font-inter)]">
                Para <span className="font-bold text-[#002045]">{waLead.name}</span>
                {waLead.phone ? ` · ${waLead.phone}` : ""}
              </p>
              <textarea
                className={`${inputCls} min-h-[120px]`}
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                placeholder="Digite a mensagem…"
                autoFocus
              />
              {waError && <p className="text-xs text-red-700 font-[var(--font-inter)] break-words">{waError}</p>}
              <p className="text-[10px] text-[#b0b0b0] font-[var(--font-inter)]">
                Enviado pela instância configurada no SM Click. Mensagens fora da janela de 24h podem exigir um template aprovado.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#e2e2e2] flex justify-end gap-3">
              <button onClick={() => !waSending && setWaLead(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#74777f] hover:text-[#002045]">Cancelar</button>
              <button
                onClick={sendWhatsApp}
                disabled={waSending || !waMessage.trim()}
                className="bg-[#128c3e] text-white px-5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#0f7233] disabled:opacity-50"
              >
                {waSending ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / edit modal */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setDraft(null)}>
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#002045] px-6 py-4 flex items-center justify-between sticky top-0">
              <p className="text-white font-[var(--font-noto-serif)] text-lg">{draft._isNew ? "Novo lead" : "Editar lead"}</p>
              <button onClick={() => !saving && setDraft(null)} className="text-white/60 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              {!draft._isNew && draft.source && (
                <p className="text-[10px] text-[#74777f] font-[var(--font-inter)]">
                  Origem: <span className={`font-bold px-1.5 py-0.5 ${SOURCE_META[draft.source].cls}`}>{SOURCE_META[draft.source].label}</span>
                  {draft.partner_name ? ` · via ${draft.partner_name}` : ""}
                </p>
              )}
              <Field label="Nome *">
                <input className={inputCls} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="E-mail">
                  <input className={inputCls} value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                </Field>
                <Field label="Telefone / WhatsApp">
                  <input className={inputCls} value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Estágio">
                  <select className={inputCls} value={draft.status ?? "novo"} onChange={(e) => setDraft({ ...draft, status: e.target.value as LeadStatus })}>
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Valor estimado (R$)">
                  <input
                    type="number"
                    className={inputCls}
                    value={draft.estimated_value ?? ""}
                    onChange={(e) => setDraft({ ...draft, estimated_value: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ambiente">
                  <input className={inputCls} value={draft.space ?? ""} onChange={(e) => setDraft({ ...draft, space: e.target.value })} />
                </Field>
                <Field label="Produto de interesse">
                  <input className={inputCls} value={draft.product_name ?? ""} onChange={(e) => setDraft({ ...draft, product_name: e.target.value })} />
                </Field>
              </div>
              <Field label="Lembrete (data e hora)">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={toLocalInput(draft.next_reminder_at)}
                  onChange={(e) => setDraft({ ...draft, next_reminder_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </Field>
              <Field label="Nota do lembrete">
                <input className={inputCls} value={draft.reminder_note ?? ""} onChange={(e) => setDraft({ ...draft, reminder_note: e.target.value })} placeholder="Ex: ligar para confirmar interesse" />
              </Field>
              <Field label="Anotações">
                <textarea className={`${inputCls} min-h-[80px]`} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-[#e2e2e2] flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => !saving && setDraft(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#74777f] hover:text-[#002045]">Cancelar</button>
              <button
                onClick={saveDraft}
                disabled={saving || !draft.name?.trim()}
                className="bg-[#002045] text-white px-5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#1a365d] disabled:opacity-50"
              >
                {saving ? "Salvando..." : draft._isNew ? "Criar lead" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">{label}</span>
      {children}
    </label>
  );
}
