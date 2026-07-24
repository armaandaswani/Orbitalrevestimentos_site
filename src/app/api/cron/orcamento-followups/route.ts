/*
 * Follow-ups do ORÇAMENTO FORMALIZADO (§33) — régua separada do drip do lead.
 * Envia até 2 acompanhamentos por WhatsApp (SM Click), idempotentes:
 *   1º após followup1Hours (padrão 24h) da formalização;
 *   2º após followup2Hours (padrão 72h), respeitando ≥ 1 dia entre envios.
 * Interrompe quando: convertido em pedido (pedido_id), opt-out, validade
 * expirada, ou os dois já enviados. Tudo configurável no painel (orcamento
 * config). Env: CRON_SECRET (se definido, exige Authorization: Bearer).
 * Sugestão de agendamento: diário.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { smclickConfigured, sendText, normalizePhone } from "@/lib/smclick";
import { isMissingColumn, isMissingTable } from "@/lib/db-compat";
import { loadOrcamentoConfig } from "@/lib/orcamento-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { extras } = await loadOrcamentoConfig(db);
  if (!extras.followupEnabled) return NextResponse.json({ ok: true, skipped: "followups desativados" });
  if (!smclickConfigured()) return NextResponse.json({ ok: true, skipped: "SM Click não configurado" });

  const now = Date.now();
  const H = 3600 * 1000;

  const cols = "slug, formal_number, client_name, client_phone, formalized_at, expires_at, pedido_id, followups_opted_out, followup1_sent_at, followup2_sent_at";
  const { data, error } = await db
    .from("saved_quotes")
    .select(cols)
    .not("formal_number", "is", null)
    .is("pedido_id", null)
    .order("formalized_at", { ascending: true })
    .limit(200);

  if (error) {
    if (isMissingTable(error) || isMissingColumn(error)) return NextResponse.json({ ok: true, skipped: "migração 048 pendente" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const rowUnknown of (data ?? [])) {
    const q = rowUnknown as Record<string, unknown>;
    if (q.followups_opted_out === true) continue;
    const phone = normalizePhone((q.client_phone as string) || null);
    if (!phone) continue;
    const formalizedAt = q.formalized_at ? new Date(q.formalized_at as string).getTime() : 0;
    if (!formalizedAt) continue;
    const expired = q.expires_at ? new Date(q.expires_at as string).getTime() < now : false;
    const name = (q.client_name as string) || "tudo bem";
    const number = (q.formal_number as string) || "";
    const fill = (t: string) => t.replace(/\{nome\}/g, name).replace(/\{numero\}/g, number);

    let which: 1 | 2 | null = null;
    if (!q.followup1_sent_at && now >= formalizedAt + extras.followup1Hours * H) {
      which = 1;
    } else if (q.followup1_sent_at && !q.followup2_sent_at && !expired
      && now >= formalizedAt + extras.followup2Hours * H
      && now >= new Date(q.followup1_sent_at as string).getTime() + 24 * H) {
      which = 2;
    }
    if (!which) continue;

    const msg = fill(which === 1 ? extras.followup1Message : extras.followup2Message);
    const res = await sendText(phone, msg);
    if (res.ok) {
      const field = which === 1 ? "followup1_sent_at" : "followup2_sent_at";
      await db.from("saved_quotes").update({ [field]: new Date().toISOString() }).eq("slug", q.slug as string).then(() => {}, () => {});
      sent++;
    }
  }

  return NextResponse.json({ ok: true, sent });
}
