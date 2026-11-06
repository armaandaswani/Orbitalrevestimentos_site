import crypto from "crypto";
import { sign } from "@/lib/admin-auth";
import { SITE_URL } from "@/lib/product-link";

/**
 * Link assinado do e-mail de aniversários para completar o contato de UM
 * profissional (confirmar o Instagram, adicionar o WhatsApp) direto do
 * celular, sem login no admin. Vale 15 dias e só abre aquela pessoa.
 * Formato: <id>.<expira em ms>.<assinatura>.
 */

const VALIDADE_DIAS = 15;

/**
 * O link do e-mail troca o token por este cookie e redireciona para
 * /aniversario/contato: o token não fica na barra de endereço nem chega ao
 * Analytics/Pixel do layout.
 */
export const COOKIE_CONTATO = "orbital_aniversario_contato";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const assinar = (id: string, exp: number) => sign(`aniversario-contato.${id}.${exp}`);

export function linkContato(id: string, agora = Date.now()): string | null {
  if (!UUID.test(id)) return null;
  const exp = agora + VALIDADE_DIAS * 86400000;
  try {
    return `${SITE_URL}/aniversario/${id}.${exp}.${assinar(id, exp)}`;
  } catch {
    return null; // segredo da sessão não configurado
  }
}

/** O id da pessoa, se o token é válido e não venceu. */
export function lerTokenContato(token: string | null | undefined, agora = Date.now()): string | null {
  const [id, expTxt, sig, ...resto] = String(token ?? "").split(".");
  const exp = Number(expTxt);
  if (resto.length || !id || !sig || !UUID.test(id) || !Number.isFinite(exp) || exp < agora) return null;
  let esperado: string;
  try {
    esperado = assinar(id, exp);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? id : null;
}
