import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { EMAIL_EMPRESA } from "@/lib/email-destinos";
import { aniversariantes } from "@/lib/aniversarios-server";
import { enfileirar } from "@/lib/ia/fila";
import { rodarWorker } from "@/lib/ia/worker";
import { resumoStories, type DirectPendente } from "@/lib/instagram-resumo";
import { avisarDono } from "@/lib/instagram-aviso";
import {
  BUCKET_AGENDA, GRAPH, contaDoToken, destravar, gravarAgendado, hojeManaus, listarAgendados,
  tokenParaPublicar, travar, type Agendado,
} from "@/lib/instagram-agenda";

export const maxDuration = 300;

/**
 * De hora em hora das 12h às 15h UTC (8h às 11h em Manaus): publica os Stories
 * de aniversário que o dono aprovou antes e agendou para hoje (fim de semana
 * fechado na sexta, viagem), e apaga a mídia. Sem marcação pela API (user_tags):
 * ela entra calada e não sai mais no app. O dono marca pelo app, avisado pelo
 * WhatsApp da Ste com o @ (decisão dele, 07/11/2026).
 *
 * Nunca publica duas vezes: uma trava por arquivo deixa só uma execução por vez;
 * cada Story ganha um container da Meta que fica gravado ("processando") antes
 * de qualquer espera, e as execuções seguintes continuam daquele container (que
 * vale 24 h) em vez de criar outro. A Meta recusa publicar o mesmo container de novo.
 *
 * A mensagem de parabéns (escrita no Mac, no estilo do dono, com "bom dia") vai
 * para a fila do WhatsApp da Ste com as travas do painel; o rascunho do painel
 * para a mesma pessoa sai da fila de aprovação. Dia que passou não sai atrasado:
 * vira "expirado". Manda um resumo por e-mail sempre que algo muda; quem tem @
 * confirmado vem nele com o Direct pronto para a equipe mandar pelo celular (a
 * API não começa conversa no Direct).
 */

const TRAVA = "_cron.lock";
const POLL_MS = 5000;
const ORCAMENTO_MS = 200_000; // sobra tempo para o WhatsApp e o e-mail dentro dos 300 s

async function graph(token: string, metodo: "GET" | "POST", caminho: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH}/${caminho}`);
  const init: RequestInit = { method: metodo, headers: { Authorization: `Bearer ${token}` }, cache: "no-store" };
  if (metodo === "GET") for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  else init.body = new URLSearchParams(params);
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Meta ${res.status} em ${caminho}: ${data.error?.message ?? "sem detalhe"}`);
  return data;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** WhatsApp da Ste com as travas do painel. Devolve o que aconteceu, em uma linha. */
async function parabensPeloWhatsapp(db: SupabaseClient, a: Agendado, ano: number, pessoas: Awaited<ReturnType<typeof aniversariantes>>["deHoje"]) {
  if (!a.mensagem) return { texto: "sem mensagem agendada", naFila: false };
  const p = pessoas.find((x) => (a.handle && x.instagram?.toLowerCase() === a.handle) || semAcento(x.nome) === semAcento(a.nome));
  if (!p) return { texto: "pessoa não achada na base de aniversários de hoje", naFila: false };
  if (!p.whatsapp) return { texto: "sem WhatsApp na base", naFila: false };

  // Já parabenizada este ano por qualquer canal (o dono pode ter mandado pelo celular): não repete.
  const { data: antes } = await db.from("relacionamento_envios").select("canal, status").eq("pessoa_ref", p.ref).eq("ano", ano);
  const feito = (antes ?? []).find((e) => e.status !== "falhou");
  if (feito) return { texto: `já parabenizada este ano (${feito.canal}), não repeti`, naFila: false };

  // O rascunho do painel para a mesma pessoa sai da fila de aprovação e vira o "pai" deste envio.
  const { data: rascunho } = await db.from("ai_tasks").select("id, status").eq("chave_dedupe", `aniversario.rascunho:${p.ref}:${ano}`).maybeSingle();
  if (rascunho && ["fila", "aguardando_aprovacao", "falhou"].includes(rascunho.status)) {
    await db.from("ai_tasks").update({ status: "aprovada", decidido_por: "dono (agendado)", decidido_em: new Date().toISOString() }).eq("id", rascunho.id);
  }
  const criou = await enfileirar(db, {
    tipo: "aniversario.envio", departamento: "relacionamento", autonomia: 4, pai_id: rascunho?.id,
    chave_dedupe: `aniversario.envio:${p.ref}:${ano}:whatsapp`,
    entrada: { ref: p.ref, nome: p.nome, ano, telefone: p.whatsapp, texto: a.mensagem, aprovado_por: `dono, agendado: ${a.aprovacao}` },
    orcamento_tokens: 0,
  });
  return criou ? { texto: "na fila do WhatsApp da Ste", naFila: true } : { texto: "o painel já tinha um envio na fila para ela (vale o do painel)", naFila: false };
}

