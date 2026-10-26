/**
 * Avisos da formação da Academia Orbital: confirmação para quem se inscreve,
 * alerta para a Orbital e as mensagens disparadas pelo admin (aviso geral e
 * pedido de confirmação de presença).
 *
 * Só servidor (usa SM Click e Resend). Nenhuma função lança erro: cada envio
 * devolve true/false para a rota registrar o que chegou.
 *
 * Regras do texto: o número de vagas NUNCA aparece ("vagas limitadíssimas");
 * gratuita é só a 1ª turma — nada de prometer a 2ª gratuita; data, horário e
 * local só quando existirem. PFB por extenso na primeira vez.
 */

import { adminWhatsappPhone, normalizePhone, sendText, smclickConfigured } from "@/lib/smclick";
import { getResend } from "@/lib/resend";
import { EMAIL_EMPRESA } from "@/lib/email-destinos";
import { ATUACOES, EXPERIENCIAS, FOCOS, rotulo } from "@/lib/academia-waitlist";
import { emailLogo } from "@/lib/email-marca";
import { LIMITE_TURMA_1, QUANDO_TURMA_1, QUANDO_TURMA_1_INICIO, VAGAS_TURMA_1, type StatusTurma, type Turma } from "@/lib/academia-turmas";

const FROM = "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>";

export interface InscritoAviso {
  name: string;
  phone: string;
  email: string | null;
  city?: string | null;
  role?: string | null;
  role_other?: string | null;
  main_focus?: string | null;
  main_focus_other?: string | null;
  years_experience?: string | null;
  source?: string | null;
  /** Resposta a "tem disponibilidade no dia da 1ª turma?"; null = não perguntado. */
  disponivel_na_data?: boolean | null;
}

