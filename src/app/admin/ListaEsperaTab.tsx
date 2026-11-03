"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyState, Field, KpiCard, PageHeader, Spinner, TableShell,
  btnGhost, btnPrimary, cardCls, inputCls, tdCls, thCls,
} from "./ui";
import {
  LINHAS_ESPERA, PERFIL_ESPERA_ROTULO, PRAZOS_OBRA, assuntoChegada, mensagemChegada, prioridadePrazo, rotuloLinha,
  rotuloPrazo, whatsappLegivel, type SiteListaEspera,
} from "@/lib/lista-espera";

/**
 * Lista de espera — quem se inscreveu nas páginas das linhas em chegada
 * (TechStone, PFB Carbon). Ordem de aviso: quem já está em obra primeiro,
 * depois quem chegou antes. "Avisar no WhatsApp" e "Avisar por e-mail" abrem
 * o app com a mensagem de chegada pronta, mas NÃO marcam nada: quem envia é o
 * consultor, e só ele sabe se enviou. A pessoa vira "avisada" no botão
 * "Marcar como avisado".
 */

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Manaus", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

type Carga = { lista: SiteListaEspera[]; erro: "" | "migration" | "falha" };

async function buscarLista(): Promise<Carga> {
  try {
    const res = await fetch("/api/admin/lista-espera", { cache: "no-store" });
    if (res.status === 503) return { lista: [], erro: "migration" };
    if (!res.ok) return { lista: [], erro: "falha" };
    return { lista: await res.json(), erro: "" };
  } catch {
    return { lista: [], erro: "falha" };
  }
}

const PRAZO_COR: Record<string, string> = {
  em_obra: "bg-[#e7f5ec] text-[#1F7A44]",
  ate_3_meses: "bg-[#eef2fb] text-[#2347A0]",
};

