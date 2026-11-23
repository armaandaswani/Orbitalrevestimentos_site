import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  BUCKET_AGENDA, contaDoToken, destravar, gravarAgendado, hojeManaus, horaManaus, listarAgendados,
  tokenParaPublicar, travar, type Agendado,
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
 * ?simular=1 (também com o CRON_SECRET): faz tudo menos enviar e gravar, e devolve
 * o que faria. É assim que testamos em produção sem mandar nada a ninguém.
 */

const TRAVA = "_directs.lock";

const erroTexto = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function GET(req: NextRequest) {
  // Manda mensagem em nome da Orbital: sem CRON_SECRET configurado, não roda (nem em preview).
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const simular = req.nextUrl.searchParams.get("simular") === "1";
  const hoje = hojeManaus();
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
    const candidatos = (await listarAgendados()).filter(
      (a) => a.data === hoje && a.status === "publicado" && a.handle && !a.direct_status,
    );
    if (!candidatos.length) return NextResponse.json({ hoje, simular, linhas: ["ninguém esperando Direct hoje"] });

    let token: string | null = null;
    let erroToken = "";
    try {
      token = await tokenParaPublicar();
    } catch (e) {
      erroToken = erroTexto(e);
    }
    if (!token || !(await contaDoToken(token))) {
      const erro = erroToken || (token ? "o token guardado não é mais da @orbitalrevestimentos ou venceu" : "nenhum token guardado");
      return NextResponse.json({ hoje, simular, linhas: candidatos.map((a) => `${a.nome} (@${a.handle}): sem Direct (${erro})`) });
    }

    // Uma leitura das conversas para todos os candidatos.
    let conversas: Awaited<ReturnType<typeof conversasPorHandle>>;
    try {
      conversas = await conversasPorHandle(token);
    } catch (e) {
      return NextResponse.json({ hoje, simular, linhas: [`não consegui ler as conversas: ${erroTexto(e)}`] });
    }

    // Grava só quando algo muda: o cron passa 32 vezes por dia.
    const gravar = async (a: Agendado, novo: Agendado) => {
      if (simular) return;
      if (novo.direct_status === a.direct_status && novo.direct_detalhe === a.direct_detalhe) return;
      await gravarAgendado(novo).catch(() => {});
    };

    for (const a of candidatos) {
      const handle = (a.handle as string).toLowerCase();
      const c = conversas.get(handle);
      if (!c) {
        await gravar(a, { ...a, direct_detalhe: "sem conversa ainda" });
        linhas.push(`${a.nome} (@${handle}): sem conversa ainda`);
        continue;
      }
      try {
        const d = decidir(await lerMensagens(token, c.conversa), new Date(), hoje);
        if (d.acao === "ja_tinha") {
          await gravar(a, { ...a, direct_status: "ja_tinha", direct_em: new Date().toISOString(), direct_detalhe: "a Orbital já tinha mandado parabéns hoje" });
          linhas.push(`${a.nome} (@${handle}): já tinha parabéns da Orbital hoje, não repeti`);
        } else if (d.acao === "sem_janela") {
          await gravar(a, { ...a, direct_detalhe: "sem janela (a pessoa não escreveu nas últimas 23 h)" });
          linhas.push(`${a.nome} (@${handle}): sem janela ainda`);
        } else {
          const texto = textoDirect(a.nome, horaManaus(), a.id);
          if (simular) {
            linhas.push(`${a.nome} (@${handle}): ENVIARIA →\n${texto}`);
            continue;
          }
          // Uma tentativa por pessoa por execução; erro fica no registro e o próximo cron tenta de novo.
          try {
            await enviarDirect(token, c.igsid, texto);
          } catch (e) {
            await gravar(a, { ...a, direct_detalhe: `envio falhou: ${erroTexto(e)}` });
            linhas.push(`${a.nome} (@${handle}): envio falhou (${erroTexto(e)})`);
            continue;
          }
          await gravar(a, { ...a, direct_status: "enviado_nuvem", direct_em: new Date().toISOString(), direct_detalhe: "enviado pela nuvem" });
          linhas.push(`${a.nome} (@${handle}): Direct enviado`);
        }
      } catch (e) {
        await gravar(a, { ...a, direct_detalhe: `não consegui ler a conversa: ${erroTexto(e)}` });
        linhas.push(`${a.nome} (@${handle}): não consegui ler a conversa (${erroTexto(e)})`);
      }
    }
  } finally {
    if (!simular) await destravar(TRAVA).catch(() => {});
  }
  return NextResponse.json({ hoje, simular, linhas });
}
