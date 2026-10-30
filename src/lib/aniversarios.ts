/**
 * Aniversários de profissionais — tipos, leitura da planilha (CSV), datas no
 * fuso de Manaus e os links do e-mail. Sem import nenhum: roda na aba do
 * admin (navegador) e no servidor (cron, importação).
 */

export interface Aniversario {
  id: string;
  ref: string | null;
  nome: string;
  profissao: string | null;
  escritorio: string | null;
  instagram: string | null;
  instagram_confirmado: boolean;
  whatsapp: string | null;
  email: string | null;
  dia: number;
  mes: number;
  ano: number | null;
  fonte: string | null;
  observacoes: string | null;
  ativo: boolean;
}

/** Campos que a importação e o formulário do admin gravam. */
export type AniversarioDados = Omit<Aniversario, "id" | "ativo">;

/** Uma pessoa no e-mail do dia: profissional, parceiro ou representante. */
export interface Aniversariante {
  nome: string;
  tipo: "profissional" | "parceiro" | "representante";
  detalhe: string;
  instagram: string | null;
  instagramConfirmado: boolean;
  whatsapp: string | null;
  email: string | null;
  dia: number;
  mes: number;
  ano: number | null;
  /** Cupom do parceiro, quando é parceiro. */
  cupom?: string | null;
}

export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;

// ── Datas (sempre no fuso de Manaus) ─────────────────────────────────────────

/** Dia, mês e ano de hoje em Manaus (o cron roda em UTC). */
export function hojeEmManaus(agora = new Date()): { dia: number; mes: number; ano: number } {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Manaus", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(agora);
  const v = (t: string) => Number(partes.find((p) => p.type === t)?.value);
  return { dia: v("day"), mes: v("month"), ano: v("year") };
}

/** Os próximos `n` dias depois de `hoje` (sem incluir hoje), como dia/mês. */
export function proximosDias(hoje: { dia: number; mes: number; ano: number }, n: number): { dia: number; mes: number }[] {
  const base = Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia);
  return Array.from({ length: n }, (_, k) => {
    const d = new Date(base + (k + 1) * 86400000);
    return { dia: d.getUTCDate(), mes: d.getUTCMonth() + 1 };
  });
}

/** Quantos dias faltam (0 = hoje) até o próximo aniversário dia/mês. */
export function diasAte(hoje: { dia: number; mes: number; ano: number }, dia: number, mes: number): number {
  const base = Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia);
  let alvo = Date.UTC(hoje.ano, mes - 1, dia);
  if (alvo < base) alvo = Date.UTC(hoje.ano + 1, mes - 1, dia);
  return Math.round((alvo - base) / 86400000);
}

export function idade(ano: number | null, hojeAno: number): number | null {
  return ano && ano > 1900 && ano <= hojeAno ? hojeAno - ano : null;
}

export function dataCurta(dia: number, mes: number): string {
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}

// ── Normalização ─────────────────────────────────────────────────────────────

/** "@fulano", "instagram.com/fulano/", "fulano" → "fulano". Vazio, "-" e textos → null. */
export function normalizarInstagram(raw: string | null | undefined): string | null {
  let s = String(raw ?? "").trim();
  if (!s || s === "-" || /n[aã]o (encontrad|tem)/i.test(s)) return null;
  const url = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (url) s = url[1];
  s = s.replace(/^@+/, "").replace(/\/+$/, "").trim();
  return /^[A-Za-z0-9._]{2,30}$/.test(s) ? s.toLowerCase() : null;
}

/** Só os dígitos, com o 55 do Brasil quando veio só com DDD. */
export function digitosWhatsapp(raw: string | null | undefined): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d.length >= 12 && d.length <= 13 ? d : null;
}

/** "Fulana de Tal (STUDIO X)" → "fulana de tal": para achar a mesma pessoa em duas listas. */
export function chaveNome(nome: string): string {
  return nome
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)/g, " ")
    .toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

export function primeiroNome(nome: string): string {
  const n = nome.replace(/\(.*?\)/g, "").trim().split(/\s+/)[0] ?? "";
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "";
}

// ── Links do e-mail ──────────────────────────────────────────────────────────