export function primeiroNome(name: string): string {
  return name.trim().split(/\s+/)[0] || "";
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Texto de WhatsApp → HTML de e-mail: parágrafos, *negrito* e links clicáveis. */
function textoParaHtml(texto: string): string {
  return texto
    .split(/\n{2,}/)
    .map((par) => {
      const html = esc(par)
        .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#0B1F45">$1</a>')
        .replace(/\n/g, "<br>");
      return `<p style="margin:0 0 16px 0;line-height:1.6;color:#43474e">${html}</p>`;
    })
    .join("");
}

function emailHtml(titulo: string, corpo: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff">
      <div style="background:#0B1F45;padding:20px 24px">
        ${emailLogo(140, 14)}
        <p style="margin:0;color:#36A35C;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:bold">Academia Orbital</p>
        <p style="margin:6px 0 0 0;color:#ffffff;font-size:20px;font-weight:bold">${esc(titulo)}</p>
      </div>
      <div style="padding:24px">${corpo}</div>
    </div>`;
}

async function enviarEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const { error } = await getResend().emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("[academia-notify] e-mail recusado:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[academia-notify] e-mail falhou:", e instanceof Error ? e.message : e);
    return false;
  }
}

async function enviarWhats(phone: string, message: string): Promise<boolean> {
  return (await enviarWhatsDetalhe(phone, message)).ok;
}

/** Como enviarWhats, mas diz o motivo quando não vai (para o teste no admin). */
async function enviarWhatsDetalhe(phone: string, message: string): Promise<{ ok: boolean; erro?: string }> {
  const tel = normalizePhone(phone);
  if (!tel) return { ok: false, erro: "número de WhatsApp inválido" };
  if (!smclickConfigured()) return { ok: false, erro: "SM Click não configurado no servidor" };
  const res = await sendText(tel, message);
  if (!res.ok) {
    console.error("[academia-notify] WhatsApp falhou:", res.error);
    return { ok: false, erro: `SM Click recusou (${res.status || "sem resposta"}): ${res.error ?? "erro desconhecido"}` };
  }
  return { ok: true };
}

// ── Confirmação para quem se inscreve ────────────────────────────────────────

export function mensagemConfirmacao(nome: string, temEmail: boolean, turma: Turma, indisponivel = false): string {
  const n = primeiroNome(nome);
  const canais = `aqui no WhatsApp${temEmail ? " e no seu e-mail" : ""}`;
  if (turma === 2 && indisponivel) {
    return [
      `Olá${n ? `, ${n}` : ""}! ✅`,
      "",
      `Como você não pode no dia da 1ª turma (${QUANDO_TURMA_1}), você entrou na *lista de espera da 2ª turma* da *Formação em Instalação do PFB* (Painel Flexível Fibra de Bambu) da Academia Orbital.`,
      "",
      `Quando a 2ª turma abrir, você é avisado primeiro, ${canais}.`,
      "",
      "Orbital Revestimentos",
    ].join("\n");
  }
  if (turma === 2) {
    return [
      `Olá${n ? `, ${n}` : ""}! ✅`,
      "",
      "A 1ª turma da *Formação em Instalação do PFB* (Painel Flexível Fibra de Bambu) da Academia Orbital está preenchida — e você entrou na *lista de espera da 2ª turma*.",
      "",
      `Se abrir vaga na 1ª turma (${QUANDO_TURMA_1}) por desistência, chamamos pela ordem da lista, ${canais}. E quando a 2ª turma abrir, você é avisado primeiro.`,
      "",
      "Orbital Revestimentos",
    ].join("\n");
  }
  return [
    `Olá${n ? `, ${n}` : ""}! ✅`,
    "",
    "Sua pré-inscrição na *1ª turma da Formação em Instalação do PFB* (Painel Flexível Fibra de Bambu) da Academia Orbital está confirmada.",
    "",
    `📅 *${QUANDO_TURMA_1_INICIO}*`,
    "",
    "Esta 1ª turma é gratuita e tem vagas limitadíssimas. Quem conclui sai com certificado e pode comprar PFB direto com a Orbital.",
    "",
    `O local chega ${canais}. Uma semana antes, pedimos que você confirme a presença.`,
    "",
    "Orbital Revestimentos",
  ].join("\n");
}

/** Envia a confirmação nos dois canais, em paralelo. */
export async function enviarConfirmacao(p: InscritoAviso, turma: Turma): Promise<{ whatsapp: boolean; email: boolean }> {
  const texto = mensagemConfirmacao(p.name, !!p.email, turma, p.disponivel_na_data === false);
  const [assunto, titulo] = turma === 2
    ? ["Lista de espera da 2ª turma — Academia Orbital", "Você está na lista da 2ª turma"]
    : ["Pré-inscrição confirmada — Formação Academia Orbital", "Pré-inscrição confirmada"];
  const [whatsapp, email] = await Promise.all([
    enviarWhats(p.phone, texto),
    p.email ? enviarEmail(p.email, assunto, emailHtml(titulo, textoParaHtml(texto))) : Promise.resolve(false),
  ]);
  return { whatsapp, email };
}

// ── Alerta para a Orbital ────────────────────────────────────────────────────

export async function avisarEmpresa(p: InscritoAviso, turma: Turma, status: StatusTurma): Promise<void> {
  const atuacao = p.role === "outro" && p.role_other ? `Outro: ${p.role_other}` : rotulo(ATUACOES, p.role);
  const foco = p.main_focus === "outro" && p.main_focus_other ? `Outro: ${p.main_focus_other}` : rotulo(FOCOS, p.main_focus);
  const linhas: Array<[string, string]> = [
    ["Nome", p.name],
    ["WhatsApp", p.phone],
    ["E-mail", p.email || "—"],
    ["Cidade", p.city || "—"],
    ["Atuação", atuacao || "—"],
    ["Mais instala hoje", foco || "—"],
    ["Tempo de profissão", rotulo(EXPERIENCIAS, p.years_experience) || "—"],
    ["Origem", p.source || "direto"],
    ["Pode em " + QUANDO_TURMA_1, p.disponivel_na_data === true ? "Sim" : p.disponivel_na_data === false ? "Não" : "—"],
  ];
  // Para a equipe o número aparece: 20 vagas + folga de desistências.
  const totalTxt = [
    turma === 2
      ? `Entrou na LISTA DE ESPERA DA 2ª TURMA${p.disponivel_na_data === false ? " (não pode na data da 1ª)" : ""}.`
      : "Entrou na 1ª turma.",
    `1ª turma: ${status.inscritos} de ${LIMITE_TURMA_1} pré-inscrições (${VAGAS_TURMA_1} vagas + folga para desistências)${status.fechada ? " — FECHADA" : ""}.`,
    status.fila2 ? `Fila da 2ª turma: ${status.fila2}.` : "",
  ].filter(Boolean).join(" ");

  const whats = [
    `🎓 *Nova inscrição — Academia Orbital (${turma === 2 ? "fila da 2ª turma" : "1ª turma"})*`,
    "",
    ...linhas.map(([k, v]) => `${k}: ${v}`),
    ...(totalTxt ? ["", totalTxt] : []),
  ].join("\n");

  const tabela = linhas
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#74777f;font-size:13px;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;color:#0B1F45;font-size:13px">${esc(v)}</td></tr>`)
    .join("");
  const html = emailHtml(
    turma === 2 ? "Nova inscrição na fila da 2ª turma" : "Nova pré-inscrição na 1ª turma",
    `<table style="border-collapse:collapse">${tabela}</table>${totalTxt ? `<p style="margin:16px 0 0 0;color:#43474e;font-size:13px">${esc(totalTxt)}</p>` : ""}
     <p style="margin:16px 0 0 0;font-size:13px"><a href="https://orbitalrevestimentos.com.br/admin" style="color:#0B1F45">Ver os inscritos no admin</a></p>`,
  );

  const admin = adminWhatsappPhone();
  await Promise.all([
    admin ? enviarWhats(admin, whats) : Promise.resolve(false),
    enviarEmail(EMAIL_EMPRESA, `Academia: nova inscrição — ${p.name}`, html),
  ]);
}

