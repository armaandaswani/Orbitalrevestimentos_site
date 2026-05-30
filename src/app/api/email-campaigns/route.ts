import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import {
  generateCampaignContent,
  getNextCampaignRotation,
} from "@/lib/email-campaign-content";

const ADMIN_EMAIL = "armaandaswani19@gmail.com";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("email_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (req.headers.get("origin") ?? "https://orbitalrevestimentos.com.br");

  // Count existing campaigns to determine rotation
  const { count, error: countError } = await db
    .from("email_campaigns")
    .select("id", { count: "exact", head: true });

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const existingCount = count ?? 0;
  const { campaignType, campaignSubtype } = getNextCampaignRotation(existingCount);

  const content = generateCampaignContent(
    campaignSubtype,
    "{{PARTNER_NAME}}",
    "{{COUPON_CODE}}",
    siteUrl,
  );

  // Insert campaign
  const { data: campaign, error: insertError } = await db
    .from("email_campaigns")
    .insert({
      campaign_type: campaignType,
      campaign_subtype: campaignSubtype,
      subject: content.subject,
      preview_text: content.previewText,
      html_body: content.htmlBody,
      status: "pending_approval",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Count active partners with email for the preview banner
  const { count: partnerCount } = await db
    .from("partners")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .not("email", "is", null);

  const approveUrl = `${siteUrl}/api/email-campaigns/${campaign.id}/approve?token=${campaign.approve_token}`;

  // Build test email with preview banner
  const testHtmlBody = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[TESTE] ${content.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0efec;font-family:Arial,Helvetica,sans-serif;">
  <!-- Preview banner -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-bottom:2px solid #f59e0b;">
    <tr><td align="center" style="padding:16px 24px;">
      <table cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
        <tr>
          <td>
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#78350f;font-family:Arial,sans-serif;">&#9888; CAMPANHA AGUARDANDO APROVAÇÃO</p>
            <p style="margin:0 0 12px;font-size:12px;color:#92400e;font-family:Arial,sans-serif;">Será enviada para aproximadamente <strong>${partnerCount ?? 0} parceiros ativos</strong> se aprovada.</p>
            <div style="display:flex;gap:8px;">
              <a href="${approveUrl}" style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;padding:10px 20px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;margin-right:8px;">&#10003; Aprovar e Enviar</a>
              <a href="${siteUrl}/admin" style="display:inline-block;background:#002045;color:#ffffff;text-decoration:none;padding:10px 20px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;">Ver no painel admin</a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
  <!-- Campaign body with placeholder values replaced for preview -->
  ${content.htmlBody
    .replace(/<html[^>]*>[\s\S]*?<body[^>]*>/i, "")
    .replace(/<\/body>[\s\S]*?<\/html>/i, "")
    .replace(/{{PARTNER_NAME}}/g, "Armaan Daswani")
    .replace(/{{COUPON_CODE}}/g, "PREVIEW")}
</body>
</html>`;

  // Send test email
  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Orbital Revestimentos <orbitalrevestimentos@gmail.com>",
      to: ADMIN_EMAIL,
      subject: `[TESTE] ${content.subject}`,
      html: testHtmlBody,
    });
  } catch (emailErr) {
    console.error("Failed to send test email:", emailErr);
    // Don't fail the whole request if email fails
  }

  return NextResponse.json(campaign, { status: 201 });
}
