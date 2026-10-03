"use client";

import React, { useMemo, useState } from "react";

/**
 * Lista de comissões dos portais (representante e parceiro): filtros por
 * período, status e busca; agrupamento por semana / mês / ano / parceiro /
 * cliente com subtotais; ordenação; e "dar baixa" — a pessoa confirma que
 * recebeu (POST /api/comissoes/baixa).
 */

export interface ComissaoItem {
  id: string;
  amount: number;
  createdAt: string;
  saleStatus: "em_orcamento" | "concluido" | "cancelado" | null;
  paidAt: string | null;
  receivedAt: string | null;
  cancelledAt: string | null;
  partnerName: string | null;
  clientName: string | null;
  product: string | null;
  space: string | null;
}

type Situacao = "pendente" | "a_receber" | "pago" | "recebido" | "cancelada";
type Periodo = "all" | "week" | "month" | "year" | "custom";
type Grupo = "none" | "week" | "month" | "year" | "partner" | "client";
type Ordem = "recent" | "oldest" | "high" | "low" | "name";

const SITUACAO: Record<Situacao, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-yellow-50 text-yellow-700" },
  a_receber: { label: "A receber", cls: "bg-yellow-100 text-yellow-800" },
  pago: { label: "✓ Pago", cls: "bg-green-100 text-green-800" },
  recebido: { label: "✓ Recebido", cls: "bg-green-700 text-white" },
  cancelada: { label: "Cancelada", cls: "bg-red-100 text-red-700" },
};

function situacao(c: ComissaoItem): Situacao {
  if (c.cancelledAt || c.saleStatus === "cancelado") return "cancelada";
  if (c.receivedAt) return "recebido";
  if (c.saleStatus !== "concluido") return "pendente";
  return c.paidAt ? "pago" : "a_receber";
}

const DAY = 24 * 60 * 60 * 1000;
const ddmm = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const ddmmyyyy = (d: Date) => d.toLocaleDateString("pt-BR");
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Segunda-feira 00:00 da semana de `d`. */
function inicioSemana(d: Date) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

