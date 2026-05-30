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
    .from("sales_reps")
    .select("name, email, portal_password, referral_code")
    .eq("id", id)
    .single();

  const { data, error } = await db
    .from("sales_reps")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
                  <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Código de indicação</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;font-size:14px;text-align:right;letter-spacing:0.1em">${data.referral_code}</td></tr>
                  ${changes.join("")}
                </table>
                <a href="${siteUrl}/representante" style="display:inline-block;background:#002045;color:#fff;text-decoration:none;padding:12px 24px;font-size:14px;font-weight:600;margin-bottom:24px">
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

  const { error } = await db.from("sales_reps").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
