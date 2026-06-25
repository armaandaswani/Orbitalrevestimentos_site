"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

type Stage = "novo_contato" | "reuniao_agendada" | "reuniao_realizada" | "acompanhamento" | "ativo" | "inativo";
type Recur = "none" | "daily" | "weekly" | "monthly";

const STAGE_META: Record<Stage, { label: string; cls: string }> = {
  novo_contato: { label: "Novo contato", cls: "bg-gray-100 text-gray-700" },
  reuniao_agendada: { label: "Reunião agendada", cls: "bg-blue-100 text-blue-800" },
  reuniao_realizada: { label: "Reunião realizada", cls: "bg-purple-100 text-purple-800" },
  acompanhamento: { label: "Acompanhamento", cls: "bg-amber-100 text-amber-800" },
  ativo: { label: "Ativo", cls: "bg-green-100 text-green-800" },
  inativo: { label: "Inativo", cls: "bg-gray-100 text-gray-500" },
};
const STAGE_ORDER = Object.keys(STAGE_META) as Stage[];
const RECUR_META: Record<Recur, string> = { none: "Não repete", daily: "Diário", weekly: "Semanal", monthly: "Mensal" };

interface CrmRow {
  id: string;
  partner_id: string | null;
  is_prospect?: boolean;
  stage: Stage;
  first_contact_at: string | null;
  meeting_happened_at: string | null;
  mostruario_sent: boolean;
  mostruario_sent_at: string | null;
  has_specified: boolean;
  last_specified_at: string | null;
  last_followup_at: string | null;
  next_reminder_at: string | null;
  reminder_note: string | null;
  reminder_recur: Recur;
  prospect_name?: string | null;
  prospect_phone?: string | null;
  prospect_email?: string | null;
  prospect_profession?: string | null;
  partner: { id: string | null; name: string; profession: string | null; phone?: string | null; email?: string | null };
  total_generated: number;
  projects_count: number;
  last_sale_at: string | null;
  updated_at?: string | null;
}

interface Note {
  id: string;
  kind: string;
  body: string;
  author: string | null;
  created_at: string;
}

interface PartnerOption {
  id: string;
  name: string;
}

type SortKey = "activity" | "value" | "overdue" | "name";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
// ISO timestamp <-> <input type="date"> value (yyyy-MM-dd), local time.
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromDateInput(s: string): string | null {
  if (!s) return null;
  const d = new Date(`${s}T12:00:00`); // noon local — avoids day-shift across TZ
  return isNaN(d.getTime()) ? null : d.toISOString();
}
function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

type Bucket = "overdue" | "today" | "upcoming";
function bucketOf(iso: string): Bucket {
  const due = new Date(iso).getTime();
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
  if (due < now.getTime()) return "overdue";
  if (due <= endOfToday) return "today";
  return "upcoming";
}

// In-card meeting scheduler. Creates a rep_meeting tied to this CRM
// relationship; the partner/prospect (and any contact info on file) is added as
// an invitee and auto-notified by email + WhatsApp on the server.
function ScheduleMeeting({
  row,
  salesRepId,
  onScheduled,
}: {
  row: CrmRow;
  salesRepId: string;
  onScheduled: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [title, setTitle] = useState(`Reunião com ${row.partner.name}`);
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const hasContact = !!(row.partner.phone || row.partner.email);

  async function submit() {
    if (!when || busy) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/representante/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sales_rep_id: salesRepId,
        crm_id: row.id,
        partner_id: row.partner_id,
        title: title.trim() || `Reunião com ${row.partner.name}`,
        scheduled_at: new Date(when).toISOString(),
        location: location.trim() || undefined,
        invitees: [{ name: row.partner.name, phone: row.partner.phone || "", email: row.partner.email || "" }],
      }),
    });
    setBusy(false);
    if (res.ok) {
      onScheduled(new Date(when).toISOString());
      setOpen(false);
      setWhen("");
      setLocation("");
    } else {
      const j = await res.json().catch(() => null);
      setMsg(j?.error || "Não foi possível agendar.");
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="mb-4 inline-flex items-center gap-1.5 text-[11px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] text-[#002045] border border-[#002045] px-3 py-2 hover:bg-[#002045] hover:text-white transition-colors">
        📅 Agendar reunião
      </button>
    );
  }

  return (
    <div className="mb-4 bg-white border border-[#e2e2e2] px-3 py-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título"
          className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
          className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Local (opcional)"
          className="sm:col-span-2 border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
      </div>
      <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mb-2">
        {hasContact
          ? `${row.partner.name} será convidado e notificado automaticamente${row.partner.phone ? " por WhatsApp" : ""}${row.partner.phone && row.partner.email ? " e" : ""}${row.partner.email ? " por e-mail" : ""}.`
          : `Sem telefone/e-mail no cadastro — a reunião será agendada, mas ${row.partner.name} não receberá convite automático.`}
      </p>
      {msg && <p className="text-red-600 text-[11px] font-[var(--font-inter)] mb-2">{msg}</p>}
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={!when || busy}
          className="bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] px-4 py-2 hover:bg-[#1a365d] disabled:opacity-50">
          {busy ? "Agendando…" : "Agendar e convidar"}
        </button>
        <button onClick={() => setOpen(false)} className="text-[#74777f] text-xs font-[var(--font-inter)] px-2 py-2 hover:text-[#002045]">Cancelar</button>
      </div>
    </div>
  );
}