// ── Mensagens disparadas pelo admin (aviso geral, confirmação de presença) ──

/**
 * Troca {nome} pelo primeiro nome (sem nome, tira a vírgula que sobraria) e
 * {link} pelo link pessoal de confirmação de presença, quando houver.
 */
export function personalizar(texto: string, nome: string, link?: string): string {
  const n = primeiroNome(nome);
  const t = n ? texto.replace(/\{nome\}/g, n) : texto.replace(/,?\s*\{nome\}/g, "");
  return link ? t.replace(/\{link\}/g, link) : t;
}

export async function enviarLancamento(
  p: { name: string; phone: string; email: string | null },
  texto: string,
  assunto: string,
  link?: string,
): Promise<{ whatsapp: boolean; email: boolean }> {
  const msg = personalizar(texto, p.name, link);
  const [whatsapp, email] = await Promise.all([
    enviarWhats(p.phone, msg),
    p.email ? enviarEmail(p.email, assunto, emailHtml(assunto, textoParaHtml(msg))) : Promise.resolve(false),
  ]);
  return { whatsapp, email };
}

/**
 * Teste do aviso: o e-mail vai para a Orbital; o WhatsApp vai para o número
 * informado na tela ou, sem ele, para o WhatsApp de alertas da Orbital.
 * Devolve o motivo quando o WhatsApp não vai.
 */
export async function enviarLancamentoTeste(
  texto: string,
  assunto: string,
  link?: string,
  telefone?: string | null,
): Promise<{ whatsapp: boolean; email: boolean; para: string | null; erroWhatsapp?: string }> {
  const para = normalizePhone(telefone) ?? adminWhatsappPhone();
  const msg = personalizar(texto, "Orbital", link);
  const tituloEmail = `[TESTE] ${assunto}`;
  const [w, email] = await Promise.all([
    para ? enviarWhatsDetalhe(para, msg) : Promise.resolve({ ok: false, erro: "sem número para o teste" }),
    enviarEmail(EMAIL_EMPRESA, tituloEmail, emailHtml(tituloEmail, textoParaHtml(msg))),
  ]);
  return { whatsapp: w.ok, email, para, ...(w.erro ? { erroWhatsapp: w.erro } : {}) };
}
