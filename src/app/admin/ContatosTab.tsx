"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyState, Field, KpiCard, PageHeader, Spinner, TableShell,
  btnGhost, btnPrimary, cardCls, inputCls, tdCls, thCls,
} from "./ui";
import {
  ETAPA_ROTULO, PERFIL_ROTULO, areaContato, digitosContato, type SiteContato,
} from "@/lib/site-contatos";

/**
 * Contatos do site — cada envio da aba "Solicitar atendimento" (produtos,
 * visualizador, botões "Falar com um consultor"). O mesmo envio também vira
 * lead no CRM; aqui é a lista completa, filtrável e exportável para o Excel.
 */

const DIA = 24 * 60 * 60 * 1000;

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Manaus", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function WhatsLink({ phone }: { phone: string }) {
  const d = digitosContato(phone);
  return (
    <a href={`https://wa.me/${d.length <= 11 ? "55" + d : d}`} target="_blank" rel="noopener noreferrer" className="text-[#1f7a3d] font-semibold hover:underline whitespace-nowrap">
      {phone}
    </a>
  );
}

type Carga = { lista: SiteContato[]; erro: "" | "migration" | "falha"; em: number };

/** Só busca — quem aplica o resultado é o componente. */
async function buscarLista(): Promise<Carga> {
  try {
    const res = await fetch("/api/admin/contatos", { cache: "no-store" });
    const em = Date.now();
    if (res.status === 503) return { lista: [], erro: "migration", em };
    if (!res.ok) return { lista: [], erro: "falha", em };
    return { lista: await res.json(), erro: "", em };
  } catch {
    return { lista: [], erro: "falha", em: Date.now() };
  }
}