export async function GET(req: NextRequest) {
  // Publica em nome da Orbital: sem CRON_SECRET configurado, não roda (nem em preview).
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const inicio = Date.now();
  const db = supabaseAdmin();
  const storage = db.storage.from(BUCKET_AGENDA);
  const hoje = hojeManaus();
  const ano = Number(hoje.slice(0, 4));

  const { error: semBucket } = await storage.list("", { limit: 1 });
  if (semBucket) {
    if (/not.?found/i.test(semBucket.message)) return NextResponse.json({ hoje, pulado: "nenhum agendamento ainda" });
    return NextResponse.json({ error: semBucket.message }, { status: 500 });
  }
  if (!(await travar(TRAVA))) return NextResponse.json({ hoje, pulado: "outra execução em andamento" });

  const linhas: string[] = [];
  const directs: DirectPendente[] = [];
  const comDirect: Agendado[] = [];
  let worker = null;
  try {
    // Renova o token todo dia, haja Story ou não: um agendamento distante não pode achar o token vencido.
    let token: string | null = null;
    let erroToken = "";
    try {
      token = await tokenParaPublicar();
    } catch (e) {
      erroToken = e instanceof Error ? e.message : String(e);
    }

    const todos = await listarAgendados();

    // Dia que passou: não publica atrasado; apaga a mídia e avisa. O registro fica 30 dias.
    const limite30 = new Date(Date.parse(hoje) - 30 * 86400000).toISOString().slice(0, 10);
    for (const a of todos.filter((x) => x.data < hoje)) {
      if (a.status === "pendente" || a.status === "processando") {
        await storage.remove([a.midia]);
        await gravarAgendado({ ...a, status: "expirado", erro: "Não foi publicado no dia." });
        linhas.push(`${a.nome} (${a.data}): EXPIROU sem publicar. Confira no app se saiu.`);
      } else if (a.data < limite30) {
        await storage.remove([`${a.data}/${a.id}.json`]);
      }
    }

    const deHoje = todos.filter((a) => a.data === hoje && (a.status === "pendente" || a.status === "processando"));
    if (deHoje.length) {
      const igUser = token ? await contaDoToken(token) : null;
      if (!igUser) {
        const erro = erroToken || (token ? "O token guardado não é mais da @orbitalrevestimentos ou venceu" : "Nenhum token guardado")
          + ": rode \"verificar\" no Mac e agende de novo.";
        for (const a of deHoje.filter((x) => x.status === "pendente")) {
          await storage.remove([a.midia]);
          await gravarAgendado({ ...a, status: "erro", erro });
          linhas.push(`${a.nome}: NÃO publicado (${erro})`);
        }
      } else {
        const tk = token as string;
        // 1) Cria o container dos pendentes e grava ANTES de esperar a Meta.
        const emAndamento: Agendado[] = deHoje.filter((a) => a.status === "processando" && a.container);
        for (const a of deHoje.filter((x) => x.status === "pendente")) {
          try {
            const { data: url } = await storage.createSignedUrl(a.midia, 3600);
            if (!url?.signedUrl) throw new Error("A mídia agendada sumiu do armazenamento.");
            // Sem user_tags, nem para quem foi agendado com @: o @ vai no aviso ao dono.
            const params: Record<string, string> = { media_type: "STORIES", [a.tipo === "image/jpeg" ? "image_url" : "video_url"]: url.signedUrl };
            const { id } = await graph(tk, "POST", `${igUser}/media`, params);
            const proc: Agendado = { ...a, status: "processando", container: String(id) };
            await gravarAgendado(proc);
            emAndamento.push(proc);
          } catch (e) {
            const erro = e instanceof Error ? e.message : String(e);
            await storage.remove([a.midia]);
            await gravarAgendado({ ...a, status: "erro", erro });
            linhas.push(`${a.nome}: NÃO publicado (${erro})`);
          }
        }

        // 2) Espera todos juntos e publica cada container uma vez só.
        const pessoas = (await aniversariantes(db)).deHoje;
        let naFila = 0;
        const publicados: Agendado[] = [];
        let fila = emAndamento;
        while (fila.length && Date.now() - inicio < ORCAMENTO_MS) {
          const restam: Agendado[] = [];
          for (const a of fila) {
            let feito: Agendado | null = null;
            try {
              const { status_code: s, status } = await graph(tk, "GET", a.container as string, { fields: "status_code,status" });
              if (s === "FINISHED") {
                const { id } = await graph(tk, "POST", `${igUser}/media_publish`, { creation_id: a.container as string });
                feito = { ...a, status: "publicado", media_id: String(id), publicado_em: new Date().toISOString() };
              } else if (s === "PUBLISHED") {
                feito = { ...a, status: "publicado", publicado_em: new Date().toISOString() }; // execução anterior publicou e morreu antes de gravar
              } else if (s === "ERROR" || s === "EXPIRED") {
                throw new Error(`A Meta não processou o Story (${s}): ${status ?? ""}`);
              } else {
                restam.push(a);
                continue;
              }
            } catch (e) {
              const erro = e instanceof Error ? e.message : String(e);
              await storage.remove([a.midia]);
              await gravarAgendado({ ...a, status: "erro", erro });
              linhas.push(`${a.nome}: NÃO publicado (${erro})`);
              continue;
            }
            // Publicado: grava primeiro; o resto (apagar mídia, WhatsApp) não pode virar "erro".
            await gravarAgendado(feito).catch(() => {});
            await storage.remove([a.midia]).catch(() => {});
            try {
              const w = await parabensPeloWhatsapp(db, a, ano, pessoas);
              feito.whatsapp = w.texto;
              if (w.naFila) naFila++;
            } catch (e) {
              feito.whatsapp = `não enfileirei (${e instanceof Error ? e.message : String(e)})`;
            }
            await gravarAgendado(feito).catch(() => {});
            publicados.push(feito);
            // Agendados antes de existir o campo "direct" usam o texto do WhatsApp.
            if (a.handle) {
              directs.push({ nome: a.nome, handle: a.handle, texto: a.direct ?? a.mensagem });
              comDirect.push(feito);
            }
          }
          fila = restam;
          if (fila.length) await new Promise((r) => setTimeout(r, POLL_MS));
        }
        // Um aviso ao dono por Story publicado, todos juntos (a Ste pode levar até 30 s cada).
        const avisos = await Promise.all(publicados.map((f) => avisarDono(f.nome, f.handle)));
        for (const [i, f] of publicados.entries()) {
          f.aviso_dono = avisos[i].detalhe;
          await gravarAgendado(f).catch(() => {});
          linhas.push(`${f.nome}: Story publicado; falta marcar no app (${f.handle ? `@${f.handle}` : "sem @ confirmado"}); aviso ao dono: ${f.aviso_dono}; WhatsApp: ${f.whatsapp}`);
        }
        for (const a of fila) linhas.push(`${a.nome}: a Meta ainda está processando; a próxima execução (de hora em hora até 11h) continua.`);
        if (naFila) worker = await rodarWorker(db, { detectar: false, maxTarefas: 10, limiteMs: 40_000 }).catch(() => null);
      }
    }
  } finally {
    await destravar(TRAVA).catch(() => {});
  }

  if (linhas.length) {
    try {
      const { getResend } = await import("@/lib/resend");
      const { assunto, html, texto } = resumoStories(hoje, linhas, directs);
      const { error } = await getResend().emails.send({
        from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
        to: EMAIL_EMPRESA,
        subject: assunto,
        html,
        text: texto,
      });
      if (error) throw new Error(error.message);
    } catch (e) {
      console.error("Resumo dos Stories agendados não foi enviado:", e);
      // Sem o e-mail a equipe não sabe do Direct: fica marcado para o Mac mandar quando ligar.
      for (const f of comDirect) await gravarAgendado({ ...f, resumo: "o e-mail com o Direct não saiu" }).catch(() => {});
    }
  }
  return NextResponse.json({ hoje, linhas, directs: directs.map((d) => d.handle), worker });
}
