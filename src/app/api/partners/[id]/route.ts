import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const db = supabaseAdmin();

  // Fetch current record to detect changes
  const { data: current } = await db
    .from("partners")
    .select("name, email, portal_password, coupon_code, status, profession, has_special_table")
    .eq("id", id)
    .single();

  const { data, error } = await db
    .from("partners")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send beautiful welcome email if status changed from pending → active
  if (current && data && current.status === "pending" && body.status === "active") {
    const recipientEmail = data.email as string | null;
    if (recipientEmail) {
      try {
        const { getResend } = await import("@/lib/resend");
        const { generatePartnerWelcomeEmail, formatValueLabel } = await import("@/lib/partner-email-content");
        const resend = getResend();
        const { subject, html } = generatePartnerWelcomeEmail({
          partnerName: data.name as string,
          couponCode: data.coupon_code as string,
          discountLabel: formatValueLabel(
            (data.discount_type as "percentage" | "fixed") ?? "percentage",
            (data.discount_value as number) ?? 0
          ),
          bonusLabel: formatValueLabel(
            (data.commission_type as "percentage" | "fixed") ?? "percentage",
            (data.commission_value as number) ?? 0
          ),
        });
        await resend.emails.send({
          from: "Orbital Revestimentos <orbitalrevestimentos@gmail.com>",
          to: recipientEmail,
          subject,
          html,
        });
      } catch {
        // email failure is non-fatal
      }
    }
  }

  // Send special table email if has_special_table was just activated
  if (current && data && !current.has_special_table && body.has_special_table === true) {
    const recipientEmail = data.email as string | null;
    if (recipientEmail) {
      try {
        const { getResend } = await import("@/lib/resend");
        const { generatePartnerSpecialTableEmail } = await import("@/lib/partner-email-content");
        const resend = getResend();
        const { subject, html } = generatePartnerSpecialTableEmail({
          partnerName: data.name as string,
          couponCode: data.coupon_code as string,
        });
        await resend.emails.send({
          from: "Orbital Revestimentos <orbitalrevestimentos@gmail.com>",
          to: recipientEmail,
          subject,
          html,
        });
      } catch {
        // email failure is non-fatal
      }
    }
  }

  // Send notification email if email or password changed
  if (current && data) {
    const emailChanged = body.email !== undefined && body.email !== current.email && body.email;
    const passwordChanged = body.portal_password !== undefined && body.portal_password !== current.portal_password && body.portal_password;

    if (emailChanged || passwordChanged) {
      const recipientEmail = emailChanged ? (body.email as string) : (current.email as string);
      if (recipientEmail) {
        try {
          const { getResend } = await import("@/lib/resend");
          const resend = getResend();
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://orbitalrevestimentos.com.br";

          const changes: string[] = [];
          if (emailChanged) changes.push(`<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Novo e-mail</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;font-size:14px;text-align:right">${body.email}</td></tr>`);
          if (passwordChanged) changes.push(`<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Nova senha</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;font-size:14px;text-align:right;font-family:monospace">${body.portal_password}</td></tr>`);

          await resend.emails.send({
            from: "Orbital Revestimentos <orbitalrevestimentos@gmail.com>",
            to: recipientEmail,
            subject: "Seus dados de acesso foram atualizados — Orbital Revestimentos",
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
                <h2 style="font-size:20px;margin-bottom:8px;color:#002045">Dados de acesso atualizados</h2>
                <p style="color:#555;margin-bottom:24px">Olá, ${data.name}. Seus dados de acesso no portal Orbital foram atualizados por nossa equipe.</p>
                <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
                  <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Cupom</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;font-size:14px;text-align:right;letter-spacing:0.1em">${data.coupon_code}</td></tr>
                  ${changes.join("")}
                </table>
                <a href="${siteUrl}/parceiro" style="display:inline-block;background:#002045;color:#fff;text-decoration:none;padding:12px 24px;font-size:14px;font-weight:600;margin-bottom:24px">
                  Acessar meu portal
                </a>
                <p style="color:#888;font-size:12px;margin-top:24px">Se você não reconhece essa alteração, entre em contato conosco pelo WhatsApp.</p>
                <p style="color:#888;font-size:12px">Orbital Revestimentos · Manaus, AM</p>
              </div>
            `,
          });
        } catch {
          // email failure is non-fatal
        }
      }
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = supabaseAdmin();

  await db.from("coupon_uses").delete().eq("partner_id", id);
  const { error } = await db.from("partners").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
