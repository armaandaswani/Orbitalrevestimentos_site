"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import RepCrmTab from "../representante/RepCrmTab";

interface RepOption {
  id: string;
  name: string;
}

interface Meeting {
  id: string;
  sales_rep_id: string;
  sales_rep_name: string | null;
  partner_id: string | null;
  title: string;
  scheduled_at: string;
  status: "scheduled" | "completed" | "cancelled";
}

interface AllCrmRow {
  id: string;
  sales_rep_id: string;
  sales_rep_name: string | null;
  stage: string;
  has_specified: boolean;
  meeting_happened_at: string | null;
  last_followup_at: string | null;
  first_contact_at: string | null;
  next_reminder_at: string | null;
  prospect_name: string | null;
  specified_count: number | null;
  project_added_count: number | null;
  total_generated: number;
  projects_count: number;
  partner?: { name?: string | null; phone?: string | null; email?: string | null } | null;
}

type LeadStatus = "novo" | "contatado" | "em_negociacao" | "orcamento" | "ganho" | "perdido";
type RepStage = "novo_contato" | "reuniao_agendada" | "reuniao_realizada" | "acompanhamento" | "ativo" | "inativo";
type UnifiedColumnId = "entrada" | "contato" | "negociacao" | "proposta" | "ganho" | "perdido";

interface AdminLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: LeadStatus;
  partner_name: string | null;
  space: string | null;
  product_name: string | null;
  estimated_value: number | null;
  next_reminder_at: string | null;
  reminder_note: string | null;
  created_at: string;
}

interface UnifiedCard {
  key: string;
  type: "lead" | "rep";
  id: string;
  column: UnifiedColumnId;
  title: string;
  owner: string;
  meta: string;
  value: number;
  nextReminderAt: string | null;
  detail: string | null;
  badges: string[];
}

interface PartnerOption {
  id: string;
  name: string;
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}
function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

const UNIFIED_COLUMNS: Array<{ id: UnifiedColumnId; label: string; hint: string }> = [
  { id: "entrada", label: "Entrada", hint: "novos contatos" },
  { id: "contato", label: "Contato", hint: "contatados/reunião" },
  { id: "negociacao", label: "Negociação", hint: "conversa ativa" },
  { id: "proposta", label: "Proposta", hint: "orçamento/acompanhamento" },
  { id: "ganho", label: "Ganho / ativo", hint: "convertidos" },
  { id: "perdido", label: "Perdido / inativo", hint: "encerrados" },
];

const LEAD_TO_COLUMN: Record<LeadStatus, UnifiedColumnId> = {
  novo: "entrada",
  contatado: "contato",
  em_negociacao: "negociacao",
  orcamento: "proposta",
  ganho: "ganho",
  perdido: "perdido",
};
const COLUMN_TO_LEAD_STATUS: Record<UnifiedColumnId, LeadStatus> = {
  entrada: "novo",
  contato: "contatado",
  negociacao: "em_negociacao",
  proposta: "orcamento",
  ganho: "ganho",
  perdido: "perdido",
};
const CRM_TO_COLUMN: Record<RepStage, UnifiedColumnId> = {
  novo_contato: "entrada",
  reuniao_agendada: "contato",
  reuniao_realizada: "negociacao",
  acompanhamento: "proposta",
  ativo: "ganho",
  inativo: "perdido",
};
const COLUMN_TO_CRM_STAGE: Record<UnifiedColumnId, RepStage> = {
  entrada: "novo_contato",
  contato: "reuniao_agendada",
  negociacao: "reuniao_realizada",
  proposta: "acompanhamento",
  ganho: "ativo",
  perdido: "inativo",
};

