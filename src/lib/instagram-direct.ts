/**
 * Direct de parabéns pelo Instagram, saindo da nuvem (pedido do dono: todo
 * aniversariante com Story também recebe o Direct). Até 23/11/2026 isso era um
 * script no Mac pelo Chrome, que falhava com o Mac dormindo ou a extensão caída.
 *
 * A API não começa conversa: só responde até 24 h depois da última mensagem da
 * pessoa para a Orbital (repostar o Story ou responder a ele já abre essa janela).
 * Por isso o cron passa de meia em meia hora e manda assim que a janela abre.
 *
 * Módulo puro: sem import de runtime (só `import type`), para o `node --test`
 * importar o .ts direto. Os helpers da Meta usam só o fetch global.
 */

// Repetidos de instagram-agenda.ts: importar de lá puxaria o Supabase e quebraria o node --test.
const GRAPH = "https://graph.instagram.com/v26.0";
const CONTA = "orbitalrevestimentos";

// Margem de 1 h sobre as 24 h da Meta.
export const JANELA_MS = 23 * 3600 * 1000;

// Modelo do dono, igual ao do script do Mac (texto e emojis sem mudar nada).
export const PARABENS: readonly (readonly [string, string, string])[] = [
  ['Queria lhe parabenizar nesse dia especial!', 'Que Deus lhe abençoe, lhe traga muita felicidade, saúde, sucesso e prosperidade!!!! 🥳🥳🥳', 'De toda a equipe da Orbital Revestimentos, lhe desejamos um feliz aniversário! 🎊🎉🎂🎁'],
  ['Hoje o dia é seu! Parabéns pelo seu aniversário!', 'Que Deus continue abençoando sua vida e seus projetos, com muita saúde, alegria e conquistas!!!! 🙏✨', 'Um abraço de toda a equipe da Orbital Revestimentos! Feliz aniversário! 🎉🎂🎈'],
  ['Passando para lhe desejar um feliz aniversário!', 'Que esse novo ano venha cheio de saúde, paz, sucesso e muitos projetos lindos!!!! 🥳✨', 'Com carinho, toda a equipe da Orbital Revestimentos! 🎊🎁🎂'],
  ['Parabéns pelo seu dia!', 'Desejamos muita luz, saúde, felicidade e prosperidade nesse novo ciclo!!!! 🙌🥳', 'Toda a equipe da Orbital Revestimentos celebra com você! Feliz aniversário! 🎉🎂🎁'],
  ['Hoje é dia de comemorar você!', 'Que Deus lhe abençoe e que não faltem saúde, alegria e sucesso nesse novo ano!!!! 🥳🥳', 'De toda a equipe da Orbital Revestimentos, um feliz aniversário! 🎊🎈🎂'],
];

/** Saudação pela hora de Manaus na hora do envio (regra do dono). */
export function saudacao(hora: number): string {
  if (hora >= 5 && hora <= 11) return "Bom diaaa";
  if (hora >= 12 && hora <= 17) return "Boa tardeee";
  return "Boa noiteee";
}

/** Primeira palavra do nome, sem o que estiver entre parênteses ("(Ana) Maria Souza" → "Maria"). */
export function primeiroNome(nome: string): string {
  return nome.replace(/\(.*?\)/g, " ").trim().split(/\s+/)[0] ?? "";
}

