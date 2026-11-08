import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Stories agendados da Orbital (pedido do dono, 06/11/2026): o dono aprova antes
 * (sexta para o fim de semana, ou antes de viajar) e o Story sai sozinho no dia,
 * com o Mac fechado.
 *
 * - Arquivos: bucket PRIVADO "instagram-agendados", em <AAAA-MM-DD>/<id>.mp4|jpg
 *   e <AAAA-MM-DD>/<id>.json (quem marcar, mensagem, aprovação, status). A Meta
 *   busca a mídia por uma URL assinada de 1 h; depois de publicar, a mídia é apagada.
 * - Token do Instagram: chega do Mac a cada agendamento (o mesmo que publica pelo
 *   script) e fica no mesmo bucket privado, em _token.json, CIFRADO (AES-256-GCM,
 *   chave derivada do segredo do servidor). O cron tenta renovar todo dia (a Meta só renova token
 *   com mais de 24 h; ele vale 60 dias).
 */

export const CONTA = "orbitalrevestimentos";
export const BUCKET_AGENDA = "instagram-agendados";
export const GRAPH = "https://graph.instagram.com/v26.0";
// Fica no próprio bucket privado (o banco de produção não tem admin_settings), sempre cifrado.
const ARQUIVO_TOKEN = "_token.json";
const RENOVAR_MS = 86400000;
const TRAVA_VELHA_MS = 6 * 60 * 1000;

export interface Agendado {
  id: string;
  data: string;            // AAAA-MM-DD (Manaus)
  tipo: "image/jpeg" | "video/mp4";
  midia: string;           // caminho no bucket
  nome: string;            // nome como na planilha (para achar o WhatsApp no dia)
  handle: string | null;   // @ confirmado: vai no aviso ao dono e no Direct (não na marcação: o dono marca pelo app)
  mensagem: string | null; // parabéns já escrito no estilo do dono
  direct?: string | null;  // outra versão, para a equipe colar no Direct pelo celular (vem no resumo por e-mail)
  aprovacao: string;
  status: "pendente" | "processando" | "publicado" | "erro" | "expirado";
  container?: string;      // container da Meta (vale 24 h): o próximo cron continua dele, nunca cria outro
  media_id?: string;
  erro?: string;
  whatsapp?: string;
  aviso_dono?: string;     // o WhatsApp da Ste avisou o dono para marcar pelo app?
  resumo?: string;        // só quando o e-mail com o Direct não saiu: o Mac vê no "agendados" e manda
  criado_em: string;
  publicado_em?: string;
}