// A compact editable date field used for each pipeline milestone.
function DateField({ label, value, onChange }: { label: string; value: string | null; onChange: (iso: string | null) => void }) {
  return (
    <div>
      <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">{label}</p>
      <input
        type="date"
        value={toDateInput(value)}
        onChange={(e) => onChange(fromDateInput(e.target.value))}
        className="mt-0.5 w-full bg-transparent text-[#43474e] text-xs font-[var(--font-inter)] border-b border-transparent hover:border-[#e2e2e2] focus:border-[#002045] focus:outline-none cursor-pointer"
      />
    </div>
  );
}

export default function RepCrmTab({
  salesRepId,
  linkedPartners,
}: {
  salesRepId: string;
  linkedPartners: PartnerOption[];
}) {
  const [rows, setRows] = useState<CrmRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesByCrmId, setNotesByCrmId] = useState<Record<string, Note[]>>({});
  const [noteDraft, setNoteDraft] = useState("");

  // Add controls
  const [addMode, setAddMode] = useState<"none" | "partner" | "prospect">("none");
  const [addPartnerId, setAddPartnerId] = useState("");
  const [prospectName, setProspectName] = useState("");
  const [prospectPhone, setProspectPhone] = useState("");
  const [adding, setAdding] = useState(false);

  // Toolbar
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("activity");
  const [view, setView] = useState<"list" | "board">("list");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const fetchCrm = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/representante/crm?sales_rep_id=${encodeURIComponent(salesRepId)}`);
    if (res.ok) setRows(await res.json());
    setLoading(false);
  }, [salesRepId]);

  useEffect(() => {
    fetchCrm();
  }, [fetchCrm]);

  async function addPartner() {
    if (!addPartnerId) return;
    setAdding(true);
    const res = await fetch("/api/representante/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sales_rep_id: salesRepId, partner_id: addPartnerId }),
    });
    setAdding(false);
    if (res.ok) {
      setAddPartnerId("");
      setAddMode("none");
      fetchCrm();
    }
  }

  async function addProspect() {
    if (!prospectName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/representante/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sales_rep_id: salesRepId,
        prospect_name: prospectName.trim(),
        prospect_phone: prospectPhone.trim() || undefined,
      }),
    });
    setAdding(false);
    if (res.ok) {
      setProspectName("");
      setProspectPhone("");
      setAddMode("none");
      fetchCrm();
    }
  }

  async function patchRow(id: string, patch: Partial<CrmRow>) {
    setRows((cur) =>
      cur.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        // Keep the displayed name in sync when editing a prospect.
        if ("prospect_name" in patch && r.is_prospect) {
          next.partner = { ...r.partner, name: (patch.prospect_name as string) || "Prospecto" };
        }
        return next;
      })
    );
    const res = await fetch(`/api/representante/crm/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) fetchCrm();
    else {
      const updated = await res.json();
      setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...updated, partner: r.partner, is_prospect: r.is_prospect } : r)));
    }
  }

  async function removeRow(id: string) {
    if (!confirm("Remover esta relação do seu CRM? O histórico de notas será apagado.")) return;
    setRows((cur) => cur.filter((r) => r.id !== id));
    await fetch(`/api/representante/crm/${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!notesByCrmId[id]) {
      const res = await fetch(`/api/representante/crm/${id}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotesByCrmId((cur) => ({ ...cur, [id]: data }));
      }
    }
  }

  async function addNote(id: string) {
    if (!noteDraft.trim()) return;
    const res = await fetch(`/api/representante/crm/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteDraft.trim() }),
    });
    if (res.ok) {
      const note = await res.json();
      setNotesByCrmId((cur) => ({ ...cur, [id]: [note, ...(cur[id] ?? [])] }));
      setNoteDraft("");
      patchRow(id, { last_followup_at: new Date().toISOString() } as Partial<CrmRow>);
    }
  }

  function snoozeReminder(id: string, days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(9, 0, 0, 0);
    patchRow(id, { next_reminder_at: d.toISOString() });
  }

  const trackedPartnerIds = new Set(rows.map((r) => r.partner_id).filter(Boolean) as string[]);
  const untrackedPartners = linkedPartners.filter((p) => !trackedPartnerIds.has(p.id));

  const reminderBuckets = useMemo(() => {
    const g: Record<Bucket, CrmRow[]> = { overdue: [], today: [], upcoming: [] };
    for (const r of rows) {
      if (!r.next_reminder_at) continue;
      g[bucketOf(r.next_reminder_at)].push(r);
    }
    return g;
  }, [rows]);
  const actionable = reminderBuckets.overdue.length + reminderBuckets.today.length;

  // Strategy funnel: how relationships progress contato → reunião → especificou
  // → ativo, plus value generated and how many have stalled.
  const metrics = useMemo(() => {
    const total = rows.length;
    const byStage: Record<Stage, number> = {
      novo_contato: 0, reuniao_agendada: 0, reuniao_realizada: 0, acompanhamento: 0, ativo: 0, inativo: 0,
    };
    let met = 0, specified = 0, active = 0, value = 0, projects = 0, stalled = 0;
    const advanced: Stage[] = ["reuniao_realizada", "acompanhamento", "ativo"];
    for (const r of rows) {
      byStage[r.stage]++;
      if (r.meeting_happened_at || advanced.includes(r.stage)) met++;
      if (r.has_specified) specified++;
      if (r.stage === "ativo") active++;
      value += r.total_generated || 0;
      projects += r.projects_count || 0;
      if (r.stage !== "inativo" && (daysSince(r.last_followup_at || r.first_contact_at) ?? 0) >= 30) stalled++;
    }
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
    return {
      total, byStage, met, specified, active, value, projects, stalled,
      rateMet: pct(met, total),
      rateSpecified: pct(specified, met),
      rateActive: pct(active, total),
    };
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (stageFilter !== "all" && r.stage !== stageFilter) return false;
      if (q && !r.partner.name.toLowerCase().includes(q)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "value":
          return b.total_generated - a.total_generated;
        case "name":
          return a.partner.name.localeCompare(b.partner.name);
        case "overdue": {
          const av = a.next_reminder_at ? new Date(a.next_reminder_at).getTime() : Infinity;
          const bv = b.next_reminder_at ? new Date(b.next_reminder_at).getTime() : Infinity;
          return av - bv;
        }
        case "activity":
        default: {
          const av = a.last_followup_at || a.updated_at || "";
          const bv = b.last_followup_at || b.updated_at || "";
          return bv.localeCompare(av);
        }
      }
    });
    return list;
  }, [rows, search, stageFilter, sortKey]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Meu CRM</h2>
          {actionable > 0 && (
            <span className="bg-red-100 text-red-700 text-[10px] font-bold font-[var(--font-inter)] tracking-wider px-2 py-0.5">
              {actionable} follow-up{actionable !== 1 ? "s" : ""} pendente{actionable !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {addMode === "none" && (
            <>
              <button onClick={() => setAddMode("prospect")}
                className="border border-[#002045] text-[#002045] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 hover:bg-[#002045] hover:text-white transition-colors">
                + Prospecto
              </button>
              {untrackedPartners.length > 0 && (
                <button onClick={() => setAddMode("partner")}
                  className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 hover:bg-[#1a365d] transition-colors">
                  + Parceiro
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add a registered partner */}
      {addMode === "partner" && (
        <div className="bg-white border border-[#e2e2e2] px-4 py-3 mb-5 flex flex-wrap items-center gap-2">
          <select value={addPartnerId} onChange={(e) => setAddPartnerId(e.target.value)}
            className="border border-[#e2e2e2] px-3 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
            <option value="">Selecione um parceiro vinculado...</option>
            {untrackedPartners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={addPartner} disabled={!addPartnerId || adding}
            className="bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] px-4 py-2 hover:bg-[#1a365d] disabled:opacity-50">
            Adicionar
          </button>
          <button onClick={() => { setAddMode("none"); setAddPartnerId(""); }}
            className="text-[#74777f] text-xs font-[var(--font-inter)] px-2 py-2 hover:text-[#002045]">Cancelar</button>
        </div>
      )}

      {/* Add an inline prospect */}
      {addMode === "prospect" && (
        <div className="bg-white border border-[#e2e2e2] px-4 py-3 mb-5 flex flex-wrap items-center gap-2">
          <input value={prospectName} onChange={(e) => setProspectName(e.target.value)} autoFocus
            placeholder="Nome do prospecto"
            className="border border-[#e2e2e2] px-3 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
          <input value={prospectPhone} onChange={(e) => setProspectPhone(e.target.value)} inputMode="tel"
            placeholder="WhatsApp (opcional)"
            className="border border-[#e2e2e2] px-3 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
          <button onClick={addProspect} disabled={!prospectName.trim() || adding}
            className="bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] px-4 py-2 hover:bg-[#1a365d] disabled:opacity-50">
            Adicionar
          </button>
          <button onClick={() => { setAddMode("none"); setProspectName(""); setProspectPhone(""); }}
            className="text-[#74777f] text-xs font-[var(--font-inter)] px-2 py-2 hover:text-[#002045]">Cancelar</button>
        </div>
      )}

      {/* Reminders strip */}
      {actionable > 0 && (
        <div className="bg-white border border-[#e2e2e2] border-l-4 border-l-red-500 px-5 py-4 mb-6">
          <p className="text-[11px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] text-red-700 mb-2">
            Follow-ups para hoje / atrasados
          </p>
          <div className="space-y-1.5">
            {[...reminderBuckets.overdue, ...reminderBuckets.today].map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 text-xs font-[var(--font-inter)]">
                <span className="text-[#002045] font-semibold">{r.partner.name}</span>
                <span className="text-[#74777f]">{r.reminder_note || "Follow-up agendado"} · {fmtDateTime(r.next_reminder_at!)}</span>
                <button onClick={() => toggleExpand(r.id)} className="text-[#002045] font-bold hover:underline whitespace-nowrap">Ver →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy funnel metrics */}
      {rows.length > 0 && (
        <div className="bg-white border border-[#e2e2e2] px-5 py-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Relações", value: String(metrics.total), sub: `${metrics.byStage.ativo} ativos` },
              { label: "Reuniões", value: String(metrics.met), sub: `${metrics.rateMet}% do total` },
              { label: "Especificaram", value: String(metrics.specified), sub: `${metrics.rateSpecified}% das reuniões` },
              { label: "Ativos", value: String(metrics.active), sub: `${metrics.rateActive}% conversão` },
              { label: "Valor gerado", value: fmtBRL(metrics.value), sub: `${metrics.projects} projeto${metrics.projects !== 1 ? "s" : ""}` },
              { label: "Parados 30d+", value: String(metrics.stalled), sub: metrics.stalled > 0 ? "precisam atenção" : "tudo em dia" },
            ].map((m) => (
              <div key={m.label}>
                <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">{m.label}</p>
                <p className="text-[#002045] text-lg font-[var(--font-noto-serif)] mt-0.5">{m.value}</p>
                <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)]">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View toggle */}
      {rows.length > 0 && (
        <div className="flex items-center gap-1 mb-4">
          {(["list", "board"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`text-[11px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border ${view === v ? "bg-[#002045] text-white border-[#002045]" : "bg-white text-[#74777f] border-[#e2e2e2] hover:border-[#002045] hover:text-[#002045]"}`}>
              {v === "list" ? "Lista" : "Quadro"}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar: search / filter / sort */}
      {rows.length > 0 && view === "list" && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome…"
            className="flex-1 min-w-[160px] border border-[#e2e2e2] px-3 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as Stage | "all")}
            className="border border-[#e2e2e2] px-2 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
            <option value="all">Todos os estágios</option>
            {STAGE_ORDER.map((s) => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
          </select>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="border border-[#e2e2e2] px-2 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
            <option value="activity">Atividade recente</option>
            <option value="overdue">Follow-up mais próximo</option>
            <option value="value">Maior valor gerado</option>
            <option value="name">Nome (A–Z)</option>
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-[#e2e2e2] px-6 py-10 text-center">
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
            Nenhum parceiro no seu CRM ainda. Adicione um parceiro vinculado ou um prospecto acima para começar.
          </p>
        </div>
      ) : view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {STAGE_ORDER.map((stage) => {
            const colRows = rows.filter(
              (r) => r.stage === stage && (!search.trim() || r.partner.name.toLowerCase().includes(search.trim().toLowerCase()))
            );
            return (
              <div key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (draggingId) { patchRow(draggingId, { stage }); setDraggingId(null); } }}
                className="flex-shrink-0 w-[240px] bg-[#f4f5f7] border border-[#e8e8e8] rounded-sm">
                <div className="px-3 py-2 border-b border-[#e2e2e2] flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 ${STAGE_META[stage].cls}`}>{STAGE_META[stage].label}</span>
                  <span className="text-[#74777f] text-[11px] font-bold font-[var(--font-inter)]">{colRows.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[80px]">
                  {colRows.map((r) => (
                    <div key={r.id} draggable
                      onDragStart={() => setDraggingId(r.id)}
                      onDragEnd={() => setDraggingId(null)}
                      className={`bg-white border border-[#e2e2e2] px-3 py-2 cursor-grab active:cursor-grabbing ${draggingId === r.id ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[#002045] text-xs font-semibold font-[var(--font-inter)]">{r.partner.name}</p>
                        {r.is_prospect && <span className="text-[8px] font-bold px-1 py-0.5 bg-[#fde9cf] text-[#8a5a12]">Prosp.</span>}
                      </div>
                      {r.total_generated > 0 && (
                        <p className="text-[#2f5429] text-[11px] font-semibold font-[var(--font-inter)] mt-1">{fmtBRL(r.total_generated)}</p>
                      )}
                      {r.next_reminder_at && (
                        <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mt-0.5">⏰ {fmtDate(r.next_reminder_at)}</p>
                      )}
                    </div>
                  ))}
                  {colRows.length === 0 && <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)] text-center py-3">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : visibleRows.length === 0 ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhum resultado para o filtro atual.</p>
      ) : (
        <div className="space-y-4">
          {visibleRows.map((r) => {
            const expanded = expandedId === r.id;
            const stageMeta = STAGE_META[r.stage];
            const stale = r.stage !== "inativo" && (daysSince(r.last_followup_at || r.first_contact_at) ?? 0) >= 30;
            return (
              <div key={r.id} className="bg-white border border-[#e2e2e2]">
                <div className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{r.partner.name}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 ${stageMeta.cls}`}>{stageMeta.label}</span>
                        {r.is_prospect && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#fde9cf] text-[#8a5a12]">Prospecto</span>}
                        {stale && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-50 text-red-600">Parado {daysSince(r.last_followup_at || r.first_contact_at)}d</span>}
                      </div>
                      {r.partner.profession && <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-0.5">{r.partner.profession}</p>}
                      {r.partner.phone && <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-0.5">{r.partner.phone}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={r.stage} onChange={(e) => patchRow(r.id, { stage: e.target.value as Stage })}
                        className="border border-[#e2e2e2] px-2 py-1.5 text-[11px] font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
                        {STAGE_ORDER.map((s) => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
                      </select>
                      <button onClick={() => removeRow(r.id)} title="Remover do CRM" className="text-[#b42318] hover:text-[#7a1610]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Prospect inline editing */}
                  {r.is_prospect && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                      <input defaultValue={r.prospect_name ?? ""} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== r.prospect_name) patchRow(r.id, { prospect_name: v } as Partial<CrmRow>); }}
                        placeholder="Nome" className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                      <input defaultValue={r.prospect_phone ?? ""} onBlur={(e) => patchRow(r.id, { prospect_phone: e.target.value.trim() || null } as Partial<CrmRow>)}
                        placeholder="WhatsApp" className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                      <input defaultValue={r.prospect_profession ?? ""} onBlur={(e) => patchRow(r.id, { prospect_profession: e.target.value.trim() || null } as Partial<CrmRow>)}
                        placeholder="Profissão" className="border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mb-4">
                    <DateField label="1º contato" value={r.first_contact_at} onChange={(iso) => patchRow(r.id, { first_contact_at: iso })} />
                    <DateField label="Reunião realizada" value={r.meeting_happened_at} onChange={(iso) => patchRow(r.id, { meeting_happened_at: iso })} />
                    <DateField label="Último follow-up" value={r.last_followup_at} onChange={(iso) => patchRow(r.id, { last_followup_at: iso })} />
                    <div>
                      <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">Gerado / projetos</p>
                      <p className="text-[#002045] text-xs font-semibold font-[var(--font-inter)] mt-1">
                        {r.total_generated > 0 ? `${fmtBRL(r.total_generated)} · ${r.projects_count}` : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <label className="flex items-center gap-2 text-xs font-[var(--font-inter)] text-[#43474e] cursor-pointer">
                      <input type="checkbox" checked={r.mostruario_sent} onChange={(e) => patchRow(r.id, { mostruario_sent: e.target.checked })} />
                      Mostruário enviado{r.mostruario_sent && r.mostruario_sent_at ? ` (${fmtDate(r.mostruario_sent_at)})` : ""}
                    </label>
                    <label className="flex items-center gap-2 text-xs font-[var(--font-inter)] text-[#43474e] cursor-pointer">
                      <input type="checkbox" checked={r.has_specified} onChange={(e) => patchRow(r.id, { has_specified: e.target.checked })} />
                      Especificou Orbital{r.has_specified && r.last_specified_at ? ` (${fmtDate(r.last_specified_at)})` : ""}
                    </label>
                  </div>

                  {/* Reminder controls */}
                  <div className="flex flex-wrap items-center gap-2 mb-3 bg-[#fafafa] border border-[#f0f0f0] px-3 py-2.5">
                    <span className="text-[10px] tracking-wider uppercase font-bold font-[var(--font-inter)] text-[#74777f]">Próximo follow-up:</span>
                    <input
                      type="datetime-local"
                      value={r.next_reminder_at ? r.next_reminder_at.slice(0, 16) : ""}
                      onChange={(e) => patchRow(r.id, { next_reminder_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="border border-[#e2e2e2] px-2 py-1 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                    />
                    <select value={r.reminder_recur} onChange={(e) => patchRow(r.id, { reminder_recur: e.target.value as Recur })}
                      className="border border-[#e2e2e2] px-2 py-1 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
                      {(Object.keys(RECUR_META) as Recur[]).map((k) => <option key={k} value={k}>{RECUR_META[k]}</option>)}
                    </select>
                    <input
                      value={r.reminder_note || ""}
                      onChange={(e) => patchRow(r.id, { reminder_note: e.target.value })}
                      placeholder="Nota do lembrete"
                      className="flex-1 min-w-[120px] border border-[#e2e2e2] px-2 py-1 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                    />
                    {r.next_reminder_at && (
                      <div className="flex gap-1">
                        {[1, 7].map((d) => (
                          <button key={d} onClick={() => snoozeReminder(r.id, d)}
                            className="text-[9px] text-[#74777f] font-bold border border-[#e2e2e2] px-1.5 py-1 hover:border-[#002045] hover:text-[#002045]">
                            +{d}d
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={() => toggleExpand(r.id)} className="text-[11px] text-[#002045] font-bold font-[var(--font-inter)] hover:underline">
                    {expanded ? "Ocultar histórico ▲" : "Ver histórico e notas ▼"}
                  </button>
                </div>

                {expanded && (
                  <div className="border-t border-[#e2e2e2] px-5 py-4 bg-[#fafafa]">
                    <ScheduleMeeting
                      row={r}
                      salesRepId={salesRepId}
                      onScheduled={(iso) => {
                        patchRow(r.id, { stage: "reuniao_agendada", next_reminder_at: iso });
                        const sysNote: Note = { id: `tmp-${Date.now()}`, kind: "meeting", body: `Reunião agendada para ${fmtDateTime(iso)}`, author: null, created_at: new Date().toISOString() };
                        setNotesByCrmId((cur) => ({ ...cur, [r.id]: [sysNote, ...(cur[r.id] ?? [])] }));
                      }}
                    />
                    <div className="flex gap-2 mb-4">
                      <input
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addNote(r.id); }}
                        placeholder="Registrar uma interação ou anotação..."
                        className="flex-1 border border-[#e2e2e2] px-3 py-2 text-xs font-[var(--font-inter)] text-[#002045] bg-white focus:outline-none focus:border-[#002045]"
                      />
                      <button onClick={() => addNote(r.id)} className="bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] px-4 py-2 hover:bg-[#1a365d]">
                        Adicionar
                      </button>
                    </div>
                    {(notesByCrmId[r.id] ?? []).length === 0 ? (
                      <p className="text-[#74777f] text-xs font-[var(--font-inter)]">Nenhuma nota ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {(notesByCrmId[r.id] ?? []).map((n) => (
                          <div key={n.id} className="bg-white border border-[#f0f0f0] px-3 py-2">
                            <p className="text-[#43474e] text-xs font-[var(--font-inter)]">{n.body}</p>
                            <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)] mt-1">{fmtDateTime(n.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
