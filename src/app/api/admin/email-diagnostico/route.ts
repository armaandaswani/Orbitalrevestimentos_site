import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { EMAIL_EMPRESA } from "@/lib/email-destinos";

/**
 * Diagnóstico dos e-mails do site para a Orbital.
 *
 * GET  — status dos últimos e-mails no Resend (entregue, spam, bloqueado…) e
 *        do domínio de envio. Só leitura.
 * POST — envia um e-mail de teste para EMAIL_EMPRESA e devolve a resposta
 *        exata do Resend (o SDK não lança exceção: devolve { error }).
 */

const FROM = "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>";

async function cliente() {
  if (!process.env.RESEND_API_KEY) return null;
  try {
    return (await import("@/lib/resend")).getResend();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resend = await cliente();
  if (!resend) return NextResponse.json({ configurado: false, destino: EMAIL_EMPRESA });

  const [lista, dominios] = await Promise.all([
    resend.emails.list({ limit: 100 }).catch((e: unknown) => ({ data: null, error: { name: "exception", message: String(e) } })),
    resend.domains.list().catch((e: unknown) => ({ data: null, error: { name: "exception", message: String(e) } })),
  ]);

  const emails = lista.data?.data ?? [];
  const contagem: Record<string, number> = {};
  for (const e of emails) contagem[e.last_event] = (contagem[e.last_event] ?? 0) + 1;

  const paraEmpresa = emails
    .filter((e) => (e.to ?? []).some((t) => t.toLowerCase() === EMAIL_EMPRESA))
    .slice(0, 25)
    .map((e) => ({ id: e.id, created_at: e.created_at, subject: e.subject, last_event: e.last_event }));

  const dominio = (dominios.data?.data ?? []).find((d) => d.name === "orbitalrevestimentos.com.br");

  return NextResponse.json({
    configurado: true,
    destino: EMAIL_EMPRESA,
    lista_erro: lista.error ? `${lista.error.name}: ${lista.error.message}` : null,
    total_recentes: emails.length,
    ultimo_envio: emails[0]?.created_at ?? null,
    contagem,
    para_empresa: paraEmpresa,
    dominio: dominio ? { status: dominio.status } : null,
    dominio_erro: dominios.error ? `${dominios.error.name}: ${dominios.error.message}` : null,
  });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resend = await cliente();
  if (!resend) return NextResponse.json({ ok: false, erro: "RESEND_API_KEY não está configurada no Vercel." });

  const quando = new Date().toLocaleString("pt-BR", { timeZone: "America/Manaus" });
  const envio = await resend.emails
    .send({
      from: FROM,
      to: EMAIL_EMPRESA,
      subject: "Teste de aviso — Orbital Revestimentos",
      text: `E-mail de teste enviado pelo painel admin em ${quando}. Se chegou, os avisos do site estão saindo normalmente.`,
    })
    .catch((e: unknown) => ({ data: null, error: { name: "exception", message: String(e) } }));

  if (envio.error) {
    console.error("[email-diagnostico] teste falhou", envio.error);
    return NextResponse.json({ ok: false, erro: `${envio.error.name}: ${envio.error.message}` });
  }
  return NextResponse.json({ ok: true, id: envio.data?.id ?? null, destino: EMAIL_EMPRESA });
}
