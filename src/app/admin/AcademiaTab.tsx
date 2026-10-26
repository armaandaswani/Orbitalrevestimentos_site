"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyState, Field, KpiCard, PageHeader, Spinner, StatusBadge, TableShell,
  btnGhost, btnPrimary, cardCls, inputCls, tdCls, thCls,
} from "./ui";
import {
  ATUACOES, EXPERIENCIAS, FOCOS, LANCAMENTO_ASSUNTO_PADRAO, LANCAMENTO_TEXTO_PADRAO,
  PRESENCA_ASSUNTO_PADRAO, PRESENCA_TEXTO_PADRAO,
  digitos, rotulo, type Inscricao,
} from "@/lib/academia-waitlist";
import { FOLGA_DESISTENCIAS, LIMITE_TURMA_1, VAGAS_TURMA_1 } from "@/lib/academia-turmas";

/**
 * Formação da Academia Orbital (inscrições vindas de /academia).
 *
 * 1ª turma: gratuita, 20 vagas + folga para desistências (regras em
 * src/lib/academia-turmas.ts). Lotou → as inscrições novas vão para a fila
 * da 2ª turma. Uma semana antes, o admin pede a confirmação de presença; quem
 * responde "não vou" libera a vaga, e a vaga vai para o próximo da fila (o
 * admin chama, pelo botão). WhatsApp é o canal principal, por isso cada linha
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

/** Antes da migration 065 a coluna não existe: todo mundo é da 1ª turma. */
function turmaDe(r: Inscricao): 1 | 2 {
  return r.turma === 2 ? 2 : 1;
}