function Prazo({ v }: { v: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${PRAZO_COR[v] ?? "bg-[#f3f3f3] text-[#43474e]"}`}>
      {rotuloPrazo(v)}
    </span>
  );
}

function perfilTexto(c: SiteListaEspera): string {
  const p = PERFIL_ESPERA_ROTULO[c.perfil] ?? c.perfil;
  return c.perfil === "outro" && c.perfil_outro ? `${p}: ${c.perfil_outro}` : p;
}

export default function ListaEsperaTab() {
  const [lista, setLista] = useState<SiteListaEspera[] | null>(null);
  const [erro, setErro] = useState<"" | "migration" | "falha">("");
  const [busca, setBusca] = useState("");
  const [fLinha, setFLinha] = useState("");
  const [fPrazo, setFPrazo] = useState("");
  const [fStatus, setFStatus] = useState<"" | "avisar" | "avisados">("avisar");
  const [salvando, setSalvando] = useState<string | null>(null);

  const aplicar = useCallback((c: Carga) => { setLista(c.lista); setErro(c.erro); }, []);

  useEffect(() => {
    let vivo = true;
    buscarLista().then((c) => { if (vivo) aplicar(c); });
    return () => { vivo = false; };
  }, [aplicar]);

  async function marcar(c: SiteListaEspera, avisado: boolean) {
    setSalvando(c.id);
    try {
      const res = await fetch("/api/admin/lista-espera", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, avisado }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setLista((l) => l?.map((x) => (x.id === c.id ? { ...x, avisado_em: d.avisado_em ?? null } : x)) ?? l);
    } finally {
      setSalvando(null);
    }
  }

  /** Abre o WhatsApp com a mensagem de chegada. Não marca: abrir não é enviar. */
  function avisar(c: SiteListaEspera) {
    window.open(`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(mensagemChegada(c))}`, "_blank", "noopener,noreferrer");
  }

  const ordenada = useMemo(() => {
    if (!lista) return [];
    return lista.slice().sort((a, b) =>
      prioridadePrazo(a.prazo) - prioridadePrazo(b.prazo) || a.created_at.localeCompare(b.created_at));
  }, [lista]);

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const qDig = q.replace(/\D/g, "");
    return ordenada.filter((c) => {
      if (fLinha && c.linha !== fLinha) return false;
      if (fPrazo && c.prazo !== fPrazo) return false;
      if (fStatus === "avisar" && c.avisado_em) return false;
      if (fStatus === "avisados" && !c.avisado_em) return false;
      if (!q) return true;
      return (
        c.nome.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.perfil_outro ?? "").toLowerCase().includes(q) ||
        (c.modelos ?? []).some((m) => m.toLowerCase().includes(q)) ||
        (qDig.length >= 3 && c.whatsapp.includes(qDig))
      );
    });
  }, [ordenada, busca, fLinha, fPrazo, fStatus]);

  const resumo = useMemo(() => {
    const l = lista ?? [];
    return {
      total: l.length,
      emObra: l.filter((c) => c.prazo === "em_obra").length,
      arquitetos: l.filter((c) => c.perfil === "arquiteto").length,
      avisados: l.filter((c) => c.avisado_em).length,
    };
  }, [lista]);

  // Modelos mais pedidos: ajuda a decidir o que separar quando a remessa chega.
  const topModelos = useMemo(() => {
    const cont = new Map<string, number>();
    for (const c of lista ?? []) for (const m of c.modelos ?? []) cont.set(m, (cont.get(m) ?? 0) + 1);
    return [...cont.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [lista]);

  const filtrando = !!(busca || fLinha || fPrazo || fStatus);

  return (
    <div>
      <PageHeader
        title="Lista de espera"
        subtitle="Quem pediu para ser avisado quando as linhas novas chegarem. Quem já está em obra aparece primeiro."
        actions={
          <a
            href="/api/admin/lista-espera/export"
            className={`${btnPrimary} ${!lista?.length ? "pointer-events-none opacity-50" : ""}`}
            aria-disabled={!lista?.length}
          >
            Exportar Excel
          </a>
        }
      />

      {lista === null ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : erro === "migration" ? (
        <EmptyState title="Tabela ainda não criada" hint="Rode a migration 075 (site_lista_espera) no SQL Editor do Supabase." />
      ) : erro === "falha" ? (
        <EmptyState
          title="Não foi possível carregar a lista"
          hint="Verifique a conexão e tente de novo."
          action={<button type="button" onClick={() => { setLista(null); buscarLista().then(aplicar); }} className={btnGhost}>Tentar de novo</button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Inscritos" value={resumo.total} />
            <KpiCard label="Já em obra" value={resumo.emObra} tone={resumo.emObra ? "good" : "default"} hint="Avisar primeiro" />
            <KpiCard label="Arquitetos" value={resumo.arquitetos} hint={resumo.total ? `${Math.round((resumo.arquitetos / resumo.total) * 100)}% da lista` : undefined} />
            <KpiCard label="Avisados" value={resumo.avisados} hint={resumo.total ? `${resumo.total - resumo.avisados} a avisar` : undefined} />
          </div>

          {resumo.total === 0 ? (
            <EmptyState
              title="Ninguém na lista ainda"
              hint="As inscrições feitas na página da TechStone aparecem aqui, com o atalho para avisar cada pessoa pelo WhatsApp ou pelo e-mail."
            />
          ) : (
            <>
              {topModelos.length > 0 && (
                <div className={`${cardCls} p-4 mb-4`}>
                  <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] mb-2">Modelos mais pedidos</p>
                  <ul className="flex flex-wrap gap-2">
                    {topModelos.map(([m, n]) => (
                      <li key={m} className="text-xs text-[#0B1F45] bg-[#F6F5F2] px-2.5 py-1 rounded">
                        {m} <span className="text-[#74777f]">· {n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={`${cardCls} p-3 sm:p-4 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3`}>
                <input
                  value={busca} onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar nome, WhatsApp, e-mail ou modelo"
                  className={inputCls} aria-label="Buscar"
                />
                <select value={fLinha} onChange={(e) => setFLinha(e.target.value)} className={inputCls} aria-label="Filtrar por linha">
                  <option value="">Todas as linhas</option>
                  {LINHAS_ESPERA.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={fPrazo} onChange={(e) => setFPrazo(e.target.value)} className={inputCls} aria-label="Filtrar por obra">
                  <option value="">Qualquer prazo</option>
                  {PRAZOS_OBRA.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value as typeof fStatus)} className={inputCls} aria-label="Filtrar por aviso">
                  <option value="avisar">A avisar</option>
                  <option value="avisados">Já avisados</option>
                  <option value="">Todos</option>
                </select>
              </div>

              <p className="text-[#74777f] text-xs mb-3">
                {filtrando ? `${filtrada.length} de ${resumo.total} inscritos` : `${resumo.total} inscritos`}
                {filtrando && (
                  <button type="button" onClick={() => { setBusca(""); setFLinha(""); setFPrazo(""); setFStatus(""); }} className="ml-3 underline hover:text-[#0B1F45]">
                    ver todos
                  </button>
                )}
              </p>

              {filtrada.length === 0 ? (
                <EmptyState title={fStatus === "avisar" ? "Todo mundo já foi avisado" : "Ninguém com esses filtros"} />
              ) : (
                <>
                  {/* Celular: cartões. Nunca rolagem lateral no admin. */}
                  <div className="md:hidden space-y-3">
                    {filtrada.map((c) => (
                      <div key={c.id} className={`${cardCls} p-4`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="font-serif text-[#0B1F45] text-base leading-tight min-w-0 break-words">{c.nome}</p>
                          <Prazo v={c.prazo} />
                        </div>
                        <div className="flex flex-col gap-1 text-xs">
                          <a href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-[#1f7a3d] font-semibold hover:underline">{whatsappLegivel(c.whatsapp)}</a>
                          <a href={`mailto:${c.email}`} className="text-[#2347A0] hover:underline break-all">{c.email}</a>
                          <Field label="Linha">{rotuloLinha(c.linha)}</Field>
                          <Field label="Perfil"><span className="break-words">{perfilTexto(c)}</span></Field>
                          <Field label="Modelos"><span className="break-words">{c.modelos?.join(", ") || "—"}</span></Field>
                          <Field label="Inscrição">{dataCurta(c.created_at)}</Field>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <BotaoAviso c={c} salvando={salvando === c.id} avisar={avisar} marcar={() => marcar(c, true)} desfazer={() => marcar(c, false)} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: tabela. */}
                  <TableShell className="hidden md:block">
                    <thead>
                      <tr>
                        <th className={thCls}>Obra</th>
                        <th className={thCls}>Nome</th>
                        <th className={thCls}>WhatsApp</th>
                        <th className={thCls}>E-mail</th>
                        <th className={thCls}>Perfil</th>
                        <th className={thCls}>Linha</th>
                        <th className={thCls}>Modelos</th>
                        <th className={thCls}>Inscrição</th>
                        <th className={thCls}>Aviso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrada.map((c) => (
                        <tr key={c.id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#F6F5F2]">
                          <td className={tdCls}><Prazo v={c.prazo} /></td>
                          <td className={`${tdCls} text-[#0B1F45] font-semibold`}>{c.nome}</td>
                          <td className={tdCls}>
                            <a href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-[#1f7a3d] font-semibold hover:underline whitespace-nowrap">{whatsappLegivel(c.whatsapp)}</a>
                          </td>
                          <td className={tdCls}><a href={`mailto:${c.email}`} className="text-[#2347A0] hover:underline break-all">{c.email}</a></td>
                          <td className={tdCls}>{perfilTexto(c)}</td>
                          <td className={`${tdCls} whitespace-nowrap`}>{rotuloLinha(c.linha)}</td>
                          <td className={tdCls}>{c.modelos?.join(", ") || "—"}</td>
                          <td className={`${tdCls} whitespace-nowrap text-[#74777f]`}>{dataCurta(c.created_at)}</td>
                          <td className={tdCls}>
                            <BotaoAviso c={c} salvando={salvando === c.id} avisar={avisar} marcar={() => marcar(c, true)} desfazer={() => marcar(c, false)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </TableShell>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function BotaoAviso({ c, salvando, avisar, marcar, desfazer }: {
  c: SiteListaEspera;
  salvando: boolean;
  avisar: (c: SiteListaEspera) => void;
  marcar: () => void;
  desfazer: () => void;
}) {
  if (c.avisado_em) {
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-[#1F7A44]">
        Avisado em {new Date(c.avisado_em).toLocaleDateString("pt-BR", { timeZone: "America/Manaus" })}
        <button type="button" onClick={desfazer} disabled={salvando} className="text-[#74777f] underline hover:text-[#0B1F45] disabled:opacity-50">
          desfazer
        </button>
      </span>
    );
  }
  // Abrir o WhatsApp ou o e-mail não marca ninguém: só "Marcar como avisado" marca.
  const email = `mailto:${c.email}?subject=${encodeURIComponent(assuntoChegada(c))}&body=${encodeURIComponent(mensagemChegada(c))}`;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => avisar(c)}
        title="Abre o WhatsApp com a mensagem de chegada pronta. Não marca como avisado."
        className="inline-flex items-center gap-1.5 whitespace-nowrap bg-[#36A35C] text-[#0B1F45] text-xs font-bold px-3 py-2 rounded hover:bg-[#2f9150]">
        Avisar no WhatsApp
      </button>
      <a href={email}
        title="Abre o e-mail com a mensagem de chegada pronta. Não marca como avisado."
        className="inline-flex items-center gap-1.5 whitespace-nowrap bg-[#36A35C] text-[#0B1F45] text-xs font-bold px-3 py-2 rounded hover:bg-[#2f9150]">
        Avisar por e-mail
      </a>
      <button type="button" onClick={marcar} disabled={salvando}
        title="Use depois de enviar a mensagem"
        className="whitespace-nowrap text-xs text-[#74777f] underline hover:text-[#0B1F45] disabled:opacity-50">
        Marcar como avisado
      </button>
    </span>
  );
}
