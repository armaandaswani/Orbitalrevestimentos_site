"use client";

import { useState } from "react";
import { StatusBadge, btnGhost, btnPrimary, cardCls } from "./ui";

/**
 * Diagnóstico dos avisos por e-mail: o que o Resend fez com os últimos e-mails
 * para a caixa da empresa, e um envio de teste com a resposta exata do Resend.
 */

type Diag = {
  configurado: boolean;
  destino: string;
  lista_erro?: string | null;
  total_recentes?: number;
  ultimo_envio?: string | null;
  contagem?: Record<string, number>;
  para_empresa?: { id: string; created_at: string; subject: string; last_event: string }[];
  dominio?: { status: string } | null;
  dominio_erro?: string | null;
};

type Teste = { ok: boolean; id?: string | null; erro?: string; destino?: string };

const EVENTO: Record<string, { label: string; tone: "green" | "yellow" | "red" | "gray" | "blue" }> = {
  delivered: { label: "Entregue", tone: "green" },
  opened: { label: "Aberto", tone: "green" },
  clicked: { label: "Clicado", tone: "green" },
  sent: { label: "Enviado", tone: "blue" },
  queued: { label: "Na fila", tone: "gray" },
  scheduled: { label: "Agendado", tone: "gray" },
  delivery_delayed: { label: "Atrasado", tone: "yellow" },
  bounced: { label: "Devolvido", tone: "red" },
  complained: { label: "Marcado como spam", tone: "red" },
  suppressed: { label: "Bloqueado pelo Resend", tone: "red" },
  failed: { label: "Falhou", tone: "red" },
  canceled: { label: "Cancelado", tone: "gray" },
};

