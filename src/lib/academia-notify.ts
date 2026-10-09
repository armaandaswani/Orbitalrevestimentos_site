/**
 * Avisos da lista de espera da Academia Orbital: confirmação para quem se
 * inscreve, alerta para a Orbital e aviso de lançamento disparado pelo admin.
 *
 * Só servidor (usa SM Click e Resend). Nenhuma função lança erro: cada envio
 * devolve true/false para a rota registrar o que chegou.
 *
 * Regras do texto: o curso ainda NÃO existe — nada de preço, data, vagas ou
 * duração; o curso não é gratuito (gratuita é só a lista). PFB por extenso na
 * primeira vez.
 */

import { adminWhatsappPhone, normalizePhone, sendText, smclickConfigured } from "@/lib/smclick";
import { getResend } from "@/lib/resend";
import { EMAIL_EMPRESA } from "@/lib/email-destinos";
import { ATUACOES, EXPERIENCIAS, FOCOS, rotulo } from "@/lib/academia-waitlist";
import { emailLogo } from "@/lib/email-marca";

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
  const tel = normalizePhone(phone);
  if (!tel || !smclickConfigured()) return false;
  const res = await sendText(tel, message);
  if (!res.ok) console.error("[academia-notify] WhatsApp falhou:", res.error);
  return res.ok;
}

// ── Confirmação para quem se inscreve ────────────────────────────────────────

export function mensagemConfirmacao(nome: string, temEmail: boolean): string {
  const n = primeiroNome(nome);
  return [
    `Olá${n ? `, ${n}` : ""}! ✅`,
    "",
    "Sua inscrição na *lista de espera da Academia Orbital* está confirmada.",
    "",
    `O curso de instalação do PFB (Painel Flexível Fibra de Bambu) está em preparação. Quando abrir, você recebe o aviso primeiro, aqui no WhatsApp${temEmail ? " e no seu e-mail" : ""}.`,
    "",
    "Orbital Revestimentos",
  ].join("\n");
}

/** Envia a confirmação nos dois canais, em paralelo. */
export async function enviarConfirmacao(p: InscritoAviso): Promise<{ whatsapp: boolean; email: boolean }> {
  const texto = mensagemConfirmacao(p.name, !!p.email);
  const [whatsapp, email] = await Promise.all([
    enviarWhats(p.phone, texto),
    p.email
      ? enviarEmail(p.email, "Inscrição confirmada — Academia Orbital", emailHtml("Você está na lista de espera", textoParaHtml(texto)))
      : Promise.resolve(false),
  ]);
  return { whatsapp, email };
}

// ── Alerta para a Orbital ────────────────────────────────────────────────────

export async function avisarEmpresa(p: InscritoAviso, total: number | null): Promise<void> {
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
  ];
  const totalTxt = total != null ? `Total na lista: ${total}.` : "";

  const whats = [
    "🎓 *Nova inscrição — Academia Orbital*",
    "",
    ...linhas.map(([k, v]) => `${k}: ${v}`),
    ...(totalTxt ? ["", totalTxt] : []),
  ].join("\n");

  const tabela = linhas
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#74777f;font-size:13px;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;color:#0B1F45;font-size:13px">${esc(v)}</td></tr>`)
    .join("");
  const html = emailHtml(
    "Nova inscrição na lista de espera",
    `<table style="border-collapse:collapse">${tabela}</table>${totalTxt ? `<p style="margin:16px 0 0 0;color:#43474e;font-size:13px">${esc(totalTxt)}</p>` : ""}
     <p style="margin:16px 0 0 0;font-size:13px"><a href="https://orbitalrevestimentos.com.br/admin" style="color:#0B1F45">Ver a lista no admin</a></p>`,
  );

  const admin = adminWhatsappPhone();
  await Promise.all([
    admin ? enviarWhats(admin, whats) : Promise.resolve(false),
    enviarEmail(EMAIL_EMPRESA, `Academia: nova inscrição — ${p.name}`, html),
  ]);
}

// ── Aviso de lançamento (disparado pelo admin) ───────────────────────────────

/** Troca {nome} pelo primeiro nome; sem nome, tira a vírgula que sobraria. */
export function personalizar(texto: string, nome: string): string {
  const n = primeiroNome(nome);
  return n ? texto.replace(/\{nome\}/g, n) : texto.replace(/,?\s*\{nome\}/g, "");
}

export async function enviarLancamento(
  p: { name: string; phone: string; email: string | null },
  texto: string,
  assunto: string,
): Promise<{ whatsapp: boolean; email: boolean }> {
  const msg = personalizar(texto, p.name);
  const [whatsapp, email] = await Promise.all([
    enviarWhats(p.phone, msg),
    p.email ? enviarEmail(p.email, assunto, emailHtml(assunto, textoParaHtml(msg))) : Promise.resolve(false),
  ]);
  return { whatsapp, email };
}

/** Teste do aviso de lançamento: vai só para o WhatsApp e o e-mail da Orbital. */
export async function enviarLancamentoTeste(texto: string, assunto: string): Promise<{ whatsapp: boolean; email: boolean }> {
  const admin = adminWhatsappPhone();
  return enviarLancamento({ name: "Orbital", phone: admin ?? "", email: EMAIL_EMPRESA }, texto, `[TESTE] ${assunto}`);
}
