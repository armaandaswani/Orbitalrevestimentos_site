import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, sales_rep_referral_code, portal_password, birthday } = body;

  if (!name || !email || !phone || !sales_rep_referral_code || !portal_password || !birthday) {
    return NextResponse.json(
      { error: "Todos os campos são obrigatórios." },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // Check email uniqueness across both tables
  const [{ data: existingPartner }, { data: existingRep }] = await Promise.all([
    db.from("partners").select("id").eq("email", email).maybeSingle(),
    db.from("sales_reps").select("id").eq("email", email).maybeSingle(),
  ]);
  if (existingPartner || existingRep) {
    return NextResponse.json({ error: "Este e-mail já está cadastrado no sistema." }, { status: 409 });
  }

  // Validate sales_rep_referral_code exists and is active
  const { data: salesRep, error: repError } = await db
    .from("sales_reps")
    .select("id, name, referral_code")
    .eq("referral_code", (sales_rep_referral_code as string).toUpperCase())
    .eq("status", "active")
    .single();

  if (repError || !salesRep) {
    return NextResponse.json(
      { error: "Código de representante inválido ou inativo." },
      { status: 400 }
    );
  }

  // Generate coupon code: first word of name uppercased (letters only) + last 2 digits of year
  const year2 = String(new Date().getFullYear()).slice(-2);
  const firstWord = (name as string)
    .trim()
    .split(/\s+/)[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  const baseCode = `${firstWord}${year2}`;

  // Find an available coupon code
  let couponCode = baseCode;
  let suffix = 1;
  while (true) {
    const { data: existing } = await db
      .from("partners")
      .select("id")
      .eq("coupon_code", couponCode)
      .maybeSingle();
    if (!existing) break;
    couponCode = `${baseCode}${suffix}`;
    suffix++;
  }

  // Insert partner with pending status
  const { data: partner, error: insertError } = await db
    .from("partners")
    .insert({
      name,
      email,
      phone,
      coupon_code: couponCode,
      status: "pending",
      is_self_registered: true,
      discount_type: "percentage",
      discount_value: 0,
      commission_type: "percentage",
      commission_value: 0,
      portal_password,
      sales_rep_referral_code: (sales_rep_referral_code as string).toUpperCase(),
      birthday: birthday || null,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Send "under review" email to the partner (non-fatal)
  try {
    const { getResend } = await import("@/lib/resend");
    const resend = getResend();
    await resend.emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: email,
      subject: "Recebemos o seu cadastro — Orbital Revestimentos",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
          <h2 style="font-size:22px;margin-bottom:8px;color:#002045">Cadastro recebido!</h2>
          <p style="color:#555;margin-bottom:20px">Olá, ${name}. Recebemos o seu cadastro como parceiro Orbital e ele está em análise pela nossa equipe.</p>
          <div style="background:#f5f5f3;border-left:4px solid #002045;padding:16px 20px;margin-bottom:24px">
            <p style="margin:0;font-size:14px;color:#002045;font-weight:600">O que acontece agora?</p>
            <p style="margin:8px 0 0;font-size:13px;color:#555">Nossa equipe irá revisar o seu cadastro e, uma vez aprovado, você receberá um e-mail com todas as informações para acessar o portal de parceiro.</p>
          </div>
          <p style="color:#888;font-size:13px;margin-bottom:4px">Dúvidas? Entre em contato pelo WhatsApp:</p>
          <a href="https://wa.me/5592988150149" style="color:#002045;font-weight:600;font-size:13px">+55 (92) 98815-0149</a>
          <p style="color:#888;font-size:12px;margin-top:32px;border-top:1px solid #eee;padding-top:16px">Orbital Revestimentos · Manaus, AM</p>
        </div>
      `,
    });
  } catch {
    // email failure is non-fatal
  }

  // Send admin notification email (non-fatal)
  try {
    const { getResend } = await import("@/lib/resend");
    const resend = getResend();
    const waText = encodeURIComponent(
      `Novo parceiro aguardando aprovação!\nNome: ${name}\nEmail: ${email}\nTelefone: ${phone}\nCupom: ${couponCode}\nRepresentante: ${(sales_rep_referral_code as string).toUpperCase()}`
    );
    const waLink = `https://wa.me/5592988150149?text=${waText}`;

    await resend.emails.send({
      from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
      to: "armaandaswani19@gmail.com",
      subject: `Novo parceiro aguardando aprovação: ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
          <h2 style="font-size:22px;margin-bottom:8px;color:#002045">Novo parceiro aguardando aprovação</h2>
          <p style="color:#555;margin-bottom:24px">Um novo parceiro se cadastrou e aguarda aprovação no portal.</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Nome</td>
              <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;font-size:14px;text-align:right">${name}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Email</td>
              <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;font-size:14px;text-align:right">${email}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Telefone</td>
              <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;font-size:14px;text-align:right">${phone}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Cupom gerado</td>
              <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;font-size:14px;text-align:right;letter-spacing:0.1em">${couponCode}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#555;font-size:14px">Representante</td>
              <td style="padding:10px 0;font-weight:600;font-size:14px;text-align:right">${(sales_rep_referral_code as string).toUpperCase()}</td>
            </tr>
          </table>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <a href="https://orbitalrevestimentos.com.br/admin" style="display:inline-block;background:#002045;color:#fff;text-decoration:none;padding:12px 24px;font-size:14px;font-weight:600">
              Acessar Painel Admin
            </a>
            <a href="${waLink}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 24px;font-size:14px;font-weight:600">
              Abrir no WhatsApp
            </a>
          </div>
          <p style="color:#888;font-size:12px;margin-top:32px">Orbital Revestimentos · Manaus, AM</p>
        </div>
      `,
    });
  } catch {
    // email failure is non-fatal
  }

  return NextResponse.json(partner, { status: 201 });
}
