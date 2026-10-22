import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, partnerIdFromRequest, repIdFromRequest, sign } from "@/lib/admin-auth";

/**
 * Passkeys (Face ID / Touch ID / digital) — WebAuthn — para o admin e os
 * portais do parceiro e do representante (migração 070). Só servidor.
 *
 * - A passkey é cadastrada já logado (com a senha) e depois entra sem senha.
 * - O desafio de cada cerimônia vai num cookie assinado de 5 minutos, de uso
 *   único — não precisa de tabela para isso.
 * - Funciona em orbitalrevestimentos.com.br e no www (rpID = domínio raiz).
 */

export type PasskeyTipo = "admin" | "partner" | "rep";

export function parseTipo(v: unknown): PasskeyTipo | null {
  return v === "admin" || v === "partner" || v === "rep" ? v : null;
}

export const RP_NAME = "Orbital Revestimentos";
const DOMINIO = "orbitalrevestimentos.com.br";

/**
 * rpID e origem esperada a partir do pedido. A origem vem do header Origin
 * (o navegador sempre manda num POST); só aceita o domínio da Orbital.
 */
export function relyingParty(req: NextRequest): { rpID: string; origin: string } | null {
  const origin = req.headers.get("origin") || req.nextUrl.origin;
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return null;
  }
  if (host === DOMINIO || host.endsWith(`.${DOMINIO}`)) return { rpID: DOMINIO, origin };
  // Teste local e prévias da Vercel: a passkey fica presa àquele endereço.
  if (host === "localhost" || host.endsWith(".vercel.app")) return { rpID: host, origin };
  return null;
}

/** Quem está logado para cadastrar uma passkey: 'admin', o id do parceiro ou do representante. */
export function sessionUserId(req: NextRequest, tipo: PasskeyTipo): string | null {
  if (tipo === "admin") return isAdminRequest(req) ? "admin" : null;
  if (tipo === "partner") return partnerIdFromRequest(req);
  return repIdFromRequest(req);
}

/** userHandle estável por pessoa: o mesmo aparelho substitui a passkey antiga em vez de duplicar. */
export function userHandle(tipo: PasskeyTipo, userId: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Buffer.from(`${tipo}:${userId}`, "utf8"));
}

// ── Desafio em cookie assinado ───────────────────────────────────────────────

const CHALLENGE_COOKIE = "orbital_passkey_challenge";
const CHALLENGE_MINUTES = 5;

interface Desafio {
  c: string;              // challenge (base64url)
  p: "reg" | "auth";
  t: PasskeyTipo;
  u?: string;             // user id (só no cadastro)
  exp: number;
}

export function setChallengeCookie(res: NextResponse, d: Omit<Desafio, "exp">) {
  const payload = Buffer.from(JSON.stringify({ ...d, exp: Date.now() + CHALLENGE_MINUTES * 60_000 })).toString("base64url");
  res.cookies.set(CHALLENGE_COOKIE, `${payload}.${sign(`passkey:${payload}`)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/passkey",
    maxAge: CHALLENGE_MINUTES * 60,
  });
}

export function readChallengeCookie(req: NextRequest, p: Desafio["p"], t: PasskeyTipo): Desafio | null {
  const raw = req.cookies.get(CHALLENGE_COOKIE)?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i <= 0) return null;
  const payload = raw.slice(0, i);
  const sig = Buffer.from(raw.slice(i + 1));
  let esperado: Buffer;
  try {
    esperado = Buffer.from(sign(`passkey:${payload}`));
  } catch {
    return null;
  }
  if (sig.length !== esperado.length || !crypto.timingSafeEqual(sig, esperado)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Desafio;
    if (d.p !== p || d.t !== t || !d.c || !(Date.now() < d.exp)) return null;
    return d;
  } catch {
    return null;
  }
}

/** Desafio de uso único: apaga o cookie na resposta da verificação. */
export function clearChallengeCookie(res: NextResponse) {
  res.cookies.set(CHALLENGE_COOKIE, "", { httpOnly: true, path: "/api/passkey", maxAge: 0 });
}

/** Nome do aparelho a partir do navegador ("iPhone", "Mac", ...), para a lista de passkeys. */
export function deviceNameFromUA(ua: string | null): string {
  const s = ua ?? "";
  if (/iPhone/i.test(s)) return "iPhone";
  if (/iPad/i.test(s)) return "iPad";
  if (/Android/i.test(s)) return "Android";
  if (/Macintosh|Mac OS X/i.test(s)) return "Mac";
  if (/Windows/i.test(s)) return "Windows";
  if (/Linux/i.test(s)) return "Linux";
  return "Aparelho";
}
