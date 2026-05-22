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
      const discountLabel = discount_type === "percentage"
        ? `${discount_value}% de desconto`
        : `R$ ${discount_value} de desconto`;
      const commissionLabel = commission_type === "percentage"
        ? `${commission_value}% de comissão`
        : `R$ ${commission_value} de comissão`;

      await resend.emails.send({
        from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
        to: email,
        subject: `Seu cupom Orbital: ${coupon_code.toUpperCase()}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
            <h2 style="font-size:22px;margin-bottom:8px">Olá, ${name}!</h2>
            <p style="color:#555;margin-bottom:24px">Você foi cadastrado como parceiro da <strong>Orbital Revestimentos</strong>. Aqui estão suas informações:</p>
            <div style="background:#f5f5f3;border:1px solid #e2e2e2;padding:20px 24px;margin-bottom:24px">
              <p style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#74777f">Seu código de cupom</p>
              <p style="margin:0;font-size:28px;font-weight:bold;letter-spacing:0.15em;color:#002045">${coupon_code.toUpperCase()}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Desconto para o cliente</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;font-size:14px;text-align:right">${discountLabel}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#555;font-size:14px">Sua comissão por venda</td>
                <td style="padding:10px 0;font-weight:600;font-size:14px;text-align:right">${commissionLabel}</td>
              </tr>
            </table>
            ${portal_password ? `<p style="color:#555;font-size:14px">Acesse seu painel em <a href="https://orbitalrevestimentos-site.vercel.app/parceiro" style="color:#002045">orbitalrevestimentos-site.vercel.app/parceiro</a> com seu código de cupom e a senha cadastrada.</p>` : ""}
            <p style="color:#888;font-size:12px;margin-top:32px">Orbital Revestimentos · Manaus, AM</p>
          </div>
        `,
      });
    } catch {
      // email failure is non-fatal
    }
  }

  return NextResponse.json(data, { status: 201 });
}