/** Índice estável da variante: a mesma pessoa sempre recebe o mesmo texto, pessoas diferentes variam. */
export function variante(chave: string): number {
  let h = 2166136261; // FNV-1a 32 bits
  for (const c of chave) {
    h ^= c.codePointAt(0) as number;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % PARABENS.length;
}

/** Texto do Direct. Nunca leva link do Story (regra do dono). */
export function textoDirect(nome: string, hora: number, chave: string): string {
  const [linha, bencao, assinatura] = PARABENS[variante(chave)];
  return [`${saudacao(hora)} ${primeiroNome(nome)}!!`, linha, "", bencao, "", assinatura].join("\n");
}

export interface MensagemIG {
  id?: string;
  from?: { username?: string; id?: string };
  created_time?: string;   // "2026-11-23T14:05:12+0000"
  message?: string;
  story?: { mention?: unknown; reply_to?: unknown };
}

export type Decisao = { acao: "ja_tinha" } | { acao: "enviar" } | { acao: "sem_janela" };

function quando(m: MensagemIG): number {
  // A Meta manda o fuso como +0000; o Date.parse aceita, mas "+00:00" é o formato garantido.
  return Date.parse((m.created_time ?? "").replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
}

function diaManaus(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Manaus" }).format(new Date(ms));
}

const daOrbital = (m: MensagemIG) => (m.from?.username ?? "").toLowerCase() === CONTA;

/**
 * O que fazer com a conversa de um aniversariante.
 * - "ja_tinha": a Orbital já mandou parabéns hoje (pelo celular, pelo Mac ou por uma
 *   execução anterior que caiu antes de gravar). Vem antes de "enviar" para nunca repetir.
 * - "enviar": a última mensagem DA PESSOA tem menos de 23 h (a menção da Orbital não conta).
 * - "sem_janela": ainda não dá; o próximo cron tenta de novo.
 */
export function decidir(mensagens: MensagemIG[], agora: Date, hojeManaus: string): Decisao {
  const jaTinha = mensagens.some((m) => {
    const t = quando(m);
    return daOrbital(m) && Number.isFinite(t) && diaManaus(t) === hojeManaus && /anivers|parab/i.test(m.message ?? "");
  });
  if (jaTinha) return { acao: "ja_tinha" };
  const daPessoa = mensagens
    .filter((m) => m.from?.username && !daOrbital(m))
    .map(quando)
    .filter((t) => Number.isFinite(t));
  const ultima = daPessoa.length ? Math.max(...daPessoa) : NaN;
  if (Number.isFinite(ultima) && agora.getTime() - ultima < JANELA_MS) return { acao: "enviar" };
  return { acao: "sem_janela" };
}

// ---- Meta (não entra no teste unitário) ----

async function getGraph(token: string, url: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Meta ${res.status}: ${data.error?.message ?? "sem detalhe"}`);
  return data;
}

export interface Conversa {
  conversa: string;   // id da conversa
  igsid: string;      // id da pessoa no Direct (destinatário do envio)
}

/**
 * Conversas recentes da Orbital, por @ (minúsculo). Lê até `paginas` páginas, da mais
 * recente para trás: quem repostou o Story hoje está nas primeiras.
 */
export async function conversasPorHandle(token: string, paginas = 4): Promise<Map<string, Conversa>> {
  const out = new Map<string, Conversa>();
  let url: string | null = `${GRAPH}/me/conversations?platform=instagram&fields=participants,updated_time&limit=50`;
  for (let i = 0; i < paginas && url; i++) {
    const data = await getGraph(token, url);
    for (const c of (data.data ?? []) as { id: string; participants?: { data?: { username?: string; id?: string }[] } }[]) {
      for (const p of c.participants?.data ?? []) {
        const u = (p.username ?? "").toLowerCase();
        if (u && u !== CONTA && p.id && !out.has(u)) out.set(u, { conversa: c.id, igsid: p.id });
      }
    }
    const prox: unknown = data.paging?.next;
    url = typeof prox === "string" && prox.startsWith("https://graph.instagram.com/") ? prox : null;
  }
  return out;
}

/** Últimas mensagens de uma conversa (a Meta devolve da mais nova para a mais velha). */
export async function lerMensagens(token: string, conversa: string, n = 20): Promise<MensagemIG[]> {
  const url = `${GRAPH}/${encodeURIComponent(conversa)}?fields=${encodeURIComponent(`messages.limit(${n}){from,created_time,message,story}`)}`;
  const data = await getGraph(token, url);
  return (data.messages?.data ?? []) as MensagemIG[];
}

/** Manda um texto no Direct (só funciona dentro da janela de 24 h). Lança com o erro da Meta. */
export async function enviarDirect(token: string, igsid: string, texto: string): Promise<string | null> {
  const res = await fetch(`${GRAPH}/me/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: igsid }, message: { text: texto } }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const e = data.error ?? {};
    throw new Error(`Meta ${res.status}: ${e.message ?? "sem detalhe"}${e.code ? ` (código ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ""})` : ""}`);
  }
  return data.message_id ? String(data.message_id) : null;
}