export function linkParabens(a: Pick<Aniversariante, "nome" | "whatsapp">): string | null {
  const d = digitosWhatsapp(a.whatsapp);
  if (!d) return null;
  const n = primeiroNome(a.nome);
  const msg = `Feliz aniversário${n ? `, ${n}` : ""}! 🎂 A equipe Orbital deseja um novo ciclo cheio de saúde, alegria e projetos lindos. Um abraço!`;
  return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`;
}

export function linkInstagram(handle: string): string {
  return `https://instagram.com/${handle}`;
}

/** Busca para achar o que falta (Instagram ou WhatsApp) da pessoa. */
export function linkBusca(a: Pick<Aniversariante, "nome" | "detalhe">, o: "instagram" | "whatsapp"): string {
  const nome = a.nome.replace(/\(.*?\)/g, "").trim();
  const q = o === "instagram"
    ? `"${nome}" ${a.detalhe || "arquiteto"} Manaus instagram`
    : `"${nome}" ${a.detalhe || "arquiteto"} Manaus whatsapp telefone`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

// ── Planilha (CSV) ───────────────────────────────────────────────────────────

/** CSV com aspas, vírgula ou ponto e vírgula (detecta pela 1ª linha). */
export function lerCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "");
  const primeira = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = (primeira.match(/;/g)?.length ?? 0) > (primeira.match(/,/g)?.length ?? 0) ? ";" : ",";
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"') {
        if (t[i + 1] === '"') { campo += '"'; i++; } else aspas = false;
      } else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((x) => x.trim())) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((x) => x.trim())) linhas.push(linha);
  return linhas;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Linhas da planilha "Profissionais" → registros. Lê pelos nomes das colunas
 * (ID, Nome, Profissão, Escritório, Instagram, Instagram sugerido,
 * Aniversário, Ano nasc., Fonte, Email, WhatsApp, Observações), em qualquer
 * ordem. Instagram confirmado vence o sugerido. Devolve também as linhas
 * ignoradas (sem nome ou sem data válida).
 */
export function linhasParaAniversarios(tabela: string[][]): { registros: AniversarioDados[]; ignoradas: number } {
  const [cab, ...corpo] = tabela;
  if (!cab) return { registros: [], ignoradas: 0 };
  const idx = (...nomes: string[]) => cab.findIndex((h) => nomes.includes(semAcento(h)));
  const col = {
    ref: idx("id", "ref"),
    nome: idx("nome"),
    profissao: idx("profissao"),
    escritorio: idx("escritorio"),
    instagram: idx("instagram"),
    sugerido: idx("instagram sugerido"),
    aniversario: idx("aniversario", "data de aniversario"),
    ano: idx("ano nasc.", "ano nasc", "ano de nascimento", "ano"),
    fonte: idx("fonte"),
    email: idx("email", "e-mail"),
    whatsapp: idx("whatsapp", "telefone", "numero"),
    obs: idx("observacoes", "obs"),
  };
  const v = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");
  const registros: AniversarioDados[] = [];
  let ignoradas = 0;
  for (const l of corpo) {
    const nome = v(l, col.nome);
    const m = v(l, col.aniversario).match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/);
    const dia = m ? Number(m[1]) : 0;
    const mes = m ? Number(m[2]) : 0;
    if (!nome || dia < 1 || dia > 31 || mes < 1 || mes > 12) { ignoradas++; continue; }
    const anoTxt = v(l, col.ano) || (m?.[3]?.length === 4 ? m[3] : "");
    const ano = /^\d{4}$/.test(anoTxt) ? Number(anoTxt) : null;
    const confirmado = normalizarInstagram(v(l, col.instagram));
    const sugerido = normalizarInstagram(v(l, col.sugerido));
    const whats = v(l, col.whatsapp);
    const email = v(l, col.email).split(/[;,\s]+/).find((e) => /@/.test(e)) ?? "";
    registros.push({
      ref: v(l, col.ref) || null,
      nome,
      profissao: v(l, col.profissao) || null,
      escritorio: v(l, col.escritorio) || null,
      instagram: confirmado ?? sugerido,
      instagram_confirmado: !!confirmado,
      whatsapp: whats && whats !== "-" ? whats : null,
      email: email ? email.toLowerCase() : null,
      dia,
      mes,
      ano,
      fonte: v(l, col.fonte) || null,
      observacoes: v(l, col.obs) || null,
    });
  }
  return { registros, ignoradas };
}
