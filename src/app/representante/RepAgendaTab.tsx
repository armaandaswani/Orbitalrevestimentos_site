"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

interface Invitee {
  name: string;
  phone: string;
  email: string;
}

interface Meeting {
  id: string;
  sales_rep_id: string;
  partner_id: string | null;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  notes: string | null;
  invitees: Invitee[];
  status: "scheduled" | "completed" | "cancelled";
}

interface PartnerOption {
  id: string;
  name: string;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const EMPTY_INVITEE: Invitee = { name: "", phone: "", email: "" };

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function isoFromDateAndTime(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr || "09:00"}:00`).toISOString();
}

export default function RepAgendaTab({
  salesRepId,
  linkedPartners,
}: {
  salesRepId: string;
  linkedPartners: PartnerOption[];
}) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fTitle, setFTitle] = useState("");
  const [fPartnerId, setFPartnerId] = useState("");
  const [fDate, setFDate] = useState("");
  const [fTime, setFTime] = useState("09:00");
  const [fDuration, setFDuration] = useState(60);
  const [fLocation, setFLocation] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [fInvitees, setFInvitees] = useState<Invitee[]>([{ ...EMPTY_INVITEE }]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/representante/meetings?sales_rep_id=${encodeURIComponent(salesRepId)}`);
    if (res.ok) setMeetings(await res.json());
    setLoading(false);
  }, [salesRepId]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  function resetForm() {
    setEditingId(null);
    setFTitle("");
    setFPartnerId("");
    setFDate("");
    setFTime("09:00");
    setFDuration(60);
    setFLocation("");
    setFNotes("");
    setFInvitees([{ ...EMPTY_INVITEE }]);
    setFormError("");
  }

  function openCreateForm(prefillDate?: Date) {
    resetForm();
    if (prefillDate) setFDate(dayKey(prefillDate));
    setFormOpen(true);
  }

  function openEditForm(m: Meeting) {
    setEditingId(m.id);
    setFTitle(m.title);
    setFPartnerId(m.partner_id || "");
    const d = new Date(m.scheduled_at);
    setFDate(dayKey(d));
    setFTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    setFDuration(m.duration_minutes);
    setFLocation(m.location || "");
    setFNotes(m.notes || "");
    setFInvitees(m.invitees.length > 0 ? m.invitees : [{ ...EMPTY_INVITEE }]);
    setFormError("");
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fTitle.trim() || !fDate) {
      setFormError("Título e data são obrigatórios.");
      return;
    }
    setSaving(true);
    setFormError("");

    const invitees = fInvitees.filter((i) => i.name.trim());
    const payload = {
      sales_rep_id: salesRepId,
      partner_id: fPartnerId || null,
      title: fTitle.trim(),
      scheduled_at: isoFromDateAndTime(fDate, fTime),
      duration_minutes: fDuration,
      location: fLocation.trim() || null,
      notes: fNotes.trim() || null,
      invitees,
    };

    const res = await fetch(
      editingId ? `/api/representante/meetings/${editingId}` : "/api/representante/meetings",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setFormError(j?.error || "Erro ao salvar reunião.");
      return;
    }
    setFormOpen(false);
    resetForm();
    fetchMeetings();
  }

  async function setStatus(id: string, status: Meeting["status"]) {
    setMeetings((cur) => cur.map((m) => (m.id === id ? { ...m, status } : m)));
    const res = await fetch(`/api/representante/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) fetchMeetings();
  }

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of meetings) {
      if (m.status === "cancelled") continue;
      const key = dayKey(new Date(m.scheduled_at));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [meetings]);

  const upcoming = useMemo(
    () =>
      meetings
        .filter((m) => m.status === "scheduled" && new Date(m.scheduled_at).getTime() >= Date.now() - 3600_000)
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
    [meetings]
  );

  const partnerName = (id: string | null) => (id ? linkedPartners.find((p) => p.id === id)?.name ?? null : null);

  // Build calendar grid cells for the viewed month.
  const gridCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [viewMonth]);

  const todayKey = dayKey(new Date());

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Agenda</h2>
        <button
          onClick={() => (formOpen && !editingId ? setFormOpen(false) : openCreateForm())}
          className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-5 py-2.5 hover:bg-[#1a365d] transition-colors"
        >
          {formOpen && !editingId ? "Cancelar" : "+ Nova reunião"}
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-white border border-[#e2e2e2] px-6 py-5 mb-8 space-y-4">
          <p className="text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f]">
            {editingId ? "Editar reunião" : "Nova reunião"}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">Título *</label>
              <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Ex: Apresentação Orbital — Studio Arq."
                className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">Parceiro (opcional)</label>
              <select value={fPartnerId} onChange={(e) => setFPartnerId(e.target.value)}
                className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]">
                <option value="">Nenhum</option>
                {linkedPartners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">Local</label>
              <input value={fLocation} onChange={(e) => setFLocation(e.target.value)} placeholder="Ex: Escritório do parceiro"
                className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">Data *</label>
              <input required type="date" value={fDate} onChange={(e) => setFDate(e.target.value)}
                className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">Hora</label>
                <input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)}
                  className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
              </div>
              <div className="w-28">
                <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">Min.</label>
                <input type="number" min={15} step={15} value={fDuration} onChange={(e) => setFDuration(Number(e.target.value) || 60)}
                  className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">Convidados</label>
            <div className="space-y-2">
              {fInvitees.map((inv, i) => (
                <div key={i} className="flex gap-2">
                  <input value={inv.name} onChange={(e) => setFInvitees((cur) => cur.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    placeholder="Nome" className="flex-1 border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                  <input value={inv.phone} onChange={(e) => setFInvitees((cur) => cur.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))}
                    placeholder="Telefone" className="w-36 border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                  <input value={inv.email} onChange={(e) => setFInvitees((cur) => cur.map((x, j) => j === i ? { ...x, email: e.target.value } : x))}
                    placeholder="E-mail" className="w-44 border border-[#e2e2e2] px-3 py-2 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
                  <button type="button" onClick={() => setFInvitees((cur) => cur.filter((_, j) => j !== i))}
                    className="text-[#74777f] hover:text-red-600 px-2" aria-label="Remover convidado">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setFInvitees((cur) => [...cur, { ...EMPTY_INVITEE }])}
              className="mt-2 text-[11px] text-[#002045] font-bold font-[var(--font-inter)] hover:underline">
              + Adicionar convidado
            </button>
          </div>

          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1.5">Notas</label>
            <textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} rows={2}
              className="w-full border border-[#e2e2e2] px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]" />
          </div>

          {formError && <p className="text-red-600 text-xs font-[var(--font-inter)]">{formError}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-6 py-2.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50">
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar reunião"}
            </button>
            <button type="button" onClick={() => { setFormOpen(false); resetForm(); }}
              className="text-[#74777f] text-xs font-[var(--font-inter)] hover:text-[#002045]">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Month grid */}
      <div className="bg-white border border-[#e2e2e2] mb-8">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#e2e2e2]">
          <button onClick={() => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="text-[#74777f] hover:text-[#002045] px-2 py-1">‹</button>
          <p className="font-[var(--font-noto-serif)] text-[#002045] text-sm font-normal capitalize">
            {viewMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
          <button onClick={() => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="text-[#74777f] hover:text-[#002045] px-2 py-1">›</button>
        </div>
        <div className="grid grid-cols-7 border-b border-[#f0f0f0]">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-[9px] tracking-wider uppercase font-bold text-[#74777f] font-[var(--font-inter)] py-2">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {gridCells.map((d, i) => {
            if (!d) return <div key={i} className="border-b border-r border-[#f5f5f3] min-h-[64px] sm:min-h-[80px]" />;
            const key = dayKey(d);
            const dayMeetings = meetingsByDay.get(key) ?? [];
            const isToday = key === todayKey;
            return (
              <button
                key={i}
                onClick={() => openCreateForm(d)}
                className={`text-left border-b border-r border-[#f5f5f3] min-h-[64px] sm:min-h-[80px] px-1.5 py-1 hover:bg-[#fafafa] transition-colors ${isToday ? "bg-[#eef2f8]" : ""}`}
              >
                <span className={`text-[11px] font-[var(--font-inter)] ${isToday ? "font-bold text-[#002045]" : "text-[#74777f]"}`}>{d.getDate()}</span>
                <div className="mt-1 space-y-0.5">
                  {dayMeetings.slice(0, 2).map((m) => (
                    <div
                      key={m.id}
                      onClick={(e) => { e.stopPropagation(); openEditForm(m); }}
                      className={`text-[9px] px-1 py-0.5 truncate font-[var(--font-inter)] ${m.status === "completed" ? "bg-green-100 text-green-800" : "bg-[#002045] text-white"}`}
                    >
                      {m.title}
                    </div>
                  ))}
                  {dayMeetings.length > 2 && (
                    <p className="text-[8px] text-[#74777f] font-[var(--font-inter)]">+{dayMeetings.length - 2}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upcoming list */}
      <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-lg font-normal mb-3">Próximas reuniões</h3>
      {loading ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
      ) : upcoming.length === 0 ? (
        <div className="bg-white border border-[#e2e2e2] px-6 py-8 text-center">
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhuma reunião agendada.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e2e2e2] divide-y divide-[#f0f0f0]">
          {upcoming.map((m) => (
            <div key={m.id} className="px-5 py-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{m.title}</p>
                <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-0.5">
                  {fmtDateTime(m.scheduled_at)} · {m.duration_minutes}min
                  {partnerName(m.partner_id) ? ` · ${partnerName(m.partner_id)}` : ""}
                  {m.location ? ` · ${m.location}` : ""}
                </p>
                {m.invitees.length > 0 && (
                  <p className="text-[#b0b0b0] text-[11px] font-[var(--font-inter)] mt-0.5">
                    Convidados: {m.invitees.map((i) => i.name).join(", ")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEditForm(m)} className="text-[10px] text-[#74777f] font-bold border border-[#e2e2e2] px-2 py-1 hover:border-[#002045] hover:text-[#002045]">Editar</button>
                <button onClick={() => setStatus(m.id, "completed")} className="text-[10px] text-[#002045] font-bold border border-[#e2e2e2] px-2 py-1 hover:border-[#002045]">✓ Concluir</button>
                <button onClick={() => setStatus(m.id, "cancelled")} className="text-[10px] text-red-700 font-bold border border-red-200 px-2 py-1 hover:bg-red-50">Cancelar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
