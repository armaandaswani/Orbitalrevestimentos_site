"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  type Lead,
  type LeadStatus,
  type ReminderRecur,
  RECUR_META,
} from "./LeadsTab";

// Status colours mirror LeadsTab without re-exporting the whole map.
const STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  em_negociacao: "Em negociação",
  orcamento: "Orçamento",
  ganho: "Ganho",
  perdido: "Perdido",
};

function fmtBRL(n: number | null | undefined) {
  if (n == null) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtDateTime(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

type Bucket = "overdue" | "today" | "upcoming";
const BUCKET_META: Record<Bucket, { label: string; cls: string; accent: string }> = {
  overdue: { label: "Atrasados", cls: "text-red-700", accent: "border-l-red-500" },
  today: { label: "Hoje", cls: "text-amber-700", accent: "border-l-amber-500" },
  upcoming: { label: "Próximos", cls: "text-[#002045]", accent: "border-l-[#002045]" },
};

function bucketOf(iso: string): Bucket {
  const due = new Date(iso).getTime();
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
  if (due < now.getTime()) return "overdue";
  if (due <= endOfToday) return "today";
  return "upcoming";
}

// Reminders only needs the reminder-relevant slice of a lead.
type ReminderLead = Pick<
  Lead,
  | "id" | "name" | "email" | "phone" | "source" | "status" | "partner_name"
  | "space" | "product_name" | "estimated_value" | "next_reminder_at"
  | "reminder_note" | "reminder_recur" | "last_contacted_at"
>;

export default function RemindersTab() {
  const [items, setItems] = useState<ReminderLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideUpcoming, setHideUpcoming] = useState(false);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reminders");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data)) {
        setItems(data);
      } else {
        const msg =
          res.status === 401
            ? "sessão de admin expirada (401) — faça login novamente"
            : data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : `HTTP ${res.status}`;
        setError(`Falha ao carregar lembretes: ${msg}`);
      }
    } catch (e) {
      setError(`Falha ao carregar lembretes: ${e instanceof Error ? e.message : "rede"}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // Optimistic PATCH against the shared lead route.
  async function patchReminder(id: string, patch: Partial<ReminderLead>) {
    const prev = items;
    // Apply locally; if the reminder is cleared, drop the row.
    setItems((cur) =>
      cur
        .map((l) => (l.id === id ? { ...l, ...patch } : l))
        .filter((l) => l.next_reminder_at != null)
    );
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        setItems(prev);
      }
    } catch {
      setItems(prev);
    }
  }

  function snooze(id: string, days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(9, 0, 0, 0);
    patchReminder(id, { next_reminder_at: d.toISOString() });
  }

  function complete(id: string) {
    patchReminder(id, { next_reminder_at: null, reminder_note: null });
  }

  const grouped = useMemo(() => {
    const g: Record<Bucket, ReminderLead[]> = { overdue: [], today: [], upcoming: [] };
    for (const l of items) {
      if (!l.next_reminder_at) continue;
      g[bucketOf(l.next_reminder_at)].push(l);
    }
    return g;
  }, [items]);

  const buckets: Bucket[] = hideUpcoming ? ["overdue", "today"] : ["overdue", "today", "upcoming"];
  const total = grouped.overdue.length + grouped.today.length + grouped.upcoming.length;
  const actionable = grouped.overdue.length + grouped.today.length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Lembretes</h2>
          {!loading && (
            <span className="bg-[#eef2f8] text-[#002045] text-[10px] font-bold font-[var(--font-inter)] tracking-wider px-2 py-0.5">
              {actionable} a fazer
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-[11px] text-[#74777f] font-[var(--font-inter)] cursor-pointer">
            <input type="checkbox" checked={hideUpcoming} onChange={(e) => setHideUpcoming(e.target.checked)} />
            Só pendentes
          </label>
          <button
            onClick={fetchReminders}
            className="border border-[#e2e2e2] text-[#43474e] text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-4 py-2.5 hover:border-[#002045] hover:text-[#002045] transition-colors"
          >
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando…</p>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 px-6 py-8 text-center">
          <p className="text-red-800 text-sm font-semibold font-[var(--font-inter)]">Não foi possível carregar os lembretes</p>
          <p className="text-red-700 text-xs font-[var(--font-inter)] mt-1 break-words">{error}</p>
          <button onClick={fetchReminders} className="mt-4 inline-block border border-red-300 text-red-800 px-4 py-2 text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] hover:bg-red-100">Tentar novamente</button>
        </div>
      ) : total === 0 ? (
        <div className="bg-white border border-[#e2e2e2] px-6 py-12 text-center">
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhum lembrete agendado. Defina lembretes nos leads do CRM para acompanhá-los aqui.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {buckets.map((b) => {
            const list = grouped[b];
            if (list.length === 0) return null;
            const meta = BUCKET_META[b];
            return (
              <section key={b}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className={`text-[11px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] ${meta.cls}`}>{meta.label}</h3>
                  <span className="text-[10px] text-[#b0b0b0] font-bold">{list.length}</span>
                </div>
                <div className="space-y-2">
                  {list.map((l) => (
                    <div key={l.id} className={`bg-white border border-[#e2e2e2] border-l-4 ${meta.accent} px-4 py-3`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-[#002045] text-sm">{l.name}</p>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#eef2f8] text-[#002045]">{STATUS_LABEL[l.status]}</span>
                            {l.reminder_recur && l.reminder_recur !== "none" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-800">↻ {RECUR_META[l.reminder_recur as ReminderRecur]}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#74777f] mt-0.5">
                            ⏰ {fmtDateTime(l.next_reminder_at)}
                            {l.reminder_note ? ` · ${l.reminder_note}` : ""}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-1">
                            {l.phone && <span className="text-[10px] text-[#74777f]">{l.phone}</span>}
                            {fmtBRL(l.estimated_value) && <span className="text-[10px] text-[#74777f]">{fmtBRL(l.estimated_value)}</span>}
                            {(l.space || l.product_name) && (
                              <span className="text-[10px] text-[#b0b0b0]">{[l.space, l.product_name].filter(Boolean).join(" · ")}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {l.phone && (
                            <a
                              href={`https://wa.me/55${l.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-[#128c3e] font-bold border border-[#bce7cd] px-2 py-1 hover:bg-[#eafaf0]"
                            >
                              WhatsApp
                            </a>
                          )}
                          <SnoozeMenu onSnooze={(d) => snooze(l.id, d)} />
                          <button
                            onClick={() => complete(l.id)}
                            title="Concluir lembrete"
                            className="text-[10px] text-[#002045] font-bold border border-[#e2e2e2] px-2 py-1 hover:border-[#002045]"
                          >
                            ✓ Concluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SnoozeMenu({ onSnooze }: { onSnooze: (days: number) => void }) {
  const [open, setOpen] = useState(false);
  const opts: [string, number][] = [
    ["+1 dia", 1],
    ["+3 dias", 3],
    ["+1 semana", 7],
    ["+2 semanas", 14],
  ];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="text-[10px] text-[#74777f] font-bold border border-[#e2e2e2] px-2 py-1 hover:border-[#002045] hover:text-[#002045]"
      >
        Adiar ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-10 bg-white border border-[#e2e2e2] shadow-lg min-w-[110px]">
          {opts.map(([label, days]) => (
            <button
              key={days}
              onMouseDown={() => { onSnooze(days); setOpen(false); }}
              className="block w-full text-left text-[11px] text-[#43474e] px-3 py-1.5 hover:bg-[#eef0f3]"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
