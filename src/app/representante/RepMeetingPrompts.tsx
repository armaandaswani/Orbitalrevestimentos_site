"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

/*
 * RepMeetingPrompts — proactive "a reunião aconteceu?" banners.
 *
 * When a rep opens the portal, every past-due meeting still marked `scheduled`
 * surfaces as a banner at the top with one-tap outcomes — no hunting through
 * the Agenda or CRM. Resolving a meeting updates the meeting AND advances the
 * linked CRM contact in one action:
 *
 *   Aconteceu        → meeting completed, funnel → "reunião realizada",
 *                      inline result note, follow-up reminder scheduled.
 *   Reagendar        → new date/time, re-sends the calendar invite.
 *   Não compareceu   → completed + no-show note + retry reminder.
 *   Não aconteceu    → cancelled + reschedule reminder.
 *   Outro resultado  → completed + free-text result note.
 */

const STAGE_ORDER = ["novo_contato", "reuniao_agendada", "reuniao_realizada", "acompanhamento", "ativo", "inativo"];

interface Meeting {
  id: string;
  sales_rep_id: string;
  partner_id: string | null;
  crm_id: string | null;
  title: string;
  scheduled_at: string;
  location: string | null;
  status: "scheduled" | "completed" | "cancelled";
  invitees: Array<{ name?: string; phone?: string; email?: string }>;
}

