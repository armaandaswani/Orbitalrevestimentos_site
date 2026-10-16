"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EmptyState, KpiCard, PageHeader, Spinner, StatusBadge,
  btnGhost, btnPrimary, btnSecondary, cardCls, inputCls,
} from "./ui";

/**
 * Atendimento IA (Ste) — conversas do WhatsApp da Orbital.
 *
 * Os dados vivem no servidor do atendente (Google Cloud); esta aba conversa com
 * ele via /api/admin/atendente/* (rota que injeta o token secreto). Daqui dá
 * para acompanhar, responder, pausar/retomar a IA por conversa, encerrar a
 * venda e aprovar o que a IA aprendeu.
 */

type Contato = {
  id: number;
  channel: string;
  external_id: string;
  name: string | null;
  stage: string;
  score: number;
  summary: string;
  profile: string;
  bot_paused: number;
  needs_human: number;
  handoff_reason: string;
  outcome: string | null;
  last_message_at: string | null;
  last_text?: string | null;
};
type Mensagem = { id: number; role: "client" | "bot" | "human"; text: string; created_at: string };
type Licao = { id: number; text: string; source: string; status: string };
type Stats = { byStage: { stage: string; n: number }[]; needsHuman: number; pendingLessons: number };
type Whats = { state: string; me?: string; mode?: string };

const ESTAGIOS: Record<string, { label: string; tone: "red" | "yellow" | "blue" | "gray" | "green" }> = {
  hot: { label: "Quente", tone: "red" },
  warm: { label: "Morno", tone: "yellow" },
  qualifying: { label: "Qualificando", tone: "blue" },
  new: { label: "Novo", tone: "gray" },
  cold: { label: "Frio", tone: "gray" },
  not_a_fit: { label: "Fora do perfil", tone: "gray" },
  spam: { label: "Spam", tone: "gray" },
};

const FILTROS: { id: string; label: string }[] = [
  { id: "", label: "Todas" },
  { id: "needs_human", label: "Precisa de você" },
  { id: "hot", label: "Quentes" },
  { id: "warm", label: "Mornos" },
  { id: "qualifying", label: "Qualificando" },
  { id: "cold", label: "Frios" },
  { id: "not_a_fit", label: "Fora do perfil" },
  { id: "spam", label: "Spam" },
];

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`/api/admin/atendente/${path}`, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `Erro ${res.status}`);
  }
  return res.json();
}

const numero = (c: Contato) => c.external_id.split("@")[0];
const nome = (c: Contato) => c.name || numero(c);