function semNome(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const selectCls =
  "w-full min-w-0 border border-[#e2e2e2] bg-white px-3 py-2.5 text-sm font-[var(--font-inter)] text-[#002045] focus:outline-none focus:border-[#002045]";
const labelCls = "block text-[9px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] mb-1";

export default function ComissoesLista({
  items,
  party,
  fmt,
  onReceivedChange,
}: {
  items: ComissaoItem[];
  party: "rep" | "partner";
  fmt: (n: number) => string;
  /** Atualiza o estado da página depois de dar baixa / desfazer. */
  onReceivedChange: (id: string, receivedAt: string | null, paidAt: string | null) => void;
}) {
  const [periodo, setPeriodo] = useState<Periodo>("all");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [base, setBase] = useState<"venda" | "recebimento">("venda");
  const [status, setStatus] = useState<"all" | Situacao | "abertas">("all");
  const [grupo, setGrupo] = useState<Grupo>("month");
  const [ordem, setOrdem] = useState<Ordem>("recent");
  const [busca, setBusca] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState("");

  const nomeDe = (c: ComissaoItem) => (party === "rep" ? c.partnerName : c.clientName) || "";
  const dataDe = (c: ComissaoItem) => (base === "recebimento" ? c.receivedAt : c.createdAt);

  const filtradas = useMemo(() => {
    const agora = new Date();
    let ini: number | null = null;
    let fim: number | null = null;
    if (periodo === "week") ini = inicioSemana(agora).getTime();
    if (periodo === "month") ini = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();
    if (periodo === "year") ini = new Date(agora.getFullYear(), 0, 1).getTime();
    if (periodo === "custom") {
      if (de) ini = new Date(`${de}T00:00:00`).getTime();
      if (ate) fim = new Date(`${ate}T00:00:00`).getTime() + DAY;
    }
    const q = semNome(busca.trim());
    return items.filter((c) => {
      const s = situacao(c);
      if (status === "all" ? s === "cancelada" : status === "abertas" ? s !== "a_receber" && s !== "pago" : s !== status) return false;
      if (ini !== null || fim !== null) {
        const d = dataDe(c);
        if (!d) return false;
        const t = new Date(d).getTime();
        if (ini !== null && t < ini) return false;
        if (fim !== null && t >= fim) return false;
      }
      if (q) {
        const alvo = [c.partnerName, c.clientName, c.product, c.space].filter(Boolean).join(" ");
        if (!semNome(alvo).includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, periodo, de, ate, base, status, busca, party]);

  const ordenadas = useMemo(() => {
    const t = (c: ComissaoItem) => new Date(dataDe(c) || c.createdAt).getTime();
    return [...filtradas].sort((a, b) => {
      switch (ordem) {
        case "oldest": return t(a) - t(b);
        case "high": return b.amount - a.amount || t(b) - t(a);
        case "low": return a.amount - b.amount || t(b) - t(a);
        case "name": return nomeDe(a).localeCompare(nomeDe(b), "pt-BR", { sensitivity: "base" }) || t(b) - t(a);
        default: return t(b) - t(a);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtradas, ordem, base, party]);

  const grupos = useMemo(() => {
    if (grupo === "none") return [{ key: "all", label: "", items: ordenadas }];
    const map = new Map<string, { key: string; label: string; sort: number | string; items: ComissaoItem[] }>();
    for (const c of ordenadas) {
      let key: string;
      let label: string;
      let sort: number | string;
      if (grupo === "partner" || grupo === "client") {
        const n = (grupo === "partner" ? c.partnerName : c.clientName) || "";
        key = semNome(n) || "~";
        label = n || (grupo === "partner" ? "Sem parceiro" : "Cliente não informado");
        sort = key;
      } else {
        const d = new Date(dataDe(c) || c.createdAt);
        if (grupo === "week") {
          const s = inicioSemana(d);
          key = ymd(s);
          label = `Semana de ${ddmm(s)} a ${ddmmyyyy(new Date(s.getTime() + 6 * DAY))}`;
          sort = s.getTime();
        } else if (grupo === "month") {
          key = `${d.getFullYear()}-${d.getMonth()}`;
          const m = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
          label = m.charAt(0).toUpperCase() + m.slice(1);
          sort = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        } else {
          key = String(d.getFullYear());
          label = key;
          sort = d.getFullYear();
        }
      }
      if (!map.has(key)) map.set(key, { key, label, sort, items: [] });
      map.get(key)!.items.push(c);
    }
    const list = [...map.values()];
    const porNome = grupo === "partner" || grupo === "client";
    list.sort((a, b) => {
      // Por nome: A–Z, ou maior total quando a ordem é por valor.
      if (porNome) {
        if (ordem === "high" || ordem === "low") {
          const ta = a.items.reduce((s, c) => s + c.amount, 0);
          const tb = b.items.reduce((s, c) => s + c.amount, 0);
          return ordem === "high" ? tb - ta : ta - tb;
        }
        return String(a.sort).localeCompare(String(b.sort), "pt-BR");
      }
      return ordem === "oldest" ? (a.sort as number) - (b.sort as number) : (b.sort as number) - (a.sort as number);
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenadas, grupo, ordem, base]);

  const resumo = useMemo(() => {
    const r = { recebido: 0, aReceber: 0, andamento: 0, total: 0, abertas: [] as ComissaoItem[] };
    for (const c of filtradas) {
      const s = situacao(c);
      if (s === "cancelada") continue;
      r.total += c.amount;
      if (s === "recebido") r.recebido += c.amount;
      else if (s === "pendente") r.andamento += c.amount;
      else { r.aReceber += c.amount; r.abertas.push(c); }
    }
    return r;
  }, [filtradas]);

  async function marcar(c: ComissaoItem, received: boolean): Promise<boolean> {
    setBusy((b) => new Set(b).add(c.id));
    try {
      const res = await fetch("/api/comissoes/baixa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coupon_use_id: c.id, received, party }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(j?.error || "Não foi possível atualizar. Tente de novo.");
        return false;
      }
      const at: string | null = j?.received_at ?? null;
      // A baixa preenche o "Pago" se a Orbital ainda não tinha marcado; desfazer volta só o que ela marcou.
      const paid = received ? c.paidAt ?? at : c.paidAt && c.paidAt === c.receivedAt ? null : c.paidAt;
      onReceivedChange(c.id, at, paid);
      return true;
    } catch {
      setErro("Sem conexão. Tente de novo.");
      return false;
    } finally {
      setBusy((b) => {
        const n = new Set(b);
        n.delete(c.id);
        return n;
      });
    }
  }

  async function darBaixa(c: ComissaoItem) {
    setErro("");
    await marcar(c, true);
  }

  async function desfazer(c: ComissaoItem) {
    if (!confirm("Desfazer a baixa desta comissão?")) return;
    setErro("");
    await marcar(c, false);
  }

  async function darBaixaEmTodas() {
    const lista = resumo.abertas;
    if (lista.length === 0) return;
    if (!confirm(`Dar baixa em ${lista.length} comissão${lista.length === 1 ? "" : "ões"} (${fmt(resumo.aReceber)})? Confirme só o que você já recebeu.`)) return;
    setErro("");
    for (const c of lista) {
      const ok = await marcar(c, true);
      if (!ok) break;
    }
  }

  const temFiltro = periodo !== "all" || status !== "all" || busca.trim() !== "";

  return (
    <div>
      {/* Resumo do que está filtrado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-white border border-[#e2e2e2] px-5 py-4">
          <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Recebido</p>
          <p className="font-serif text-green-700 text-2xl sm:text-3xl font-normal">{fmt(resumo.recebido)}</p>
        </div>
        <div className="bg-white border border-[#e2e2e2] px-5 py-4">
          <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">A receber</p>
          <p className="font-serif text-[#002045] text-2xl sm:text-3xl font-normal">{fmt(resumo.aReceber)}</p>
          <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mt-1">vendas concluídas</p>
        </div>
        <div className="bg-white border border-[#e2e2e2] px-5 py-4">
          <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">Em andamento</p>
          <p className="font-serif text-amber-600 text-2xl sm:text-3xl font-normal">{fmt(resumo.andamento)}</p>
          <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mt-1">vendas ainda não concluídas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-[#e2e2e2] px-4 py-4 mb-4 space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Período</label>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} className={selectCls}>
              <option value="all">Todo o período</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mês</option>
              <option value="year">Este ano</option>
              <option value="custom">Escolher datas</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={selectCls}>
              <option value="all">Todas (sem canceladas)</option>
              <option value="abertas">A receber + pago (sem baixa)</option>
              <option value="pendente">Pendente</option>
              <option value="a_receber">A receber</option>
              <option value="pago">Pago (sem baixa)</option>
              <option value="recebido">Recebido</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Agrupar por</label>
            <select value={grupo} onChange={(e) => setGrupo(e.target.value as Grupo)} className={selectCls}>
              <option value="none">Sem agrupar</option>
              <option value="week">Semana</option>
              <option value="month">Mês</option>
              <option value="year">Ano</option>
              {party === "rep" && <option value="partner">Parceiro</option>}
              <option value="client">Cliente</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Ordenar</label>
            <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className={selectCls}>
              <option value="recent">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="high">Maior valor</option>
              <option value="low">Menor valor</option>
              <option value="name">{party === "rep" ? "Parceiro (A–Z)" : "Cliente (A–Z)"}</option>
            </select>
          </div>
        </div>
        {periodo === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>De</label>
              <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className={selectCls} />
            </div>
            <div>
              <label className={labelCls}>Até</label>
              <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={selectCls} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className={labelCls}>Buscar</label>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={party === "rep" ? "Parceiro, cliente ou produto" : "Cliente, produto ou ambiente"}
              className={selectCls}
            />
          </div>
          <div>
            <label className={labelCls}>Datas pela</label>
            <select value={base} onChange={(e) => setBase(e.target.value as typeof base)} className={selectCls}>
              <option value="venda">Data da venda</option>
              <option value="recebimento">Data do recebimento</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-[11px] text-[#74777f] font-[var(--font-inter)]">
            {filtradas.length} comiss{filtradas.length === 1 ? "ão" : "ões"} · {fmt(resumo.total)}
            {temFiltro && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => { setPeriodo("all"); setStatus("all"); setBusca(""); }}
                  className="underline underline-offset-2 hover:text-[#002045]"
                >
                  limpar filtros
                </button>
              </>
            )}
          </p>
          {resumo.abertas.length > 1 && (
            <button
              type="button"
              onClick={darBaixaEmTodas}
              disabled={busy.size > 0}
              className="border border-[#002045] text-[#002045] text-[10px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-3 py-2 hover:bg-[#002045] hover:text-white transition-colors disabled:opacity-50"
            >
              Dar baixa nas {resumo.abertas.length} a receber
            </button>
          )}
        </div>
      </div>

      {erro && <p className="text-red-600 text-sm font-[var(--font-inter)] mb-3">{erro}</p>}

      {filtradas.length === 0 ? (
        <div className="bg-white border border-[#e2e2e2] px-6 py-10 text-center">
          <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
            {items.length === 0 ? "Nenhuma comissão registrada ainda." : "Nenhuma comissão com esses filtros."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map((g) => {
            const total = g.items.reduce((s, c) => s + (situacao(c) === "cancelada" ? 0 : c.amount), 0);
            const recebido = g.items.reduce((s, c) => s + (situacao(c) === "recebido" ? c.amount : 0), 0);
            return (
              <div key={g.key}>
                {g.label && (
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 mb-2 px-1">
                    <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">
                      {g.label} <span className="text-[#74777f] font-normal">· {g.items.length}</span>
                    </p>
                    <p className="text-xs font-[var(--font-inter)] text-[#43474e]">
                      <strong className="text-[#002045]">{fmt(total)}</strong>
                      {recebido > 0 && <span className="text-green-700"> · recebido {fmt(recebido)}</span>}
                    </p>
                  </div>
                )}
                <div className="bg-white border border-[#e2e2e2] divide-y divide-[#f0f0f0]">
                  {g.items.map((c) => {
                    const s = situacao(c);
                    const titulo = party === "rep" ? c.partnerName || "—" : c.product || "—";
                    const detalhe = (party === "rep"
                      ? [c.clientName, c.product]
                      : [c.clientName, c.space]
                    ).filter(Boolean).join(" · ");
                    const ocupado = busy.has(c.id);
                    return (
                      <div key={c.id} className="px-4 sm:px-5 py-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[#002045] text-sm font-semibold font-[var(--font-inter)] leading-tight break-words">{titulo}</p>
                          <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-0.5 break-words">
                            {detalhe ? `${detalhe} · ` : ""}venda em {ddmmyyyy(new Date(c.createdAt))}
                          </p>
                          {s === "recebido" && c.receivedAt && (
                            <p className="text-green-700 text-xs font-[var(--font-inter)] mt-1">
                              Recebido em {ddmmyyyy(new Date(c.receivedAt))} ·{" "}
                              <button type="button" disabled={ocupado} onClick={() => desfazer(c)} className="underline underline-offset-2 text-[#74777f] hover:text-[#002045] disabled:opacity-50">
                                desfazer
                              </button>
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className={`text-base font-bold font-serif ${s === "cancelada" ? "text-[#b0b0b0] line-through" : s === "pendente" ? "text-amber-600" : s === "recebido" ? "text-green-700" : "text-[#002045]"}`}>
                            {fmt(c.amount)}
                          </p>
                          <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold tracking-wide ${SITUACAO[s].cls}`}>{SITUACAO[s].label}</span>
                          {(s === "a_receber" || s === "pago") && (
                            <div className="mt-2">
                              <button
                                type="button"
                                disabled={ocupado}
                                onClick={() => darBaixa(c)}
                                className="bg-[#002045] text-white text-[10px] tracking-[0.08em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 hover:bg-[#1a365d] transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                {ocupado ? "Salvando..." : "Dar baixa"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mt-4 leading-relaxed">
        &ldquo;Dar baixa&rdquo; confirma que você recebeu a comissão. &ldquo;✓ Pago&rdquo; é quando a Orbital marcou a
        transferência e falta a sua confirmação. Só vendas concluídas podem receber baixa.
      </p>
    </div>
  );
}
