"use client";

import React, { useState, useEffect, useCallback } from "react";

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

interface CrmRow {
  id: string;
  stage: string;
  next_reminder_at: string | null;
  mostruario_sent: boolean;
  has_specified: boolean;
  last_followup_at: string | null;
  partner: { name: string };
}

const STAGE_LABEL: Record<string, string> = {
  novo_contato: "Novo contato",
  reuniao_agendada: "Reunião agendada",
  reuniao_realizada: "Reunião realizada",
  acompanhamento: "Acompanhamento",
  ativo: "Ativo",
  inativo: "Inativo",
};

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(s: string | null) {
  return s ? new Date(s).toLocaleDateString("pt-BR") : "—";
}

/** Read-only oversight of every rep's agenda + own-CRM pipeline. */
export default function RepOversightTab({ reps }: { reps: RepOption[] }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [pipelineByRep, setPipelineByRep] = useState<Record<string, CrmRow[]>>({});
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [expandedRepId, setExpandedRepId] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    setMeetingsLoading(true);
    const now = new Date();
    const in14d = new Date(Date.now() + 14 * 24 * 3600 * 1000);
    const res = await fetch(`/api/admin/rep-meetings?from=${now.toISOString()}&to=${in14d.toISOString()}`);
    if (res.ok) setMeetings(await res.json());
    setMeetingsLoading(false);
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  async function loadPipeline(repId: string) {
    if (pipelineByRep[repId]) {
      setExpandedRepId(expandedRepId === repId ? null : repId);
      return;
    }
    setPipelineLoading(true);
    const res = await fetch(`/api/representante/crm?sales_rep_id=${encodeURIComponent(repId)}`);
    if (res.ok) {
      const data = await res.json();
      setPipelineByRep((cur) => ({ ...cur, [repId]: data }));
    }
    setPipelineLoading(false);
    setExpandedRepId(repId);
  }

  const upcoming = meetings.filter((m) => m.status === "scheduled");

  return (
    <div className="mb-10">
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

      <h3 className="font-[var(--font-inter)] text-[10px] tracking-[0.2em] uppercase font-bold text-[#002045] mb-3">
        Pipeline de parceiros por representante
      </h3>
      <div className="bg-white border border-[#e2e2e2] divide-y divide-[#f0f0f0] mb-8">
        {reps.map((rep) => {
          const pipeline = pipelineByRep[rep.id];
          const expanded = expandedRepId === rep.id;
          return (
            <div key={rep.id}>
              <button
                onClick={() => loadPipeline(rep.id)}
                className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-[#fafafa] transition-colors"
              >
                <span className="text-sm font-semibold text-[#002045] font-[var(--font-inter)]">{rep.name}</span>
                <span className="text-[10px] text-[#74777f] font-[var(--font-inter)]">
                  {pipeline ? `${pipeline.length} parceiro${pipeline.length !== 1 ? "s" : ""}` : "Ver pipeline →"}
                </span>
              </button>
              {expanded && (
                <div className="border-t border-[#f0f0f0] overflow-x-auto">
                  {pipelineLoading && !pipeline ? (
                    <p className="text-[#74777f] text-xs font-[var(--font-inter)] px-5 py-3">Carregando...</p>
                  ) : !pipeline || pipeline.length === 0 ? (
                    <p className="text-[#74777f] text-xs font-[var(--font-inter)] px-5 py-3">Nenhum parceiro neste CRM ainda.</p>
                  ) : (
                    <table className="w-full text-sm font-[var(--font-inter)]">
                      <thead>
                        <tr className="border-b border-[#f0f0f0] bg-[#fafafa]">
                          {["Parceiro", "Estágio", "Mostruário", "Especificou", "Último follow-up", "Próx. lembrete"].map((h) => (
                            <th key={h} className="text-left px-4 py-2 text-[9px] tracking-[0.12em] uppercase font-bold text-[#74777f] whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pipeline.map((row) => (
                          <tr key={row.id} className="border-b border-[#f5f5f3]">
                            <td className="px-4 py-2 text-xs font-semibold text-[#002045]">{row.partner.name}</td>
                            <td className="px-4 py-2 text-xs text-[#43474e]">{STAGE_LABEL[row.stage] ?? row.stage}</td>
                            <td className="px-4 py-2 text-xs">{row.mostruario_sent ? "✓" : "—"}</td>
                            <td className="px-4 py-2 text-xs">{row.has_specified ? "✓" : "—"}</td>
                            <td className="px-4 py-2 text-xs text-[#43474e]">{fmtDate(row.last_followup_at)}</td>
                            <td className="px-4 py-2 text-xs text-[#43474e]">{row.next_reminder_at ? fmtDateTime(row.next_reminder_at) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