/** Confere na Meta que o token é da @orbitalrevestimentos e devolve o id da conta. */
export async function contaDoToken(token: string): Promise<string | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${GRAPH}/me?fields=user_id,username`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    return res.ok && data.username === CONTA ? String(data.user_id) : null;
  } catch {
    return null;
  }
}

/** O token pode publicar? (a cota de publicação só responde com instagram_business_content_publish) */
export async function podePublicar(token: string, igUser: string): Promise<boolean> {
  const res = await fetch(`${GRAPH}/${igUser}/content_publishing_limit?fields=quota_usage`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  return !!res?.ok;
}

export function tokenDoPedido(req: Request): string {
  return (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
}

function chave(): Buffer {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Segredo do servidor não configurado.");
  return crypto.createHash("sha256").update(`instagram-token:${s}`).digest();
}

function cifrar(texto: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", chave(), iv);
  const corpo = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), corpo]).toString("base64");
}

function decifrar(b64: string): string {
  const buf = Buffer.from(b64, "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", chave(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

export async function guardarToken(token: string): Promise<void> {
  const corpo = JSON.stringify({ c: cifrar(token), renovado_em: new Date().toISOString() });
  const { error } = await supabaseAdmin().storage.from(BUCKET_AGENDA).upload(
    ARQUIVO_TOKEN, new Blob([corpo], { type: "application/json" }), { upsert: true, contentType: "application/json" },
  );
  if (error) throw new Error(`Não consegui guardar o token: ${error.message}`);
}

/** Token guardado (null se o Mac ainda não mandou nenhum). Renova na Meta uma vez por dia. */
export async function tokenParaPublicar(): Promise<string | null> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET_AGENDA).download(ARQUIVO_TOKEN);
  if (error) {
    if (/not.?found|404/i.test(`${error.message} ${(error as { status?: number }).status ?? ""}`)) return null;
    throw new Error(`Não consegui ler o token: ${error.message}`);
  }
  let salvo: { c: string; renovado_em: string };
  let token: string;
  try {
    salvo = JSON.parse(await data.text());
    token = decifrar(salvo.c);
  } catch {
    throw new Error("O token guardado não abre (o segredo do servidor mudou?): agende de novo pelo Mac para regravar.");
  }
  if (Date.now() - Date.parse(salvo.renovado_em) < RENOVAR_MS) return token;
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);
  const res = await fetch(url, { cache: "no-store" }).catch(() => null);
  const novo = res?.ok ? ((await res.json()) as { access_token?: string }).access_token : undefined;
  if (!novo) return token;
  await guardarToken(novo);
  return novo;
}

export async function garantirBucket(): Promise<void> {
  const storage = supabaseAdmin().storage;
  const { data } = await storage.getBucket(BUCKET_AGENDA);
  if (data) return;
  const { error } = await storage.createBucket(BUCKET_AGENDA, {
    public: false,
    allowedMimeTypes: ["image/jpeg", "video/mp4", "application/json"],
    fileSizeLimit: 50 * 1024 * 1024,
  });
  if (error && !/already exists/i.test(error.message)) throw new Error(`Não consegui criar o bucket: ${error.message}`);
}

export async function lerAgendado(caminhoJson: string): Promise<Agendado | null> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET_AGENDA).download(caminhoJson);
  if (error) {
    if (/not.?found|404/i.test(`${error.message} ${(error as { status?: number }).status ?? ""}`)) return null;
    throw new Error(`Não consegui ler ${caminhoJson}: ${error.message}`);
  }
  try { return JSON.parse(await data.text()) as Agendado; } catch { return null; }
}

export async function gravarAgendado(a: Agendado): Promise<void> {
  const { error } = await supabaseAdmin().storage.from(BUCKET_AGENDA).upload(
    `${a.data}/${a.id}.json`,
    new Blob([JSON.stringify(a, null, 2)], { type: "application/json" }),
    { upsert: true, contentType: "application/json" },
  );
  if (error) throw new Error(`Não consegui gravar o agendamento: ${error.message}`);
}

/** Todos os agendamentos (pastas de data), do mais antigo ao mais novo. Erro do storage lança. */
export async function listarAgendados(): Promise<Agendado[]> {
  const storage = supabaseAdmin().storage.from(BUCKET_AGENDA);
  const { data: dias, error } = await storage.list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw new Error(`Não consegui listar os agendamentos: ${error.message}`);
  const out: Agendado[] = [];
  for (const dia of dias || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia.name)) continue;
    const { data: arquivos, error: e2 } = await storage.list(dia.name, { limit: 200 });
    if (e2) throw new Error(`Não consegui listar ${dia.name}: ${e2.message}`);
    for (const f of arquivos || []) {
      if (!f.name.endsWith(".json")) continue;
      const a = await lerAgendado(`${dia.name}/${f.name}`);
      if (a) out.push(a);
    }
  }
  return out;
}

/**
 * Trava por arquivo: o upload sem upsert falha se o arquivo já existe, então só
 * uma execução do cron por vez segue. Trava esquecida (função morta) vence em 6 min.
 */
export async function travar(caminho: string): Promise<boolean> {
  const storage = supabaseAdmin().storage.from(BUCKET_AGENDA);
  const corpo = () => new Blob([new Date().toISOString()], { type: "application/json" });
  const { error } = await storage.upload(caminho, corpo(), { upsert: false, contentType: "application/json" });
  if (!error) return true;
  const { data } = await storage.download(caminho);
  const desde = data ? Date.parse(await data.text()) : NaN;
  if (Number.isFinite(desde) && Date.now() - desde < TRAVA_VELHA_MS) return false;
  await storage.remove([caminho]);
  const { error: e2 } = await storage.upload(caminho, corpo(), { upsert: false, contentType: "application/json" });
  return !e2;
}

export async function destravar(caminho: string): Promise<void> {
  await supabaseAdmin().storage.from(BUCKET_AGENDA).remove([caminho]);
}

export function hojeManaus(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Manaus" }).format(agora);
}

export function horaManaus(agora = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "America/Manaus" }).format(agora));
}

/** AAAA-MM-DD que existe no calendário (2026-02-30 não passa). */
export function dataValida(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
