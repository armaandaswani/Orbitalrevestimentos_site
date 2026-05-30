import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getResend } from "@/lib/resend";

const GENERIC_RESPONSE = {
  message: "Se o email estiver correto, você receberá as instruções em breve.",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { coupon_code, email } = body as { coupon_code?: string; email: string };

  if (!email) {
    return NextResponse.json({ error: "E-mail obrigatório." }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Look up by email; coupon_code is accepted as an optional additional filter (legacy)
  let query = db
    .from("partners")
    .select("id, email, name")
    .ilike("email", email.trim())
    .eq("status", "active");

  if (coupon_code) {
    query = query.eq("coupon_code", coupon_code.toUpperCase());
  }

  const { data: partner, error } = await query.maybeSingle();

  // Always return the generic message to avoid leaking whether the account exists
  if (error || !partner) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { error: updateError } = await db
    .from("partners")
    .update({ reset_token: token, reset_token_expires_at: expiresAt })
    .eq("id", partner.id);

  if (updateError) {
    // Still return generic response to not leak information
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://orbitalrevestimentos.com.br";
  const resetLink = `${siteUrl}/parceiro?reset=${token}`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: "orbitalrevestimentos@gmail.com",
      to: partner.email,
      subject: "Redefinição de senha — Orbital Revestimentos",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #002045;">
          <p style="font-size: 16px;">Olá, ${partner.name}!</p>
          <p style="font-size: 14px; color: #43474e;">
            Recebemos uma solicitação para redefinir a senha do seu portal de parceiro.
          </p>
          <p style="margin: 24px 0;">
            <a
              href="${resetLink}"
              style="background-color: #002045; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 14px; display: inline-block;"
            >
              Redefinir Senha
            </a>
          </p>
          <p style="font-size: 12px; color: #74777f;">
            Este link expira em 1 hora. Se você não solicitou a redefinição, pode ignorar este e-mail.
          </p>
          <p style="font-size: 12px; color: #74777f;">
            Ou copie e cole o link abaixo no seu navegador:<br/>
            <a href="${resetLink}" style="color: #002045;">${resetLink}</a>
          </p>
        </div>
      `,
    });
  } catch {
    // Email sending is non-fatal — still return success
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
