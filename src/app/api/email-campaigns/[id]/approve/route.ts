import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";

function htmlPage(title: string, body: string): Response {
  return new Response(
    `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f3; font-family: Arial, Helvetica, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border: 1px solid #e2e2e2; padding: 48px 56px; max-width: 520px; text-align: center; }
    h1 { color: #002045; font-size: 22px; margin: 0 0 12px; }
    p { color: #43474e; font-size: 14px; line-height: 1.7; margin: 0 0 8px; }
    .note { color: #74777f; font-size: 12px; margin-top: 20px; }
    a { color: #002045; }
  </style>
</head>
<body>
  <div class="card">${body}</div>
</body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return htmlPage(
      "Erro",
      `<h1>Token inválido</h1><p>O link de aprovação não contém um token válido.</p>`,
    );
  }

  const db = supabaseAdmin();

  // Fetch campaign
  const { data: campaign, error } = await db
    .from("email_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return htmlPage("Erro", `<h1>Erro interno</h1><p>${error.message}</p>`);
  }

  if (!campaign) {
    return htmlPage("Campanha não encontrada", `<h1>Campanha não encontrada</h1>`);
  }

  if (campaign.status === "sent") {
    return htmlPage(
      "Campanha já enviada",
      `<h1>Esta campanha já foi enviada.</h1>
       <p>Enviada em ${new Date(campaign.sent_at).toLocaleString("pt-BR")} para ${campaign.recipient_count ?? 0} destinatários.</p>`,
    );
  }

  if (campaign.approve_token !== token) {
    return htmlPage(
      "Token inválido",
      `<h1>Token de aprovação inválido.</h1><p>O link pode estar desatualizado.</p>`,
    );
  }

  if (campaign.status !== "pending_approval") {
    return htmlPage(
      "Status inválido",
      `<h1>Esta campanha não pode ser aprovada.</h1><p>Status atual: ${campaign.status}</p>`,
    );
  }

  // Fetch active partners with email
  const { data: partners, error: partnersError } = await db
    .from("partners")
    .select("id, name, email, coupon_code")
    .eq("status", "active")
    .not("email", "is", null);

  if (partnersError) {
    return htmlPage("Erro", `<h1>Erro ao buscar parceiros</h1><p>${partnersError.message}</p>`);
  }

  const recipients = (partners ?? []).filter(
    (p): p is { id: string; name: string; email: string; coupon_code: string } =>
      typeof p.email === "string" && p.email.length > 0,
  );

  // Send emails in batches of 50
  const BATCH_SIZE = 50;
  const resend = getResend();
  let sent = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((partner) => {
        const personalizedHtml = campaign.html_body
          .replace(/{{PARTNER_NAME}}/g, partner.name)
          .replace(/{{COUPON_CODE}}/g, partner.coupon_code);

        return resend.emails.send({
          from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
          to: partner.email,
          subject: campaign.subject,
          html: personalizedHtml,
        });
      }),
    );
    sent += batch.length;

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // Update campaign status
  await db
    .from("email_campaigns")
    .update({
      status: "sent",
      approved_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      recipient_count: sent,
    })
    .eq("id", id);

  return htmlPage(
    "Campanha enviada",
    `<h1>Campanha enviada com sucesso!</h1>
     <p>Enviada para <strong>${sent} parceiros</strong>.</p>
     <p>Assunto: <em>${campaign.subject}</em></p>
     <p class="note"><a href="/admin">Voltar ao painel admin</a></p>`,
  );
}