const BLOQUEIO = new Set(["suppressed", "complained", "bounced"]);

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Manaus", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Leitura do diagnóstico em linguagem direta: o problema e o que fazer. */
function Conclusao({ d }: { d: Diag }) {
  const caixa = (tone: "red" | "green" | "amber", titulo: string, texto: React.ReactNode) => (
    <div className={`mt-3 p-3 rounded-md text-xs leading-relaxed ${tone === "red" ? "bg-red-50 text-red-800" : tone === "green" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
      <p className="font-bold mb-1">{titulo}</p>
      <div>{texto}</div>
    </div>
  );

  if (!d.configurado) {
    return caixa("red", "A chave do Resend não está configurada", "Sem a variável RESEND_API_KEY no Vercel (Settings → Environment Variables, ambiente Production), nenhum e-mail do site sai. Confira se ela existe e faça um novo deploy depois de salvar.");
  }
  if (d.dominio && d.dominio.status !== "verified") {
    return caixa("red", `Domínio de envio não verificado no Resend (status: ${d.dominio.status})`, "No painel do Resend, abra Domains → orbitalrevestimentos.com.br e clique em Verify. Enquanto o domínio não estiver verificado, os envios são recusados.");
  }
  const lista = d.para_empresa ?? [];
  const bloqueado = lista.find((e) => BLOQUEIO.has(e.last_event));
  if (bloqueado) {
    return caixa("red", `O Resend está bloqueando os e-mails para ${d.destino}`, (
      <>
        Isso acontece quando um e-mail do site foi marcado como spam ou voltou: o Resend coloca o endereço numa lista de bloqueio e para de entregar, sem dar erro para o site. Para resolver:
        <ol className="list-decimal pl-5 mt-1 space-y-0.5">
          <li>No painel do Resend, abra <strong>Suppressions</strong> e remova {d.destino}.</li>
          <li>No Gmail de {d.destino}, procure <strong>from:noreply@orbitalrevestimentos.com.br in:anywhere</strong>, marque como <strong>Não é spam</strong> e crie um filtro &quot;Nunca enviar para spam&quot; para esse remetente.</li>
          <li>Volte aqui e clique em Enviar e-mail de teste.</li>
        </ol>
      </>
    ));
  }
  if (lista.length && ["delivered", "opened", "clicked"].includes(lista[0].last_event)) {
    return caixa("amber", "O Resend está entregando ao Gmail", (
      <>
        Os e-mails chegam ao Gmail de {d.destino}. Se não aparecem na caixa de entrada, estão sendo filtrados lá: procure <strong>from:noreply@orbitalrevestimentos.com.br in:anywhere</strong> (inclui Spam, Lixeira e Promoções), marque como Não é spam e crie um filtro &quot;Nunca enviar para spam&quot;. Confira também se há algum filtro ou encaminhamento em Configurações → Filtros.
      </>
    ));
  }
  if (d.lista_erro) {
    return caixa("amber", "Não foi possível ler o histórico do Resend", `${d.lista_erro}. A chave pode ter só permissão de envio. Use o botão de teste: ele mostra a resposta exata do Resend.`);
  }
  if (!lista.length) {
    return caixa("amber", `Nenhum dos últimos ${d.total_recentes ?? 0} e-mails do site foi para ${d.destino}`, "O site não enviou nada para a caixa da empresa nesse período. Use o botão de teste para confirmar que um envio chega.");
  }
  return caixa("green", "Nenhum bloqueio encontrado", "Os últimos e-mails não mostram erro. Use o teste para confirmar a chegada.");
}

export default function EmailDiagnostico() {
  const [d, setD] = useState<Diag | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [teste, setTeste] = useState<Teste | null>(null);
  const [testando, setTestando] = useState(false);

  async function verificar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/admin/email-diagnostico", { cache: "no-store" });
      setD(res.ok ? await res.json() : { configurado: true, destino: "", lista_erro: `HTTP ${res.status}` });
    } catch {
      setD({ configurado: true, destino: "", lista_erro: "Sem conexão" });
    }
    setCarregando(false);
  }

  async function testar() {
    setTestando(true);
    try {
      const res = await fetch("/api/admin/email-diagnostico", { method: "POST" });
      setTeste(res.ok ? await res.json() : { ok: false, erro: `HTTP ${res.status}` });
    } catch {
      setTeste({ ok: false, erro: "Sem conexão" });
    }
    setTestando(false);
  }

  return (
    <div className={`${cardCls} p-4 mb-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[#0B1F45] text-sm font-semibold">Diagnóstico dos avisos por e-mail</p>
          <p className="text-[#74777f] text-xs mt-0.5">Mostra o que aconteceu com os últimos e-mails do site para a caixa da empresa.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button type="button" onClick={verificar} disabled={carregando} className={`${btnGhost} w-full sm:w-auto`}>{carregando ? "Verificando…" : "Verificar"}</button>
          <button type="button" onClick={testar} disabled={testando} className={`${btnPrimary} w-full sm:w-auto`}>{testando ? "Enviando…" : "Enviar e-mail de teste"}</button>
        </div>
      </div>

      {teste && (
        <div className={`mt-3 p-3 rounded-md text-xs ${teste.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {teste.ok
            ? <>O Resend aceitou o e-mail de teste para {teste.destino}. Confira a caixa de entrada (e o Spam) em 1 a 2 minutos, depois clique em Verificar para ver se foi entregue ou bloqueado.</>
            : <><strong>O Resend recusou o envio:</strong> <span className="break-words">{teste.erro}</span></>}
        </div>
      )}

      {d && (
        <>
          <Conclusao d={d} />
          {(d.para_empresa?.length ?? 0) > 0 && (
            <div className="mt-3">
              <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[#74777f] mb-2">Últimos e-mails para {d.destino}</p>
              <ul className="divide-y divide-[#f0f0f0]">
                {d.para_empresa!.map((e) => {
                  const ev = EVENTO[e.last_event] ?? { label: e.last_event, tone: "gray" as const };
                  return (
                    <li key={e.id} className="py-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-[#0B1F45] break-words">{e.subject}</p>
                        <p className="text-[11px] text-[#74777f]">{quando(e.created_at)}</p>
                      </div>
                      <span className="flex-shrink-0"><StatusBadge tone={ev.tone}>{ev.label}</StatusBadge></span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {d.contagem && Object.keys(d.contagem).length > 0 && (
            <p className="mt-2 text-[11px] text-[#74777f]">
              Últimos {d.total_recentes} e-mails do site (todos os destinos):{" "}
              {Object.entries(d.contagem).map(([k, n]) => `${EVENTO[k]?.label ?? k}: ${n}`).join(" · ")}
              {d.ultimo_envio ? ` · último em ${quando(d.ultimo_envio)}` : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
}
