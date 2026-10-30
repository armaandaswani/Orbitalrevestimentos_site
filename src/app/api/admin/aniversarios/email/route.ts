import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { EMAIL_EMPRESA } from "@/lib/email-destinos";
import { getResend } from "@/lib/resend";
import { aniversariantes, emailAniversarios } from "@/lib/aniversarios-server";

/**
 * O e-mail diário de aniversários, sob demanda (admin).
 * GET  → prévia em HTML
 * POST → envia agora para a caixa da Orbital (EMAIL_EMPRESA)
 */

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { html } = emailAniversarios(await aniversariantes(supabaseAdmin()));
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const lista = await aniversariantes(supabaseAdmin());
  const { assunto, html } = emailAniversarios(lista);
  const { error } = await getResend().emails.send({
    from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
    to: EMAIL_EMPRESA,
    subject: assunto,
    html,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, hoje: lista.deHoje.length, proximos: lista.proximos.length, para: EMAIL_EMPRESA });
}
