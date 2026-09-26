"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyState, Field, KpiCard, PageHeader, Spinner, TableShell,
  btnGhost, btnPrimary, cardCls, inputCls, tdCls, thCls,
} from "./ui";
import {
  ATUACOES, EXPERIENCIAS, FOCOS, digitos, rotulo, type Inscricao,
} from "@/lib/academia-waitlist";

/**
 * Lista de espera da Academia Orbital (vem de /academia).
 *
 * Só leitura + exportação. O curso ainda não existe: isto é a base de contatos
 * para avisar quando abrir. WhatsApp é o canal principal, por isso cada linha
 * tem o atalho direto para a conversa.
 */

const DIA = 24 * 60 * 60 * 1000;

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Manaus", day: "2-digit", month: "2-digit", year: "2-digit" });
}

function atuacao(r: Inscricao): string {
  return r.role === "outro" && r.role_other ? `Outro: ${r.role_other}` : rotulo(ATUACOES, r.role);
}

function foco(r: Inscricao): string {
  return r.main_focus === "outro" && r.main_focus_other ? `Outro: ${r.main_focus_other}` : rotulo(FOCOS, r.main_focus);
}

/** Link direto para a conversa. Números brasileiros sem DDI recebem o 55. */
function linkWhats(phone: string): string {
  const d = digitos(phone);
  return `https://wa.me/${d.length <= 11 ? "55" + d : d}`;
}

