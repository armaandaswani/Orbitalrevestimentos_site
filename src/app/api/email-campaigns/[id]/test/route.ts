import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";

const ADMIN_EMAIL = "armaandaswani19@gmail.com";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();

  const { data: campaign, error } = await db
    .from("email_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (req.headers.get("origin") ?? "https://orbitalrevestimentos.com.br");

  // Count active partners with email for preview
  const { count: partnerCount } = await db
    .from("partners")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .not("email", "is", null);

  const approveUrl = `${siteUrl}/api/email-campaigns/${campaign.id}/approve?token=${campaign.approve_token}`;

  const previewBody = campaign.html_body
    .replace(/{{PARTNER_NAME}}/g, "Armaan Daswani")
    .replace(/{{COUPON_CODE}}/g, "PREVIEW");

  // Strip outer html/body so we can wrap in our own
  const innerHtml = previewBody
    .replace(/<!DOCTYPE[^>]*>/i, "")
    .replace(/<html[^>]*>/i, "")
    .replace(/<\/html>/i, "")
    .replace(/<head>[\s\S]*?<\/head>/i, "")
    .replace(/<body[^>]*>/i, "")
    .replace(/<\/body>/i, "");

  const testHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[TESTE] ${campaign.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0efec;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-bottom:2px solid #f59e0b;">
    <tr><td align="center" style="padding:16px 24px;">
      <table cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
        <tr>
          <td>
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#78350f;font-family:Arial,sans-serif;">&#9888; CAMPANHA AGUARDANDO APROVAÇÃO &#8212; Enviada para ${partnerCount ?? 0} parceiros ativos se aprovada</p>
            <div>
              <a href="${approveUrl}" style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;padding:10px 20px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;margin-right:8px;">&#10003; Aprovar e Enviar</a>
              <a href="${siteUrl}/admin" style="display:inline-block;background:#002045;color:#ffffff;text-decoration:none;padding:10px 20px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;">Ver no painel admin</a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
  ${innerHtml}
</body>
</html>`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: ADMIN_EMAIL,
      subject: `[TESTE] ${campaign.subject}`,
      html: testHtml,
    });
  } catch (emailErr) {
    return NextResponse.json(
      { error: `Failed to send email: ${emailErr}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
