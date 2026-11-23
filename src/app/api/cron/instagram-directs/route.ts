import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { aniversariantes } from "@/lib/aniversarios-server";
import { avisarSemDirect, type SemDirect } from "@/lib/instagram-aviso";
import {
  BUCKET_AGENDA, contaDoToken, destravar, gravarAgendado, hojeManaus, horaManaus,
  listarAgendadosDoDia, tokenParaPublicar, travar, type Agendado,
} from "@/lib/instagram-agenda";
import { conversasPorHandle, decidir, enviarDirect, lerMensagens, textoDirect } from "@/lib/instagram-direct";

export const maxDuration = 60;

/**
 * De meia em meia hora, das 8h às 23h30 em Manaus: manda o Direct de parabéns a
 * quem teve o Story de aniversário publicado hoje (o dono quer Direct para todos,
 * 23/11/2026; antes saía pelo Chrome do Mac, que falhava com o Mac dormindo).
 *
 * A API só responde até 24 h depois da última mensagem da pessoa: o Direct sai
 * quando ela reposta ou responde o Story. Sem conversa ou sem janela, fica para a
 * próxima execução. Nunca manda duas vezes: quem já tem direct_status sai da lista,
 * e um parabéns da Orbital de hoje na conversa (celular, Mac ou execução que caiu
 * antes de gravar) vira "ja_tinha". Saudação pela hora do envio, sem link do Story.
 *
 * Às 18h (uma vez por dia), avisa o dono pelo WhatsApp da Ste de quem faz aniversário
 * hoje, tem @ e ainda não recebeu parabéns no Direct, com ou sem Story. Esse aviso
 * morava no Mac (vigia-direct.mjs) e não saía com o Mac desligado (dono, 23/11/2026).
 *
 * ?simular=1 (também com o CRON_SECRET): faz tudo menos enviar, avisar e gravar, e
 * devolve o que faria. Com ?aviso=1 simula também o aviso das 18h fora do horário.
 */

const TRAVA = "_directs.lock";
const HORA_AVISO = 18;

const erroTexto = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Uma vez por dia: o upload sem upsert falha se o aviso de hoje já saiu. */
async function marcarAviso(hoje: string): Promise<boolean> {
  const { error } = await supabaseAdmin().storage.from(BUCKET_AGENDA).upload(
    `avisos-direct/${hoje}.json`,
    new Blob([JSON.stringify({ em: new Date().toISOString() })], { type: "application/json" }),
    { upsert: false, contentType: "application/json" },
  );
  return !error;
}

