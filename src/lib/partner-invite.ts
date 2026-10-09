import type { SupabaseClient } from "@supabase/supabase-js";
import { smclickConfigured, normalizePhone, sendText } from "@/lib/smclick";
import { emailTopo } from "@/lib/email-marca";

/**
 * Convite de parceiro feito pela representante: o parceiro é cadastrado como
 * "pending" com um token (reset_token) e recebe o link por e-mail e WhatsApp.
 * Ao abrir o link ele aceita, cria a senha e já entra no portal — sem esperar
 * a aprovação manual no admin.
 */

export const CONVITE_VALIDADE_DIAS = 14;
export const CONVITE_COMISSAO_PADRAO = 7; // % para o parceiro
export const CONVITE_DESCONTO_PADRAO = 0; // % para o cliente

const SITE_URL = () => process.env.NEXT_PUBLIC_SITE_URL || "https://orbitalrevestimentos.com.br";

export function linkConvite(token: string) {
  return `${SITE_URL()}/parceiro?convite=${encodeURIComponent(token)}`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function conviteWhatsapp(i: { nome: string; repNome: string | null; link: string }) {
  const first = i.nome.trim().split(/\s+/)[0] || i.nome;
  return [
    `Olá, ${first}! 👋`,
    "",
    `${i.repNome ? `${i.repNome}, da Orbital Revestimentos,` : "A Orbital Revestimentos"} cadastrou você como *Parceiro Orbital*.`,
    "",
    "Para ativar seu acesso, abra o link, aceite o convite e crie sua senha:",
    i.link,
    "",
    `No portal você acompanha suas indicações e comissões. O link vale por ${CONVITE_VALIDADE_DIAS} dias.`,
  ].join("\n");
}

export function conviteEmailHtml(i: { nome: string; repNome: string | null; link: string }) {
  const first = esc(i.nome.trim().split(/\s+/)[0] || i.nome);
  const quem = i.repNome ? `${esc(i.repNome)}, da Orbital Revestimentos,` : "A Orbital Revestimentos";
  return `
    ${emailTopo(520)}<div style="font-family:Montserrat,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0D1830;line-height:1.55">
      <h2 style="font-size:22px;margin:0 0 12px;color:#0B1F45;font-weight:300;font-family:Noto Serif Display,Georgia,serif">Olá, ${first}!</h2>
      <p style="color:#43474e;margin:0 0 20px">${quem} cadastrou você como <strong>Parceiro Orbital</strong>.</p>
      <p style="color:#43474e;margin:0 0 24px">Para ativar seu acesso, aceite o convite e crie sua senha. No portal você acompanha suas indicações e comissões.</p>
      <p style="margin:0 0 24px">
        <a href="${i.link}" style="background:#0B1F45;color:#ffffff;text-decoration:none;padding:12px 22px;font-size:14px;font-weight:700;display:inline-block">Aceitar convite</a>
      </p>
      <p style="font-size:12px;color:#74777f;margin:0 0 8px">O link vale por ${CONVITE_VALIDADE_DIAS} dias. Se não esperava este convite, ignore este e-mail.</p>
      <p style="font-size:12px;color:#74777f;margin:0">Ou copie o link no navegador:<br><a href="${i.link}" style="color:#0B1F45;word-break:break-all">${i.link}</a></p>
    </div>`;
}

/** Envia o convite por e-mail e WhatsApp. Nunca lança; diz o que saiu. */
export async function enviarConvite(i: { nome: string; email: string; phone: string; repNome: string | null; token: string }) {
  const link = linkConvite(i.token);
  const out = { email: false, whatsapp: false };

  if (process.env.RESEND_API_KEY) {
    try {
      const { getResend } = await import("@/lib/resend");
      const r = await getResend().emails.send({
        from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
        to: i.email,
        subject: "Seu convite para o Portal do Parceiro — Orbital Revestimentos",
        html: conviteEmailHtml({ nome: i.nome, repNome: i.repNome, link }),
        text: conviteWhatsapp({ nome: i.nome, repNome: i.repNome, link }).replace(/\*/g, ""),
      });
      out.email = !r.error;
      if (r.error) console.error("[convite] e-mail não enviado", r.error.name, r.error.message);
    } catch (e) {
      console.error("[convite] e-mail falhou", e instanceof Error ? e.message : e);
    }
  }

  const tel = normalizePhone(i.phone);
  if (tel && smclickConfigured()) {
    out.whatsapp = await sendText(tel, conviteWhatsapp({ nome: i.nome, repNome: i.repNome, link })).then((r) => r.ok, () => false);
  }
  return out;
}

/** Parceiro pendente com convite válido para este token, ou null. */
export async function parceiroDoConvite(db: SupabaseClient, token: string) {
  if (!token || token.length < 20) return null;
  const { data } = await db
    .from("partners")
    .select("id, name, email, status, coupon_code, sales_rep_referral_code")
    .eq("reset_token", token)
    .gt("reset_token_expires_at", new Date().toISOString())
    .maybeSingle();
  return data as { id: string; name: string; email: string | null; status: string; coupon_code: string; sales_rep_referral_code: string | null } | null;
}
