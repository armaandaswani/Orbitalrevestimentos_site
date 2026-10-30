"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EmptyState, Field, KpiCard, PageHeader, Spinner, TableShell,
  btnDanger, btnGhost, btnPrimary, cardCls, inputCls, labelCls, tdCls, thCls,
} from "./ui";
import {
  MESES, dataCurta, diasAte, digitosWhatsapp, hojeEmManaus, idade, linkBusca, linkInstagram, linkParabens,
  type Aniversario,
} from "@/lib/aniversarios";

/**
 * Aniversários — a base de profissionais (planilha importada, migração 072).
 * Hoje e os próximos 7 dias no topo, busca e filtros, edição para completar
 * Instagram e WhatsApp. O e-mail diário (5h) junta esta lista com os
 * parceiros e representantes, que já têm o aniversário no próprio cadastro.
 */

type Carga = { lista: Aniversario[]; erro: "" | "migration" | "falha" };

async function buscarLista(): Promise<Carga> {
  try {
    const res = await fetch("/api/admin/aniversarios", { cache: "no-store" });
    if (res.status === 503) return { lista: [], erro: "migration" };
    if (!res.ok) return { lista: [], erro: "falha" };
    return { lista: await res.json(), erro: "" };
  } catch {
    return { lista: [], erro: "falha" };
  }
}

type Rascunho = Partial<Aniversario> & { nome: string };
const VAZIO: Rascunho = { nome: "", dia: undefined, mes: undefined, instagram_confirmado: true };

function Contatos({ a }: { a: Aniversario }) {
  const fone = digitosWhatsapp(a.whatsapp);
  const parabens = linkParabens(a);
  const detalhe = [a.profissao, a.escritorio].filter(Boolean).join(", ");
  return (
    <div className="flex flex-col gap-1 text-xs">
      {a.instagram ? (
        <span>
          <a href={linkInstagram(a.instagram)} target="_blank" rel="noopener noreferrer" className="text-[#2347A0] font-semibold hover:underline">@{a.instagram}</a>
          {!a.instagram_confirmado && <span className="ml-1 text-[#8a5a00]">(a confirmar)</span>}
        </span>
      ) : (
        <a href={linkBusca({ nome: a.nome, detalhe }, "instagram")} target="_blank" rel="noopener noreferrer" className="text-[#8a5a00] hover:underline">Sem Instagram · buscar</a>
      )}
      {fone ? (
        <a href={parabens ?? `https://wa.me/${fone}`} target="_blank" rel="noopener noreferrer" className="text-[#1f7a3d] font-semibold hover:underline">{a.whatsapp}</a>
      ) : (
        <a href={linkBusca({ nome: a.nome, detalhe }, "whatsapp")} target="_blank" rel="noopener noreferrer" className="text-[#8a5a00] hover:underline">Sem WhatsApp · buscar</a>
      )}
    </div>
  );
}

