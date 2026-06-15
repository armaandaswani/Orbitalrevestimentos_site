import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { smclickConfigured, listInstances, sendText, normalizePhone } from "@/lib/smclick";

/**
 * SM Click diagnostics — figure out *why* a WhatsApp send did or didn't go out.
 * Every production send is best-effort and swallows its error, so this endpoint
 * is the way to see what SM Click actually replies.
 *
 * GET  /api/admin/smclick/diag
 *   Reports which SMCLICK_* env vars are present (booleans only — never the
 *   values) and pings SM Click with listInstances() to verify the base URL +
 *   API key are accepted.
 *
 * POST /api/admin/smclick/diag   { "to": "<phone>", "text"?: "<msg>" }
 *   Sends a real test WhatsApp to `to` and returns SM Click's raw response,
 *   including the normalized phone and the HTTP status/error. Use your own
 *   number. Subject to WhatsApp's 24h free-form window like any sendText.
 */

function envStatus() {
  return {
    SMCLICK_API_URL: Boolean(process.env.SMCLICK_API_URL),
    SMCLICK_API_KEY: Boolean(process.env.SMCLICK_API_KEY),
    SMCLICK_INSTANCE_ID: Boolean(process.env.SMCLICK_INSTANCE_ID),
    SMCLICK_DEFAULT_TAGS: Boolean(process.env.SMCLICK_DEFAULT_TAGS),
    SMCLICK_WEBHOOK_SECRET: Boolean(process.env.SMCLICK_WEBHOOK_SECRET),
    SMCLICK_REMINDER_TO: Boolean(process.env.SMCLICK_REMINDER_TO),
    SMCLICK_HIGH_VALUE_THRESHOLD: process.env.SMCLICK_HIGH_VALUE_THRESHOLD || null,
    // First chars of the URL help confirm it's the host you expect (not a secret).
    apiUrlPreview: (process.env.SMCLICK_API_URL || "").replace(/\/+$/, "") || null,
  };
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const env = envStatus();
  const configured = smclickConfigured();

  // Live connectivity check: does SM Click accept the base URL + API key?
  let instances: unknown = { skipped: "SM Click não configurado (faltam URL/KEY)." };
  if (configured) {
    const res = await listInstances();
    instances = { ok: res.ok, status: res.status, error: res.error ?? null, data: res.data ?? null };
  }

  return NextResponse.json({
    configured,
    sendReady: configured && Boolean(process.env.SMCLICK_INSTANCE_ID),
    env,
    instances,
  });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { to?: unknown; text?: unknown };
  const rawTo = typeof body.to === "string" ? body.to : "";
  const phone = normalizePhone(rawTo);
  if (!phone) {
    return NextResponse.json(
      { error: "Informe um telefone válido em `to` (ex.: 5592999998888).", rawTo, normalized: phone },
      { status: 400 }
    );
  }

  if (!smclickConfigured()) {
    return NextResponse.json(
      { error: "SM Click não configurado. Defina SMCLICK_API_URL e SMCLICK_API_KEY.", env: envStatus() },
      { status: 400 }
    );
  }

  const message =
    typeof body.text === "string" && body.text.trim()
      ? body.text.trim()
      : "✅ Teste de integração SM Click — Orbital Revestimentos.";

  const res = await sendText(phone, message);

  return NextResponse.json({
    sent: res.ok,
    rawTo,
    normalizedPhone: phone,
    smclick: { ok: res.ok, status: res.status, error: res.error ?? null, data: res.data ?? null },
  });
}