/** Ocupa vaga na 1ª turma: está nela e não respondeu "não vou". */
function ocupaVaga(r: Inscricao): boolean {
  return turmaDe(r) === 1 && r.presenca !== "nao";
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

/** O que já foi enviado para a pessoa (migration 058). */
function Avisos({ r }: { r: Inscricao }) {
  const conf = [r.confirmation_whatsapp_at && "WhatsApp", r.confirmation_email_at && "e-mail"].filter(Boolean).join(" + ");
  const lanc = [r.launch_whatsapp_at && "WhatsApp", r.launch_email_at && "e-mail"].filter(Boolean).join(" + ");
  return (
    <span className="text-[11px] leading-snug">
      <span className={conf ? "text-[#1f7a3d]" : "text-[#b0b4bc]"}>Confirmação: {conf || "—"}</span>
      {r.launch_notified_at && (
        <span className={`block ${lanc ? "text-[#1f7a3d]" : "text-[#b3261e]"}`}>Aviso geral: {lanc ? "enviado" : "não entregue"}</span>
      )}
      {r.presenca_pedida_at && (
        <span className="block text-[#43474e]">Presença pedida em {dataCurta(r.presenca_pedida_at)}</span>
      )}
    </span>
  );
}

/** Turma e resposta de presença, num relance. */
function Situacao({ r }: { r: Inscricao }) {
  const semData = r.disponivel_na_data === false && <StatusBadge tone="yellow">Não pode em 31/10</StatusBadge>;
  if (turmaDe(r) === 2) {
    return (
      <span className="inline-flex flex-wrap gap-1">
        <StatusBadge tone="gray">Fila 2ª turma</StatusBadge>
        {semData}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap gap-1">
      <StatusBadge tone="navy">1ª turma</StatusBadge>
      {semData}
      {r.presenca === "sim" && <StatusBadge tone="green">Vai</StatusBadge>}
      {r.presenca === "nao" && <StatusBadge tone="red">Não vai · vaga liberada</StatusBadge>}
      {!r.presenca && r.presenca_pedida_at && <StatusBadge tone="yellow">Sem resposta</StatusBadge>}
    </span>
  );
}

/**
 * Ajustes manuais: presença respondida por fora (no WhatsApp, por exemplo) e
 * troca de turma. Tocar de novo na resposta marcada volta para "sem resposta".
 */
function Acoes({ r, mudar, ocupado }: { r: Inscricao; mudar: (id: string, campos: Partial<Inscricao>) => void; ocupado: boolean }) {
  const b = "border px-2 py-1 text-[10px] uppercase tracking-wide font-bold transition-colors disabled:opacity-50";
  if (turmaDe(r) === 2) {
    return (
      <button type="button" disabled={ocupado} onClick={() => mudar(r.id, { turma: 1 })} className={`${b} border-[#0B1F45] text-[#0B1F45] hover:bg-[#0B1F45] hover:text-white`}>
        Chamar para a 1ª turma
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap gap-1">
      <button
        type="button" disabled={ocupado} aria-pressed={r.presenca === "sim"}
        onClick={() => mudar(r.id, { presenca: r.presenca === "sim" ? null : "sim" })}
        className={`${b} ${r.presenca === "sim" ? "bg-green-700 border-green-700 text-white" : "border-[#e2e2e2] text-[#43474e] hover:border-green-700"}`}
      >
        Vai
      </button>
      <button
        type="button" disabled={ocupado} aria-pressed={r.presenca === "nao"}
        onClick={() => mudar(r.id, { presenca: r.presenca === "nao" ? null : "nao" })}
        className={`${b} ${r.presenca === "nao" ? "bg-red-700 border-red-700 text-white" : "border-[#e2e2e2] text-[#43474e] hover:border-red-700"}`}
      >
        Não vai
      </button>
      <button type="button" disabled={ocupado} onClick={() => mudar(r.id, { turma: 2 })} className={`${b} border-[#e2e2e2] text-[#74777f] hover:border-[#0B1F45]`}>
        Mover p/ fila
      </button>
    </span>
  );
}

type Destino = "todos" | 1 | 2;

/**
 * Disparo para os inscritos — o aviso geral e o pedido de confirmação de
 * presença usam o mesmo fluxo: texto editável, teste para a Orbital e envio em
 * lotes para quem ainda não recebeu (a API devolve quantos faltam).
 */
function Disparo({
  modo, lista, aoTerminar,
}: { modo: "presenca" | "aviso"; lista: Inscricao[]; aoTerminar: () => void }) {
  const presenca = modo === "presenca";
  const [assunto, setAssunto] = useState(presenca ? PRESENCA_ASSUNTO_PADRAO : LANCAMENTO_ASSUNTO_PADRAO);
  const [texto, setTexto] = useState(presenca ? PRESENCA_TEXTO_PADRAO : LANCAMENTO_TEXTO_PADRAO);
  const [destino, setDestino] = useState<Destino>(presenca ? 1 : 2);
  const [status, setStatus] = useState("");
  const [enviando, setEnviando] = useState(false);
  // Número para o teste (vazio = WhatsApp de alertas da Orbital). Lembrado neste navegador.
  const [telTeste, setTelTeste] = useState(() => {
    try { return typeof window === "undefined" ? "" : localStorage.getItem("orbital_academia_tel_teste") ?? ""; } catch { return ""; }
  });

  // Mesmo critério da API, para o botão dizer quantos vão receber.
  const pendentes = presenca
    ? lista.filter((r) => turmaDe(r) === 1 && !r.presenca && !r.presenca_pedida_at).length
    : lista.filter((r) => !r.launch_notified_at && (destino === "todos" || turmaDe(r) === destino)).length;
  const faltaPreencher = presenca && /\[[^\]]*\]/.test(texto);
  const semLink = presenca && !texto.includes("{link}");

  async function chamar(teste: boolean) {
    const res = await fetch(presenca ? "/api/admin/academia/presenca" : "/api/admin/academia/lancamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texto, assunto, teste,
        ...(teste && telTeste.trim() ? { telefone_teste: telTeste.trim() } : {}),
        ...(!presenca && destino !== "todos" ? { turma: destino } : {}),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);
    return json;
  }

  async function testar() {
    setEnviando(true);
    setStatus("Enviando teste…");
    try {
      try { localStorage.setItem("orbital_academia_tel_teste", telTeste.trim()); } catch { /* modo privado */ }
      const r = await chamar(true);
      const para = r.para ? ` para ${r.para}` : "";
      setStatus(
        `Teste: WhatsApp ${r.whatsapp ? `enviado${para}` : `NÃO enviado${para}${r.erroWhatsapp ? ` — ${r.erroWhatsapp}` : ""}`}` +
        ` · e-mail ${r.email ? "enviado" : "NÃO enviado"} (para a Orbital).`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Falha no teste.");
    } finally {
      setEnviando(false);
    }
  }

  async function enviarTodos() {
    const quem = presenca ? "da 1ª turma" : destino === 1 ? "da 1ª turma" : destino === 2 ? "da fila da 2ª turma" : "";
    if (!window.confirm(`Enviar por WhatsApp e e-mail para ${pendentes} inscrito(s) ${quem} que ainda não receberam? Não dá para desfazer.`)) return;
    setEnviando(true);
    let whats = 0, mail = 0, sem = 0, feitos = 0;
    try {
      for (let volta = 0; volta < 500; volta++) {
        const r = await chamar(false);
        feitos += r.processados; whats += r.whatsapp; mail += r.email; sem += r.semEntrega;
        setStatus(`Enviando… ${feitos} enviados, faltam ${r.faltam}.`);
        if (!r.processados || !r.faltam) break;
      }
      setStatus(`Pronto: ${feitos} enviados · ${whats} por WhatsApp · ${mail} por e-mail${sem ? ` · ${sem} sem entrega` : ""}.`);
    } catch (e) {
      setStatus(`${e instanceof Error ? e.message : "Falha no envio."} ${feitos ? `(${feitos} já enviados — pode continuar, ninguém recebe duas vezes.)` : ""}`);
    } finally {
      setEnviando(false);
      aoTerminar();
    }
  }

  return (
    <div className={`${cardCls} p-4 mb-6 space-y-3`}>
      <p className="text-[#0B1F45] text-sm font-bold">{presenca ? "Pedir confirmação de presença (1ª turma)" : "Aviso geral"}</p>
      <p className="text-[#74777f] text-xs">
        {presenca
          ? <>Envie uma semana antes. Data e horário já vêm preenchidos (31/10, 7h30); troque [local]. {"{link}"} (opcional) vira o link pessoal Vou / Não vou — quem responde &quot;não vou&quot; libera a vaga. {"{nome}"} vira o primeiro nome. Quem já recebeu ou já respondeu não recebe de novo.</>
          : <>Vai por WhatsApp e, para quem informou, por e-mail. {"{nome}"} vira o primeiro nome. Quem já recebeu um aviso geral não recebe de novo.</>}
      </p>
      {!presenca && (
        <select value={String(destino)} onChange={(e) => setDestino(e.target.value === "todos" ? "todos" : (Number(e.target.value) as 1 | 2))} className={inputCls} aria-label="Para quem">
          <option value="2">Fila da 2ª turma</option>
          <option value="1">1ª turma</option>
          <option value="todos">Todos os inscritos</option>
        </select>
      )}
      <input value={assunto} onChange={(e) => setAssunto(e.target.value)} className={inputCls} aria-label="Assunto do e-mail" placeholder="Assunto do e-mail" />
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} className={`${inputCls} min-h-[220px]`} aria-label="Mensagem" />
      {faltaPreencher && <p className="text-[#b3261e] text-xs">Troque os [colchetes] (o local) pelo texto certo — o envio fica bloqueado até lá.</p>}
      {semLink && (
        <p className="text-[#8a5a00] text-xs">
          Sem {"{link}"}, a resposta não é registrada sozinha: marque <strong>Vai</strong> / <strong>Não vai</strong> na lista abaixo conforme as pessoas entrarem no grupo.
        </p>
      )}
      <div>
        <label className="block text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] mb-1" htmlFor={`tel-teste-${modo}`}>
          WhatsApp do teste (opcional)
        </label>
        <input id={`tel-teste-${modo}`} type="tel" inputMode="tel" value={telTeste} onChange={(e) => setTelTeste(e.target.value)}
          className={`${inputCls} sm:max-w-xs`} placeholder="(92) 9 9999-9999 — vazio: WhatsApp da Orbital" />
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" onClick={testar} disabled={enviando || faltaPreencher} className={`${btnGhost} w-full sm:w-auto`}>Enviar teste</button>
        <button type="button" onClick={enviarTodos} disabled={enviando || pendentes === 0 || faltaPreencher} className={`${btnPrimary} w-full sm:w-auto`}>
          {pendentes ? `Enviar para ${pendentes} inscrito(s)` : "Todos já receberam"}
        </button>
      </div>
      {status && <p className="text-[#43474e] text-xs" role="status">{status}</p>}
    </div>
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
  const [fTurma, setFTurma] = useState("");
  const [fPresenca, setFPresenca] = useState("");
  // Instante do carregamento: "últimos 7 dias" conta a partir dele, e não de um
  // Date.now() durante a renderização (que a tornaria impura).
  const [carregadoEm, setCarregadoEm] = useState(0);
  const [disparo, setDisparo] = useState<"" | "presenca" | "aviso">("");
  const [salvando, setSalvando] = useState("");
  const [erroAcao, setErroAcao] = useState("");

  const aplicar = useCallback((c: Carga) => {
    setLista(c.lista);
    setErro(c.erro);
    setCarregadoEm(c.em);
  }, []);

  /** Ajuste manual de uma linha; a tela troca a linha pela que o banco devolveu. */
  const mudar = useCallback(async (id: string, campos: Partial<Inscricao>) => {
    setSalvando(id);
    setErroAcao("");
    try {
      const res = await fetch("/api/admin/academia", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...campos }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);
      setLista((l) => (l ? l.map((r) => (r.id === id ? (json as Inscricao) : r)) : l));
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando("");
    }
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
      if (fTurma && String(turmaDe(r)) !== fTurma) return false;
      if (fPresenca === "sim" && r.presenca !== "sim") return false;
      if (fPresenca === "nao" && r.presenca !== "nao") return false;
      if (fPresenca === "sem" && r.presenca) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.city ?? "").toLowerCase().includes(q) ||
        (qDig.length >= 3 && digitos(r.phone).includes(qDig))
      );
    });
  }, [lista, busca, fAtuacao, fFoco, fTurma, fPresenca]);

  const resumo = useMemo(() => {
    const l = lista ?? [];
    const semana = l.filter((r) => carregadoEm - new Date(r.created_at).getTime() < 7 * DIA).length;
    const comEmail = l.filter((r) => r.email).length;
    // Foco mais comum: diz que tipo de profissional a lista está atraindo.
    const cont = new Map<string, number>();
    for (const r of l) if (r.main_focus) cont.set(r.main_focus, (cont.get(r.main_focus) ?? 0) + 1);
    const topo = [...cont.entries()].sort((a, b) => b[1] - a[1])[0];
    const vagasOcupadas = l.filter(ocupaVaga).length;
    const turma1 = l.filter((r) => turmaDe(r) === 1);
    const vai = turma1.filter((r) => r.presenca === "sim").length;
    const naoVai = turma1.filter((r) => r.presenca === "nao").length;
    // Fila em ordem de chegada: quem chegou primeiro é chamado primeiro — só
    // quem pode na data da 1ª turma (quem disse que não pode espera a 2ª).
    const turma2 = l.filter((r) => turmaDe(r) === 2);
    const fila = turma2.filter((r) => r.disponivel_na_data !== false).sort((a, b) => a.created_at.localeCompare(b.created_at));
    return {
      total: l.length, semana, comEmail, vagasOcupadas, vai, naoVai, fila, turma2: turma2.length,
      semResposta: turma1.length - vai - naoVai,
      livres: Math.max(0, LIMITE_TURMA_1 - vagasOcupadas),
      topoFoco: topo ? `${rotulo(FOCOS, topo[0])} (${topo[1]})` : "—",
    };
  }, [lista, carregadoEm]);

  const filtrando = !!(busca || fAtuacao || fFoco || fTurma || fPresenca);

  return (
    <div>
      <PageHeader
        title="Academia Orbital · Formação"
        subtitle={`Pré-inscrições pela página /academia. 1ª turma gratuita: ${VAGAS_TURMA_1} vagas + ${FOLGA_DESISTENCIAS} de folga para desistências (o site nunca mostra o número).`}
        actions={
          <>
            <a href="/academia" target="_blank" rel="noopener noreferrer" className={btnGhost}>Ver página</a>
            <button type="button" onClick={() => setDisparo((v) => (v === "presenca" ? "" : "presenca"))} className={btnGhost} disabled={!lista?.length}>
              {disparo === "presenca" ? "Fechar" : "Pedir confirmação de presença"}
            </button>
            <button type="button" onClick={() => setDisparo((v) => (v === "aviso" ? "" : "aviso"))} className={btnGhost} disabled={!lista?.length}>
              {disparo === "aviso" ? "Fechar" : "Aviso geral"}
            </button>
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
          hint="Rode as migrations 056, 058 e 065 (academy_waitlist) no SQL Editor do Supabase. Até lá, o formulário da página /academia recusa os cadastros com uma mensagem de erro — nada é perdido em silêncio."
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
            <KpiCard
              label="1ª turma"
              value={`${resumo.vagasOcupadas} / ${LIMITE_TURMA_1}`}
              hint={resumo.livres ? `${resumo.livres} vaga(s) livre(s)` : "Preenchida"}
              tone={resumo.livres ? "default" : "warn"}
              onClick={() => { setFTurma("1"); setFPresenca(""); }}
            />
            <KpiCard
              label="Fila da 2ª turma"
              value={resumo.turma2}
              hint={resumo.turma2 > resumo.fila.length ? `${resumo.turma2 - resumo.fila.length} não podem em 31/10 · os demais são chamados por ordem` : "Chamados por ordem de chegada"}
              onClick={() => { setFTurma("2"); setFPresenca(""); }}
            />
            <KpiCard
              label="Presença (1ª turma)"
              value={<span className="text-base sm:text-lg">{resumo.vai} vão · {resumo.naoVai} não</span>}
              hint={`${resumo.semResposta} sem resposta`}
              tone={resumo.vai ? "good" : "default"}
            />
            <KpiCard label="Últimos 7 dias" value={resumo.semana} tone={resumo.semana ? "good" : "default"} hint={`Foco mais comum: ${resumo.topoFoco}`} />
          </div>

          {/* Desistência abriu vaga e há fila: lembra quem chamar. */}
          {resumo.livres > 0 && resumo.fila.length > 0 && (
            <div className={`${cardCls} border-l-4 border-l-amber-500 p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between`}>
              <p className="text-[#0B1F45] text-sm">
                {resumo.livres === 1 ? "1 vaga liberada" : `${resumo.livres} vagas liberadas`} na 1ª turma. Próximo da fila:{" "}
                <strong>{resumo.fila[0].name}</strong> · <WhatsLink phone={resumo.fila[0].phone} />
              </p>
              <button type="button" disabled={!!salvando} onClick={() => mudar(resumo.fila[0].id, { turma: 1 })} className={`${btnPrimary} w-full sm:w-auto`}>
                Chamar para a 1ª turma
              </button>
            </div>
          )}

          {disparo && resumo.total > 0 && (
            <Disparo key={disparo} modo={disparo} lista={lista} aoTerminar={() => buscarLista().then(aplicar)} />
          )}
          {erroAcao && <p className="text-[#b3261e] text-xs mb-4" role="alert">{erroAcao}</p>}

          {resumo.total === 0 ? (
            <EmptyState
              title="Nenhum inscrito ainda"
              hint="Os cadastros feitos em /academia aparecem aqui, com atalho direto para o WhatsApp de cada pessoa."
            />
          ) : (
            <>
              <div className={`${cardCls} p-3 sm:p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3`}>
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
                <select value={fTurma} onChange={(e) => setFTurma(e.target.value)} className={inputCls} aria-label="Filtrar por turma">
                  <option value="">1ª turma e fila</option>
                  <option value="1">1ª turma</option>
                  <option value="2">Fila da 2ª turma</option>
                </select>
                <select value={fPresenca} onChange={(e) => setFPresenca(e.target.value)} className={inputCls} aria-label="Filtrar por presença">
                  <option value="">Qualquer presença</option>
                  <option value="sim">Vai</option>
                  <option value="nao">Não vai</option>
                  <option value="sem">Sem resposta</option>
                </select>
              </div>

              <p className="text-[#74777f] text-xs mb-3">
                {filtrando ? `${filtrada.length} de ${resumo.total} inscritos` : `${resumo.total} inscritos`}
                {filtrando && (
                  <button type="button" onClick={() => { setBusca(""); setFAtuacao(""); setFFoco(""); setFTurma(""); setFPresenca(""); }} className="ml-3 underline hover:text-[#0B1F45]">
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
                          <p className="font-serif text-[#0B1F45] text-base leading-tight min-w-0 break-words">{r.name}</p>
                          <span className="text-[#74777f] text-[11px] flex-shrink-0">{dataCurta(r.created_at)}</span>
                        </div>
                        <div className="mb-2"><Situacao r={r} /></div>
                        <div className="flex flex-col gap-1 text-xs">
                          <WhatsLink phone={r.phone} />
                          {r.email && <span className="text-[#43474e] break-all">{r.email}</span>}
                          <Field label="Cidade">{r.city || "—"}</Field>
                          <Field label="Atuação">{atuacao(r)}</Field>
                          <Field label="Foco">{foco(r) || "—"}</Field>
                          <Field label="Profissão">{rotulo(EXPERIENCIAS, r.years_experience) || "—"}</Field>
                          <Avisos r={r} />
                        </div>
                        <div className="mt-3"><Acoes r={r} mudar={mudar} ocupado={salvando === r.id} /></div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: tabela. */}
                  <TableShell className="hidden md:block">
                    <thead>
                      <tr>
                        <th className={thCls}>Data</th>
                        <th className={thCls}>Nome</th>
                        <th className={thCls}>Turma / presença</th>
                        <th className={thCls}>Contato</th>
                        <th className={thCls}>Perfil</th>
                        <th className={thCls}>Avisos</th>
                        <th className={thCls}>Ajustar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrada.map((r) => (
                        <tr key={r.id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#F6F5F2]">
                          <td className={`${tdCls} whitespace-nowrap text-[#74777f]`}>{dataCurta(r.created_at)}</td>
                          <td className={`${tdCls} text-[#0B1F45] font-semibold`}>{r.name}</td>
                          <td className={tdCls}><Situacao r={r} /></td>
                          <td className={tdCls}>
                            <WhatsLink phone={r.phone} />
                            {r.email && <span className="block break-all text-[11px] mt-0.5">{r.email}</span>}
                          </td>
                          {/* Atuação, foco, tempo de profissão e cidade numa célula só:
                              com uma coluna para cada, a tabela não cabia na tela. */}
                          <td className={`${tdCls} min-w-[180px]`}>
                            <span className="block text-[#0B1F45]">{atuacao(r)} · {rotulo(EXPERIENCIAS, r.years_experience) || "—"}</span>
                            <span className="block text-[11px]">{foco(r) || "—"} · {r.city || "—"}</span>
                          </td>
                          <td className={tdCls}><Avisos r={r} /></td>
                          <td className={tdCls}><Acoes r={r} mudar={mudar} ocupado={salvando === r.id} /></td>
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
