import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { EMAIL_EMPRESA } from "@/lib/email-destinos";
import { aniversariantes, emailAniversarios } from "@/lib/aniversarios-server";

/**
 * Todo dia às 9h UTC (5h em Manaus): UM e-mail para a Orbital com os
 * aniversariantes de hoje — profissionais da planilha, parceiros e
 * representantes —, cada um com Instagram e WhatsApp (ou o atalho para buscar
 * o que falta), e a lista dos próximos 7 dias. Vai mesmo sem aniversário hoje,
 * para a semana nunca pegar ninguém de surpresa.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = supabaseAdmin();
  const lista = await aniversariantes(db);
  const { assunto, html } = emailAniversarios(lista);

  try {
    const { getResend } = await import("@/lib/resend");
    const { error } = await getResend().emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: EMAIL_EMPRESA,
      subject: assunto,
      html,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("Birthday email error:", err);
    return NextResponse.json({ error: "Falha ao enviar o e-mail de aniversários." }, { status: 500 });
  }

  return NextResponse.json({ hoje: lista.deHoje.length, proximos: lista.proximos.length });
}