export default function AniversariosTab() {
  const [lista, setLista] = useState<Aniversario[] | null>(null);
  const [erro, setErro] = useState<Carga["erro"]>("");
  const [busca, setBusca] = useState("");
  const [fMes, setFMes] = useState("");
  const [fFalta, setFFalta] = useState("");
  const [limite, setLimite] = useState(60);
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState<"" | "importar" | "enviar">("");
  const arquivoRef = useRef<HTMLInputElement | null>(null);
  const hoje = useMemo(() => hojeEmManaus(), []);

  const aplicar = useCallback((c: Carga) => { setLista(c.lista); setErro(c.erro); }, []);
  useEffect(() => {
    let vivo = true;
    buscarLista().then((c) => { if (vivo) aplicar(c); });
    return () => { vivo = false; };
  }, [aplicar]);
  const recarregar = () => buscarLista().then(aplicar);

  const comDias = useMemo(
    () => (lista ?? []).map((a) => ({ a, faltam: diasAte(hoje, a.dia, a.mes) })),
    [lista, hoje],
  );
  const deHoje = comDias.filter((x) => x.faltam === 0).map((x) => x.a);
  const semana = comDias.filter((x) => x.faltam > 0 && x.faltam <= 7).sort((x, y) => x.faltam - y.faltam);

  const resumo = useMemo(() => {
    const l = lista ?? [];
    return {
      total: l.length,
      semWhats: l.filter((a) => !digitosWhatsapp(a.whatsapp)).length,
      semInsta: l.filter((a) => !a.instagram).length,
      aConfirmar: l.filter((a) => a.instagram && !a.instagram_confirmado).length,
    };
  }, [lista]);

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const qDig = q.replace(/\D/g, "");
    return comDias
      .filter(({ a }) => {
        if (fMes && a.mes !== Number(fMes)) return false;
        if (fFalta === "whats" && digitosWhatsapp(a.whatsapp)) return false;
        if (fFalta === "insta" && a.instagram) return false;
        if (fFalta === "confirmar" && !(a.instagram && !a.instagram_confirmado)) return false;
        if (!q) return true;
        return (
          a.nome.toLowerCase().includes(q) ||
          (a.escritorio ?? "").toLowerCase().includes(q) ||
          (a.instagram ?? "").includes(q.replace(/^@/, "")) ||
          (a.email ?? "").toLowerCase().includes(q) ||
          (qDig.length >= 3 && (a.whatsapp ?? "").replace(/\D/g, "").includes(qDig))
        );
      })
      // Sem filtro de mês: do próximo aniversário para o mais distante.
      .sort((x, y) => (fMes ? x.a.dia - y.a.dia : x.faltam - y.faltam) || x.a.nome.localeCompare(y.a.nome, "pt-BR"))
      .map((x) => x.a);
  }, [comDias, busca, fMes, fFalta]);

  async function salvar() {
    if (!editando) return;
    setSalvando(true);
    setMsg("");
    try {
      const novo = !editando.id;
      const res = await fetch("/api/admin/aniversarios", {
        method: novo ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(novo ? {} : { id: editando.id }),
          nome: editando.nome,
          dia: editando.dia,
          mes: editando.mes,
          ano: editando.ano ?? null,
          profissao: editando.profissao ?? "",
          escritorio: editando.escritorio ?? "",
          instagram: editando.instagram ?? "",
          instagram_confirmado: !!editando.instagram_confirmado,
          whatsapp: editando.whatsapp ?? "",
          email: editando.email ?? "",
          observacoes: editando.observacoes ?? "",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);
      setLista((l) => (l ? (novo ? [...l, json] : l.map((a) => (a.id === json.id ? json : a))) : l));
      setEditando(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    if (!editando?.id || !window.confirm(`Tirar ${editando.nome} da lista de aniversários?`)) return;
    setSalvando(true);
    try {
      const res = await fetch("/api/admin/aniversarios", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editando.id }) });
      if (!res.ok) throw new Error();
      setLista((l) => (l ? l.filter((a) => a.id !== editando.id) : l));
      setEditando(null);
    } catch {
      setMsg("Não foi possível remover.");
    } finally {
      setSalvando(false);
    }
  }

  async function importar(arquivo: File) {
    setOcupado("importar");
    setMsg("");
    try {
      const csv = await arquivo.text();
      const res = await fetch("/api/admin/aniversarios/importar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);
      setMsg(`Planilha importada: ${json.novos} novos, ${json.atualizados} atualizados${json.ignoradas ? `, ${json.ignoradas} linhas sem nome ou data ignoradas` : ""}.`);
      await recarregar();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao importar.");
    } finally {
      setOcupado("");
      if (arquivoRef.current) arquivoRef.current.value = "";
    }
  }

  async function enviarAgora() {
    if (!window.confirm("Enviar agora o e-mail de aniversários de hoje para a caixa da Orbital?")) return;
    setOcupado("enviar");
    setMsg("");
    try {
      const res = await fetch("/api/admin/aniversarios/email", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);
      setMsg(`E-mail enviado para ${json.para}: ${json.hoje} hoje, ${json.proximos} nos próximos 7 dias.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao enviar.");
    } finally {
      setOcupado("");
    }
  }

  const acoes = (
    <>
      <input ref={arquivoRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); }} />
      <button type="button" onClick={() => arquivoRef.current?.click()} disabled={!!ocupado || erro === "migration"} className={btnGhost}>
        {ocupado === "importar" ? "Importando…" : "Importar planilha (CSV)"}
      </button>
      <a href="/api/admin/aniversarios/email" target="_blank" rel="noopener noreferrer" className={btnGhost}>Ver e-mail de hoje</a>
      <button type="button" onClick={enviarAgora} disabled={!!ocupado} className={btnGhost}>
        {ocupado === "enviar" ? "Enviando…" : "Enviar agora"}
      </button>
      <button type="button" onClick={() => { setMsg(""); setEditando({ ...VAZIO }); }} disabled={erro === "migration"} className={btnPrimary}>Adicionar pessoa</button>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Aniversários"
        subtitle="Profissionais da planilha, mais parceiros e representantes. Todo dia às 5h chega um e-mail com os aniversariantes do dia e dos próximos 7 dias."
        actions={acoes}
      />
      {msg && <p className="mb-4 text-xs text-[#0B1F45] bg-[#eef2f8] px-4 py-3" role="status">{msg}</p>}

      {lista === null ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : erro === "migration" ? (
        <EmptyState title="Tabela ainda não criada" hint="Rode a migração 072 (aniversarios) no SQL Editor do Supabase e depois importe a planilha. Até lá, o e-mail diário já traz os parceiros e representantes." />
      ) : erro === "falha" ? (
        <EmptyState title="Não foi possível carregar" hint="Verifique a conexão e tente de novo." action={<button type="button" onClick={recarregar} className={btnGhost}>Tentar de novo</button>} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Profissionais" value={resumo.total} />
            <KpiCard label="Hoje" value={deHoje.length} tone={deHoje.length ? "good" : "default"} hint={`${semana.length} nos próximos 7 dias`} />
            <KpiCard label="Sem WhatsApp" value={resumo.semWhats} tone={resumo.semWhats ? "warn" : "default"} />
            <KpiCard label="Sem Instagram" value={resumo.semInsta} tone={resumo.semInsta ? "warn" : "default"} hint={`${resumo.aConfirmar} a confirmar`} />
          </div>

          {resumo.total === 0 ? (
            <EmptyState
              title="Nenhum profissional ainda"
              hint="Importe a planilha “Aniversários Profissionais – Arquitetos”: no Google Planilhas, aba Profissionais, Arquivo → Fazer download → CSV. Depois use Importar planilha."
            />
          ) : (
            <>
              {(deHoje.length > 0 || semana.length > 0) && (
                <div className={`${cardCls} p-4 sm:p-5 mb-6`}>
                  <p className="font-serif text-[#0B1F45] text-lg">{deHoje.length ? `Hoje, ${hoje.dia} de ${MESES[hoje.mes - 1]}` : "Nenhum aniversário hoje"}</p>
                  {deHoje.map((a) => (
                    <div key={a.id} className="mt-3 flex flex-wrap items-start justify-between gap-3 border-t border-[#f0f0f0] pt-3">
                      <div className="min-w-0">
                        <p className="text-[#0B1F45] text-sm font-semibold break-words">
                          {a.nome}{idade(a.ano, hoje.ano) ? <span className="font-normal text-[#74777f]">, {idade(a.ano, hoje.ano)} anos</span> : null}
                        </p>
                        <div className="mt-1"><Contatos a={a} /></div>
                      </div>
                      {linkParabens(a) && (
                        <a href={linkParabens(a)!} target="_blank" rel="noopener noreferrer" className="bg-[#36A35C] text-[#0B1F45] text-xs font-bold px-4 py-2.5 rounded-full hover:bg-[#2f9150]">
                          Parabenizar no WhatsApp
                        </a>
                      )}
                    </div>
                  ))}
                  {semana.length > 0 && (
                    <div className="mt-4">
                      <p className={labelCls}>Próximos 7 dias</p>
                      <ul className="space-y-1.5">
                        {semana.map(({ a }) => (
                          <li key={a.id} className="flex gap-3 text-xs">
                            <span className="text-[#74777f] w-11 flex-shrink-0">{dataCurta(a.dia, a.mes)}</span>
                            <button type="button" onClick={() => { setMsg(""); setEditando({ ...a }); }} className="text-left text-[#0B1F45] hover:underline min-w-0 break-words">{a.nome}</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className={`${cardCls} p-3 sm:p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3`}>
                <input value={busca} onChange={(e) => { setBusca(e.target.value); setLimite(60); }} placeholder="Buscar nome, escritório, @instagram ou telefone" className={inputCls} aria-label="Buscar" />
                <select value={fMes} onChange={(e) => { setFMes(e.target.value); setLimite(60); }} className={inputCls} aria-label="Filtrar por mês">
                  <option value="">Todos os meses</option>
                  {MESES.map((m, i) => <option key={m} value={i + 1}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </select>
                <select value={fFalta} onChange={(e) => { setFFalta(e.target.value); setLimite(60); }} className={inputCls} aria-label="Filtrar pelo que falta">
                  <option value="">Todos os contatos</option>
                  <option value="whats">Sem WhatsApp</option>
                  <option value="insta">Sem Instagram</option>
                  <option value="confirmar">Instagram a confirmar</option>
                </select>
              </div>
              <p className="text-[#74777f] text-xs mb-3">{filtrada.length} de {resumo.total} profissionais{!fMes && " · do próximo aniversário ao mais distante"}</p>

              {filtrada.length === 0 ? (
                <EmptyState title="Ninguém com esses filtros" />
              ) : (
                <>
                  {/* Celular: cartões. */}
                  <div className="md:hidden space-y-3">
                    {filtrada.slice(0, limite).map((a) => (
                      <div key={a.id} className={`${cardCls} p-4`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="font-serif text-[#0B1F45] text-base leading-tight min-w-0 break-words">{a.nome}</p>
                          <span className="text-[#0B1F45] text-sm font-semibold flex-shrink-0">{dataCurta(a.dia, a.mes)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {(a.profissao || a.escritorio) && <Field label="Atuação">{[a.profissao, a.escritorio].filter(Boolean).join(", ")}</Field>}
                          <Contatos a={a} />
                        </div>
                        <button type="button" onClick={() => { setMsg(""); setEditando({ ...a }); }} className={`${btnGhost} w-full mt-3`}>Editar</button>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: tabela. */}
                  <TableShell className="hidden md:block">
                    <thead>
                      <tr>
                        <th className={thCls}>Data</th>
                        <th className={thCls}>Nome</th>
                        <th className={thCls}>Atuação</th>
                        <th className={thCls}>Instagram e WhatsApp</th>
                        <th className={thCls}>E-mail</th>
                        <th className={thCls} />
                      </tr>
                    </thead>
                    <tbody>
                      {filtrada.slice(0, limite).map((a) => (
                        <tr key={a.id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#F6F5F2]">
                          <td className={`${tdCls} whitespace-nowrap text-[#0B1F45] font-semibold`}>{dataCurta(a.dia, a.mes)}</td>
                          <td className={`${tdCls} text-[#0B1F45] font-semibold`}>{a.nome}{idade(a.ano, hoje.ano) ? <span className="block font-normal text-[#74777f]">{idade(a.ano, hoje.ano)} anos</span> : null}</td>
                          <td className={tdCls}>{[a.profissao, a.escritorio].filter(Boolean).join(", ") || "—"}</td>
                          <td className={tdCls}><Contatos a={a} /></td>
                          <td className={`${tdCls} break-all`}>{a.email || "—"}</td>
                          <td className={tdCls}>
                            <button type="button" onClick={() => { setMsg(""); setEditando({ ...a }); }} className="text-[#2347A0] font-semibold hover:underline">Editar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </TableShell>
                  {filtrada.length > limite && (
                    <div className="mt-4 flex justify-center">
                      <button type="button" onClick={() => setLimite((n) => n + 60)} className={btnGhost}>Mostrar mais ({filtrada.length - limite})</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {editando && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-end sm:items-center justify-center sm:p-6" onClick={() => setEditando(null)} role="dialog" aria-modal="true" aria-label={editando.id ? `Editar ${editando.nome}` : "Adicionar pessoa"}>
          <div className="bg-white w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-serif text-[#0B1F45] text-xl mb-4">{editando.id ? "Editar aniversário" : "Adicionar pessoa"}</p>
            <div className="space-y-4">
              <label className="block"><span className={labelCls}>Nome</span>
                <input className={inputCls} value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="block"><span className={labelCls}>Dia</span>
                  <input className={inputCls} inputMode="numeric" value={editando.dia ?? ""} onChange={(e) => setEditando({ ...editando, dia: Number(e.target.value.replace(/\D/g, "").slice(0, 2)) || undefined })} />
                </label>
                <label className="block"><span className={labelCls}>Mês</span>
                  <select className={inputCls} value={editando.mes ?? ""} onChange={(e) => setEditando({ ...editando, mes: Number(e.target.value) || undefined })}>
                    <option value="">—</option>
                    {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </label>
                <label className="block"><span className={labelCls}>Ano</span>
                  <input className={inputCls} inputMode="numeric" placeholder="opcional" value={editando.ano ?? ""} onChange={(e) => setEditando({ ...editando, ano: Number(e.target.value.replace(/\D/g, "").slice(0, 4)) || null })} />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block"><span className={labelCls}>Profissão</span>
                  <input className={inputCls} value={editando.profissao ?? ""} onChange={(e) => setEditando({ ...editando, profissao: e.target.value })} />
                </label>
                <label className="block"><span className={labelCls}>Escritório</span>
                  <input className={inputCls} value={editando.escritorio ?? ""} onChange={(e) => setEditando({ ...editando, escritorio: e.target.value })} />
                </label>
              </div>
              <label className="block"><span className={labelCls}>Instagram</span>
                <input className={inputCls} placeholder="@perfil" value={editando.instagram ?? ""} onChange={(e) => setEditando({ ...editando, instagram: e.target.value })} autoComplete="off" spellCheck={false} />
              </label>
              <label className="flex items-center gap-2 text-xs text-[#43474e]">
                <input type="checkbox" checked={!!editando.instagram_confirmado} onChange={(e) => setEditando({ ...editando, instagram_confirmado: e.target.checked })} />
                Instagram confirmado (é mesmo desta pessoa)
              </label>
              <label className="block"><span className={labelCls}>WhatsApp</span>
                <input className={inputCls} type="tel" inputMode="tel" placeholder="(92) 9 0000-0000" value={editando.whatsapp ?? ""} onChange={(e) => setEditando({ ...editando, whatsapp: e.target.value })} />
              </label>
              <label className="block"><span className={labelCls}>E-mail</span>
                <input className={inputCls} type="email" value={editando.email ?? ""} onChange={(e) => setEditando({ ...editando, email: e.target.value })} spellCheck={false} />
              </label>
              <label className="block"><span className={labelCls}>Observações</span>
                <textarea className={`${inputCls} min-h-[70px]`} value={editando.observacoes ?? ""} onChange={(e) => setEditando({ ...editando, observacoes: e.target.value })} />
              </label>
            </div>
            {msg && <p className="mt-3 text-xs text-red-700" role="alert">{msg}</p>}
            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
              {editando.id ? <button type="button" onClick={remover} disabled={salvando} className={btnDanger}>Tirar da lista</button> : <span />}
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <button type="button" onClick={() => setEditando(null)} className={btnGhost}>Cancelar</button>
                <button type="button" onClick={salvar} disabled={salvando || !editando.nome.trim() || !editando.dia || !editando.mes} className={btnPrimary}>
                  {salvando ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