/** Admin: team-wide funnel + full view/edit of every rep's CRM pipeline. */
export default function RepOversightTab({ reps }: { reps: RepOption[] }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [allRows, setAllRows] = useState<AllCrmRow[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [expandedRepId, setExpandedRepId] = useState<string | null>(null);
  const [partnersByRep, setPartnersByRep] = useState<Record<string, PartnerOption[]>>({});
  const [unifiedSearch, setUnifiedSearch] = useState("");
  const [unifiedKind, setUnifiedKind] = useState<"all" | "lead" | "rep">("all");
  const [draggingCard, setDraggingCard] = useState<UnifiedCard | null>(null);
  // Scope the whole oversight view (funnel, kanban, agenda) to one rep. "all" =
  // the whole team. Drives team funnel, unified kanban cards and the agenda.
  const [repFilter, setRepFilter] = useState<string>("all");
  // The CRM row currently open in the inline edit modal (click a rep card).
  const [editingRow, setEditingRow] = useState<AllCrmRow | null>(null);
  // Inline reschedule: the meeting id being rescheduled + the new datetime.
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState<string>("");

  const fetchMeetings = useCallback(async () => {
    setMeetingsLoading(true);
    const now = new Date();
    const in14d = new Date(Date.now() + 14 * 24 * 3600 * 1000);
    const res = await fetch(`/api/admin/rep-meetings?from=${now.toISOString()}&to=${in14d.toISOString()}`);
    if (res.ok) setMeetings(await res.json());
    setMeetingsLoading(false);
  }, []);

  const fetchAll = useCallback(async () => {
    setAllLoading(true);
    const res = await fetch(`/api/representante/crm?all=true`);
    if (res.ok) setAllRows(await res.json());
    setAllLoading(false);
  }, []);

  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    const res = await fetch("/api/admin/leads");
    if (res.ok) setLeads(await res.json());
    setLeadsLoading(false);
  }, []);

  useEffect(() => {
    fetchMeetings();
    fetchAll();
    fetchLeads();
  }, [fetchMeetings, fetchAll, fetchLeads]);

  async function toggleRep(repId: string) {
    if (expandedRepId === repId) {
      setExpandedRepId(null);
      return;
    }
    setExpandedRepId(repId);
    if (!partnersByRep[repId]) {
      const res = await fetch(`/api/representante/partners?sales_rep_id=${encodeURIComponent(repId)}`);
      if (res.ok) {
        const data = (await res.json()) as Array<{ id: string; name: string }>;
        setPartnersByRep((cur) => ({ ...cur, [repId]: (data ?? []).map((p) => ({ id: p.id, name: p.name })) }));
      } else {
        setPartnersByRep((cur) => ({ ...cur, [repId]: [] }));
      }
    }
  }

  // Rows/meetings scoped to the selected rep (or the whole team).
  const scopedRows = useMemo(
    () => (repFilter === "all" ? allRows : allRows.filter((r) => r.sales_rep_id === repFilter)),
    [allRows, repFilter]
  );
  const upcoming = meetings.filter(
    (m) => m.status === "scheduled" && (repFilter === "all" || m.sales_rep_id === repFilter)
  );

  // Funnel across the scoped rep(s).
  const team = useMemo(() => {
    const advanced = ["reuniao_realizada", "acompanhamento", "ativo"];
    let met = 0, specified = 0, active = 0, value = 0, projects = 0, stalled = 0;
    for (const r of scopedRows) {
      if (r.meeting_happened_at || advanced.includes(r.stage)) met++;
      if (r.has_specified) specified++;
      if (r.stage === "ativo") active++;
      value += r.total_generated || 0;
      projects += r.projects_count || 0;
      if (r.stage !== "inativo" && (daysSince(r.last_followup_at || r.first_contact_at) ?? 0) >= 30) stalled++;
    }
    const total = scopedRows.length;
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
    return { total, met, specified, active, value, projects, stalled, rateMet: pct(met, total), rateActive: pct(active, total) };
  }, [scopedRows]);

  // Per-rep summary counts.
  const repSummary = useMemo(() => {
    const m: Record<string, { count: number; active: number; value: number }> = {};
    for (const r of allRows) {
      const s = (m[r.sales_rep_id] ??= { count: 0, active: 0, value: 0 });
      s.count++;
      if (r.stage === "ativo") s.active++;
      s.value += r.total_generated || 0;
    }
    return m;
  }, [allRows]);

  const unifiedCards = useMemo<UnifiedCard[]>(() => {
    const leadCards: UnifiedCard[] = leads.map((lead) => ({
      key: `lead:${lead.id}`,
      type: "lead",
      id: lead.id,
      column: LEAD_TO_COLUMN[lead.status] ?? "entrada",
      title: lead.name,
      owner: "Admin CRM",
      meta: lead.partner_name ? `Lead · via ${lead.partner_name}` : `Lead · ${lead.source}`,
      value: lead.estimated_value ?? 0,
      nextReminderAt: lead.next_reminder_at,
      detail: [lead.space, lead.product_name].filter(Boolean).join(" · ") || lead.reminder_note || null,
      badges: lead.reminder_note ? ["follow-up"] : [],
    }));

    const repCards: UnifiedCard[] = scopedRows.map((row) => {
      const stage = (row.stage || "novo_contato") as RepStage;
      const title = row.partner?.name || row.prospect_name || "Parceiro";
      const badges: string[] = [];
      if ((row.specified_count ?? 0) > 0 || row.has_specified) badges.push(`${row.specified_count || 1} espec.`);
      if ((row.project_added_count ?? 0) > 0) badges.push(`${row.project_added_count} proj.`);
      if (row.projects_count > 0) badges.push(`${row.projects_count} venda${row.projects_count !== 1 ? "s" : ""}`);
      return {
        key: `rep:${row.id}`,
        type: "rep",
        id: row.id,
        column: CRM_TO_COLUMN[stage] ?? "entrada",
        title,
        owner: row.sales_rep_name || "Representante",
        meta: "CRM representante",
        value: row.total_generated || 0,
        nextReminderAt: row.next_reminder_at,
        detail: row.partner?.email || row.partner?.phone || null,
        badges,
      };
    });

    // When a specific rep is selected, leads (which are unassigned admin CRM
    // entries) don't belong to anyone — hide them so the board shows only that
    // rep's pipeline.
    const base = repFilter === "all" ? [...leadCards, ...repCards] : repCards;
    const q = unifiedSearch.trim().toLowerCase();
    return base.filter((card) => {
      if (unifiedKind !== "all" && card.type !== unifiedKind) return false;
      if (!q) return true;
      return `${card.title} ${card.owner} ${card.meta} ${card.detail ?? ""}`.toLowerCase().includes(q);
    });
  }, [scopedRows, leads, unifiedKind, unifiedSearch, repFilter]);

  const unifiedStats = useMemo(() => {
    return {
      total: unifiedCards.length,
      leads: unifiedCards.filter((card) => card.type === "lead").length,
      reps: unifiedCards.filter((card) => card.type === "rep").length,
      value: unifiedCards.reduce((sum, card) => sum + card.value, 0),
    };
  }, [unifiedCards]);

  async function moveUnifiedCard(card: UnifiedCard, column: UnifiedColumnId) {
    if (card.column === column) return;
    setDraggingCard(null);
    if (card.type === "lead") {
      const status = COLUMN_TO_LEAD_STATUS[column];
      setLeads((cur) => cur.map((lead) => (lead.id === card.id ? { ...lead, status } : lead)));
      const res = await fetch(`/api/admin/leads/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) fetchLeads();
      return;
    }

    const stage = COLUMN_TO_CRM_STAGE[column];
    setAllRows((cur) => cur.map((row) => (row.id === card.id ? { ...row, stage } : row)));
    const res = await fetch(`/api/representante/crm/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) fetchAll();
  }

  // Reschedule/cancel a rep meeting from the admin agenda. The endpoint accepts
  // admin auth and re-sends the calendar invite (.ics) to invitees, so the
  // change reflects in their calendar + CRM. Best-effort; re-fetches on success.
  async function patchMeeting(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/representante/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) { await fetchMeetings(); return true; }
    alert("Não foi possível atualizar a reunião.");
    return false;
  }

  async function cancelMeeting(m: Meeting) {
    if (!confirm(`Cancelar a reunião "${m.title}"? Os convidados serão avisados e o convite removido do calendário.`)) return;
    await patchMeeting(m.id, { status: "cancelled" });
  }

  async function submitReschedule(id: string) {
    if (!rescheduleValue) return;
    const iso = new Date(rescheduleValue).toISOString();
    const ok = await patchMeeting(id, { scheduled_at: iso });
    if (ok) { setReschedulingId(null); setRescheduleValue(""); }
  }

  // Save edits made in the contact modal — admin edits a rep's CRM row exactly
  // as the rep would (the /api/representante/crm/[id] PATCH accepts admin auth).
  async function saveContact(id: string, patch: Partial<AllCrmRow>) {
    setAllRows((cur) => cur.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    const res = await fetch(`/api/representante/crm/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) { fetchAll(); return false; }
    return true;
  }

  const repName = repFilter === "all" ? null : (reps.find((r) => r.id === repFilter)?.name ?? "Representante");

  return (
    <div className="mb-10">
      {/* Rep scope filter — drives the funnel, kanban and agenda below. */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">Representante</span>
        <select
          value={repFilter}
          onChange={(e) => setRepFilter(e.target.value)}
          className="border border-[#d7dbe3] px-3 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] min-w-[200px]"
        >
          <option value="all">Todos os representantes</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        {repFilter !== "all" && (
          <button
            onClick={() => setRepFilter("all")}
            className="text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#1e5fb4] hover:underline"
          >
            limpar
          </button>
        )}
      </div>

      {/* Team funnel */}
      <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] mb-3">
        {repName ? `Funil — ${repName}` : "Funil da equipe — todos os representantes"}
      </h3>
      {allLoading ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)] mb-8">Carregando...</p>
      ) : (
        <div className="bg-white border border-[#e2e2e2] px-5 py-4 mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Relações", value: String(team.total), sub: `${team.active} ativos` },
              { label: "Reuniões", value: String(team.met), sub: `${team.rateMet}% do total` },
              { label: "Especificaram", value: String(team.specified), sub: "" },
              { label: "Ativos", value: String(team.active), sub: `${team.rateActive}% conversão` },
              { label: "Valor gerado", value: fmtBRL(team.value), sub: `${team.projects} projeto${team.projects !== 1 ? "s" : ""}` },
              { label: "Parados 30d+", value: String(team.stalled), sub: team.stalled > 0 ? "precisam atenção" : "tudo em dia" },
            ].map((m) => (
              <div key={m.label}>
                <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">{m.label}</p>
                <p className="text-[#002045] text-lg font-[var(--font-noto-serif)] mt-0.5">{m.value}</p>
                {m.sub && <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)]">{m.sub}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unified admin + rep funnel */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-3">
          <div>
            <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045]">
              Kanban unificado — leads + representantes
            </h3>
            <p className="text-[#74777f] text-sm font-[var(--font-inter)] mt-1">
              Arraste cards para atualizar o estágio no CRM correto.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={unifiedSearch}
              onChange={(e) => setUnifiedSearch(e.target.value)}
              placeholder="Buscar no funil..."
              className="border border-[#d7dbe3] px-3 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] min-w-[220px]"
            />
            {(["all", "lead", "rep"] as const).map((kind) => (
              <button
                key={kind}
                onClick={() => setUnifiedKind(kind)}
                className={`text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 border ${
                  unifiedKind === kind
                    ? "bg-[#002045] text-white border-[#002045]"
                    : "bg-white text-[#74777f] border-[#d7dbe3] hover:border-[#002045] hover:text-[#002045]"
                }`}
              >
                {kind === "all" ? "Todos" : kind === "lead" ? "Leads" : "Reps"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {[
            { label: "Total", value: unifiedStats.total, sub: "cards" },
            { label: "Leads admin", value: unifiedStats.leads, sub: "site/manual" },
            { label: "CRM reps", value: unifiedStats.reps, sub: "parceiros/prospects" },
            { label: "Valor", value: fmtBRL(unifiedStats.value), sub: "potencial + gerado" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#e2e2e2] px-4 py-3">
              <p className="text-[9px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">{s.label}</p>
              <p className="text-[#002045] text-base font-semibold font-[var(--font-noto-serif)] mt-0.5">{s.value}</p>
              <p className="text-[#b0b0b0] text-[9px] font-[var(--font-inter)]">{s.sub}</p>
            </div>
          ))}
        </div>

        {leadsLoading || allLoading ? (
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando funil...</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-3">
            {UNIFIED_COLUMNS.map((column) => {
              const cards = unifiedCards.filter((card) => card.column === column.id);
              const columnValue = cards.reduce((sum, card) => sum + card.value, 0);
              return (
                <div
                  key={column.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (draggingCard) moveUnifiedCard(draggingCard, column.id); }}
                  className="flex-shrink-0 w-[292px] bg-[#f7f8fa] border border-[#e2e2e2]"
                >
                  <div className="px-3 py-2.5 border-b border-[#e2e2e2] bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[#002045] text-[11px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)]">{column.label}</p>
                      <span className="text-[#74777f] text-[11px] font-bold font-[var(--font-inter)]">{cards.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{column.hint}</p>
                      {columnValue > 0 && <p className="text-[#2f5429] text-[10px] font-semibold font-[var(--font-inter)]">{fmtBRL(columnValue)}</p>}
                    </div>
                  </div>
                  <div className="p-2 space-y-2 min-h-[220px]">
                    {cards.map((card) => (
                      <div
                        key={card.key}
                        draggable
                        onDragStart={() => setDraggingCard(card)}
                        onDragEnd={() => setDraggingCard(null)}
                        className={`bg-white border border-[#e2e2e2] px-3 py-2 cursor-grab active:cursor-grabbing ${
                          draggingCard?.key === card.key ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[#002045] text-xs font-semibold font-[var(--font-inter)] truncate">{card.title}</p>
                            <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] truncate">{card.owner}</p>
                          </div>
                          <span className={`shrink-0 text-[8px] tracking-[0.08em] uppercase font-bold px-1.5 py-0.5 ${
                            card.type === "lead" ? "bg-[#eef2f8] text-[#002045]" : "bg-[#eafaf0] text-[#2f5429]"
                          }`}>
                            {card.type === "lead" ? "Lead" : "Rep"}
                          </span>
                        </div>
                        <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mt-1">{card.meta}</p>
                        {card.detail && <p className="text-[#43474e] text-[10px] font-[var(--font-inter)] mt-1 truncate">{card.detail}</p>}
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <span className="text-[#2f5429] text-[10px] font-semibold font-[var(--font-inter)]">{card.value > 0 ? fmtBRL(card.value) : "—"}</span>
                          <span className="text-[#74777f] text-[10px] font-[var(--font-inter)]">{card.nextReminderAt ? fmtDate(card.nextReminderAt) : ""}</span>
                        </div>
                        {card.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {card.badges.slice(0, 3).map((badge) => (
                              <span key={badge} className="text-[9px] font-bold px-1.5 py-0.5 bg-[#f4f5f7] text-[#43474e]">{badge}</span>
                            ))}
                          </div>
                        )}
                        {card.type === "rep" && (
                          <div className="flex justify-end mt-2 pt-2 border-t border-[#f0f0f0]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const row = allRows.find((r) => r.id === card.id);
                                if (row) setEditingRow(row);
                              }}
                              className="text-[10px] font-bold font-[var(--font-inter)] text-[#1e5fb4] hover:underline"
                            >
                              Abrir / editar →
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {cards.length === 0 && (
                      <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)] text-center py-8">Sem cards</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming meetings */}
      <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] mb-3">
        {repName ? `Agenda — ${repName}` : "Agenda dos representantes"} · próximos 14 dias
      </h3>
      {meetingsLoading ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
      ) : upcoming.length === 0 ? (
        <div className="bg-white border border-[#e2e2e2] px-5 py-6 text-center mb-8">
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhuma reunião agendada nos próximos 14 dias.</p>
        </div>
      ) : (
        <>
        {/* Desktop table */}
        <div className="hidden md:block bg-white border border-[#e2e2e2] mb-8">
          <table className="w-full text-sm font-[var(--font-inter)]">
            <thead>
              <tr className="border-b border-[#e2e2e2]">
                {["Quando", "Representante", "Reunião", ""].map((h, i) => (
                  <th key={i} className="text-left px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcoming.map((m) => (
                <tr key={m.id} className="border-b border-[#f0f0f0]">
                  <td className="px-4 py-2.5 text-xs text-[#43474e] whitespace-nowrap">{fmtDateTime(m.scheduled_at)}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-[#002045]">{m.sales_rep_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-[#43474e]">{m.title}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {reschedulingId === m.id ? (
                      <span className="inline-flex items-center gap-1">
                        <input type="datetime-local" value={rescheduleValue} onChange={(e) => setRescheduleValue(e.target.value)}
                          className="border border-[#e2e2e2] px-1.5 py-1 text-[11px] text-[#002045] focus:outline-none focus:border-[#002045]" />
                        <button onClick={() => submitReschedule(m.id)} className="text-[10px] font-bold text-[#2f5429] hover:underline">OK</button>
                        <button onClick={() => { setReschedulingId(null); setRescheduleValue(""); }} className="text-[10px] text-[#74777f] hover:underline">×</button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-3">
                        <button onClick={() => { setReschedulingId(m.id); setRescheduleValue(m.scheduled_at.slice(0, 16)); }} className="text-[10px] font-bold text-[#1e5fb4] hover:underline">Remarcar</button>
                        <button onClick={() => cancelMeeting(m)} className="text-[10px] font-bold text-[#b42318] hover:underline">Cancelar</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden space-y-2 mb-8">
          {upcoming.map((m) => (
            <div key={m.id} className="bg-white border border-[#e2e2e2] p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-[#002045] truncate">{m.sales_rep_name ?? "—"}</span>
                <span className="text-[11px] text-[#74777f] whitespace-nowrap flex-shrink-0">{fmtDateTime(m.scheduled_at)}</span>
              </div>
              <p className="text-xs text-[#43474e] font-[var(--font-inter)]">{m.title}</p>
              {reschedulingId === m.id ? (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#f0f0f0]">
                  <input type="datetime-local" value={rescheduleValue} onChange={(e) => setRescheduleValue(e.target.value)}
                    className="border border-[#e2e2e2] px-2 py-1 text-[11px] text-[#002045] focus:outline-none focus:border-[#002045] flex-1" />
                  <button onClick={() => submitReschedule(m.id)} className="text-[11px] font-bold text-[#2f5429]">OK</button>
                  <button onClick={() => { setReschedulingId(null); setRescheduleValue(""); }} className="text-[11px] text-[#74777f]">×</button>
                </div>
              ) : (
                <div className="flex gap-4 mt-2 pt-2 border-t border-[#f0f0f0]">
                  <button onClick={() => { setReschedulingId(m.id); setRescheduleValue(m.scheduled_at.slice(0, 16)); }} className="text-[11px] font-bold text-[#1e5fb4]">Remarcar</button>
                  <button onClick={() => cancelMeeting(m)} className="text-[11px] font-bold text-[#b42318]">Cancelar</button>
                </div>
              )}
            </div>
          ))}
        </div>
        </>
      )}

      {/* Per-rep editable pipeline */}
      <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] mb-3">
        Pipeline por representante — visualizar e editar
      </h3>
      <div className="bg-white border border-[#e2e2e2] divide-y divide-[#f0f0f0]">
        {reps.map((rep) => {
          const expanded = expandedRepId === rep.id;
          const s = repSummary[rep.id];
          return (
            <div key={rep.id}>
              <button
                onClick={() => toggleRep(rep.id)}
                className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-[#fafafa] transition-colors"
              >
                <span className="text-sm font-semibold text-[#002045] font-[var(--font-inter)]">{rep.name}</span>
                <span className="text-[10px] text-[#74777f] font-[var(--font-inter)]">
                  {s ? `${s.count} relaç${s.count !== 1 ? "ões" : "ão"} · ${s.active} ativo${s.active !== 1 ? "s" : ""} · ${fmtBRL(s.value)}` : "—"}
                  <span className="ml-2">{expanded ? "▲" : "▼"}</span>
                </span>
              </button>
              {expanded && (
                <div className="border-t border-[#f0f0f0] px-5 py-5 bg-[#fafafa]">
                  <RepCrmTab salesRepId={rep.id} linkedPartners={partnersByRep[rep.id] ?? []} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingRow && (
        <RepContactEditor
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSave={saveContact}
        />
      )}
    </div>
  );
}

// ── Contact editor modal ─────────────────────────────────────────────────────
// Opened from a rep card on the unified kanban. Edits the same fields the rep
// edits in their own CRM (stage, next follow-up, name, value) and saves through
// the admin-capable /api/representante/crm/[id] PATCH.
const STAGE_OPTIONS: { value: RepStage; label: string }[] = [
  { value: "novo_contato", label: "Novo contato" },
  { value: "reuniao_agendada", label: "Reunião agendada" },
  { value: "reuniao_realizada", label: "Reunião realizada" },
  { value: "acompanhamento", label: "Acompanhamento" },
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
];

function RepContactEditor({
  row,
  onClose,
  onSave,
}: {
  row: AllCrmRow;
  onClose: () => void;
  onSave: (id: string, patch: Partial<AllCrmRow>) => Promise<boolean>;
}) {
  const isProspect = row.partner == null;
  const [stage, setStage] = useState<string>(row.stage || "novo_contato");
  const [prospectName, setProspectName] = useState<string>(row.prospect_name ?? "");
  const [reminder, setReminder] = useState<string>(row.next_reminder_at ? row.next_reminder_at.slice(0, 10) : "");
  const [value, setValue] = useState<string>(row.total_generated ? String(row.total_generated) : "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    const patch: Partial<AllCrmRow> = {
      stage,
      next_reminder_at: reminder ? new Date(`${reminder}T09:00:00`).toISOString() : null,
      total_generated: value === "" ? 0 : Number(value) || 0,
    };
    if (isProspect) patch.prospect_name = prospectName.trim() || null;
    const ok = await onSave(row.id, patch);
    setSaving(false);
    if (ok) onClose();
  }

  const label = row.partner?.name || row.prospect_name || "Contato";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white w-full max-w-md border border-[#e2e2e2] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#e2e2e2] bg-[#002045]">
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold font-[var(--font-inter)] truncate">{label}</p>
            <p className="text-[#a9b6c8] text-[10px] font-[var(--font-inter)]">{row.sales_rep_name || "Representante"} · CRM</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-lg leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          {isProspect && (
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Nome do contato</label>
              <input value={prospectName} onChange={(e) => setProspectName(e.target.value)}
                className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
            </div>
          )}
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Estágio</label>
            <select value={stage} onChange={(e) => setStage(e.target.value)}
              className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
              {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Próximo follow-up</label>
              <input type="date" value={reminder} onChange={(e) => setReminder(e.target.value)}
                className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Valor gerado (R$)</label>
              <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)}
                className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
            </div>
          </div>
          <p className="text-[10px] text-[#74777f] font-[var(--font-inter)]">
            Para gerenciar reuniões, notas e etapas detalhadas, abra o pipeline do representante abaixo.
          </p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#e2e2e2]">
          <button onClick={onClose} className="text-[#74777f] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 border border-[#e2e2e2] hover:border-[#74777f]">Cancelar</button>
          <button onClick={submit} disabled={saving} className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2 hover:bg-[#1a365d] disabled:opacity-50">{saving ? "Salvando…" : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}
