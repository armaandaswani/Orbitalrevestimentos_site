"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyState, KpiCard, PageHeader, Spinner, StatusBadge,
  btnGhost, btnPrimary, cardCls, inputCls,
} from "./ui";
import EmailDiagnostico from "./EmailDiagnostico";

/**
 * Agenda — reuniões de todos os representantes + agenda pessoal do admin, num
 * só lugar. Mostra também se os avisos (e-mail/WhatsApp) da reunião saíram,
 * e o link para assinar tudo no Google Calendar.
 */

const DIA = 24 * 60 * 60 * 1000;
const TZ = "America/Manaus";

type Invitee = { name?: string; phone?: string; email?: string };
type NotifyLog = {
  at: string;
  kind: "new" | "reschedule" | "cancel";
  emails: { to: string; role: "partner" | "rep" | "admin"; ok: boolean; error?: string }[];
  whatsapp_admin: boolean | null;
  whatsapp_empresa?: boolean | null;
};
type RepMeeting = {
  id: string;
  sales_rep_id: string;
  sales_rep_name: string | null;
  title: string;
  scheduled_at: string;
  duration_minutes: number | null;
  location: string | null;
  notes: string | null;
  invitees: Invitee[] | null;
  status: "scheduled" | "completed" | "cancelled";
  invitees_notified_at?: string | null;
  notify_log?: NotifyLog | null;
};
type AdminEvent = {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number | null;
  location: string | null;
  notes: string | null;
};

type Item =
  | { kind: "rep"; at: number; m: RepMeeting }
  | { kind: "admin"; at: number; e: AdminEvent };

type Carga = { reunioes: RepMeeting[]; eventos: AdminEvent[]; erro: boolean; agora: number };