export default function ContatosTab() {
  const [lista, setLista] = useState<SiteContato[] | null>(null);
  const [erro, setErro] = useState<"" | "migration" | "falha">("");
  const [busca, setBusca] = useState("");
  const [fPerfil, setFPerfil] = useState("");
  const [fEtapa, setFEtapa] = useState("");
  const [carregadoEm, setCarregadoEm] = useState(0);

  const aplicar = useCallback((c: Carga) => {
    setLista(c.lista);
    setErro(c.erro);
    setCarregadoEm(c.em);
  }, []);

  useEffect(() => {
    let vivo = true;
    buscarLista().then((c) => { if (vivo) aplicar(c); });
    return () => { vivo = false; };
  }, [aplicar]);

  const filtrada = useMemo(() => {
    if (!lista) return [];
    const q = busca.trim().toLowerCase();
    const qDig = q.replace(/\D/g, "");
    return lista.filter((c) => {
      if (fPerfil && c.perfil !== fPerfil) return false;
      if (fEtapa && c.etapa !== fEtapa) return false;
      if (!q) return true;
      return (
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.cidade ?? "").toLowerCase().includes(q) ||
        (c.produtos ?? "").toLowerCase().includes(q) ||
        (qDig.length >= 3 && digitosContato(c.phone).includes(qDig))
      );
    });
  }, [lista, busca, fPerfil, fEtapa]);

  const resumo = useMemo(() => {
    const l = lista ?? [];
    const semana = l.filter((c) => carregadoEm - new Date(c.created_at).getTime() < 7 * DIA).length;
    const arquitetos = l.filter((c) => c.perfil === "arquiteto").length;
    const manaus = l.filter((c) => c.cidade.toLowerCase() === "manaus").length;
    return { total: l.length, semana, arquitetos, manaus };
  }, [lista, carregadoEm]);

  const filtrando = !!(busca || fPerfil || fEtapa);

  return (
    <div>
      <PageHeader
        title="Contatos do site"
        subtitle="Quem pediu atendimento pelo site e foi ao WhatsApp. Cada contato também entra em Leads / CRM."
        actions={
          <a
            href="/api/admin/contatos/export"
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
        <EmptyState
          title="Tabela ainda não criada"
          hint="Rode a migration 059 (site_contatos) no SQL Editor do Supabase. Até lá, os contatos continuam entrando em Leads / CRM."
        />
      ) : erro === "falha" ? (
        <EmptyState
          title="Não foi possível carregar os contatos"
          hint="Verifique a conexão e tente de novo."
          action={<button type="button" onClick={() => { setLista(null); buscarLista().then(aplicar); }} className={btnGhost}>Tentar de novo</button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Contatos" value={resumo.total} />
            <KpiCard label="Últimos 7 dias" value={resumo.semana} tone={resumo.semana ? "good" : "default"} />
            <KpiCard label="Arquitetos" value={resumo.arquitetos} hint={resumo.total ? `${Math.round((resumo.arquitetos / resumo.total) * 100)}% dos contatos` : undefined} />
            <KpiCard label="Manaus" value={resumo.manaus} hint={resumo.total ? `${resumo.total - resumo.manaus} de outras cidades` : undefined} />
          </div>

          {resumo.total === 0 ? (
            <EmptyState
              title="Nenhum contato ainda"
              hint="Os pedidos de atendimento feitos no site aparecem aqui, com atalho para o WhatsApp de cada pessoa."
            />
          ) : (
            <>
              <div className={`${cardCls} p-3 sm:p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3`}>
                <input
                  value={busca} onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar nome, WhatsApp, cidade ou revestimento"
                  className={inputCls} aria-label="Buscar"
                />
                <select value={fPerfil} onChange={(e) => setFPerfil(e.target.value)} className={inputCls} aria-label="Filtrar por perfil">
                  <option value="">Todos os perfis</option>
                  {Object.entries(PERFIL_ROTULO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <select value={fEtapa} onChange={(e) => setFEtapa(e.target.value)} className={inputCls} aria-label="Filtrar por estágio">
                  <option value="">Todos os estágios</option>
                  {Object.entries(ETAPA_ROTULO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              <p className="text-[#74777f] text-xs mb-3">
                {filtrando ? `${filtrada.length} de ${resumo.total} contatos` : `${resumo.total} contatos`}
                {filtrando && (
                  <button type="button" onClick={() => { setBusca(""); setFPerfil(""); setFEtapa(""); }} className="ml-3 underline hover:text-[#0B1F45]">
                    limpar filtros
                  </button>
                )}
              </p>

              {filtrada.length === 0 ? (
                <EmptyState title="Nenhum contato com esses filtros" />
              ) : (
                <>
                  {/* Celular: cartões. Nunca rolagem lateral no admin. */}
                  <div className="md:hidden space-y-3">
                    {filtrada.map((c) => (
                      <div key={c.id} className={`${cardCls} p-4`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="font-serif text-[#0B1F45] text-base leading-tight min-w-0 break-words">{c.name || "Sem nome"}</p>
                          <span className="text-[#74777f] text-[11px] flex-shrink-0">{dataCurta(c.created_at)}</span>
                        </div>
                        <div className="flex flex-col gap-1 text-xs">
                          <WhatsLink phone={c.phone} />
                          <Field label="Perfil">{PERFIL_ROTULO[c.perfil] ?? c.perfil}</Field>
                          <Field label="Estágio">{ETAPA_ROTULO[c.etapa] ?? c.etapa}</Field>
                          <Field label="Cidade">{c.cidade}</Field>
                          <Field label="Revestimento"><span className="break-words">{c.produtos || "—"}</span></Field>
                          <Field label="Área"><span className="break-words">{areaContato(c) || "—"}</span></Field>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: tabela. */}
                  <TableShell className="hidden md:block">
                    <thead>
                      <tr>
                        <th className={thCls}>Data</th>
                        <th className={thCls}>Nome</th>
                        <th className={thCls}>WhatsApp</th>
                        <th className={thCls}>Perfil</th>
                        <th className={thCls}>Estágio</th>
                        <th className={thCls}>Cidade</th>
                        <th className={thCls}>Revestimento</th>
                        <th className={thCls}>Área</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrada.map((c) => (
                        <tr key={c.id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#F6F5F2]">
                          <td className={`${tdCls} whitespace-nowrap text-[#74777f]`}>{dataCurta(c.created_at)}</td>
                          <td className={`${tdCls} text-[#0B1F45] font-semibold`}>{c.name || <span className="text-[#b0b4bc] font-normal">—</span>}</td>
                          <td className={tdCls}><WhatsLink phone={c.phone} /></td>
                          <td className={`${tdCls} whitespace-nowrap`}>{PERFIL_ROTULO[c.perfil] ?? c.perfil}</td>
                          <td className={`${tdCls} whitespace-nowrap`}>{ETAPA_ROTULO[c.etapa] ?? c.etapa}</td>
                          <td className={tdCls}>{c.cidade}</td>
                          <td className={tdCls}>{c.produtos || "—"}</td>
                          <td className={tdCls}>{areaContato(c) || "—"}</td>
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
