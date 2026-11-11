"use client";

import { useEffect, useState } from "react";
import { repPriority, type RepActivity } from "@/lib/rep-priority";

type Row = RepActivity & {
  id: string;
  partner: { name: string; profession?: string | null };
  reminder_note?: string | null;
  mostruario_sent?: boolean;
  mostruario_received?: boolean;
};

export default function RepPriorities({ repId, onOpen }: { repId: string; onOpen: (id: string) => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/representante/crm?sales_rep_id=${encodeURIComponent(repId)}`, { signal: controller.signal, cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error("CRM indisponível");
        return response.json() as Promise<Row[]>;
      })
      .then(result => { setRows(result); setError(false); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [repId, revision]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        setRevision(value => value + 1);
      }
    };
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  const scored = rows?.map(row => ({ row, priority: repPriority(row, now) })) ?? [];
  const due = scored.filter(item => item.priority.kind === "due").sort((a, b) => a.priority.due - b.priority.due);
  const newContacts = scored.filter(item => item.priority.kind === "new").sort((a, b) => (a.priority.age ?? 0) - (b.priority.age ?? 0));
  const review = scored.filter(item => item.priority.kind === "review");
  const groups = [
    { title: "Retornos pendentes", items: due },
    { title: "Primeiros contatos", items: newContacts },
    { title: "Contatos para reavaliar", items: review },
  ];
  return <section aria-labelledby="rep-priority-title" className="mb-7 overflow-hidden border border-[#dbe2ec] bg-white">
    <div className="bg-[#0B1F45] px-4 py-4 text-white sm:px-6">
      <h2 id="rep-priority-title" className="font-serif text-xl">Minha fila de hoje</h2>
    </div>
    {error ? <div className="p-4 text-sm" role="alert">Não foi possível carregar suas prioridades. <button className="min-h-11 underline" onClick={() => setRevision(value => value + 1)}>Tentar novamente</button></div>
      : rows === null ? <p className="p-4 text-sm" role="status">Carregando prioridades…</p>
      : groups.every(group => !group.items.length) ? <p className="p-4 text-sm">Sua fila está em dia.</p>
      : <div className="divide-y divide-[#dbe2ec]">{groups.filter(group => group.items.length).map(group =>
        <details key={group.title} open={group.title !== "Contatos para reavaliar"} className="px-4 py-2 sm:px-6">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[#0B1F45]">{group.title} · {group.items.length}</summary>
          <ul className="divide-y divide-[#e2e2e2]">{group.items.map(({ row, priority }) =>
            <li key={row.id}><button type="button" onClick={() => onOpen(row.id)} className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left hover:bg-slate-50">
              <span className="min-w-0 break-words">
                <strong className="block text-sm text-[#0B1F45]">{row.partner.name}</strong>
                <span className="text-xs text-[#43474e]">{priority.kind === "review" ? (priority.age === null ? "Histórico insuficiente · conferir antes de retomar" : `${priority.age} dias sem avanço registrado · reavaliar antes de retomar`) : priority.kind === "new" ? "Registrar o primeiro contato" : row.reminder_note || (row.mostruario_sent && !row.mostruario_received ? "Confirmar chegada do mostruário" : "Registrar retorno e próximo passo")}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-[#2347A0]">Abrir →</span>
            </button></li>)}</ul>
        </details>)}</div>}
  </section>;
}