async function carregar(): Promise<Carga> {
  const agora = Date.now();
  const from = new Date(agora - 60 * DIA).toISOString();
  const to = new Date(agora + 180 * DIA).toISOString();
  try {
    const [r, e] = await Promise.all([
      fetch(`/api/admin/rep-meetings?from=${from}&to=${to}`, { cache: "no-store" }),
      fetch(`/api/admin/events?from=${new Date(agora).toISOString()}&to=${to}`, { cache: "no-store" }),
    ]);
    return {
      reunioes: r.ok ? await r.json() : [],
      eventos: e.ok ? await e.json() : [],
      erro: !r.ok,
      agora,
    };
  } catch {
    return { reunioes: [], eventos: [], erro: true, agora };
  }
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}
function diaChave(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}
function diaRotulo(iso: string, agora: number) {
  const k = diaChave(iso);
  if (k === diaChave(new Date(agora).toISOString())) return "Hoje";
  if (k === diaChave(new Date(agora + DIA).toISOString())) return "Amanhã";
  if (k === diaChave(new Date(agora - DIA).toISOString())) return "Ontem";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit" });
}
function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function waLink(phone: string) {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.length <= 11 ? "55" + d : d}`;
}

const STATUS: Record<RepMeeting["status"], { label: string; tone: "blue" | "green" | "gray" }> = {
  scheduled: { label: "Agendada", tone: "blue" },
  completed: { label: "Realizada", tone: "green" },
  cancelled: { label: "Cancelada", tone: "gray" },
};

/** Linha "Avisos" de uma reunião: o que saiu e o que falhou. */
function Avisos({ m }: { m: RepMeeting }) {
  const log = m.notify_log;
  if (log && Array.isArray(log.emails)) {
    const admin = log.emails.find((x) => x.role === "admin");
    const falhas = log.emails.filter((x) => !x.ok);
    return (
      <div className="text-[11px] leading-relaxed">
        <span className={admin?.ok ? "text-green-700" : "text-red-600 font-semibold"}>
          {admin?.ok ? "✓ E-mail para a Orbital enviado" : "✗ E-mail para a Orbital não saiu"}
        </span>
        {log.whatsapp_admin !== null && (
          <span className={log.whatsapp_admin ? "text-green-700" : "text-red-600 font-semibold"}>
            {" · "}{log.whatsapp_admin ? "✓ WhatsApp para você" : "✗ WhatsApp para você falhou"}
          </span>
        )}
        {log.whatsapp_empresa != null && (
          <span className={log.whatsapp_empresa ? "text-green-700" : "text-red-600 font-semibold"}>
            {" · "}{log.whatsapp_empresa ? "✓ WhatsApp da empresa" : "✗ WhatsApp da empresa falhou"}
          </span>
        )}
        <span className="text-[#74777f]"> · {dataHora(log.at)}</span>
        {falhas.length > 0 && (
          <ul className="mt-1 text-red-600 break-words">
            {falhas.map((f) => (
              <li key={f.to}>{f.to}: {f.error || "falhou"}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  if (m.invitees_notified_at) {
    return (
      <p className="text-[11px] text-[#74777f]">
        Avisos disparados em {dataHora(m.invitees_notified_at)} (sem confirmação de entrega: reunião anterior à correção).
      </p>
    );
  }
  return <p className="text-[11px] text-amber-700">Nenhum aviso registrado para esta reunião.</p>;
}

function CartaoReuniao({ m }: { m: RepMeeting }) {
  const convidados = (m.invitees ?? []).filter((i) => i?.name);
  const st = STATUS[m.status] ?? STATUS.scheduled;
  return (
    <div className={`${cardCls} p-4 ${m.status === "cancelled" ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="w-14 flex-shrink-0">
          <p className="text-[#0B1F45] text-lg leading-none">{hora(m.scheduled_at)}</p>
          <p className="text-[#74777f] text-[10px] mt-1">{m.duration_minutes || 60} min</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
            <span className="text-[11px] font-semibold text-[#1F7A44]">{m.sales_rep_name ?? "Representante"}</span>
          </div>
          <p className={`text-[#0B1F45] text-sm font-semibold break-words ${m.status === "cancelled" ? "line-through" : ""}`}>{m.title}</p>
          {m.location && <p className="text-[#43474e] text-xs mt-0.5 break-words">📍 {m.location}</p>}
          {convidados.length > 0 && (
            <div className="mt-2 flex flex-col gap-0.5">
              {convidados.map((c, i) => (
                <p key={i} className="text-xs text-[#43474e] break-words">
                  {c.name}
                  {c.phone && (
                    <>
                      {" · "}
                      <a href={waLink(c.phone)} target="_blank" rel="noopener noreferrer" className="text-[#1f7a3d] font-semibold hover:underline">{c.phone}</a>
                    </>
                  )}
                  {c.email && <span className="text-[#74777f]"> · {c.email}</span>}
                </p>
              ))}
            </div>
          )}
          {m.notes && <p className="text-[#74777f] text-xs mt-2 whitespace-pre-line break-words">{m.notes}</p>}
          <div className="mt-2 pt-2 border-t border-[#f0f0f0]">
            <Avisos m={m} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CartaoEvento({ e }: { e: AdminEvent }) {
  return (
    <div className={`${cardCls} p-4 border-l-4 border-l-[#36A35C]`}>
      <div className="flex items-start gap-3">
        <div className="w-14 flex-shrink-0">
          <p className="text-[#0B1F45] text-lg leading-none">{hora(e.scheduled_at)}</p>
          <p className="text-[#74777f] text-[10px] mt-1">{e.duration_minutes || 60} min</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-[#74777f] mb-1">Minha agenda</p>
          <p className="text-[#0B1F45] text-sm font-semibold break-words">{e.title}</p>
          {e.location && <p className="text-[#43474e] text-xs mt-0.5 break-words">📍 {e.location}</p>}
          {e.notes && <p className="text-[#74777f] text-xs mt-1 whitespace-pre-line break-words">{e.notes}</p>}
        </div>
      </div>
    </div>
  );
}

/** Link secreto para assinar a agenda no Google Calendar. */
function AssinarGoogle() {
  const [url, setUrl] = useState("");
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function mostrar() {
    setAberto(true);
    if (url) return;
    const res = await fetch("/api/admin/agenda-feed", { cache: "no-store" });
    if (res.ok) setUrl((await res.json()).url);
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* o campo continua selecionável */ }
  }

  return (
    <div className={`${cardCls} p-4 mb-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[#0B1F45] text-sm font-semibold">Ver esta agenda no Google Calendar</p>
          <p className="text-[#74777f] text-xs mt-0.5">Assine uma vez na conta orbitalrevestimentos@gmail.com e as reuniões dos representantes aparecem lá sozinhas.</p>
        </div>
        {!aberto && <button type="button" onClick={mostrar} className={btnGhost}>Mostrar link</button>}
      </div>
      {aberto && (
        <div className="mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input readOnly value={url || "Carregando…"} onFocus={(ev) => ev.currentTarget.select()} className={`${inputCls} w-full font-mono text-[11px]`} aria-label="Link da agenda" />
            <button type="button" onClick={copiar} disabled={!url} className={`${btnPrimary} w-full sm:w-auto whitespace-nowrap`}>{copiado ? "Copiado ✓" : "Copiar link"}</button>
          </div>
          <ol className="mt-3 text-xs text-[#43474e] list-decimal pl-5 space-y-1">
            <li>No computador, abra o Google Agenda com a conta orbitalrevestimentos@gmail.com.</li>
            <li>Na lateral, em <strong>Outras agendas</strong>, clique em <strong>+</strong> e depois em <strong>Do URL</strong>.</li>
            <li>Cole o link e clique em <strong>Adicionar agenda</strong>. Ela aparece também no celular.</li>
          </ol>
          <p className="mt-2 text-[11px] text-[#74777f]">O Google atualiza agendas assinadas de tempos em tempos (pode levar algumas horas). Para ver na hora, use esta aba. O link é secreto: não compartilhe.</p>
        </div>
      )}
    </div>
  );
}

export default function AgendaTab() {
  const [carga, setCarga] = useState<Carga | null>(null);
  const [rep, setRep] = useState("todos");
  const [periodo, setPeriodo] = useState<"proximas" | "anteriores">("proximas");

  const aplicar = useCallback((c: Carga) => setCarga(c), []);
  useEffect(() => {
    let vivo = true;
    carregar().then((c) => { if (vivo) aplicar(c); });
    return () => { vivo = false; };
  }, [aplicar]);

  const reps = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of carga?.reunioes ?? []) m.set(r.sales_rep_id, r.sales_rep_name ?? "Representante");
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [carga]);

  const { grupos, resumo } = useMemo(() => {
    const agora = carga?.agora ?? 0;
    const inicioHoje = new Date(new Date(agora).toLocaleDateString("en-CA", { timeZone: TZ }) + "T00:00:00-04:00").getTime();
    const itens: Item[] = [
      ...(carga?.reunioes ?? [])
        .filter((m) => rep === "todos" || m.sales_rep_id === rep)
        .map((m) => ({ kind: "rep" as const, at: new Date(m.scheduled_at).getTime(), m })),
      ...(rep === "todos" || rep === "minha" ? (carga?.eventos ?? []) : [])
        .map((e) => ({ kind: "admin" as const, at: new Date(e.scheduled_at).getTime(), e })),
    ].filter((i) => rep !== "minha" || i.kind === "admin");

    const visiveis = itens
      .filter((i) => (periodo === "proximas" ? i.at >= inicioHoje : i.at < inicioHoje))
      .sort((a, b) => (periodo === "proximas" ? a.at - b.at : b.at - a.at));

    const mapa = new Map<string, Item[]>();
    for (const i of visiveis) {
      const iso = new Date(i.at).toISOString();
      const k = diaChave(iso);
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k)!.push(i);
    }

    const reunioes = (carga?.reunioes ?? []).filter((m) => m.status === "scheduled");
    const hojeFim = inicioHoje + DIA;
    return {
      grupos: [...mapa.entries()],
      resumo: {
        hoje: reunioes.filter((m) => { const t = new Date(m.scheduled_at).getTime(); return t >= inicioHoje && t < hojeFim; }).length,
        semana: reunioes.filter((m) => { const t = new Date(m.scheduled_at).getTime(); return t >= agora && t < agora + 7 * DIA; }).length,
        falhas: (carga?.reunioes ?? []).filter((m) => m.notify_log?.emails?.some((x) => x.role === "admin" && !x.ok)).length,
      },
    };
  }, [carga, rep, periodo]);

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Reuniões de todos os representantes e a sua agenda, com o status dos avisos de cada uma."
        actions={<button type="button" onClick={() => { setCarga(null); carregar().then(aplicar); }} className={btnGhost}>Atualizar</button>}
      />

      {carga === null ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : carga.erro ? (
        <EmptyState
          title="Não foi possível carregar a agenda"
          hint="Verifique a conexão e tente de novo."
          action={<button type="button" onClick={() => { setCarga(null); carregar().then(aplicar); }} className={btnGhost}>Tentar de novo</button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <KpiCard label="Hoje" value={resumo.hoje} />
            <KpiCard label="Próx. 7 dias" value={resumo.semana} />
            <KpiCard label="Aviso falhou" value={resumo.falhas} tone={resumo.falhas ? "bad" : "default"} />
          </div>

          <EmailDiagnostico />
          <AssinarGoogle />

          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <select value={rep} onChange={(e) => setRep(e.target.value)} className={`${inputCls} w-full sm:w-64`} aria-label="Filtrar por representante">
              <option value="todos">Todos</option>
              {reps.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
              <option value="minha">Só minha agenda</option>
            </select>
            <div className="flex rounded-md border border-[#e2e2e2] overflow-hidden w-full sm:w-auto" role="tablist">
              {(["proximas", "anteriores"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={periodo === p}
                  onClick={() => setPeriodo(p)}
                  className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold tracking-wide ${periodo === p ? "bg-[#0B1F45] text-white" : "bg-white text-[#43474e] hover:bg-[#EFEDE8]"}`}
                >
                  {p === "proximas" ? "Próximas" : "Anteriores (60 dias)"}
                </button>
              ))}
            </div>
          </div>

          {grupos.length === 0 ? (
            <EmptyState
              title={periodo === "proximas" ? "Nenhuma reunião agendada" : "Nenhuma reunião nos últimos 60 dias"}
              hint="As reuniões que os representantes marcam no portal aparecem aqui."
            />
          ) : (
            <div className="space-y-6">
              {grupos.map(([k, itens]) => (
                <section key={k}>
                  <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[#0B1F45] mb-2">
                    {diaRotulo(new Date(itens[0].at).toISOString(), carga.agora)}
                  </p>
                  <div className="space-y-2">
                    {itens.map((i) => (i.kind === "rep" ? <CartaoReuniao key={i.m.id} m={i.m} /> : <CartaoEvento key={`a-${i.e.id}`} e={i.e} />))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
