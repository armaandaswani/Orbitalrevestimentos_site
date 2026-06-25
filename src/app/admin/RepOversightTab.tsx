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
  total_generated: number;
  projects_count: number;
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
function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** Admin: team-wide funnel + full view/edit of every rep's CRM pipeline. */
export default function RepOversightTab({ reps }: { reps: RepOption[] }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [allRows, setAllRows] = useState<AllCrmRow[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [expandedRepId, setExpandedRepId] = useState<string | null>(null);
  const [partnersByRep, setPartnersByRep] = useState<Record<string, PartnerOption[]>>({});

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

  useEffect(() => {
    fetchMeetings();
    fetchAll();
  }, [fetchMeetings, fetchAll]);

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

  const upcoming = meetings.filter((m) => m.status === "scheduled");

  // Team-wide funnel across every rep.
  const team = useMemo(() => {
    const advanced = ["reuniao_realizada", "acompanhamento", "ativo"];
    let met = 0, specified = 0, active = 0, value = 0, projects = 0, stalled = 0;
    for (const r of allRows) {
      if (r.meeting_happened_at || advanced.includes(r.stage)) met++;
      if (r.has_specified) specified++;
      if (r.stage === "ativo") active++;
      value += r.total_generated || 0;
      projects += r.projects_count || 0;
      if (r.stage !== "inativo" && (daysSince(r.last_followup_at || r.first_contact_at) ?? 0) >= 30) stalled++;
    }
    const total = allRows.length;
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
    return { total, met, specified, active, value, projects, stalled, rateMet: pct(met, total), rateActive: pct(active, total) };
  }, [allRows]);

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

  return (
    <div className="mb-10">
      {/* Team funnel */}
      <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] mb-3">
        Funil da equipe — todos os representantes
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

      {/* Upcoming meetings */}
      <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] mb-3">
        Agenda dos representantes — próximos 14 dias
      </h3>
      {meetingsLoading ? (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando...</p>
      ) : upcoming.length === 0 ? (
        <div className="bg-white border border-[#e2e2e2] px-5 py-6 text-center mb-8">
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhuma reunião agendada nos próximos 14 dias.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e2e2e2] overflow-x-auto mb-8">
          <table className="w-full text-sm font-[var(--font-inter)]">
            <thead>
              <tr className="border-b border-[#e2e2e2]">
                {["Quando", "Representante", "Reunião"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcoming.map((m) => (
                <tr key={m.id} className="border-b border-[#f0f0f0]">
                  <td className="px-4 py-2.5 text-xs text-[#43474e] whitespace-nowrap">{fmtDateTime(m.scheduled_at)}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-[#002045]">{m.sales_rep_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-[#43474e]">{m.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
