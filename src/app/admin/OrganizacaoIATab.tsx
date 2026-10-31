"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState, KpiCard, PageHeader, Spinner, btnDanger, btnGhost, btnPrimary, cardCls, inputCls, labelCls } from "./ui";

/**
 * Organização IA — o que o runtime de IA está fazendo de verdade (tudo vem das
 * tabelas ai_*; nada é simulado): central de aprovações, atividade da fila,
 * custo real por departamento e o registro de agentes com o modelo de cada nível.
 */

interface Tarefa {
  id: string; tipo: string; departamento: string; agente: string | null; status: string;
  entrada: Record<string, unknown>; saida: Record<string, unknown> | null;
  tentativas: number; modelo: string | null; tokens_entrada: number; tokens_saida: number; tokens_cache_leitura: number;
  custo_usd: number; latencia_ms: number; erro: string | null; criado_em: string;
}
interface Permissao { pessoa_ref: string; pode_whatsapp: boolean; pode_email: boolean; pode_story_publica: boolean }
interface Painel {
  migracaoPendente: boolean; chaveConfigurada: boolean;
  agentes?: { id: string; departamento: string; papel: string; nivel: string; autonomia: number; ativo: boolean }[];
  modelos?: { nivel: string; modelo: string }[];
  tarefas?: Tarefa[];
  custo30?: { departamento: string; status: string; custo_usd: number }[];
  permissoes?: Permissao[];
}

