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
const RECUR_META: Record<Recur, string> = { none: "Não repete", daily: "Diário", weekly: "Semanal", monthly: "Mensal" };

interface CrmRow {
  id: string;
  partner_id: string;
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
  partner: { id: string; name: string; profession: string | null; phone?: string | null; email?: string | null };
  total_generated: number;
  projects_count: number;
  last_sale_at: string | null;
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

type Bucket = "overdue" | "today" | "upcoming";
function bucketOf(iso: string): Bucket {
  const due = new Date(iso).getTime();
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
  if (due < now.getTime()) return "overdue";
  if (due <= endOfToday) return "today";
  return "upcoming";
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
  const [addPartnerId, setAddPartnerId] = useState("");

  const fetchCrm = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/representante/crm?sales_rep_id=${encodeURIComponent(salesRepId)}`);
    if (res.ok) setRows(await res.json());
    setLoading(false);
  }, [salesRepId]);

  useEffect(() => {
    fetchCrm();
  }, [fetchCrm]);

  async function startTracking() {
    if (!addPartnerId) return;
    const res = await fetch("/api/representante/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sales_rep_id: salesRepId, partner_id: addPartnerId }),
    });
    if (res.ok) {
      setAddPartnerId("");
      fetchCrm();
    }
  }

  async function patchRow(id: string, patch: Partial<CrmRow>) {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const res = await fetch(`/api/representante/crm/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) fetchCrm();
    else {
      const updated = await res.json();
      setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    }
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

  const trackedPartnerIds = new Set(rows.map((r) => r.partner_id));
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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Meu CRM</h2>
          {actionable > 0 && (
            <span className="bg-red-100 text-red-700 text-[10px] font-bold font-[var(--font-inter)] tracking-wider px-2 py-0.5">
              {actionable} follow-up{actionable !== 1 ? "s" : ""} pendente{actionable !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {untrackedPartners.length > 0 && (
          <div className="flex items-center gap-2">
            <select value={addPartnerId} onChange={(e) => setAddPartnerId(e.target.value)}
              className="border border-[#e2e2e2] px-3 py-2 text-xs font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
              <option value="">Adicionar parceiro ao CRM...</option>
              {untrackedPartners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button onClick={startTracking} disabled={!addPartnerId}
              className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2 hover:bg-[#1a365d] transition-colors disabled:opacity-50">
              Adicionar
            </button>
          </div>
        )}
      </div>

      {/* Reminders strip */}
      {actionable > 0 && (
        <div className="bg-white border border-[#e2e2e2] border-l-4 border-l-red-500 px-5 py-4 mb-8">
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

      {loading ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-[#e2e2e2] px-6 py-10 text-center">
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
            Nenhum parceiro no seu CRM ainda. Adicione um parceiro vinculado acima para começar a acompanhar a relação.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const expanded = expandedId === r.id;
            const stageMeta = STAGE_META[r.stage];
            return (
              <div key={r.id} className="bg-white border border-[#e2e2e2]">
                <div className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{r.partner.name}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 ${stageMeta.cls}`}>{stageMeta.label}</span>
                      </div>
                      {r.partner.profession && <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-0.5">{r.partner.profession}</p>}
                    </div>
                    <select value={r.stage} onChange={(e) => patchRow(r.id, { stage: e.target.value as Stage })}
                      className="border border-[#e2e2e2] px-2 py-1.5 text-[11px] font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
                      {(Object.keys(STAGE_META) as Stage[]).map((s) => (
                        <option key={s} value={s}>{STAGE_META[s].label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mb-4">
                    <div>
                      <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">1º contato</p>
                      <p className="text-[#43474e] text-xs font-[var(--font-inter)] mt-0.5">{fmtDate(r.first_contact_at)}</p>
                    </div>
                    <div>
                      <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">Reunião realizada</p>
                      <p className="text-[#43474e] text-xs font-[var(--font-inter)] mt-0.5">{fmtDate(r.meeting_happened_at)}</p>
                    </div>
                    <div>
                      <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">Último follow-up</p>
                      <p className="text-[#43474e] text-xs font-[var(--font-inter)] mt-0.5">{fmtDate(r.last_followup_at)}</p>
                    </div>
                    <div>
                      <p className="text-[#74777f] text-[9px] uppercase tracking-wider font-bold font-[var(--font-inter)]">Gerado / projetos</p>
                      <p className="text-[#002045] text-xs font-semibold font-[var(--font-inter)] mt-0.5">
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
                      {(Object.keys(RECUR_META) as Recur[]).map((k) => (
                        <option key={k} value={k}>{RECUR_META[k]}</option>
                      ))}
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
