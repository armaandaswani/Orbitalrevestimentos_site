import crypto from "crypto";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Server-side admin auth.
 *
 * - Login: password is verified ONLY on the server (env ADMIN_PASSWORD or a
 *   scrypt hash stored in admin_settings). Never exposed to the client.
 * - Session: signed (HMAC-SHA256) expiring token in an httpOnly cookie.
 * - All admin API routes call isAdminRequest(req) / unauthorized().
 */

export const ADMIN_COOKIE = "orbital_admin_session";
const SESSION_HOURS = 12;

function sessionSecret(): string {
  const s =
    process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("ADMIN_SESSION_SECRET não configurado.");
  return s;
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
}

function safeEqual(a: Buffer | Uint8Array, b: Buffer | Uint8Array): boolean {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Session tokens
// ---------------------------------------------------------------------------

export function createSessionToken(): { token: string; maxAge: number } {
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  const payload = `${exp}.${crypto.randomBytes(9).toString("base64url")}`;
  return { token: `${payload}.${sign(payload)}`, maxAge: SESSION_HOURS * 3600 };
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i <= 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return false; // secret not configured → fail closed
  }
  if (!safeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  const exp = parseInt(payload, 10);
  return Number.isFinite(exp) && Date.now() < exp;
}

/** True when the request carries a valid admin session cookie. */
export function isAdminRequest(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value);
}

// ---------------------------------------------------------------------------
// Portal sessions (partner / sales-rep) — signed cookie carrying the row id
// ---------------------------------------------------------------------------

export const PARTNER_COOKIE = "orbital_partner_portal";
export const REP_COOKIE = "orbital_rep_portal";
const PORTAL_SESSION_HOURS = 24 * 7; // 7 days

/** Token format: `${exp}.${id}.${sig}` (id is a UUID, no dots). */
export function createPortalToken(id: string): { token: string; maxAge: number } {
  const exp = Date.now() + PORTAL_SESSION_HOURS * 3600 * 1000;
  const payload = `${exp}.${id}`;
  return { token: `${payload}.${sign(payload)}`, maxAge: PORTAL_SESSION_HOURS * 3600 };
}

/** Returns the embedded id when the token is valid and unexpired, else null. */
export function verifyPortalToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [expStr, id, sig] = parts;
  const payload = `${expStr}.${id}`;
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null; // secret not configured → fail closed
  }
  if (!safeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || Date.now() >= exp) return null;
  return id || null;
}

/** Partner id from a valid portal cookie, else null. */
export function partnerIdFromRequest(req: NextRequest): string | null {
  return verifyPortalToken(req.cookies.get(PARTNER_COOKIE)?.value);
}

/** Sales-rep id from a valid portal cookie, else null. */
export function repIdFromRequest(req: NextRequest): string | null {
  return verifyPortalToken(req.cookies.get(REP_COOKIE)?.value);
}

/** True when `stored` is already a scrypt hash (vs legacy plaintext). */
export function isHashedPassword(stored: string): boolean {
  return stored.startsWith("scrypt:");
}

// ---------------------------------------------------------------------------
// Password hashing (scrypt, no external deps)
// ---------------------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(password, salt, 32).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith("scrypt:")) {
    const [, salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const candidate = crypto.scryptSync(password, salt, 32);
    return safeEqual(candidate, Buffer.from(hash, "base64url"));
  }
  // Legacy plaintext value (old env/DB format) — still constant-time.
  return safeEqual(Buffer.from(password), Buffer.from(stored));
}

/**
 * The password record to verify logins against, in priority order:
 * 1. scrypt hash in admin_settings (set via "change password")
 * 2. legacy plaintext in admin_settings
 * 3. ADMIN_PASSWORD env var
 * Returns null when nothing is configured (login then fails closed).
 */
export async function getStoredPassword(): Promise<string | null> {
  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from("admin_settings")
      .select("key, value")
      .in("key", ["admin_password_hash", "admin_password"]);
    const hash = data?.find((r) => r.key === "admin_password_hash")?.value;
    if (hash) return hash as string;
    const legacy = data?.find((r) => r.key === "admin_password")?.value;
    if (legacy) return legacy as string;
  } catch {
    // fall through to env
  }
  return process.env.ADMIN_PASSWORD || null;
}