interface CrmRow {
  id: string;
  stage: string;
  partner: { name?: string | null } | null;
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Manaus", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

// Datetime-local value (local wall clock) for the reschedule input.
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export default function RepMeetingPrompts({
  salesRepId,
  repName,
  onResolved,
}: {
  salesRepId: string;
  repName?: string | null;
  onResolved?: () => void;
}) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [crmById, setCrmById] = useState<Map<string, CrmRow>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<{ id: string; mode: "aconteceu" | "reagendar" | "outro" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resultText, setResultText] = useState("");
  const [followupDays, setFollowupDays] = useState(7);
  const [rescheduleAt, setRescheduleAt] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [mRes, cRes] = await Promise.all([
        fetch(`/api/representante/meetings?sales_rep_id=${encodeURIComponent(salesRepId)}`),
        fetch(`/api/representante/crm?sales_rep_id=${encodeURIComponent(salesRepId)}`),
      ]);
      const mData = mRes.ok ? await mRes.json() : [];
      const cData = cRes.ok ? await cRes.json() : [];
      setMeetings(Array.isArray(mData) ? mData : []);
      const map = new Map<string, CrmRow>();
      for (const r of Array.isArray(cData) ? cData : []) map.set(r.id as string, r as CrmRow);
      setCrmById(map);
    } catch {
      /* best-effort — banners just won't show */
    } finally {
      setLoaded(true);
    }
  }, [salesRepId]);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 90_000);
    return () => clearInterval(t);
  }, [fetchData]);

  const pastDue = useMemo(() => {
    const now = Date.now();
    return meetings
      .filter((m) => m.status === "scheduled" && new Date(m.scheduled_at).getTime() < now && !dismissed.has(m.id))
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  }, [meetings, dismissed]);

  function contactName(m: Meeting): string {
    if (m.crm_id) {
      const c = crmById.get(m.crm_id);
      if (c?.partner?.name) return c.partner.name;
    }
    const inv = m.invitees?.find((i) => i.name)?.name;
    return inv || m.title;
  }

  const patchMeeting = (id: string, patch: Record<string, unknown>, notify: boolean) =>
    fetch(`/api/representante/meetings/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...patch, notify }),
    });

  const patchCrm = (id: string, patch: Record<string, unknown>) =>
    fetch(`/api/representante/crm/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });

  const addNote = (crmId: string, body: string, kind = "meeting") =>
    fetch(`/api/representante/crm/${crmId}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, kind, author: repName || undefined }),
    });

  function advanceStage(current: string): string {
    const target = "reuniao_realizada";
    return STAGE_ORDER.indexOf(current) >= STAGE_ORDER.indexOf(target) ? current : target;
  }

  function resetForm() {
    setExpanded(null);
    setResultText("");
    setFollowupDays(7);
    setRescheduleAt("");
  }

  function removeLocally(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
    resetForm();
    onResolved?.();
  }

  async function doAconteceu(m: Meeting) {
    setBusyId(m.id);
    try {
      await patchMeeting(m.id, { status: "completed" }, false);
      if (m.crm_id) {
        const c = crmById.get(m.crm_id);
        await patchCrm(m.crm_id, {
          stage: advanceStage(c?.stage ?? "novo_contato"),
          meeting_happened_at: m.scheduled_at,
          last_followup_at: new Date().toISOString(),
          next_reminder_at: daysFromNow(followupDays),
          reminder_note: "Follow-up pós-reunião",
        });
        const note = `Reunião realizada (${fmtWhen(m.scheduled_at)}).${resultText.trim() ? ` ${resultText.trim()}` : ""}`;
        await addNote(m.crm_id, note, "meeting");
      }
      removeLocally(m.id);
    } catch { alert("Não foi possível registrar. Tente novamente."); }
    finally { setBusyId(null); }
  }

  async function doReagendar(m: Meeting) {
    if (!rescheduleAt) return;
    setBusyId(m.id);
    try {
      const iso = new Date(rescheduleAt).toISOString();
      await patchMeeting(m.id, { scheduled_at: iso, status: "scheduled" }, true);
      if (m.crm_id) {
        await patchCrm(m.crm_id, { next_reminder_at: iso, reminder_note: "Reunião remarcada" });
        await addNote(m.crm_id, `Reunião remarcada para ${fmtWhen(iso)}.`, "meeting");
      }
      removeLocally(m.id);
    } catch { alert("Não foi possível remarcar. Tente novamente."); }
    finally { setBusyId(null); }
  }

  async function doNaoCompareceu(m: Meeting) {
    setBusyId(m.id);
    try {
      await patchMeeting(m.id, { status: "completed" }, false);
      if (m.crm_id) {
        await patchCrm(m.crm_id, { next_reminder_at: daysFromNow(2), reminder_note: "Remarcar — cliente não compareceu", last_followup_at: new Date().toISOString() });
        await addNote(m.crm_id, `Cliente não compareceu à reunião de ${fmtWhen(m.scheduled_at)}.`, "meeting");
      }
      removeLocally(m.id);
    } catch { alert("Não foi possível registrar. Tente novamente."); }
    finally { setBusyId(null); }
  }

  async function doNaoAconteceu(m: Meeting) {
    setBusyId(m.id);
    try {
      await patchMeeting(m.id, { status: "cancelled" }, false);
      if (m.crm_id) {
        await patchCrm(m.crm_id, { next_reminder_at: daysFromNow(2), reminder_note: "Reagendar reunião" });
        await addNote(m.crm_id, `Reunião de ${fmtWhen(m.scheduled_at)} não aconteceu.`, "meeting");
      }
      removeLocally(m.id);
    } catch { alert("Não foi possível registrar. Tente novamente."); }
    finally { setBusyId(null); }
  }

  async function doOutro(m: Meeting) {
    if (!resultText.trim()) return;
    setBusyId(m.id);
    try {
      await patchMeeting(m.id, { status: "completed" }, false);
      if (m.crm_id) {
        await patchCrm(m.crm_id, { last_followup_at: new Date().toISOString() });
        await addNote(m.crm_id, `Resultado da reunião (${fmtWhen(m.scheduled_at)}): ${resultText.trim()}`, "meeting");
      }
      removeLocally(m.id);
    } catch { alert("Não foi possível registrar. Tente novamente."); }
    finally { setBusyId(null); }
  }

  if (!loaded || pastDue.length === 0) return null;

  const btn = "text-[11px] font-bold font-[var(--font-inter)] px-3 py-2 border transition-colors disabled:opacity-50";

  return (
    <div className="mb-6 space-y-3">
      {pastDue.map((m) => {
        const busy = busyId === m.id;
        const exp = expanded?.id === m.id ? expanded.mode : null;
        const name = contactName(m);
        const linked = !!m.crm_id;
        return (
          <div key={m.id} className="bg-amber-50 border border-amber-300 p-4">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 text-lg leading-none mt-0.5" aria-hidden>⏰</span>
              <div className="min-w-0 flex-1">
                <p className="text-[#43331a] text-sm font-semibold font-[var(--font-inter)]">
                  Reunião com {name} — {fmtWhen(m.scheduled_at)}
                </p>
                <p className="text-[#8a6d3b] text-xs font-[var(--font-inter)] mt-0.5">
                  Já passou. O que aconteceu?{!linked && " (reunião sem contato no CRM)"}
                </p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button disabled={busy} onClick={() => { setResultText(""); setFollowupDays(7); setExpanded(exp === "aconteceu" ? null : { id: m.id, mode: "aconteceu" }); }}
                className={`${btn} bg-[#2f5429] text-white border-[#2f5429] hover:bg-[#264321]`}>Aconteceu</button>
              <button disabled={busy} onClick={() => doNaoAconteceu(m)}
                className={`${btn} bg-white text-[#8a6d3b] border-amber-300 hover:bg-amber-100`}>Não aconteceu</button>
              <button disabled={busy} onClick={() => { setRescheduleAt(toLocalInput(daysFromNow(1))); setExpanded(exp === "reagendar" ? null : { id: m.id, mode: "reagendar" }); }}
                className={`${btn} bg-white text-[#002045] border-[#002045] hover:bg-[#eef2f8]`}>Reagendar</button>
              <button disabled={busy} onClick={() => doNaoCompareceu(m)}
                className={`${btn} bg-white text-[#8a6d3b] border-amber-300 hover:bg-amber-100`}>Não compareceu</button>
              <button disabled={busy} onClick={() => { setResultText(""); setExpanded(exp === "outro" ? null : { id: m.id, mode: "outro" }); }}
                className={`${btn} bg-white text-[#74777f] border-[#e2e2e2] hover:bg-[#f5f5f3]`}>Outro resultado</button>
            </div>

            {/* Inline: Aconteceu — result + follow-up */}
            {exp === "aconteceu" && (
              <div className="mt-3 bg-white border border-amber-200 p-3 space-y-3">
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-[#74777f] mb-1 font-[var(--font-inter)]">O que rolou / próximo passo</span>
                  <textarea value={resultText} onChange={(e) => setResultText(e.target.value)} rows={2}
                    placeholder="Ex: apresentei a linha, cliente pediu orçamento para 2 ambientes…"
                    className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-[#74777f] font-[var(--font-inter)]">Lembrar de novo em</span>
                  {[2, 7, 14, 30].map((d) => (
                    <button key={d} onClick={() => setFollowupDays(d)}
                      className={`text-[11px] font-bold px-2.5 py-1 border ${followupDays === d ? "bg-[#002045] text-white border-[#002045]" : "text-[#74777f] border-[#e2e2e2] hover:border-[#002045]"}`}>{d}d</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => doAconteceu(m)}
                    className="text-xs font-bold font-[var(--font-inter)] px-4 py-2 bg-[#2f5429] text-white hover:bg-[#264321] disabled:opacity-50">
                    {busy ? "Salvando…" : linked ? "Registrar e avançar funil" : "Registrar"}
                  </button>
                  <button disabled={busy} onClick={resetForm} className="text-xs font-[var(--font-inter)] px-3 py-2 text-[#74777f] hover:text-[#002045]">Cancelar</button>
                </div>
              </div>
            )}

            {/* Inline: Reagendar */}
            {exp === "reagendar" && (
              <div className="mt-3 bg-white border border-amber-200 p-3 space-y-3">
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-[#74777f] mb-1 font-[var(--font-inter)]">Nova data e hora</span>
                  <input type="datetime-local" value={rescheduleAt} onChange={(e) => setRescheduleAt(e.target.value)}
                    className="w-full sm:w-auto border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                </label>
                <p className="text-[11px] text-[#74777f] font-[var(--font-inter)]">O convite de calendário é reenviado aos participantes.</p>
                <div className="flex gap-2">
                  <button disabled={busy || !rescheduleAt} onClick={() => doReagendar(m)}
                    className="text-xs font-bold font-[var(--font-inter)] px-4 py-2 bg-[#002045] text-white hover:bg-[#1a365d] disabled:opacity-50">
                    {busy ? "Remarcando…" : "Remarcar"}
                  </button>
                  <button disabled={busy} onClick={resetForm} className="text-xs font-[var(--font-inter)] px-3 py-2 text-[#74777f] hover:text-[#002045]">Cancelar</button>
                </div>
              </div>
            )}

            {/* Inline: Outro resultado */}
            {exp === "outro" && (
              <div className="mt-3 bg-white border border-amber-200 p-3 space-y-3">
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-[#74777f] mb-1 font-[var(--font-inter)]">Descreva o resultado</span>
                  <textarea value={resultText} onChange={(e) => setResultText(e.target.value)} rows={2}
                    className="w-full border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                </label>
                <div className="flex gap-2">
                  <button disabled={busy || !resultText.trim()} onClick={() => doOutro(m)}
                    className="text-xs font-bold font-[var(--font-inter)] px-4 py-2 bg-[#002045] text-white hover:bg-[#1a365d] disabled:opacity-50">
                    {busy ? "Salvando…" : "Registrar"}
                  </button>
                  <button disabled={busy} onClick={resetForm} className="text-xs font-[var(--font-inter)] px-3 py-2 text-[#74777f] hover:text-[#002045]">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