function WhatsLink({ phone }: { phone: string }) {
  return (
    <a
      href={linkWhats(phone)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#1f7a3d] font-semibold hover:underline whitespace-nowrap"
    >
      {phone}
    </a>
  );
}

type Carga = { lista: Inscricao[]; erro: "" | "migration" | "falha"; em: number };

/** Só busca — não toca em estado. Quem aplica o resultado é o componente. */
async function buscarLista(): Promise<Carga> {
  try {
    const res = await fetch("/api/admin/academia", { cache: "no-store" });
    const em = Date.now();
    if (res.status === 503) return { lista: [], erro: "migration", em };
    if (!res.ok) return { lista: [], erro: "falha", em };
    return { lista: await res.json(), erro: "", em };
  } catch {
    return { lista: [], erro: "falha", em: Date.now() };
  }
}

export default function AcademiaTab() {
  const [lista, setLista] = useState<Inscricao[] | null>(null);
  const [erro, setErro] = useState<"" | "migration" | "falha">("");
  const [busca, setBusca] = useState("");
  const [fAtuacao, setFAtuacao] = useState("");
  const [fFoco, setFFoco] = useState("");
  // Instante do carregamento: "últimos 7 dias" conta a partir dele, e não de um
  // Date.now() durante a renderização (que a tornaria impura).
  const [carregadoEm, setCarregadoEm] = useState(0);

  const aplicar = useCallback((c: Carga) => {
    setLista(c.lista);
    setErro(c.erro);
    setCarregadoEm(c.em);
  }, []);

  // Estado só é aplicado no .then — de fato depois da resposta, nunca no corpo do efeito.
  useEffect(() => {
    let vivo = true;
    buscarLista().then((c) => { if (vivo) aplicar(c); });
    return () => { vivo = false; };
  }, [aplicar]);

  const filtrada = useMemo(() => {
    if (!lista) return [];
    const q = busca.trim().toLowerCase();
    const qDig = digitos(q);
    return lista.filter((r) => {
      if (fAtuacao && r.role !== fAtuacao) return false;
      if (fFoco && r.main_focus !== fFoco) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.city ?? "").toLowerCase().includes(q) ||
        (qDig.length >= 3 && digitos(r.phone).includes(qDig))
      );
    });
  }, [lista, busca, fAtuacao, fFoco]);

  const resumo = useMemo(() => {
    const l = lista ?? [];
    const semana = l.filter((r) => carregadoEm - new Date(r.created_at).getTime() < 7 * DIA).length;
    const comEmail = l.filter((r) => r.email).length;
    // Foco mais comum: diz que tipo de profissional a lista está atraindo.
    const cont = new Map<string, number>();
    for (const r of l) if (r.main_focus) cont.set(r.main_focus, (cont.get(r.main_focus) ?? 0) + 1);
    const topo = [...cont.entries()].sort((a, b) => b[1] - a[1])[0];
    return { total: l.length, semana, comEmail, topoFoco: topo ? `${rotulo(FOCOS, topo[0])} (${topo[1]})` : "—" };
  }, [lista, carregadoEm]);

  const filtrando = !!(busca || fAtuacao || fFoco);

  return (
    <div>
      <PageHeader
        title="Academia Orbital · Lista de espera"
        subtitle="Inscritos pela página /academia. O curso ainda está em desenvolvimento."
        actions={
          <>
            <a href="/academia" target="_blank" rel="noopener noreferrer" className={btnGhost}>Ver página</a>
            <a
              href="/api/admin/academia/export"
              className={`${btnPrimary} ${!lista?.length ? "pointer-events-none opacity-50" : ""}`}
              aria-disabled={!lista?.length}
            >
              Exportar CSV
            </a>
          </>
        }
      />

      {lista === null ? (
        <div className="py-16 flex justify-center"><Spinner /></div>
      ) : erro === "migration" ? (
        <EmptyState
          title="Tabela ainda não criada"
          hint="Rode a migration 056 (academy_waitlist) no SQL Editor do Supabase. Até lá, o formulário da página /academia recusa os cadastros com uma mensagem de erro — nada é perdido em silêncio."
        />
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
            <KpiCard label="Últimos 7 dias" value={resumo.semana} tone={resumo.semana ? "good" : "default"} />
            <KpiCard label="Com e-mail" value={resumo.comEmail} hint={resumo.total ? `${Math.round((resumo.comEmail / resumo.total) * 100)}% da lista` : undefined} />
            <KpiCard label="Foco mais comum" value={<span className="text-base sm:text-lg">{resumo.topoFoco}</span>} />
          </div>

          {resumo.total === 0 ? (
            <EmptyState
              title="Nenhum inscrito ainda"
              hint="Os cadastros feitos em /academia aparecem aqui, com atalho direto para o WhatsApp de cada pessoa."
            />
          ) : (
            <>
              <div className={`${cardCls} p-3 sm:p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3`}>
                <input
                  value={busca} onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar nome, WhatsApp, e-mail ou cidade"
                  className={inputCls} aria-label="Buscar"
                />
                <select value={fAtuacao} onChange={(e) => setFAtuacao(e.target.value)} className={inputCls} aria-label="Filtrar por atuação">
                  <option value="">Todas as atuações</option>
                  {ATUACOES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={fFoco} onChange={(e) => setFFoco(e.target.value)} className={inputCls} aria-label="Filtrar por foco">
                  <option value="">Todos os focos</option>
                  {FOCOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <p className="text-[#74777f] text-xs font-[var(--font-inter)] mb-3">
                {filtrando ? `${filtrada.length} de ${resumo.total} inscritos` : `${resumo.total} inscritos`}
                {filtrando && (
                  <button type="button" onClick={() => { setBusca(""); setFAtuacao(""); setFFoco(""); }} className="ml-3 underline hover:text-[#002045]">
                    limpar filtros
                  </button>
                )}
              </p>

              {filtrada.length === 0 ? (
                <EmptyState title="Nenhum inscrito com esses filtros" />
              ) : (
                <>
                  {/* Celular: cartões. Nunca rolagem lateral no portal. */}
                  <div className="md:hidden space-y-3">
                    {filtrada.map((r) => (
                      <div key={r.id} className={`${cardCls} p-4`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="font-serif text-[#002045] text-base leading-tight min-w-0 break-words">{r.name}</p>
                          <span className="text-[#74777f] text-[11px] font-[var(--font-inter)] flex-shrink-0">{dataCurta(r.created_at)}</span>
                        </div>
                        <div className="flex flex-col gap-1 text-xs">
                          <WhatsLink phone={r.phone} />
                          {r.email && <span className="text-[#43474e] font-[var(--font-inter)] break-all">{r.email}</span>}
                          <Field label="Cidade">{r.city || "—"}</Field>
                          <Field label="Atuação">{atuacao(r)}</Field>
                          <Field label="Foco">{foco(r) || "—"}</Field>
                          <Field label="Profissão">{rotulo(EXPERIENCIAS, r.years_experience) || "—"}</Field>
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
                        <th className={thCls}>E-mail</th>
                        <th className={thCls}>Cidade</th>
                        <th className={thCls}>Atuação</th>
                        <th className={thCls}>Principal foco</th>
                        <th className={thCls}>Profissão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrada.map((r) => (
                        <tr key={r.id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa]">
                          <td className={`${tdCls} whitespace-nowrap text-[#74777f]`}>{dataCurta(r.created_at)}</td>
                          <td className={`${tdCls} text-[#002045] font-semibold`}>{r.name}</td>
                          <td className={tdCls}><WhatsLink phone={r.phone} /></td>
                          <td className={`${tdCls} break-all`}>{r.email || <span className="text-[#b0b4bc]">—</span>}</td>
                          <td className={tdCls}>{r.city || "—"}</td>
                          <td className={tdCls}>{atuacao(r)}</td>
                          <td className={tdCls}>{foco(r) || "—"}</td>
                          <td className={`${tdCls} whitespace-nowrap`}>{rotulo(EXPERIENCIAS, r.years_experience) || "—"}</td>
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
