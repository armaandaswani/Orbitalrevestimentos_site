import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { generateClientEmail, STEP_DELAYS_DAYS } from "@/lib/client-email-content";

const ADMIN_EMAIL = "armaandaswani19@gmail.com";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    coupon_use_id, client_name, client_email, client_phone,
    space, model, plates, area_m2, total, partner_name, quote_url,
  } = body;

  if (!client_name || !client_email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Next email at: step 2 scheduled in STEP_DELAYS_DAYS[1] days
  const delayDays = STEP_DELAYS_DAYS[1] ?? 3;
  const nextEmailAt = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: seq, error } = await db
    .from("client_email_sequences")
    .insert({
      coupon_use_id: coupon_use_id ?? null,
      client_name,
      client_email,
      space: space || null,
      model,
      plates,
      area_m2,
      total,
      partner_name,
      current_step: 1,
      next_email_at: nextEmailAt,
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const resend = getResend();

  // Send step 1 to client immediately (non-fatal)
  try {
    const { subject, html } = generateClientEmail(1, {
      clientName: client_name as string,
      space: space as string | null,
      model: model as string,
      plates: plates as number,
      area: area_m2 as number,
      total: total as number,
      partnerName: partner_name as string,
      quoteUrl: (quote_url as string | null) ?? null,
    });
    await resend.emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: client_email as string,
      subject,
      html,
    });
  } catch {
    // email failure is non-fatal — sequence record already created
  }

  // Send internal notification to Orbital team (non-fatal)
  try {
    const spaceLabel = space || "não informado";
    const totalFmt = fmtBRL(total as number);
    const phoneLine = client_phone ? `<tr><td style="padding:6px 0;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">WhatsApp</td><td style="padding:6px 0 6px 16px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;"><a href="https://wa.me/55${String(client_phone).replace(/\D/g,"")}" style="color:#002045;">${client_phone}</a></td></tr>` : "";
    const couponLine = partner_name && partner_name !== "Orbital" ? `<tr><td style="padding:6px 0;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">Cupom parceiro</td><td style="padding:6px 0 6px 16px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${partner_name}</td></tr>` : "";

    await resend.emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: ADMIN_EMAIL,
      subject: `🆕 Novo orçamento — ${client_name} (${totalFmt})`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e2e2;">
      <tr><td style="background:#002045;padding:20px 28px;">
        <p style="margin:0;color:#ffffff;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Orbital Revestimentos</p>
        <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,sans-serif;">Novo orçamento recebido</p>
      </td></tr>
      <tr><td style="padding:28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">Cliente</td><td style="padding:6px 0 6px 16px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${client_name}</td></tr>
          <tr><td style="padding:6px 0;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">E-mail</td><td style="padding:6px 0 6px 16px;color:#002045;font-size:13px;font-family:Arial,sans-serif;"><a href="mailto:${client_email}" style="color:#002045;">${client_email}</a></td></tr>
          ${phoneLine}
          <tr><td colspan="2" style="padding:12px 0 4px;border-top:1px solid #f0f0f0;"></td></tr>
          <tr><td style="padding:6px 0;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">Espaço</td><td style="padding:6px 0 6px 16px;color:#002045;font-size:13px;font-family:Arial,sans-serif;">${spaceLabel}</td></tr>
          <tr><td style="padding:6px 0;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">Modelo</td><td style="padding:6px 0 6px 16px;color:#002045;font-size:13px;font-family:Arial,sans-serif;">${model}</td></tr>
          <tr><td style="padding:6px 0;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">Placas / Área</td><td style="padding:6px 0 6px 16px;color:#002045;font-size:13px;font-family:Arial,sans-serif;">${plates} placas — ${Number(area_m2).toFixed(2).replace(".", ",")} m²</td></tr>
          <tr><td style="padding:6px 0;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">Total material</td><td style="padding:6px 0 6px 16px;color:#002045;font-size:15px;font-weight:700;font-family:Arial,sans-serif;">${totalFmt}</td></tr>
          ${couponLine}
        </table>
        ${client_phone ? `
        <table cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
          <tr><td style="background:#002045;padding:0;">
            <a href="https://wa.me/55${String(client_phone).replace(/\D/g,"")}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Abrir WhatsApp do cliente</a>
          </td></tr>
        </table>` : ""}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
    });
  } catch {
    // notification failure is non-fatal
  }

  return NextResponse.json(seq, { status: 201 });
}
