import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { clientEmail, clientName } = await req.json();

  if (!clientEmail) return NextResponse.json({ error: "E-mail obrigatório." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: quote, error } = await db
    .from("saved_quotes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !quote) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://orbitalrevestimentos.com.br";
  const quoteUrl = `${siteUrl}/orcamento/${slug}`;
  const spaces = (quote.spaces as Array<{ spaceName: string; productName: string; plates: number; total: number }>) ?? [];
  const finalValue = quote.material_discounted ?? quote.material_total ?? 0;
  const expiresFormatted = new Date(quote.expires_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const greeting = clientName ? `Olá, <strong>${clientName}</strong>` : "Olá";
  const preparedBy = quote.partner_name ? `preparado por <strong>${quote.partner_name}</strong>` : "preparado especialmente para você";

  const spacesHtml = spaces.map((sp) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:13px;color:#002045;font-family:Georgia,serif;">${sp.spaceName}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:12px;color:#43474e;font-family:Arial,sans-serif;">${sp.productName}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:12px;color:#43474e;font-family:Arial,sans-serif;text-align:right;">${sp.plates} placa${sp.plates !== 1 ? "s" : ""}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0efec;font-size:13px;color:#002045;font-weight:700;font-family:Arial,sans-serif;text-align:right;">${fmt(sp.total)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0efec;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px 0;">
    <table cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

      <!-- Header -->
      <tr><td style="background:#002045;padding:28px 32px;">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#86a0cd;font-family:Arial,sans-serif;">Orçamento exclusivo</p>
        <p style="margin:0;font-size:24px;color:#ffffff;font-family:Georgia,serif;font-weight:400;">Seu projeto em PFB Orbital</p>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#ffffff;border:1px solid #e2e2e2;border-top:0;padding:28px 32px;">
        <p style="margin:0 0 20px;font-size:14px;color:#43474e;font-family:Arial,sans-serif;line-height:1.6;">
          ${greeting} — segue o orçamento ${preparedBy} com os produtos PFB Orbital para o seu projeto.
        </p>

        <!-- Spaces table -->
        <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr>
              <th style="padding:6px 0;border-bottom:2px solid #002045;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#74777f;font-family:Arial,sans-serif;text-align:left;">Ambiente</th>
              <th style="padding:6px 0;border-bottom:2px solid #002045;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#74777f;font-family:Arial,sans-serif;text-align:left;">Produto</th>
              <th style="padding:6px 0;border-bottom:2px solid #002045;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#74777f;font-family:Arial,sans-serif;text-align:right;">Qtd.</th>
              <th style="padding:6px 0;border-bottom:2px solid #002045;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#74777f;font-family:Arial,sans-serif;text-align:right;">Valor</th>
            </tr>
          </thead>
          <tbody>${spacesHtml}</tbody>
        </table>

        <!-- Total -->
        <table cellpadding="0" cellspacing="0" width="100%" style="background:#002045;margin-bottom:24px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 2px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#86a0cd;font-family:Arial,sans-serif;">Total do projeto${quote.coupon_code ? ` — cupom ${quote.coupon_code}` : ""}</p>
              <p style="margin:0;font-size:28px;color:#ffffff;font-family:Georgia,serif;font-weight:400;">${fmt(finalValue)}</p>
            </td>
          </tr>
        </table>

        <!-- CTA -->
        <p style="margin:0 0 12px;font-size:13px;color:#43474e;font-family:Arial,sans-serif;">Acesse o link abaixo para ver o orçamento completo com fotos dos produtos:</p>
        <a href="${quoteUrl}" style="display:block;background:#002045;color:#ffffff;text-decoration:none;text-align:center;padding:14px 24px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;margin-bottom:16px;">
          Ver orçamento completo →
        </a>

        <p style="margin:0;font-size:11px;color:#74777f;font-family:Arial,sans-serif;">
          Este orçamento é válido até <strong>${expiresFormatted}</strong>. Para avançar ou tirar dúvidas, entre em contato pelo WhatsApp:
          <a href="https://wa.me/559288150149" style="color:#002045;">(92) 98815-0149</a>.
        </p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f0efec;border:1px solid #e2e2e2;border-top:0;padding:16px 32px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#74777f;font-family:Arial,sans-serif;">
          Orbital Revestimentos · Manaus, AM ·
          <a href="https://orbitalrevestimentos.com.br" style="color:#74777f;">orbitalrevestimentos.com.br</a>
        </p>
      </td></tr>

    </table>
  </td></tr></table>
</body></html>`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: clientEmail,
      subject: `Orçamento Orbital${quote.partner_name ? ` — ${quote.partner_name}` : ""} · válido até ${expiresFormatted}`,
      html,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Quote email send failed:", err);
    return NextResponse.json({ error: "Falha ao enviar e-mail." }, { status: 500 });
  }
}
