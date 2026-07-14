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
  mostruario_received: boolean;
  mostruario_received_at: string | null;
  has_specified: boolean;
  last_specified_at: string | null;
  specified_count: number;
  project_added: boolean;
  project_added_at: string | null;
  project_added_count: number;
  last_followup_at: string | null;
  next_reminder_at: string | null;
  reminder_note: string | null;
  reminder_recur: Recur;
  auto_followup_enabled: boolean;
  auto_followup_message: string | null;
  auto_followup_sent_at: string | null;
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
function toDateTimeInputs(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "09:00" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "", time: "09:00" };
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}
function fromDateTimeInputs(date: string, time: string): string | null {
  if (!date) return null;
  const d = new Date(`${date}T${time || "09:00"}:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

type Bucket = "overdue" | "today" | "upcoming";
type FollowupDraft = {
  date: string;
  time: string;
  reminder_recur: Recur;
  reminder_note: string;
  auto_followup_enabled: boolean;
  auto_followup_message: string;
};

function draftFromRow(row: CrmRow): FollowupDraft {
  const reminder = toDateTimeInputs(row.next_reminder_at);
  return {
    date: reminder.date,
    time: reminder.time,
    reminder_recur: row.reminder_recur || "none",
    reminder_note: row.reminder_note || "",
    auto_followup_enabled: !!row.auto_followup_enabled,
    auto_followup_message: row.auto_followup_message || "",
  };
}

function bucketOf(iso: string): Bucket {
  const due = new Date(iso).getTime();
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
  if (due < now.getTime()) return "overdue";
  if (due <= endOfToday) return "today";
  return "upcoming";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function staleDays(row: CrmRow) {
  if (row.stage === "inativo") return null;
  const days = daysSince(row.last_followup_at || row.first_contact_at);
  return days !== null && days >= 30 ? days : null;
}

function actionSummary(row: CrmRow): { label: string; detail: string; tone: "urgent" | "today" | "normal" | "quiet" } {
  if (row.next_reminder_at) {
    const bucket = bucketOf(row.next_reminder_at);
    if (bucket === "overdue") {
      return { label: "Atrasado", detail: row.reminder_note || fmtDateTime(row.next_reminder_at), tone: "urgent" };
    }
    if (bucket === "today") {
      return { label: "Hoje", detail: row.reminder_note || fmtDateTime(row.next_reminder_at), tone: "today" };
    }
    return { label: "Próximo", detail: row.reminder_note || fmtDate(row.next_reminder_at), tone: "normal" };
  }
  const stalled = staleDays(row);
  if (stalled) return { label: "Sem contato", detail: `${stalled} dias sem follow-up`, tone: "urgent" };
  if (row.stage === "novo_contato") return { label: "Próxima ação", detail: "Agendar primeira conversa", tone: "normal" };
  if (row.stage === "reuniao_agendada") return { label: "Próxima ação", detail: "Confirmar reunião e preparar pauta", tone: "normal" };
  if (row.stage === "reuniao_realizada") return { label: "Próxima ação", detail: "Registrar especificação ou próximo passo", tone: "normal" };
  if (row.stage === "acompanhamento") return { label: "Próxima ação", detail: "Definir follow-up", tone: "normal" };
  if (row.stage === "ativo") return { label: "Relacionamento ativo", detail: "Manter aquecido", tone: "quiet" };
  return { label: "Inativo", detail: "Sem ação pendente", tone: "quiet" };
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
  const [inviteEmail, setInviteEmail] = useState(row.partner.email || row.prospect_email || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const invitePhone = row.partner.phone || row.prospect_phone || "";
  const cleanEmail = inviteEmail.trim();
  const emailDomain = cleanEmail.split("@")[1]?.toLowerCase() || "";
  const calendarMode = cleanEmail
    ? (emailDomain === "gmail.com" || emailDomain === "googlemail.com" ? "Google Calendar" : "iCal / Outlook / Apple Calendar")
    : null;
  const hasContact = !!(invitePhone || cleanEmail);

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
        invitees: [{ name: row.partner.name, phone: invitePhone, email: cleanEmail }],
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
        <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} inputMode="email" placeholder="E-mail para convite/calendário"
          className="sm:col-span-2 border border-[#e2e2e2] px-2 py-1.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
      </div>
      <div className="text-[#74777f] text-[10px] font-[var(--font-inter)] mb-2 space-y-1">
        <p>
          {hasContact
            ? `${row.partner.name} será notificado${invitePhone ? " por WhatsApp" : ""}${invitePhone && cleanEmail ? " e" : ""}${cleanEmail ? " por e-mail" : ""}.`
            : `Sem telefone/e-mail — a reunião será salva, mas ${row.partner.name} não receberá convite automático.`}
        </p>
        {cleanEmail && (
          <p>
            Calendário: {calendarMode}. Gmail recebe link do Google Calendar; outros e-mails recebem convite .ics compatível.
          </p>
        )}
      </div>
      {msg && <p className="text-red-600 text-[11px] font-[var(--font-inter)] mb-2">{msg}</p>}
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={!when || busy}
          className="bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] px-4 py-2 hover:bg-[#1a365d] disabled:opacity-50">
          {busy ? "Agendando…" : hasContact ? "Agendar e convidar" : "Agendar"}
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
  const [followupDrafts, setFollowupDrafts] = useState<Record<string, FollowupDraft>>({});
  const [savingFollowupId, setSavingFollowupId] = useState<string | null>(null);

  // Add controls
  const [addMode, setAddMode] = useState<"none" | "partner" | "prospect">("none");
  const [addPartnerId, setAddPartnerId] = useState("");
  const [prospectName, setProspectName] = useState("");
  const [prospectPhone, setProspectPhone] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
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
        prospect_email: prospectEmail.trim() || undefined,
      }),
    });
    setAdding(false);
    if (res.ok) {
      setProspectName("");
      setProspectPhone("");
      setProspectEmail("");
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
    const row = rows.find((r) => r.id === id);
    if (row) {
      setFollowupDrafts((cur) => (cur[id] ? cur : { ...cur, [id]: draftFromRow(row) }));
    }
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
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(9, 0, 0, 0);
    setFollowupDrafts((cur) => ({
      ...cur,
      [id]: {
        ...(cur[id] || draftFromRow(row)),
        ...toDateTimeInputs(d.toISOString()),
      },
    }));
  }

  function updateFollowupDraft(id: string, patch: Partial<FollowupDraft>) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setFollowupDrafts((cur) => ({ ...cur, [id]: { ...(cur[id] || draftFromRow(row)), ...patch } }));
  }

  async function saveFollowup(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const draft = followupDrafts[id] || draftFromRow(row);
    setSavingFollowupId(id);
    await patchRow(id, {
      next_reminder_at: fromDateTimeInputs(draft.date, draft.time),
      reminder_recur: draft.reminder_recur,
      reminder_note: draft.reminder_note.trim() || null,
      auto_followup_enabled: draft.auto_followup_enabled,
      auto_followup_message: draft.auto_followup_message.trim() || null,
    } as Partial<CrmRow>);
    setSavingFollowupId(null);
  }

  async function clearFollowup(id: string) {
    updateFollowupDraft(id, {
      date: "",
      time: "09:00",
      reminder_recur: "none",
      reminder_note: "",
      auto_followup_enabled: false,
      auto_followup_message: "",
    });
    await patchRow(id, {
      next_reminder_at: null,
      reminder_recur: "none",
      reminder_note: null,
      auto_followup_enabled: false,
      auto_followup_message: null,
    } as Partial<CrmRow>);
  }

  // One-tap snooze straight from the "Atenção agora" cards — persists immediately
  // (unlike snoozeReminder, which only stages a draft for the expanded editor),
  // so the rep clears an item without opening anything. Keeps the note.
  const [quickBusyId, setQuickBusyId] = useState<string | null>(null);
  async function quickSnooze(id: string, days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(9, 0, 0, 0);
    setQuickBusyId(id);
    await patchRow(id, { next_reminder_at: d.toISOString() } as Partial<CrmRow>);
    setQuickBusyId(null);
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
      if (r.has_specified || (r.specified_count || 0) > 0) specified++;
      if (r.stage === "ativo") active++;
      value += r.total_generated || 0;
      projects += Math.max(r.projects_count || 0, r.project_added_count || 0);
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

  const focusRows = useMemo(() => {
    const due = [...reminderBuckets.overdue, ...reminderBuckets.today];
    const dueIds = new Set(due.map((r) => r.id));
    const stalled = rows
      .filter((r) => !dueIds.has(r.id) && staleDays(r))
      .sort((a, b) => (staleDays(b) ?? 0) - (staleDays(a) ?? 0));
    return [...due, ...stalled].slice(0, 5);
  }, [reminderBuckets, rows]);

  const hasFilters = !!search.trim() || stageFilter !== "all" || sortKey !== "activity";

  function clearFilters() {
    setSearch("");
    setStageFilter("all");
    setSortKey("activity");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[#74777f] text-[10px] tracking-[0.16em] uppercase font-bold font-[var(--font-inter)] mb-1">
            CRM de relacionamento
          </p>
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl font-normal">
            Quem precisa de atenção agora?
          </h2>
          <p className="text-[#74777f] text-sm font-[var(--font-inter)] mt-1">
            Priorize follow-ups, avance estágio e registre a próxima conversa sem procurar em mil campos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {addMode === "none" && (
            <>
              <button onClick={() => setAddMode("prospect")}
                className="border border-[#002045] text-[#002045] text-xs tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#002045] hover:text-white transition-colors">
                Novo prospecto
              </button>
              {untrackedPartners.length > 0 && (
                <button onClick={() => setAddMode("partner")}
                  className="bg-[#002045] text-white text-xs tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:bg-[#1a365d] transition-colors">
                  Adicionar parceiro
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add a registered partner */}
      {addMode === "partner" && (
        <div className="bg-white border border-[#d7dbe3] px-4 py-4 flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[#74777f] text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mb-1.5">
              Parceiro vinculado
            </label>
          <select value={addPartnerId} onChange={(e) => setAddPartnerId(e.target.value)}
            className="w-full border border-[#d7dbe3] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
            <option value="">Selecione um parceiro vinculado...</option>
            {untrackedPartners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          </div>
          <button onClick={addPartner} disabled={!addPartnerId || adding}
            className="bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] px-5 py-3 hover:bg-[#1a365d] disabled:opacity-50">
            Adicionar
          </button>
          <button onClick={() => { setAddMode("none"); setAddPartnerId(""); }}
            className="text-[#74777f] text-xs font-[var(--font-inter)] px-2 py-3 hover:text-[#002045]">Cancelar</button>
        </div>
      )}

      {/* Add an inline prospect */}
      {addMode === "prospect" && (
        <div className="bg-white border border-[#d7dbe3] px-4 py-4 grid grid-cols-1 md:grid-cols-[1fr_200px_240px_auto_auto] gap-3 md:items-end">
          <div>
            <label className="block text-[#74777f] text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mb-1.5">
              Nome do prospecto
            </label>
          <input value={prospectName} onChange={(e) => setProspectName(e.target.value)} autoFocus
            placeholder="Nome do prospecto"
            className="w-full border border-[#d7dbe3] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
          </div>
          <div>
            <label className="block text-[#74777f] text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mb-1.5">
              WhatsApp
            </label>
          <input value={prospectPhone} onChange={(e) => setProspectPhone(e.target.value)} inputMode="tel"
            placeholder="WhatsApp (opcional)"
            className="w-full border border-[#d7dbe3] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
          </div>
          <div>
            <label className="block text-[#74777f] text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mb-1.5">
              E-mail
            </label>
          <input type="email" value={prospectEmail} onChange={(e) => setProspectEmail(e.target.value)} inputMode="email"
            placeholder="E-mail (opcional)"
            className="w-full border border-[#d7dbe3] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
          </div>
          <button onClick={addProspect} disabled={!prospectName.trim() || adding}
            className="bg-[#002045] text-white text-xs font-bold font-[var(--font-inter)] px-5 py-3 hover:bg-[#1a365d] disabled:opacity-50">
            Adicionar
          </button>
          <button onClick={() => { setAddMode("none"); setProspectName(""); setProspectPhone(""); setProspectEmail(""); }}
            className="text-[#74777f] text-xs font-[var(--font-inter)] px-2 py-3 hover:text-[#002045]">Cancelar</button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Atenção agora", value: String(focusRows.length), sub: actionable > 0 ? `${actionable} follow-up${actionable !== 1 ? "s" : ""} vencendo` : "sem urgência" },
              { label: "Relacionamentos", value: String(metrics.total), sub: `${metrics.byStage.ativo} ativos` },
              { label: "Conversão", value: `${metrics.rateActive}%`, sub: `${metrics.active} ativos de ${metrics.total}` },
              { label: "Valor gerado", value: fmtBRL(metrics.value), sub: `${metrics.projects} projeto${metrics.projects !== 1 ? "s" : ""}` },
            ].map((m) => (
              <div key={m.label} className="bg-white border border-[#e2e2e2] px-4 py-3">
                <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">{m.label}</p>
                <p className="text-[#002045] text-lg font-[var(--font-noto-serif)] mt-0.5">{m.value}</p>
                <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)]">{m.sub}</p>
              </div>
            ))}
        </div>
      )}

      {focusRows.length > 0 && (
        <div className="bg-[#fffaf2] border border-[#ead8bd] px-4 py-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[#8a5a12] text-[10px] tracking-[0.14em] uppercase font-bold font-[var(--font-inter)]">
                Atenção agora
              </p>
              <p className="text-[#5f3f0f] text-sm font-[var(--font-inter)]">
                Comece por estes contatos antes de navegar o restante do pipeline.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {focusRows.map((r) => {
              const action = actionSummary(r);
              const hasReminder = !!r.next_reminder_at;
              const busy = quickBusyId === r.id;
              return (
                <div key={r.id} className="bg-white border border-[#ead8bd] px-3 py-3">
                  <button onClick={() => toggleExpand(r.id)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)] truncate">{r.partner.name}</p>
                        <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-0.5">{action.detail}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-1 ${
                        action.tone === "urgent" ? "bg-red-100 text-red-700" :
                        action.tone === "today" ? "bg-amber-100 text-amber-800" :
                        "bg-blue-50 text-blue-800"
                      }`}>
                        {action.label}
                      </span>
                    </div>
                  </button>
                  {/* One-tap actions — no need to open the full editor */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-[#f3e8d3]">
                    {hasReminder && (
                      <>
                        <button disabled={busy} onClick={() => quickSnooze(r.id, 2)}
                          className="text-[11px] font-bold font-[var(--font-inter)] px-2.5 py-1 border border-[#d7dbe3] text-[#74777f] hover:border-[#002045] hover:text-[#002045] disabled:opacity-50">Adiar 2d</button>
                        <button disabled={busy} onClick={() => quickSnooze(r.id, 7)}
                          className="text-[11px] font-bold font-[var(--font-inter)] px-2.5 py-1 border border-[#d7dbe3] text-[#74777f] hover:border-[#002045] hover:text-[#002045] disabled:opacity-50">Adiar 7d</button>
                        <button disabled={busy} onClick={() => clearFollowup(r.id)}
                          className="text-[11px] font-bold font-[var(--font-inter)] px-2.5 py-1 border border-[#3b6934] text-[#3b6934] hover:bg-[#eafaf0] disabled:opacity-50">Concluído</button>
                      </>
                    )}
                    <button onClick={() => toggleExpand(r.id)}
                      className="text-[11px] font-bold font-[var(--font-inter)] px-2.5 py-1 border border-[#002045] text-[#002045] hover:bg-[#eef2f8] ml-auto">Abrir</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white border border-[#e2e2e2] px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 lg:items-end">
            <div>
              <label className="block text-[#74777f] text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mb-1.5">
                Buscar relacionamento
              </label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome…"
            className="w-full border border-[#d7dbe3] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
            </div>
            <div className="flex flex-wrap gap-2">
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as Stage | "all")}
            className="border border-[#d7dbe3] px-2 py-2.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
            <option value="all">Todos os estágios</option>
            {STAGE_ORDER.map((s) => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
          </select>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="border border-[#d7dbe3] px-2 py-2.5 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
            <option value="activity">Atividade recente</option>
            <option value="overdue">Follow-up mais próximo</option>
            <option value="value">Maior valor gerado</option>
            <option value="name">Nome (A–Z)</option>
          </select>
              {hasFilters && (
                <button onClick={clearFilters} className="text-[#74777f] text-xs font-bold font-[var(--font-inter)] px-3 py-2 hover:text-[#002045]">
                  Limpar
                </button>
              )}
              {(["list", "board"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={`text-[11px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 border ${view === v ? "bg-[#002045] text-white border-[#002045]" : "bg-white text-[#74777f] border-[#d7dbe3] hover:border-[#002045] hover:text-[#002045]"}`}>
                  {v === "list" ? "Lista de ação" : "Kanban do pipeline"}
                </button>
              ))}
            </div>
          </div>
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
        <div>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-2 mb-3">
          <div>
            <p className="text-[#74777f] text-[10px] tracking-[0.14em] uppercase font-bold font-[var(--font-inter)]">
              Kanban do pipeline
            </p>
            <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
              Arraste contatos entre estágios para atualizar o relacionamento.
            </p>
          </div>
          <button
            onClick={() => setView("list")}
            className="self-start lg:self-auto text-[#002045] text-xs font-bold font-[var(--font-inter)] border border-[#002045] px-3 py-2 hover:bg-[#002045] hover:text-white"
          >
            Voltar para lista
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-3 md:overflow-x-auto pb-3">
          {STAGE_ORDER.map((stage) => {
            const colRows = rows.filter(
              (r) => r.stage === stage && (!search.trim() || r.partner.name.toLowerCase().includes(search.trim().toLowerCase()))
            );
            return (
              <div key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (draggingId) { patchRow(draggingId, { stage }); setDraggingId(null); } }}
                className="w-full md:w-[280px] md:flex-shrink-0 bg-[#f4f5f7] border border-[#e8e8e8] rounded-sm">
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
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(r.specified_count || 0) > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-800">{r.specified_count} espec.</span>
                        )}
                        {(r.project_added_count || 0) > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-50 text-purple-800">{r.project_added_count} proj.</span>
                        )}
                        {!!r.mostruario_received && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-green-50 text-green-700">Mostruário ok</span>
                        )}
                      </div>
                      <div className="flex justify-end mt-2 pt-2 border-t border-[#f0f0f0]">
                        <button
                          onClick={(e) => { e.stopPropagation(); setView("list"); setExpandedId(r.id); setTimeout(() => document.getElementById(`crm-row-${r.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60); }}
                          className="text-[10px] font-bold font-[var(--font-inter)] text-[#1e5fb4] hover:underline"
                        >
                          Abrir / editar →
                        </button>
                      </div>
                    </div>
                  ))}
                  {colRows.length === 0 && <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)] text-center py-3">—</p>}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      ) : visibleRows.length === 0 ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhum resultado para o filtro atual.</p>
      ) : (
        <div className="space-y-3">
          {visibleRows.map((r) => {
            const expanded = expandedId === r.id;
            const stageMeta = STAGE_META[r.stage];
            const action = actionSummary(r);
            const stalled = staleDays(r);
            const followupDraft = followupDrafts[r.id] || draftFromRow(r);
            return (
              <div key={r.id} id={`crm-row-${r.id}`} className={`bg-white border ${expanded ? "border-[#002045]" : "border-[#e2e2e2]"}`}>
                <div className="px-4 py-4">
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_190px_160px_auto] gap-4 lg:items-center">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 shrink-0 bg-[#edf1f6] text-[#002045] flex items-center justify-center text-xs font-bold font-[var(--font-inter)]">
                        {initials(r.partner.name) || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[#002045] text-base font-semibold font-[var(--font-inter)] truncate">{r.partner.name}</p>
                          {r.is_prospect && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#fde9cf] text-[#8a5a12]">Prospecto</span>}
                          {stalled && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-50 text-red-600">Parado {stalled}d</span>}
                        </div>
                        <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-0.5">
                          {[r.partner.profession, r.partner.phone, r.partner.email].filter(Boolean).join(" · ") || "Sem profissão/telefone/e-mail cadastrado"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)] mb-1">
                        Estágio
                      </p>
                      <select value={r.stage} onChange={(e) => patchRow(r.id, { stage: e.target.value as Stage })}
                        className="w-full border border-[#d7dbe3] px-2 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
                        {STAGE_ORDER.map((s) => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
                      </select>
                    </div>

                    <div>
                      <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)] mb-1">
                        Próxima ação
                      </p>
                      <p className={`text-xs font-semibold font-[var(--font-inter)] ${
                        action.tone === "urgent" ? "text-red-700" :
                        action.tone === "today" ? "text-amber-800" :
                        "text-[#002045]"
                      }`}>
                        {action.label}
                      </p>
                      <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mt-0.5 line-clamp-2">
                        {action.detail}
                      </p>
                    </div>

                    <div className="flex flex-wrap lg:justify-end items-center gap-2">
                      <div className="text-left lg:text-right mr-auto lg:mr-2">
                        <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">Gerado</p>
                        <p className="text-[#002045] text-xs font-semibold font-[var(--font-inter)]">
                          {r.total_generated > 0 ? fmtBRL(r.total_generated) : "—"}
                        </p>
                      </div>
                      <button
                        onClick={() => snoozeReminder(r.id, 1)}
                        className="border border-[#d7dbe3] text-[#002045] text-[11px] font-bold font-[var(--font-inter)] px-3 py-2 hover:border-[#002045]"
                      >
                        Amanhã
                      </button>
                      <button
                        onClick={() => toggleExpand(r.id)}
                        className="bg-[#002045] text-white text-[11px] font-bold font-[var(--font-inter)] px-3 py-2 hover:bg-[#1a365d]"
                      >
                        {expanded ? "Fechar" : "Detalhes"}
                      </button>
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-[#e2e2e2] px-5 py-4 bg-[#fafafa]">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 ${stageMeta.cls}`}>{stageMeta.label}</span>
                        {r.mostruario_sent && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-green-50 text-green-700">Mostruário enviado</span>}
                        {!!r.mostruario_received && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-green-50 text-green-700">Mostruário recebido</span>}
                        {(!!r.has_specified || (r.specified_count || 0) > 0) && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-800">Especificou {r.specified_count || 1}x</span>}
                        {(!!r.project_added || (r.project_added_count || 0) > 0) && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-50 text-purple-800">Projeto {r.project_added_count || 1}x</span>}
                      </div>
                      <button onClick={() => removeRow(r.id)} title="Remover do CRM" className="text-[#b42318] hover:text-[#7a1610]">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                      </button>
                    </div>

                    {r.is_prospect && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                        <input defaultValue={r.prospect_name ?? ""} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== r.prospect_name) patchRow(r.id, { prospect_name: v } as Partial<CrmRow>); }}
                          placeholder="Nome" className="border border-[#e2e2e2] px-2 py-2 text-xs font-[var(--font-inter)] text-[#002045] bg-white focus:outline-none focus:border-[#002045]" />
                        <input defaultValue={r.prospect_phone ?? ""} onBlur={(e) => patchRow(r.id, { prospect_phone: e.target.value.trim() || null } as Partial<CrmRow>)}
                          placeholder="WhatsApp" className="border border-[#e2e2e2] px-2 py-2 text-xs font-[var(--font-inter)] text-[#002045] bg-white focus:outline-none focus:border-[#002045]" />
                        <input type="email" defaultValue={r.prospect_email ?? ""} onBlur={(e) => patchRow(r.id, { prospect_email: e.target.value.trim() || null } as Partial<CrmRow>)}
                          placeholder="E-mail" className="border border-[#e2e2e2] px-2 py-2 text-xs font-[var(--font-inter)] text-[#002045] bg-white focus:outline-none focus:border-[#002045]" />
                        <input defaultValue={r.prospect_profession ?? ""} onBlur={(e) => patchRow(r.id, { prospect_profession: e.target.value.trim() || null } as Partial<CrmRow>)}
                          placeholder="Profissão" className="border border-[#e2e2e2] px-2 py-2 text-xs font-[var(--font-inter)] text-[#002045] bg-white focus:outline-none focus:border-[#002045]" />
                      </div>
                    )}

                    <div className="bg-white border border-[#e2e2e2] px-3 py-3 mb-4">
                      <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)] mb-3">
                        Datas principais
                      </p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                      <DateField label="1º contato" value={r.first_contact_at} onChange={(iso) => patchRow(r.id, { first_contact_at: iso })} />
                      <DateField label="Mostruário enviado" value={r.mostruario_sent_at} onChange={(iso) => patchRow(r.id, { mostruario_sent_at: iso, mostruario_sent: !!iso })} />
                      <DateField label="Mostruário recebido" value={r.mostruario_received_at} onChange={(iso) => patchRow(r.id, { mostruario_received_at: iso, mostruario_received: !!iso })} />
                      <DateField label="Reunião realizada" value={r.meeting_happened_at} onChange={(iso) => patchRow(r.id, { meeting_happened_at: iso })} />
                      <DateField label="Último follow-up" value={r.last_followup_at} onChange={(iso) => patchRow(r.id, { last_followup_at: iso })} />
                      <DateField label="Última especificação" value={r.last_specified_at} onChange={(iso) => patchRow(r.id, { last_specified_at: iso, has_specified: !!iso || !!r.has_specified })} />
                      <DateField label="Adicionado a projeto" value={r.project_added_at} onChange={(iso) => patchRow(r.id, { project_added_at: iso, project_added: !!iso || !!r.project_added })} />
                    </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                      <div className="bg-white border border-[#e2e2e2] px-3 py-3">
                        <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)] mb-3">Mostruário</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-xs font-[var(--font-inter)] text-[#43474e] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!r.mostruario_sent}
                              onChange={(e) => patchRow(r.id, {
                                mostruario_sent: e.target.checked,
                                mostruario_sent_at: e.target.checked ? (r.mostruario_sent_at || new Date().toISOString()) : null,
                              })}
                            />
                            Enviado
                          </label>
                          <label className="flex items-center gap-2 text-xs font-[var(--font-inter)] text-[#43474e] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!r.mostruario_received}
                              onChange={(e) => patchRow(r.id, {
                                mostruario_received: e.target.checked,
                                mostruario_received_at: e.target.checked ? (r.mostruario_received_at || new Date().toISOString()) : null,
                              })}
                            />
                            Recebido pelo parceiro
                          </label>
                        </div>
                      </div>

                      <div className="bg-white border border-[#e2e2e2] px-3 py-3">
                        <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)] mb-3">Especificações</p>
                        <label className="flex items-center gap-2 text-xs font-[var(--font-inter)] text-[#43474e] cursor-pointer mb-2">
                          <input
                            type="checkbox"
                            checked={!!r.has_specified || (r.specified_count || 0) > 0}
                            onChange={(e) => patchRow(r.id, {
                              has_specified: e.target.checked,
                              specified_count: e.target.checked ? Math.max(r.specified_count || 0, 1) : 0,
                              last_specified_at: e.target.checked ? (r.last_specified_at || new Date().toISOString()) : null,
                            })}
                          />
                          Já especificou Orbital
                        </label>
                        <input
                          type="number"
                          min={0}
                          defaultValue={r.specified_count || 0}
                          onBlur={(e) => {
                            const count = Math.max(0, Number(e.target.value) || 0);
                            patchRow(r.id, {
                              specified_count: count,
                              has_specified: count > 0,
                              last_specified_at: count > 0 ? (r.last_specified_at || new Date().toISOString()) : null,
                            });
                          }}
                          className="w-full border border-[#e2e2e2] px-2 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                          placeholder="Quantas vezes?"
                        />
                      </div>

                      <div className="bg-white border border-[#e2e2e2] px-3 py-3">
                        <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)] mb-3">Projetos</p>
                        <label className="flex items-center gap-2 text-xs font-[var(--font-inter)] text-[#43474e] cursor-pointer mb-2">
                          <input
                            type="checkbox"
                            checked={!!r.project_added || (r.project_added_count || 0) > 0}
                            onChange={(e) => patchRow(r.id, {
                              project_added: e.target.checked,
                              project_added_count: e.target.checked ? Math.max(r.project_added_count || 0, 1) : 0,
                              project_added_at: e.target.checked ? (r.project_added_at || new Date().toISOString()) : null,
                            })}
                          />
                          Adicionou Orbital a projeto
                        </label>
                        <input
                          type="number"
                          min={0}
                          defaultValue={r.project_added_count || 0}
                          onBlur={(e) => {
                            const count = Math.max(0, Number(e.target.value) || 0);
                            patchRow(r.id, {
                              project_added_count: count,
                              project_added: count > 0,
                              project_added_at: count > 0 ? (r.project_added_at || new Date().toISOString()) : null,
                            });
                          }}
                          className="w-full border border-[#e2e2e2] px-2 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                          placeholder="Quantos projetos?"
                        />
                        <p className="text-[#b0b0b0] text-[10px] font-[var(--font-inter)] mt-2">
                          Orçamentos registrados: {r.projects_count || 0}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 bg-white border border-[#e2e2e2] px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">
                            Próximo follow-up
                          </p>
                          <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mt-0.5">
                            Escolha data, hora e mensagem; depois clique em salvar.
                          </p>
                        </div>
                        {r.next_reminder_at && (
                          <p className="text-[#002045] text-[11px] font-semibold font-[var(--font-inter)]">
                            Salvo: {fmtDateTime(r.next_reminder_at)}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_150px] lg:grid-cols-[180px_120px_150px_1fr_auto] gap-2">
                        <div>
                          <label className="block text-[9px] tracking-wider uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Data</label>
                          <input
                            type="date"
                            value={followupDraft.date}
                            onChange={(e) => updateFollowupDraft(r.id, { date: e.target.value })}
                            className="w-full border border-[#e2e2e2] px-2 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] tracking-wider uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Hora</label>
                          <input
                            type="time"
                            value={followupDraft.time}
                            onChange={(e) => updateFollowupDraft(r.id, { time: e.target.value })}
                            className="w-full border border-[#e2e2e2] px-2 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] tracking-wider uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Repetição</label>
                          <select value={followupDraft.reminder_recur} onChange={(e) => updateFollowupDraft(r.id, { reminder_recur: e.target.value as Recur })}
                            className="w-full border border-[#e2e2e2] px-2 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
                            {(Object.keys(RECUR_META) as Recur[]).map((k) => <option key={k} value={k}>{RECUR_META[k]}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] tracking-wider uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Nota interna</label>
                          <input
                            value={followupDraft.reminder_note}
                            onChange={(e) => updateFollowupDraft(r.id, { reminder_note: e.target.value })}
                            placeholder="Ex: enviar proposta, cobrar retorno..."
                            className="w-full border border-[#e2e2e2] px-2 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]"
                          />
                        </div>
                        <div className="flex gap-1 items-end">
                          {[1, 7].map((d) => (
                            <button key={d} onClick={() => snoozeReminder(r.id, d)}
                              className="text-[10px] text-[#74777f] font-bold border border-[#e2e2e2] px-2 py-2 hover:border-[#002045] hover:text-[#002045]">
                              +{d}d
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-[#f0f0f0] grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 items-start">
                        <label className="flex items-start gap-2 text-xs font-[var(--font-inter)] text-[#43474e] leading-5">
                          <input
                            type="checkbox"
                            checked={followupDraft.auto_followup_enabled}
                            onChange={(e) => updateFollowupDraft(r.id, { auto_followup_enabled: e.target.checked })}
                            className="mt-1 h-3.5 w-3.5 accent-[#002045]"
                          />
                          Enviar WhatsApp automático
                        </label>
                        <div>
                          <label className="block text-[9px] tracking-wider uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1">Mensagem para o parceiro</label>
                          <textarea
                            value={followupDraft.auto_followup_message}
                            onChange={(e) => updateFollowupDraft(r.id, { auto_followup_message: e.target.value })}
                            placeholder="Oi, {nome}. Tudo bem? Passando para dar sequência ao nosso contato..."
                            rows={3}
                            className="w-full border border-[#e2e2e2] px-2 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045] resize-y min-h-[76px]"
                          />
                          <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mt-1">
                            Use {"{nome}"} para preencher automaticamente o primeiro nome do parceiro.
                          </p>
                          {r.auto_followup_sent_at && (
                            <p className="text-[#74777f] text-[10px] font-[var(--font-inter)] mt-1">
                              Último envio automático: {fmtDateTime(r.auto_followup_sent_at)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => clearFollowup(r.id)}
                          className="text-[#74777f] text-[11px] font-bold font-[var(--font-inter)] px-3 py-2 hover:text-[#002045]"
                        >
                          Limpar follow-up
                        </button>
                        <button
                          type="button"
                          onClick={() => saveFollowup(r.id)}
                          disabled={savingFollowupId === r.id}
                          className="bg-[#002045] text-white text-[11px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 hover:bg-[#1a365d] disabled:opacity-50"
                        >
                          {savingFollowupId === r.id ? "Salvando..." : "Aplicar e salvar"}
                        </button>
                      </div>
                    </div>

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
