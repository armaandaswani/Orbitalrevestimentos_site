/**
 * Formação da Academia Orbital — leitura das vagas no banco e link pessoal de
 * confirmação de presença. Só servidor.
 */

import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumn } from "@/lib/db-compat";
import { STATUS_PADRAO, calcularStatus, type StatusTurma } from "@/lib/academia-turmas";

/**
 * Vagas da 1ª turma agora. Nunca lança: sem banco, devolve a turma aberta e
 * sem números (a página não pode cair por causa do contador).
 */
export async function statusTurma1(db: SupabaseClient): Promise<StatusTurma> {
  try {
    const [t1, t2] = await Promise.all([
      db.from("academy_waitlist").select("id", { count: "exact", head: true })
        .eq("turma", 1).or("presenca.is.null,presenca.eq.sim"),
      db.from("academy_waitlist").select("id", { count: "exact", head: true }).eq("turma", 2),
    ]);
    if (t1.error || t2.error) {
      // Antes da migration 065 todo mundo é da 1ª turma.
      if (isMissingColumn(t1.error) || isMissingColumn(t2.error)) {
        const todos = await db.from("academy_waitlist").select("id", { count: "exact", head: true });
        return todos.error ? STATUS_PADRAO : calcularStatus(todos.count ?? 0, 0);
      }
      console.error("[academia-status]", (t1.error ?? t2.error)?.message);
      return STATUS_PADRAO;
    }
    return calcularStatus(t1.count ?? 0, t2.count ?? 0);
  } catch (e) {
    console.error("[academia-status]", e instanceof Error ? e.message : e);
    return STATUS_PADRAO;
  }
}

// ── Link pessoal de confirmação de presença ──────────────────────────────────

function segredo(): string {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("ADMIN_SESSION_SECRET não configurado.");
  return s;
}

/** Assinatura curta do id: o link só serve para aquela inscrição. */
export function tokenPresenca(id: string): string {
  return crypto.createHmac("sha256", segredo()).update(`academia-presenca:${id}`).digest("base64url").slice(0, 24);
}

export function tokenPresencaValido(id: string, token: string): boolean {
  if (!id || !token) return false;
  let esperado: string;
  try {
    esperado = tokenPresenca(id);
  } catch {
    return false;
  }
  const a = Buffer.from(token);
  const b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function linkPresenca(id: string): string {
  return `https://orbitalrevestimentos.com.br/academia/presenca?i=${encodeURIComponent(id)}&t=${tokenPresenca(id)}`;
}
