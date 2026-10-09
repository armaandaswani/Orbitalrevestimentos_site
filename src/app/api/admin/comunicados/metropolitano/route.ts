import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getResend } from "@/lib/resend";
import { EMAIL_EMPRESA } from "@/lib/email-destinos";
import { COMUNICADO_METROPOLITANO_ASSUNTO, comunicadoMetropolitanoHtml } from "@/lib/comunicado-metropolitano-email";

/**
 * Comunicado do Núcleo Metropolitano.
 *  GET  → prévia do e-mail (HTML), só para o admin.
 *  POST → envia um TESTE para a caixa da empresa (EMAIL_EMPRESA). Nunca para
 *         outra pessoa: o disparo para a lista de arquitetos ainda não existe.
 */

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return new Response(comunicadoMetropolitanoHtml(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { data, error } = await getResend().emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: EMAIL_EMPRESA,
      subject: `[TESTE] ${COMUNICADO_METROPOLITANO_ASSUNTO}`,
      html: comunicadoMetropolitanoHtml(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json({ ok: true, id: data?.id ?? null, to: EMAIL_EMPRESA });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao enviar" }, { status: 500 });
  }
}
