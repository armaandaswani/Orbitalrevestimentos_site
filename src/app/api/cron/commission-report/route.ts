/*
 * Weekly Commission Report Cron
 * Schedule: Every Monday at 9:00 AM Manaus time (13:00 UTC)
 * Sends admin a full report of pending + recently paid commissions.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";

const ADMIN_EMAIL = "armaandaswani19@gmail.com";

function fmt(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function row(
  date: string,
  partner: string,
  rep: string,
  product: string,
  partnerComm: string,
  partnerStatus: string,
  repComm: string,
  repStatus: string
) {
  const statusBadge = (s: string) =>
    s === "Pago"
      ? `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${s}</span>`
      : `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${s}</span>`;

  return `
    <tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:8px 10px;font-size:12px;color:#43474e;white-space:nowrap;">${date}</td>
      <td style="padding:8px 10px;font-size:12px;color:#002045;font-weight:600;">${partner}</td>
      <td style="padding:8px 10px;font-size:12px;color:#74777f;">${rep}</td>
      <td style="padding:8px 10px;font-size:12px;color:#43474e;">${product}</td>
      <td style="padding:8px 10px;font-size:12px;font-weight:700;color:#002045;">${partnerComm}</td>
      <td style="padding:8px 10px;">${statusBadge(partnerStatus)}</td>
      <td style="padding:8px 10px;font-size:12px;font-weight:700;color:#1a365d;">${repComm}</td>
      <td style="padding:8px 10px;">${repStatus !== "—" ? statusBadge(repStatus) : '<span style="color:#ccc;">—</span>'}</td>
    </tr>`;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = supabaseAdmin();

  // Fetch all concluded coupon uses with partner/rep info
  const { data: uses, error } = await db
    .from("coupon_uses")
    .select(`
      id, coupon_code, created_at, product_name,
      commission_owed, partner_commission_paid_at,
      sales_rep_referral_code, sales_rep_commission_owed, rep_commission_paid_at,
      partners!inner ( name )
    `)
    .eq("sale_status", "concluido")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type UseRow = {
    id: string;
    coupon_code: string;
    created_at: string;
    product_name: string | null;
    commission_owed: number | null;
    partner_commission_paid_at: string | null;
    sales_rep_referral_code: string | null;
    sales_rep_commission_owed: number | null;
    rep_commission_paid_at: string | null;
    partners: { name: string } | null;
  };

  const rows = (uses ?? []) as unknown as UseRow[];

  // Unpaid commissions
  const unpaidPartner = rows.filter((u) => !u.partner_commission_paid_at && u.commission_owed);
  const unpaidRep = rows.filter((u) => u.sales_rep_commission_owed && !u.rep_commission_paid_at);

  const totalUnpaidPartner = unpaidPartner.reduce((a, u) => a + (u.commission_owed ?? 0), 0);
  const totalUnpaidRep = unpaidRep.reduce((a, u) => a + (u.sales_rep_commission_owed ?? 0), 0);

  // Paid this week (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const paidThisWeekPartner = rows
    .filter((u) => u.partner_commission_paid_at && u.partner_commission_paid_at > weekAgo)
    .reduce((a, u) => a + (u.commission_owed ?? 0), 0);
  const paidThisWeekRep = rows
    .filter((u) => u.rep_commission_paid_at && u.rep_commission_paid_at > weekAgo)
    .reduce((a, u) => a + (u.sales_rep_commission_owed ?? 0), 0);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://orbitalrevestimentos.com.br";

  // Build table rows HTML — only unpaid first, then recently paid
  const tableRows = rows
    .filter((u) => !u.partner_commission_paid_at || (u.sales_rep_commission_owed && !u.rep_commission_paid_at) || (u.partner_commission_paid_at && u.partner_commission_paid_at > weekAgo) || (u.rep_commission_paid_at && u.rep_commission_paid_at > weekAgo))
    .map((u) =>
      row(
        new Date(u.created_at).toLocaleDateString("pt-BR"),
        (u.partners as { name: string } | null)?.name ?? u.coupon_code,
        u.sales_rep_referral_code ?? "—",
        u.product_name ?? "—",
        u.commission_owed ? fmt(u.commission_owed) : "—",
        u.partner_commission_paid_at ? "Pago" : "A pagar",
        u.sales_rep_commission_owed ? fmt(u.sales_rep_commission_owed) : "—",
        u.sales_rep_commission_owed
          ? u.rep_commission_paid_at
            ? "Pago"
            : "A pagar"
          : "—"
      )
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Relatório de Comissões — Orbital</title>
</head>
<body style="margin:0;padding:0;background:#f0efec;font-family:Arial,Helvetica,sans-serif;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px 0;">
      <table cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;">
        <tr>
          <td style="background:#002045;padding:28px 32px;">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#86a0cd;font-family:Arial,sans-serif;">Relatório Semanal</p>
            <p style="margin:0;font-size:22px;color:#ffffff;font-family:Georgia,serif;font-weight:400;">Comissões — ${new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>

  <!-- Summary cards -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:0 16px;">
      <table cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;">
        <tr>
          <td style="background:#ffffff;border:1px solid #e2e2e2;border-top:0;padding:24px 32px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="33%" style="padding-right:12px;">
                  <p style="margin:0 0 4px;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:#74777f;font-weight:700;font-family:Arial,sans-serif;">A PAGAR — PARCEIROS</p>
                  <p style="margin:0;font-size:24px;color:#002045;font-family:Georgia,serif;">${fmt(totalUnpaidPartner)}</p>
                </td>
                <td width="33%" style="padding-right:12px;border-left:1px solid #e2e2e2;padding-left:12px;">
                  <p style="margin:0 0 4px;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:#74777f;font-weight:700;font-family:Arial,sans-serif;">A PAGAR — REPRESENTANTES</p>
                  <p style="margin:0;font-size:24px;color:#1a365d;font-family:Georgia,serif;">${fmt(totalUnpaidRep)}</p>
                </td>
                <td width="33%" style="border-left:1px solid #e2e2e2;padding-left:12px;">
                  <p style="margin:0 0 4px;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:#74777f;font-weight:700;font-family:Arial,sans-serif;">PAGO ESTA SEMANA</p>
                  <p style="margin:0;font-size:24px;color:#166534;font-family:Georgia,serif;">${fmt(paidThisWeekPartner + paidThisWeekRep)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>

  <!-- Table -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:0 16px 8px;">
      <table cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;">
        <tr>
          <td style="background:#ffffff;border:1px solid #e2e2e2;border-top:0;padding:0 0 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:2px solid #e2e2e2;background:#fafafa;">
                  ${["Data","Parceiro","Rep.","Produto","Com. Parceiro","Status","Com. Rep.","Status Rep."].map(h => `<th style="text-align:left;padding:10px 10px;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#74777f;font-weight:700;font-family:Arial,sans-serif;white-space:nowrap;">${h}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${tableRows || `<tr><td colspan="8" style="padding:20px;text-align:center;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">Nenhuma comissão pendente esta semana.</td></tr>`}
              </tbody>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>

  <!-- CTA -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:0 16px 40px;">
      <table cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;">
        <tr>
          <td style="background:#f0efec;border:1px solid #e2e2e2;border-top:0;padding:20px 32px;text-align:center;">
            <a href="${siteUrl}/admin" style="display:inline-block;background:#002045;color:#ffffff;text-decoration:none;padding:12px 28px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;">Marcar comissões como pagas →</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>

</body>
</html>`;

  const totalPending = unpaidPartner.length + unpaidRep.length;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: ADMIN_EMAIL,
      subject: `💰 Comissões a pagar — ${totalPending} pendente${totalPending !== 1 ? "s" : ""} · ${fmt(totalUnpaidPartner + totalUnpaidRep)}`,
      html,
    });
  } catch (err) {
    console.error("Commission report email failed:", err);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    unpaidPartner: unpaidPartner.length,
    unpaidRep: unpaidRep.length,
    totalUnpaid: fmt(totalUnpaidPartner + totalUnpaidRep),
  });
}