export async function GET(req: NextRequest) {
  // Manda mensagem em nome da Orbital: sem CRON_SECRET configurado, não roda (nem em preview).
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const simular = req.nextUrl.searchParams.get("simular") === "1";
  const hoje = hojeManaus();
  const horaDoAviso = horaManaus() === HORA_AVISO || (simular && req.nextUrl.searchParams.get("aviso") === "1");
  const storage = supabaseAdmin().storage.from(BUCKET_AGENDA);

  const { error: semBucket } = await storage.list("", { limit: 1 });
  if (semBucket) {
    if (/not.?found/i.test(semBucket.message)) return NextResponse.json({ hoje, simular, pulado: "nenhum agendamento ainda" });
    return NextResponse.json({ error: semBucket.message }, { status: 500 });
  }
  // A simulação não trava: se ela cair, o cron de verdade não fica 6 min parado.
  if (!simular && !(await travar(TRAVA))) return NextResponse.json({ hoje, simular, pulado: "outra execução em andamento" });

  const linhas: string[] = [];
  try {
    const doDia = await listarAgendadosDoDia(hoje);
    const candidatos = doDia.filter((a) => a.data === hoje && a.status === "publicado" && a.handle && !a.direct_status);
    if (!candidatos.length && !horaDoAviso) {
      linhas.push("ninguém esperando Direct hoje");
      return NextResponse.json({ hoje, simular, linhas });
    }

    let token: string | null = null;
    let erroToken = "";
    try {
      token = await tokenParaPublicar();
    } catch (e) {
      erroToken = erroTexto(e);
    }
    if (!token || !(await contaDoToken(token))) {
      const erro = erroToken || (token ? "o token guardado não é mais da @orbitalrevestimentos ou venceu" : "nenhum token guardado");
      linhas.push(...candidatos.map((a) => `${a.nome} (@${a.handle}): sem Direct (${erro})`));
      token = null;
    }

    // Uma leitura das conversas para todos (envio e aviso).
    let conversas: Awaited<ReturnType<typeof conversasPorHandle>> = new Map();
    if (token) {
      try {
        conversas = await conversasPorHandle(token);
      } catch (e) {
        linhas.push(`não consegui ler as conversas: ${erroTexto(e)}`);
        token = null;
      }
    }

    // Grava só quando algo muda: o cron passa 32 vezes por dia.
    const gravar = async (a: Agendado, novo: Agendado) => {
      if (simular) return;
      if (novo.direct_status === a.direct_status && novo.direct_detalhe === a.direct_detalhe) return;
      await gravarAgendado(novo).catch(() => {});
    };
    const resolvidos = new Set<string>(); // @ que já receberam (ou já tinham) parabéns hoje

    for (const a of token ? candidatos : []) {
      const handle = (a.handle as string).toLowerCase();
      const c = conversas.get(handle);
      if (!c) {
        await gravar(a, { ...a, direct_detalhe: "sem conversa ainda" });
        linhas.push(`${a.nome} (@${handle}): sem conversa ainda`);
        continue;
      }
      try {
        const d = decidir(await lerMensagens(token as string, c.conversa), new Date(), hoje);
        if (d.acao === "ja_tinha") {
          resolvidos.add(handle);
          await gravar(a, { ...a, direct_status: "ja_tinha", direct_em: new Date().toISOString(), direct_detalhe: "a Orbital já tinha mandado parabéns hoje" });
          linhas.push(`${a.nome} (@${handle}): já tinha parabéns da Orbital hoje, não repeti`);
        } else if (d.acao === "sem_janela") {
          await gravar(a, { ...a, direct_detalhe: "sem janela (a pessoa não escreveu nas últimas 23 h)" });
          linhas.push(`${a.nome} (@${handle}): sem janela ainda`);
        } else {
          const texto = textoDirect(a.nome, horaManaus(), a.id);
          if (simular) {
            resolvidos.add(handle);
            linhas.push(`${a.nome} (@${handle}): ENVIARIA →\n${texto}`);
            continue;
          }
          // Uma tentativa por pessoa por execução; erro fica no registro e o próximo cron tenta de novo.
          try {
            await enviarDirect(token as string, c.igsid, texto);
          } catch (e) {
            await gravar(a, { ...a, direct_detalhe: `envio falhou: ${erroTexto(e)}` });
            linhas.push(`${a.nome} (@${handle}): envio falhou (${erroTexto(e)})`);
            continue;
          }
          resolvidos.add(handle);
          await gravar(a, { ...a, direct_status: "enviado_nuvem", direct_em: new Date().toISOString(), direct_detalhe: "enviado pela nuvem" });
          linhas.push(`${a.nome} (@${handle}): Direct enviado`);
        }
      } catch (e) {
        await gravar(a, { ...a, direct_detalhe: `não consegui ler a conversa: ${erroTexto(e)}` });
        linhas.push(`${a.nome} (@${handle}): não consegui ler a conversa (${erroTexto(e)})`);
      }
    }

    // Aviso das 18h: todo aniversariante de hoje com @ (Story agendado ou base do site) sem parabéns no Direct.
    if (horaDoAviso) {
      const pessoas = new Map<string, Omit<SemDirect, "texto">>();
      for (const a of doDia) {
        if (a.status === "publicado" && a.handle) pessoas.set(a.handle.toLowerCase(), { nome: a.nome, handle: a.handle.toLowerCase(), confirmado: true });
      }
      for (const p of (await aniversariantes(supabaseAdmin()).catch(() => ({ deHoje: [] }))).deHoje) {
        const h = p.instagram?.replace(/^@/, "").toLowerCase();
        if (h && !pessoas.has(h)) pessoas.set(h, { nome: p.nome, handle: h, confirmado: !!p.instagramConfirmado });
      }
      const jaFeitos = new Set(doDia.filter((a) => a.direct_status && a.handle).map((a) => (a.handle as string).toLowerCase()));
      const faltam: SemDirect[] = [];
      for (const p of pessoas.values()) {
        if (resolvidos.has(p.handle) || jaFeitos.has(p.handle)) continue;
        const c = conversas.get(p.handle);
        // Sem token não dá para ler a conversa: avisa do mesmo jeito (melhor um aviso a mais do que um Direct a menos).
        if (token && c) {
          const d = await lerMensagens(token, c.conversa).then((m) => decidir(m, new Date(), hoje)).catch(() => null);
          if (d?.acao === "ja_tinha") continue;
        }
        faltam.push({ ...p, texto: textoDirect(p.nome, horaManaus(), p.handle) });
      }
      if (!faltam.length) {
        linhas.push("aviso das 18h: todos com @ já têm parabéns no Direct");
      } else if (simular) {
        linhas.push(`aviso das 18h AVISARIA: ${faltam.map((p) => `@${p.handle}`).join(", ")}`);
      } else if (await marcarAviso(hoje)) {
        const r = await avisarSemDirect(faltam);
        linhas.push(`aviso das 18h ao dono (${faltam.map((p) => `@${p.handle}`).join(", ")}): ${r.detalhe}`);
      } else {
        linhas.push("aviso das 18h já tinha saído hoje");
      }
    }
  } finally {
    if (!simular) await destravar(TRAVA).catch(() => {});
  }
  console.log(`[instagram-directs] ${hoje}${simular ? " (simulação)" : ""}: ${linhas.join(" | ") || "nada"}`);
  return NextResponse.json({ hoje, simular, linhas });
}
