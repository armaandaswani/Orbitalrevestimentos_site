import { OWNER_PERSONAL_WHATSAPP, normalizePhone, sendText, smclickConfigured } from "@/lib/smclick";
import { enviarPelaSte, steConfigurada } from "@/lib/whatsapp-ste";

/**
 * Avisos dos Stories de aniversário ao dono, pelo WhatsApp da Ste, sempre para o
 * número dele e com o texto montado aqui.
 *
 * 1. Story no ar, falta marcar. A marcação pela API (user_tags) entra calada: a
 *    pessoa não recebe "mencionou você" e não consegue repostar, e uma menção feita
 *    assim não sai mais no app. Decisão do dono (07/11/2026): o Story sai sem
 *    marcação e este aviso leva o @ para ele marcar pelo app. Um por Story
 *    publicado, pelo cron da nuvem ou pelo Mac.
 * 2. Semana pronta para aprovar. A tarefa do sábado 8h no Mac roda sem Remote
 *    Control, e o push dela não chega ao celular (10/11/2026). O dono escolheu
 *    ser avisado pelo WhatsApp da Ste: quantos Stories esperam o "aprovado" e de
 *    quem falta foto.
 */

export function textoAvisoDono(nome: string, handle: string | null): string {
  return [
    `📸 O Story de aniversário de ${nome} já está no ar no Instagram da Orbital.`,
    handle
      ? `Falta marcar: @${handle}`
      : "Falta marcar, mas não temos o @ confirmado: procure o perfil antes.",
    "No app: abra o Story e toque em Mention.",
  ].join("\n");
}

export interface SemanaAviso {
  inicio: string;                                  // AAAA-MM-DD
  fim: string;                                     // AAAA-MM-DD
  prontos: number;
  faltaFoto: { nome: string; data: string }[];    // data AAAA-MM-DD
}

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
function dia(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export function textoSemana(s: SemanaAviso): string {
  const linhas = [`🎂 Aniversários da semana (${dia(s.inicio)} a ${dia(s.fim)})`];
  if (s.prontos > 0) {
    linhas.push(`${s.prontos} ${s.prontos > 1 ? "Stories prontos" : "Story pronto"} para você aprovar no Claude, na conversa "Semana de Stories de aniversário".`);
  }
  if (s.faltaFoto.length) {
    linhas.push(`Falta foto de: ${s.faltaFoto.map((f) => `${f.nome} (${dia(f.data)})`).join(", ")}. Mande a foto na mesma conversa.`);
  }
  if (s.prontos === 0 && !s.faltaFoto.length) linhas.push("Nada para aprovar.");
  return linhas.join("\n");
}

/**
 * Manda ao dono pelo WhatsApp da Ste (SM Click só se a ponte da Ste não existir). Não lança.
 * Sempre para o número pessoal dele, nunca adminWhatsappPhone(): em produção a variável de
 * ambiente dos alertas aponta para outro celular, e de 08 a 10/11/2026 estes avisos foram
 * para lá sem ele ver nenhum.
 */
async function enviarAoDono(texto: string, origem: string): Promise<{ ok: boolean; detalhe: string }> {
  const para = normalizePhone(OWNER_PERSONAL_WHATSAPP);
  if (!para) return { ok: false, detalhe: "sem número do dono configurado" };
  if (steConfigurada()) {
    const r = await enviarPelaSte({ telefone: para, texto, origem });
    return r.ok ? { ok: true, detalhe: "enviado pelo WhatsApp da Ste" } : { ok: false, detalhe: `Ste falhou: ${r.erro ?? `HTTP ${r.status}`}` };
  }
  if (smclickConfigured()) {
    const r = await sendText(para, texto);
    return r.ok ? { ok: true, detalhe: "enviado pelo SM Click" } : { ok: false, detalhe: `SM Click falhou: ${r.error ?? `HTTP ${r.status}`}` };
  }
  return { ok: false, detalhe: "nenhum WhatsApp configurado (Ste nem SM Click)" };
}

export function avisarDono(nome: string, handle: string | null) {
  return enviarAoDono(textoAvisoDono(nome, handle), "instagram-story-marcar");
}

export function avisarSemana(s: SemanaAviso) {
  return enviarAoDono(textoSemana(s), "instagram-story-semana");
}

/** 3. Lembrete no dia: aniversário de alguém que ficou sem Story porque falta foto ou @. */
export function textoLembrete(nome: string, motivo: string): string {
  return [
    `🎂 Hoje é aniversário de ${nome}, e o Story não saiu: ${motivo}.`,
    "Você pediu para lembrar no dia. Se achar a foto (e o @), mande na conversa do Claude que o Story sai hoje; se não, pode deixar passar.",
  ].join("\n");
}

export function avisarLembrete(nome: string, motivo: string) {
  return enviarAoDono(textoLembrete(nome, motivo), "instagram-lembrete-dia");
}

/**
 * 4. Às 18h, quem faz aniversário hoje e ainda não recebeu o Direct (dono, 23/11/2026: o aviso
 *    não pode depender do Mac ligado). A API só responde a quem já escreveu; sem reação ao Story
 *    e sem o Mac, só o celular resolve. Ele não entra no site para conferir: tudo chega no
 *    WhatsApp, com o parabéns numa mensagem sozinha, pronto para copiar e colar no Direct.
 */
export interface SemDirect { nome: string; handle: string; confirmado: boolean; texto: string }

export function textoSemDirect(p: SemDirect): string {
  return [
    `🎂 Hoje é aniversário de ${p.nome}, e o Direct de parabéns ainda não saiu (a pessoa não reagiu ao Story e o Mac não mandou).`,
    `Abra o perfil, toque em Mensagem e cole o texto que vem logo abaixo: https://instagram.com/${p.handle}${p.confirmado ? "" : "\n(o @ ainda é a confirmar: veja se é a pessoa certa)"}`,
  ].join("\n");
}

/** Duas mensagens por pessoa: o aviso com o link do perfil e, sozinho, o texto para colar. */
export async function avisarSemDirect(pessoas: SemDirect[]): Promise<{ ok: boolean; detalhe: string }> {
  const out: string[] = [];
  let ok = true;
  for (const p of pessoas) {
    const a = await enviarAoDono(textoSemDirect(p), "instagram-sem-direct");
    const b = a.ok ? await enviarAoDono(p.texto, "instagram-sem-direct-texto") : a;
    ok &&= a.ok && b.ok;
    out.push(`@${p.handle}: ${b.detalhe}`);
  }
  return { ok, detalhe: out.join("; ") };
}
