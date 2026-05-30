/*
 * Weekly Email Campaign Cron Job
 * Schedule: Every Monday at 12:00 UTC (9:00 AM Manaus / UTC-4)
 *
 * Required SQL — run once in Supabase SQL editor:
 *
 * CREATE TABLE email_campaigns (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   campaign_type TEXT NOT NULL CHECK (campaign_type IN ('product', 'educational')),
 *   campaign_subtype TEXT NOT NULL,
 *   subject TEXT NOT NULL,
 *   preview_text TEXT,
 *   html_body TEXT NOT NULL,
 *   status TEXT NOT NULL DEFAULT 'pending_approval'
 *     CHECK (status IN ('pending_approval', 'approved', 'sent')),
 *   approve_token UUID DEFAULT gen_random_uuid() UNIQUE,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   approved_at TIMESTAMPTZ,
 *   sent_at TIMESTAMPTZ,
 *   recipient_count INTEGER
 * );
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import {
  generateCampaignContent,
  getNextCampaignRotation,
} from "@/lib/email-campaign-content";

const ADMIN_EMAIL = "armaandaswani19@gmail.com";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = supabaseAdmin();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://orbitalrevestimentos.com.br";

  // Count existing campaigns
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

  // Count active partners with email for banner
  const { count: partnerCount } = await db
    .from("partners")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .not("email", "is", null);

  const approveUrl = `${siteUrl}/api/email-campaigns/${campaign.id}/approve?token=${campaign.approve_token}`;

  const testHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[TESTE] ${content.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0efec;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-bottom:2px solid #f59e0b;">
    <tr><td align="center" style="padding:16px 24px;">
      <table cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
        <tr>
          <td>
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#78350f;font-family:Arial,sans-serif;">&#9888; CAMPANHA SEMANAL AGUARDANDO APROVAÇÃO &#8212; ${partnerCount ?? 0} parceiros ativos</p>
            <p style="margin:0 0 12px;font-size:12px;color:#92400e;font-family:Arial,sans-serif;">Tipo: ${campaignType} &nbsp;·&nbsp; Subtipo: ${campaignSubtype}</p>
            <div>
              <a href="${approveUrl}" style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;padding:10px 20px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;margin-right:8px;">&#10003; Aprovar e Enviar</a>
              <a href="${siteUrl}/admin" style="display:inline-block;background:#002045;color:#ffffff;text-decoration:none;padding:10px 20px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;">Ver no painel admin</a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
  ${content.htmlBody
    .replace(/<!DOCTYPE[^>]*>/i, "")
    .replace(/<html[^>]*>/i, "")
    .replace(/<\/html>/i, "")
    .replace(/<head>[\s\S]*?<\/head>/i, "")
    .replace(/<body[^>]*>/i, "")
    .replace(/<\/body>/i, "")
    .replace(/{{PARTNER_NAME}}/g, "Armaan Daswani")
    .replace(/{{COUPON_CODE}}/g, "PREVIEW")}
</body>
</html>`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Orbital Revestimentos <orbitalrevestimentos@gmail.com>",
      to: ADMIN_EMAIL,
      subject: `[TESTE] ${content.subject}`,
      html: testHtml,
    });
  } catch (emailErr) {
    console.error("Failed to send cron test email:", emailErr);
  }

  return NextResponse.json({ success: true, campaignId: campaign.id });
}
