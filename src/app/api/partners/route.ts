import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("partners")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name, email, phone, coupon_code,
    discount_type, discount_value,
    commission_type, commission_value,
    portal_password,
  } = body;

  if (!coupon_code) {
    return NextResponse.json({ error: "coupon_code is required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Check email uniqueness across both tables
  if (email) {
    const [{ data: existingPartner }, { data: existingRep }] = await Promise.all([
      db.from("partners").select("id").eq("email", email).maybeSingle(),
      db.from("sales_reps").select("id").eq("email", email).maybeSingle(),
    ]);
    if (existingPartner || existingRep) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado no sistema." }, { status: 409 });
    }
  }

  const { data, error } = await db
    .from("partners")
    .insert({
      name,
      email,
      phone,
      coupon_code: coupon_code.toUpperCase(),
      discount_type,
      discount_value,
      commission_type,
      commission_value,
      portal_password: portal_password || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Código de cupom já existe." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (email) {
    try {
      const { getResend } = await import("@/lib/resend");
      const resend = getResend();
      const portalUrl = "https://orbitalrevestimentos.com.br/parceiro";

      if (portal_password) {
        // Has password — send normal welcome email
        await resend.emails.send({
          from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
          to: email,
          subject: `Bem-vindo à Orbital — seu acesso está pronto`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
              <h2 style="font-size:22px;margin-bottom:8px">Olá, ${name}!</h2>
              <p style="color:#555;margin-bottom:24px">Você foi cadastrado como parceiro da <strong>Orbital Revestimentos</strong>. Aqui estão suas credenciais:</p>
              <div style="background:#f5f5f3;border:1px solid #e2e2e2;padding:20px 24px;margin-bottom:16px">
                <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#74777f">Código de cupom (login)</p>
                <p style="margin:0;font-size:26px;font-weight:bold;letter-spacing:0.15em;color:#002045">${coupon_code.toUpperCase()}</p>
              </div>
              <div style="background:#f5f5f3;border:1px solid #e2e2e2;padding:20px 24px;margin-bottom:24px">
                <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#74777f">Senha inicial</p>
                <p style="margin:0;font-size:20px;font-weight:bold;letter-spacing:0.1em;color:#002045">${portal_password}</p>
              </div>
              <p style="color:#555;font-size:14px;margin-bottom:24px">Acesse: <a href="${portalUrl}" style="color:#002045;font-weight:600">${portalUrl}</a></p>
              <p style="color:#555;font-size:13px">Recomendamos alterar sua senha após o primeiro acesso.</p>
              <p style="color:#888;font-size:12px;margin-top:32px;border-top:1px solid #eee;padding-top:16px">Orbital Revestimentos · Manaus, AM</p>
            </div>
          `,
        });
      } else {
        // No password set — generate reset token and send "create your password" email
        const { randomUUID } = await import("crypto");
        const token = randomUUID();
        const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        const db2 = supabaseAdmin();
        await db2.from("partners").update({ reset_token: token, reset_token_expires_at: expires }).eq("id", data.id);
        const resetUrl = `${portalUrl}?reset=${token}`;

        await resend.emails.send({
          from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
          to: email,
          subject: `Orbital — crie sua senha de acesso`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
              <h2 style="font-size:22px;margin-bottom:8px">Olá, ${name}!</h2>
              <p style="color:#555;margin-bottom:24px">Sua conta como parceiro da <strong>Orbital Revestimentos</strong> foi criada. Clique no botão abaixo para criar sua senha de acesso.</p>
              <div style="background:#f5f5f3;border:1px solid #e2e2e2;padding:20px 24px;margin-bottom:24px">
                <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#74777f">Seu código de cupom</p>
                <p style="margin:0;font-size:26px;font-weight:bold;letter-spacing:0.15em;color:#002045">${coupon_code.toUpperCase()}</p>
              </div>
              <a href="${resetUrl}" style="display:inline-block;background:#002045;color:#fff;text-decoration:none;padding:14px 28px;font-size:14px;font-weight:600;letter-spacing:0.05em;margin-bottom:20px">
                Criar minha senha →
              </a>
              <p style="color:#888;font-size:12px">Este link expira em 48 horas.</p>
              <p style="color:#888;font-size:12px;margin-top:32px;border-top:1px solid #eee;padding-top:16px">Orbital Revestimentos · Manaus, AM</p>
            </div>
          `,
        });
      }
    } catch {
      // email failure is non-fatal
    }
  }

  return NextResponse.json(data, { status: 201 });
}
