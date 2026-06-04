import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { generateClientEmail, STEP_DELAYS_DAYS } from "@/lib/client-email-content";

const ADMIN_EMAIL = "armaandaswani19@gmail.com";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtArea(n: number) {
  return n.toFixed(2).replace(".", ",");
}

interface SpaceBreakdownItem {
  spaceName: string;
  productName: string;
  dimLabel: string;
  plates: number;
  area_m2: number;
  total: number;
  imageUrl?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    coupon_use_id, client_name, client_email, client_phone,
    space, model, plates, area_m2, total, dim_label, product_images,
    space_breakdown, partner_name, quote_url,
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
      client_phone: client_phone ?? null,
      space: space || null,
      model,
      plates,
      area_m2,
      total,
      dim_label: dim_label ?? null,
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
      productImages: Array.isArray(product_images) ? product_images as Array<{ imageUrl: string; productName: string; spaceName: string }> : null,
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
    const totalFmt = fmtBRL(total as number);
    const breakdown: SpaceBreakdownItem[] = Array.isArray(space_breakdown) ? space_breakdown : [];
    const hasBreakdown = breakdown.length > 0;
    const couponLine = partner_name && partner_name !== "Orbital"
      ? `<tr><td style="padding:5px 0;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">Cupom parceiro</td><td style="padding:5px 0 5px 16px;color:#002045;font-size:12px;font-weight:700;font-family:Arial,sans-serif;">${partner_name}</td></tr>`
      : "";

    // ── Product thumbnails (unique by imageUrl, max 3) ──────────────────────
    const uniqueImgs: SpaceBreakdownItem[] = [];
    const seenUrls = new Set<string>();
    for (const sp of breakdown) {
      if (sp.imageUrl && !seenUrls.has(sp.imageUrl)) {
        seenUrls.add(sp.imageUrl);
        uniqueImgs.push(sp);
      }
    }
    const thumbItems = uniqueImgs.slice(0, 3);
    const thumbBlock = thumbItems.length === 0 ? "" : `
<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;border-collapse:separate;border-spacing:8px 0;">
  <tr>
    ${thumbItems.map((img) => `
    <td style="width:${Math.floor(100 / thumbItems.length)}%;vertical-align:top;padding:0 4px;">
      <img src="${img.imageUrl}" alt="${img.productName}" style="display:block;width:100%;height:auto;border:0;" />
      <p style="margin:4px 0 0;font-size:10px;color:#74777f;font-family:Arial,sans-serif;line-height:1.4;">${img.spaceName ?? img.productName}<br><span style="color:#002045;font-weight:700;">${img.productName}</span></p>
    </td>`).join("")}
  </tr>
</table>`;

    // ── Per-space breakdown table ────────────────────────────────────────────
    const breakdownRows = hasBreakdown ? breakdown.map((sp, i) => `
<tr style="${i > 0 ? "border-top:1px solid #f0f0f0;" : ""}">
  <td style="padding:10px 0;vertical-align:top;">
    <p style="margin:0 0 2px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${sp.spaceName}</p>
    <p style="margin:0;color:#74777f;font-size:11px;font-family:Arial,sans-serif;">${sp.productName}${sp.dimLabel ? ` · ${sp.dimLabel}` : ""}</p>
  </td>
  <td style="padding:10px 0 10px 12px;text-align:right;vertical-align:top;white-space:nowrap;">
    <p style="margin:0 0 2px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${fmtBRL(sp.total)}</p>
    <p style="margin:0;color:#74777f;font-size:11px;font-family:Arial,sans-serif;">${sp.plates} placa${sp.plates !== 1 ? "s" : ""} · ${fmtArea(sp.area_m2)} m²</p>
  </td>
</tr>`).join("") : "";

    const breakdownBlock = hasBreakdown ? `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border-top:2px solid #002045;">
  ${breakdownRows}
  <tr style="border-top:2px solid #002045;">
    <td style="padding:12px 0 4px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Total material</td>
    <td style="padding:12px 0 4px;text-align:right;color:#002045;font-size:18px;font-weight:700;font-family:Arial,sans-serif;white-space:nowrap;">${totalFmt}</td>
  </tr>
</table>` : `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;">
  <tr><td style="padding:6px 0;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">Total material</td><td style="padding:6px 0 6px 16px;color:#002045;font-size:16px;font-weight:700;font-family:Arial,sans-serif;">${totalFmt}</td></tr>
</table>`;

    // ── Quote link button ────────────────────────────────────────────────────
    const quoteLinkBlock = quote_url ? `
<table cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
  <tr><td style="background:#f5f5f3;border:1px solid #e2e2e2;padding:0;">
    <a href="${quote_url}" style="display:inline-block;padding:12px 24px;color:#002045;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Ver orçamento como o cliente →</a>
  </td></tr>
</table>` : "";

    // ── WA + quote buttons ───────────────────────────────────────────────────
    const waHref = client_phone ? `https://wa.me/55${String(client_phone).replace(/\D/g, "")}` : null;
    const ctaBlock = (waHref || quote_url) ? `
<table cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-collapse:separate;border-spacing:8px 0;">
  <tr>
    ${waHref ? `<td style="background:#002045;padding:0;"><a href="${waHref}" style="display:inline-block;padding:13px 24px;color:#ffffff;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">WhatsApp do cliente</a></td>` : ""}
    ${quote_url ? `<td style="background:#f5f5f3;border:1px solid #e2e2e2;padding:0;"><a href="${quote_url}" style="display:inline-block;padding:13px 24px;color:#002045;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Ver orçamento →</a></td>` : ""}
  </tr>
</table>` : "";

    await resend.emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: ADMIN_EMAIL,
      subject: `🆕 Novo orçamento — ${client_name} (${totalFmt})`,
      html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0eeeb;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:560px;width:100%;">

      <!-- Header -->
      <tr><td style="background:#002045;padding:20px 28px;">
        <p style="margin:0;color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">Orbital Revestimentos</p>
        <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,sans-serif;">Novo orçamento recebido</p>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:28px;">

        ${thumbBlock}

        <!-- Client info -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
          <tr><td style="padding:5px 0;color:#74777f;font-size:12px;font-family:Arial,sans-serif;width:110px;">Cliente</td><td style="padding:5px 0 5px 16px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${client_name}</td></tr>
          <tr><td style="padding:5px 0;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">E-mail</td><td style="padding:5px 0 5px 16px;font-size:12px;font-family:Arial,sans-serif;"><a href="mailto:${client_email}" style="color:#002045;">${client_email}</a></td></tr>
          ${client_phone ? `<tr><td style="padding:5px 0;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">WhatsApp</td><td style="padding:5px 0 5px 16px;font-size:12px;font-weight:700;font-family:Arial,sans-serif;"><a href="https://wa.me/55${String(client_phone).replace(/\D/g,"")}" style="color:#002045;">${client_phone}</a></td></tr>` : ""}
          ${couponLine}
        </table>

        <!-- Breakdown -->
        ${breakdownBlock}

        <!-- CTAs -->
        ${ctaBlock}

      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f5f5f3;padding:16px 28px;border-top:1px solid #e2e2e2;">
        <p style="margin:0;color:#b0b0b0;font-size:10px;font-family:Arial,sans-serif;">Orbital Revestimentos · Notificação interna</p>
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