function quando(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T") + "Z");
  const hoje = new Date().toDateString() === d.toDateString();
  return d.toLocaleString("pt-BR", hoje
    ? { timeZone: "America/Manaus", hour: "2-digit", minute: "2-digit" }
    : { timeZone: "America/Manaus", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Estagio({ c }: { c: Contato }) {
  const e = ESTAGIOS[c.stage] ?? ESTAGIOS.new;
  return <StatusBadge tone={e.tone}>{e.label} · {c.score}</StatusBadge>;
}

export default function AtendimentoTab() {
  const [filtro, setFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<Contato[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [whats, setWhats] = useState<Whats | null>(null);
  const [aberto, setAberto] = useState<number | null>(null);
  const [conversa, setConversa] = useState<{ contact: Contato; messages: Mensagem[] } | null>(null);
  const [licoes, setLicoes] = useState<Licao[]>([]);
  const [verLicoes, setVerLicoes] = useState(false);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);
  const ultimaQtd = useRef(0);

  const avisar = (t: string) => {
    setAviso(t);
    window.setTimeout(() => setAviso(""), 5000);
  };

  const carregarLista = useCallback(async () => {
    try {
      const q = new URLSearchParams({ stage: filtro, q: busca });
      const [l, s, w] = await Promise.all([
        api<Contato[]>(`contacts?${q}`),
        api<Stats>("stats"),
        api<Whats>("whatsapp"),
      ]);
      setLista(l);
      setStats(s);
      setWhats(w);
      setErro("");
    } catch (e) {
      const m = (e as Error).message;
      setErro(m === "nao_configurado"
        ? "A integração ainda não foi configurada no servidor do site (ATENDENTE_API_URL / ATENDENTE_API_TOKEN)."
        : m === "atendente_offline" ? "O servidor do atendente não respondeu. Tente de novo em instantes." : m);
    }
  }, [filtro, busca]);

  const carregarConversa = useCallback(async (id: number) => {
    try {
      const c = await api<{ contact: Contato; messages: Mensagem[] }>(`contacts/${id}`);
      setConversa(c);
    } catch (e) {
      setErro((e as Error).message);
    }
  }, []);

  const carregarLicoes = useCallback(async () => {
    try {
      setLicoes(await api<Licao[]>("lessons"));
    } catch { /* aba continua funcionando sem a lista */ }
  }, []);

  // Carregamentos iniciais: o efeito só busca; o estado é aplicado no .then (padrão das outras abas).
  useEffect(() => {
    let vivo = true;
    const q = new URLSearchParams({ stage: filtro, q: busca });
    Promise.all([api<Contato[]>(`contacts?${q}`), api<Stats>("stats"), api<Whats>("whatsapp")])
      .then(([l, s, w]) => { if (vivo) { setLista(l); setStats(s); setWhats(w); } })
      .catch(() => { if (vivo) void carregarLista(); });
    return () => { vivo = false; };
  }, [filtro, busca, carregarLista]);
  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    api<{ contact: Contato; messages: Mensagem[] }>(`contacts/${aberto}`)
      .then((r) => { if (vivo) setConversa(r); })
      .catch((e) => { if (vivo) setErro((e as Error).message); });
    return () => { vivo = false; };
  }, [aberto]);
  useEffect(() => {
    if (!verLicoes) return;
    let vivo = true;
    api<Licao[]>("lessons").then((l) => { if (vivo) setLicoes(l); }).catch(() => {});
    return () => { vivo = false; };
  }, [verLicoes]);

  // Atualiza sozinho a cada 5 s enquanto a aba está visível.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.hidden) return;
      void carregarLista();
      if (aberto) void carregarConversa(aberto);
    }, 5000);
    return () => window.clearInterval(t);
  }, [aberto, carregarLista, carregarConversa]);

  // Desce para a última mensagem só quando chega mensagem nova.
  useEffect(() => {
    const qtd = conversa?.messages.length ?? 0;
    if (qtd !== ultimaQtd.current) fimRef.current?.scrollIntoView({ block: "end" });
    ultimaQtd.current = qtd;
  }, [conversa]);

  async function acao(fn: () => Promise<unknown>, ok?: string) {
    setOcupado(true);
    try {
      await fn();
      if (ok) avisar(ok);
      if (aberto) await carregarConversa(aberto);
      await carregarLista();
    } catch (e) {
      avisar(`⚠️ ${(e as Error).message}`);
    } finally {
      setOcupado(false);
    }
  }

  const c = conversa && conversa.contact.id === aberto ? conversa.contact : undefined;
  const fatos = c ? Object.entries(JSON.parse(c.profile || "{}") as Record<string, string>) : [];
  const pendentes = licoes.filter((l) => l.status === "pending");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Atendimento IA"
        subtitle={
          whats
            ? whats.state === "open"
              ? `Ste atendendo no WhatsApp ${whats.me?.split("@")[0] ?? ""}`
              : "WhatsApp desconectado — abra o app Orbital Atendente no Mac e escaneie o QR."
            : "Conversas do WhatsApp atendidas pela Ste"
        }
      />

      {erro && <div className="border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{erro}</div>}
      {aviso && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 bg-[#002045] text-white text-sm px-4 py-3 rounded-lg shadow-lg">
          {aviso}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Precisa de você" value={stats.needsHuman} tone={stats.needsHuman ? "bad" : "good"} onClick={() => setFiltro("needs_human")} />
          <KpiCard label="Quentes" value={stats.byStage.find((s) => s.stage === "hot")?.n ?? 0} tone="warn" onClick={() => setFiltro("hot")} />
          <KpiCard label="Conversas" value={stats.byStage.reduce((a, s) => a + s.n, 0)} onClick={() => setFiltro("")} />
          <KpiCard label="Aprendizados p/ aprovar" value={stats.pendingLessons} tone={stats.pendingLessons ? "warn" : "default"} onClick={() => setVerLicoes(true)} />
        </div>
      )}

      {/* Aprendizados */}
      <div className={cardCls}>
        <button
          type="button"
          onClick={() => setVerLicoes((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left"
        >
          <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f]">
            Aprendizados da IA {stats?.pendingLessons ? `· ${stats.pendingLessons} para aprovar` : ""}
          </span>
          <span className="text-[#74777f] text-xs">{verLicoes ? "Fechar" : "Abrir"}</span>
        </button>
        {verLicoes && (
          <div className="border-t border-[#f0f0f0] px-5 py-3 space-y-3">
            {licoes.length === 0 && <p className="text-sm text-[#74777f]">Nenhuma regra aprendida ainda.</p>}
            {[...pendentes, ...licoes.filter((l) => l.status !== "pending")].map((l) => (
              <div key={l.id} className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-[#f5f5f3] pb-3 last:border-0">
                <p className="flex-1 min-w-0 text-sm text-[#43474e] break-words">
                  {l.status === "pending" && <StatusBadge tone="yellow">Sugestão</StatusBadge>}{" "}
                  {l.text}
                </p>
                <div className="flex gap-2 shrink-0">
                  {l.status === "pending" ? (
                    <>
                      <button className={btnPrimary} disabled={ocupado} onClick={() => acao(() => api(`lessons/${l.id}`, { method: "POST", body: { status: "active" } }).then(carregarLicoes), "Regra aprovada.")}>Aprovar</button>
                      <button className={btnGhost} disabled={ocupado} onClick={() => acao(() => api(`lessons/${l.id}`, { method: "POST", body: { status: "rejected" } }).then(carregarLicoes))}>Recusar</button>
                    </>
                  ) : (
                    <button className={btnGhost} disabled={ocupado} onClick={() => acao(() => api(`lessons/${l.id}`, { method: "DELETE" }).then(carregarLicoes), "Regra removida.")}>Remover</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Lista */}
        <div className={`${aberto ? "hidden md:block" : ""} min-w-0 space-y-3`}>
          <div className="flex flex-wrap gap-1.5">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filtro === f.id ? "bg-[#002045] text-white border-[#002045]" : "border-[#e2e2e2] text-[#43474e] hover:border-[#002045]"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input className={inputCls} placeholder="Buscar nome, número ou resumo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <div className={`${cardCls} overflow-hidden`}>
            {lista === null ? (
              <div className="p-6 text-center"><Spinner /></div>
            ) : lista.length === 0 ? (
              <EmptyState title="Nenhuma conversa aqui" hint="As conversas aparecem assim que os clientes escrevem no WhatsApp." />
            ) : (
              <ul className="divide-y divide-[#f0f0f0] md:max-h-[70vh] md:overflow-y-auto">
                {lista.map((x) => (
                  <li key={x.id}>
                    <button
                      type="button"
                      onClick={() => setAberto(x.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-[#f5f5f3] ${aberto === x.id ? "bg-[#f5f5f3]" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm text-[#002045] truncate min-w-0">
                          {x.needs_human ? "🔔 " : ""}{nome(x)}
                        </span>
                        <span className="shrink-0"><Estagio c={x} /></span>
                      </div>
                      <p className="text-xs text-[#74777f] truncate mt-1">
                        {x.bot_paused ? "⏸ IA pausada · " : ""}{x.summary || x.last_text || ""}
                      </p>
                      <p className="text-[10px] text-[#b0b0b0] mt-0.5">{quando(x.last_message_at)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Conversa */}
        <div className={`${aberto ? "" : "hidden md:block"} min-w-0`}>
          {!aberto || !c ? (
            <div className={`${cardCls} p-8 text-center text-sm text-[#74777f]`}>
              {aberto ? <Spinner /> : "Escolha uma conversa."}
            </div>
          ) : (
            <div className={`${cardCls} flex flex-col`}>
              <div className="px-4 sm:px-5 py-4 border-b border-[#f0f0f0] space-y-3">
                <button type="button" className="md:hidden text-xs text-[#74777f]" onClick={() => { setAberto(null); setConversa(null); }}>← Voltar</button>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#002045] break-words">{nome(c)}</p>
                    <a href={`https://wa.me/${numero(c)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1f7a3d] hover:underline">
                      {numero(c)}
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Estagio c={c} />
                    {c.bot_paused ? <StatusBadge tone="gray">IA pausada</StatusBadge> : <StatusBadge tone="green">IA atendendo</StatusBadge>}
                    {c.outcome && <StatusBadge tone={c.outcome === "won" ? "green" : "red"}>{c.outcome === "won" ? "Ganho" : "Perdido"}</StatusBadge>}
                  </div>
                </div>

                {c.needs_human ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded">
                    <b>Precisa de você:</b> {c.handoff_reason || "a IA passou a conversa para você."}
                  </div>
                ) : null}
                {c.summary && <p className="text-sm text-[#43474e] break-words">{c.summary}</p>}
                {fatos.length > 0 && (
                  <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
                    {fatos.map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-[#74777f]">{k}</dt>
                        <dd className="text-[#43474e] break-words">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  {c.bot_paused ? (
                    <button className={btnPrimary} disabled={ocupado} onClick={() => acao(() => api(`contacts/${c.id}/bot`, { method: "POST", body: { paused: false } }), "A Ste voltou a atender.")}>
                      ▶ Retomar IA
                    </button>
                  ) : (
                    <button className={btnSecondary} disabled={ocupado} onClick={() => acao(() => api(`contacts/${c.id}/bot`, { method: "POST", body: { paused: true } }), "IA pausada nesta conversa.")}>
                      ⏸ Pausar IA
                    </button>
                  )}
                  {c.needs_human ? (
                    <button className={btnGhost} disabled={ocupado} onClick={() => acao(() => api(`contacts/${c.id}/resolve`, { method: "POST" }), "Marcado como resolvido.")}>✔ Resolvido</button>
                  ) : null}
                  <button className={btnGhost} disabled={ocupado} onClick={() => acao(async () => {
                    const r = await api<{ lessons: string[] }>(`contacts/${c.id}/outcome`, { method: "POST", body: { outcome: "won" } });
                    if (r.lessons.length) avisar(`Venda ganha. A IA sugeriu ${r.lessons.length} aprendizado(s) para aprovar.`);
                  }, "Venda marcada como ganha.")}>🏆 Ganho</button>
                  <button className={btnGhost} disabled={ocupado} onClick={() => acao(async () => {
                    const r = await api<{ lessons: string[] }>(`contacts/${c.id}/outcome`, { method: "POST", body: { outcome: "lost" } });
                    if (r.lessons.length) avisar(`A IA sugeriu ${r.lessons.length} aprendizado(s) para aprovar.`);
                  }, "Venda marcada como perdida.")}>✖ Perdido</button>
                </div>
              </div>

              <div className="px-3 sm:px-5 py-4 space-y-2 max-h-[60vh] overflow-y-auto bg-[#f5f5f3]">
                {(conversa?.messages ?? []).map((m) => (
                  <div key={m.id} className={`flex ${m.role === "client" ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                        m.role === "client" ? "bg-white border border-[#e2e2e2] text-[#43474e]"
                          : m.role === "bot" ? "bg-[#dff3ea] text-[#1d3a31]"
                          : "bg-[#eef2f8] text-[#002045]"
                      }`}
                    >
                      {m.text}
                      <div className="text-[10px] text-[#74777f] mt-1 flex items-center gap-2">
                        <span>{m.role === "client" ? "Cliente" : m.role === "bot" ? "Ste" : "Você"} · {quando(m.created_at)}</span>
                        {m.role === "bot" && (
                          <button
                            type="button"
                            className="text-[#1f6f5c] font-semibold hover:underline"
                            onClick={() => {
                              const certo = window.prompt("Como ela deveria ter respondido? (ela aprende com isso)", m.text);
                              if (!certo || certo === m.text) return;
                              void acao(async () => {
                                const r = await api<{ lesson: string }>(`messages/${m.id}/correct`, { method: "POST", body: { text: certo } });
                                avisar(r.lesson ? `Aprendizado sugerido: ${r.lesson}` : "Correção salva como exemplo.");
                              });
                            }}
                          >
                            ✎ corrigir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={fimRef} />
              </div>

              <form
                className="p-3 sm:p-4 border-t border-[#f0f0f0] flex flex-col sm:flex-row gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = texto.trim();
                  if (!t) return;
                  void acao(async () => {
                    await api(`contacts/${c.id}/send`, { method: "POST", body: { text: t } });
                    setTexto("");
                  }, "Enviado pelo WhatsApp. A IA pausou nesta conversa.");
                }}
              >
                <textarea
                  className={`${inputCls} min-h-[44px] resize-y`}
                  rows={2}
                  placeholder="Responder como você (a IA pausa nesta conversa)…"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                />
                <button className={`${btnPrimary} sm:self-end`} disabled={ocupado || !texto.trim()}>Enviar</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