const STATUS: Record<string, { rotulo: string; cor: string }> = {
  fila: { rotulo: "Na fila", cor: "bg-[#eef1f6] text-[#2347A0]" },
  executando: { rotulo: "Executando", cor: "bg-[#eef1f6] text-[#2347A0]" },
  aguardando_aprovacao: { rotulo: "Aguardando aprovação", cor: "bg-[#fff4e0] text-[#8a5a00]" },
  aprovada: { rotulo: "Aprovada", cor: "bg-[#e7f5ec] text-[#1f7a3d]" },
  concluida: { rotulo: "Concluída", cor: "bg-[#e7f5ec] text-[#1f7a3d]" },
  recusada: { rotulo: "Recusada", cor: "bg-[#f3f3f3] text-[#43474e]" },
  falhou: { rotulo: "Falhou", cor: "bg-red-50 text-red-700" },
};
const TIPO: Record<string, string> = { "aniversario.rascunho": "Parabéns (rascunho)", "aniversario.envio": "Parabéns (envio WhatsApp)" };
const usd = (n: number) => `US$ ${Number(n || 0).toFixed(4)}`;
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Manaus", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function Selo({ status }: { status: string }) {
  const s = STATUS[status] ?? { rotulo: status, cor: "bg-[#f3f3f3] text-[#43474e]" };
  return <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded ${s.cor}`}>{s.rotulo}</span>;
}

function Aprovacao({ t, perm, onFeito }: { t: Tarefa; perm: Permissao | undefined; onFeito: () => void }) {
  const s = (t.saida ?? {}) as { curta?: string; media?: string; recomendada?: "curta" | "media"; motivo?: string; tom?: { natural: boolean; problema: string } | null; acima_do_orcamento?: boolean };
  const e = t.entrada as { ref: string; nome: string; tipo: string; detalhe?: string; whatsapp?: string | null; data?: string };
  const [versao, setVersao] = useState<"curta" | "media">(s.recomendada ?? "curta");
  const [texto, setTexto] = useState(s[s.recomendada ?? "curta"] ?? "");
  const [p, setP] = useState<Permissao>(perm ?? { pessoa_ref: e.ref, pode_whatsapp: false, pode_email: false, pode_story_publica: false });
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState("");

  const salvarPermissao = async (nova: Permissao) => {
    setP(nova);
    const r = await fetch("/api/admin/ia/permissoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...nova, origem: "painel: central de aprovações" }) });
    if (!r.ok) setMsg("Não consegui salvar a permissão.");
  };
  const decidir = async (acao: "aprovar" | "recusar", canal?: "whatsapp" | "manual") => {
    setOcupado(true); setMsg("");
    const r = await fetch(`/api/admin/ia/tarefas/${t.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao, texto, canal }) });
    const j = await r.json().catch(() => ({}));
    setOcupado(false);
    if (!r.ok) { setMsg(j.error || "Falhou."); return; }
    if (canal === "manual") { try { await navigator.clipboard.writeText(texto); } catch { /* sem permissão de cópia */ } }
    onFeito();
  };
  const fone = (e.whatsapp ?? "").replace(/\D/g, "");
  const waManual = fone ? `https://wa.me/${fone.length <= 11 ? `55${fone}` : fone}?text=${encodeURIComponent(texto)}` : null;

  return (
    <article className={`${cardCls} p-4 sm:p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[#0B1F45] font-serif text-lg leading-tight">{e.nome}</p>
          <p className="text-[#43474e] text-xs mt-0.5">{e.tipo}{e.detalhe ? ` · ${e.detalhe}` : ""} · aniversário {e.data}</p>
        </div>
        <Selo status={t.status} />
      </div>

      <div className="flex gap-2 mt-4" role="group" aria-label="Versão">
        {(["curta", "media"] as const).map((v) => s[v] && (
          <button key={v} type="button" onClick={() => { setVersao(v); setTexto(s[v] ?? ""); }}
            className={`min-h-11 px-4 text-xs font-bold uppercase tracking-[0.1em] border ${versao === v ? "bg-[#0B1F45] text-white border-[#0B1F45]" : "border-[#e2e2e2] text-[#43474e]"}`}>
            {v === "curta" ? "Curta" : "Média"}{s.recomendada === v ? " · recomendada" : ""}
          </button>
        ))}
      </div>
      <label className={`${labelCls} mt-4`} htmlFor={`txt-${t.id}`}>Mensagem (pode editar)</label>
      <textarea id={`txt-${t.id}`} value={texto} onChange={(ev) => setTexto(ev.target.value)} rows={3} className={`${inputCls} w-full`} />
      <p className="text-[11px] text-[#43474e] mt-1">{texto.length}/320 · {s.motivo}</p>
      {s.tom && !s.tom.natural && <p className="text-[12px] text-[#8a5a00] mt-1">Checagem de tom: {s.tom.problema}</p>}
      {s.acima_do_orcamento && <p className="text-[12px] text-[#8a5a00] mt-1">Esta tarefa passou do orçamento de tokens.</p>}

      <fieldset className="mt-4">
        <legend className={labelCls}>Permissões desta pessoa</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {([["pode_whatsapp", "WhatsApp"], ["pode_email", "E-mail"], ["pode_story_publica", "Story pública"]] as const).map(([k, r]) => (
            <label key={k} className="inline-flex items-center gap-2 min-h-11 text-sm text-[#0B1F45]">
              <input type="checkbox" className="w-5 h-5" checked={p[k]} onChange={(ev) => salvarPermissao({ ...p, [k]: ev.target.checked })} />
              {r}
            </label>
          ))}
        </div>
        <p className="text-[11px] text-[#43474e]">Contato privado não autoriza Story pública.</p>
      </fieldset>

      {msg && <p className="text-[12px] text-red-700 mt-3">{msg}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
        <button type="button" disabled={ocupado || !p.pode_whatsapp || !fone} onClick={() => decidir("aprovar", "whatsapp")} className={`${btnPrimary} min-h-11`}
          title={!p.pode_whatsapp ? "Marque a permissão de WhatsApp" : !fone ? "Sem número" : ""}>
          Aprovar e enviar
        </button>
        <button type="button" disabled={ocupado} onClick={() => decidir("aprovar", "manual")} className={`${btnGhost} min-h-11`}>
          Aprovar e mando eu
        </button>
        <button type="button" disabled={ocupado} onClick={() => decidir("recusar")} className={`${btnDanger} min-h-11`}>Recusar</button>
      </div>
      {waManual && <a href={waManual} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-11 text-[12px] text-[#1f7a3d] font-semibold mt-1 hover:underline">Abrir no meu WhatsApp com o texto</a>}
    </article>
  );
}

export default function OrganizacaoIATab() {
  const [dados, setDados] = useState<Painel | null>(null);
  const [erro, setErro] = useState("");
  const [rodando, setRodando] = useState(false);
  const [resumo, setResumo] = useState("");

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/ia", { cache: "no-store" });
      if (!r.ok) { setErro("Não consegui carregar."); return; }
      setDados(await r.json()); setErro("");
    } catch { setErro("Não consegui carregar."); }
  }, []);
  useEffect(() => { const t = setTimeout(carregar, 0); return () => clearTimeout(t); }, [carregar]);

  const rodar = async () => {
    setRodando(true); setResumo("");
    const r = await fetch("/api/admin/ia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "rodar" }) });
    const j = await r.json().catch(() => ({}));
    setRodando(false);
    setResumo(r.ok ? `Detectados ${j.detectados} · processadas ${j.processadas} · falhas ${j.falhas}${j.parou_por_tempo ? " · parou pelo tempo" : ""}` : (j.error || "Falhou."));
    carregar();
  };
  const repetir = async (id: string) => {
    await fetch(`/api/admin/ia/tarefas/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "repetir" }) });
    carregar();
  };

  if (erro) return <EmptyState title={erro} />;
  if (!dados) return <div className="py-10 text-center"><Spinner /></div>;
  if (dados.migracaoPendente) return <EmptyState title="Falta rodar a migração 073 no Supabase" hint="Depois disso, esta aba mostra a fila, as aprovações e os custos reais." />;

  const tarefas = dados.tarefas ?? [];
  const pendentes = tarefas.filter((t) => t.status === "aguardando_aprovacao");
  const custo30 = dados.custo30 ?? [];
  const custoTotal = custo30.reduce((s, t) => s + Number(t.custo_usd || 0), 0);
  const aprovadas = custo30.filter((t) => t.status === "concluida" || t.status === "aprovada").length;
  const falhas = custo30.filter((t) => t.status === "falhou").length;
  const porDepto = Object.entries(custo30.reduce<Record<string, number>>((m, t) => ({ ...m, [t.departamento]: (m[t.departamento] ?? 0) + Number(t.custo_usd || 0) }), {}));
  const modeloDo = (nivel: string) => dados.modelos?.find((m) => m.nivel === nivel)?.modelo ?? "não cadastrado";
  const permDe = (ref: string) => dados.permissoes?.find((p) => p.pessoa_ref === ref);

  return (
    <div className="space-y-6">
      <PageHeader title="Organização IA" subtitle="Fila, aprovações e custo reais do runtime de IA."
        actions={<button type="button" onClick={rodar} disabled={rodando} className={`${btnPrimary} min-h-11`}>{rodando ? "Rodando…" : "Rodar agora"}</button>} />
      {resumo && <p className="text-sm text-[#0B1F45]">{resumo}</p>}
      {!dados.chaveConfigurada && (
        <div className={`${cardCls} p-4 border-l-4 border-l-[#d9a400] text-sm text-[#43474e]`}>
          A chave da API (ANTHROPIC_API_KEY) não está configurada na Vercel: a detecção funciona, os rascunhos ficam na fila até a chave existir.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Aguardando você" value={pendentes.length} tone={pendentes.length ? "warn" : "default"} />
        <KpiCard label="Aprovadas (30 dias)" value={aprovadas} />
        <KpiCard label="Falhas (30 dias)" value={falhas} tone={falhas ? "bad" : "default"} />
        <KpiCard label="Custo (30 dias)" value={usd(custoTotal)} hint={aprovadas ? `${usd(custoTotal / aprovadas)} por resultado aprovado` : "sem resultado aprovado ainda"} />
      </div>

      <section aria-labelledby="ia-aprovacoes">
        <h2 id="ia-aprovacoes" className="font-serif text-[#0B1F45] text-xl mb-3">Central de aprovações</h2>
        {pendentes.length === 0
          ? <EmptyState title="Nada aguardando aprovação." />
          : <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{pendentes.map((t) => <Aprovacao key={t.id} t={t} perm={permDe(String(t.entrada.ref))} onFeito={carregar} />)}</div>}
      </section>

      <section aria-labelledby="ia-atividade">
        <h2 id="ia-atividade" className="font-serif text-[#0B1F45] text-xl mb-3">Atividade</h2>
        {tarefas.length === 0 ? <EmptyState title="Nenhuma tarefa ainda." /> : (
          <ul className="space-y-2">
            {tarefas.slice(0, 40).map((t) => (
              <li key={t.id} className={`${cardCls} p-3 sm:p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[#0B1F45] font-semibold min-w-0">{TIPO[t.tipo] ?? t.tipo} · {String(t.entrada.nome ?? "")}</p>
                  <Selo status={t.status} />
                </div>
                <p className="text-[12px] text-[#43474e] mt-1 break-words">
                  {quando(t.criado_em)} · {t.departamento}{t.modelo ? ` · ${t.modelo}` : ""} · {t.tokens_entrada + t.tokens_saida} tokens
                  {t.tokens_cache_leitura ? ` (${t.tokens_cache_leitura} do cache)` : ""} · {usd(t.custo_usd)} · {t.latencia_ms} ms · tentativa {t.tentativas}
                </p>
                {t.erro && <p className="text-[12px] text-red-700 mt-1 break-words">{t.erro}</p>}
                {t.status === "falhou" && <button type="button" onClick={() => repetir(t.id)} className={`${btnGhost} min-h-11 mt-2`}>Tentar de novo</button>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ia-org" className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className={`${cardCls} p-4`}>
          <h2 id="ia-org" className="font-serif text-[#0B1F45] text-xl mb-3">Agentes do runtime</h2>
          {(dados.agentes ?? []).length === 0 ? <p className="text-sm text-[#43474e]">Nenhum agente cadastrado (ai_agents).</p> : (
            <ul className="divide-y divide-[#eee]">
              {(dados.agentes ?? []).map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <p className="text-[#0B1F45] font-semibold">{a.papel} <span className="font-normal text-[#43474e]">· {a.departamento}</span></p>
                  <p className="text-[12px] text-[#43474e] break-words">nível {a.nivel} → {modeloDo(a.nivel)} · autonomia {a.autonomia} · {a.ativo ? "ativo" : "inativo"}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={`${cardCls} p-4`}>
          <h2 className="font-serif text-[#0B1F45] text-xl mb-3">Custo por departamento (30 dias)</h2>
          {porDepto.length === 0 ? <p className="text-sm text-[#43474e]">Sem custo registrado.</p> : (
            <ul className="space-y-1 text-sm">{porDepto.map(([d, c]) => <li key={d} className="flex justify-between gap-3"><span className="text-[#0B1F45]">{d}</span><span className="text-[#43474e]">{usd(c)}</span></li>)}</ul>
          )}
        </div>
      </section>
    </div>
  );
}
