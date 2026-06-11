import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, repIdFromRequest, hashPassword, verifyPassword } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

// Fields a logged-in sales rep may update on their own record.
const REP_SELF_FIELDS = ["name", "email", "phone", "birthday"] as const;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const isAdmin = isAdminRequest(req);
  const isSelf = repIdFromRequest(req) === id;
  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Non-admins (the rep themselves) may only touch a whitelist of fields.
  let update: Record<string, unknown> = body;
  if (!isAdmin) {
    update = {};
    for (const f of REP_SELF_FIELDS) {
      if (body[f] !== undefined) update[f] = body[f];
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nenhum campo permitido para atualização." }, { status: 400 });
    }
  }

  // Password handling (admin only): hash before storing; ignore empty values so
  // an empty form field never wipes an existing password.
  const newPlainPassword =
    isAdmin && typeof body.portal_password === "string" && body.portal_password.length > 0
      ? (body.portal_password as string)
      : null;
  if ("portal_password" in update) delete update.portal_password;
  if (newPlainPassword) {
    if (newPlainPassword.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    }
    update.portal_password = hashPassword(newPlainPassword);
  }

  const db = supabaseAdmin();

  // Fetch current record to detect changes
  const { data: current } = await db
    .from("sales_reps")
    .select("name, email, portal_password, referral_code")
    .eq("id", id)
    .single();

  const { data, error } = await db
    .from("sales_reps")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send notification email if email or password changed
  if (current && data) {
    const emailChanged = update.email !== undefined && update.email !== current.email && update.email;
    const passwordChanged =
      !!newPlainPassword && !verifyPassword(newPlainPassword, (current.portal_password as string) ?? "");

    if (emailChanged || passwordChanged) {
      const recipientEmail = emailChanged ? (update.email as string) : (current.email as string);
      if (recipientEmail) {
        try {
          const { getResend } = await import("@/lib/resend");
          const resend = getResend();
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://orbitalrevestimentos.com.br";

          const changes: string[] = [];
          if (emailChanged) changes.push(`<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Novo e-mail</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;font-size:14px;text-align:right">${update.email}</td></tr>`);
          if (passwordChanged) changes.push(`<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;font-size:14px">Nova senha</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;font-size:14px;text-align:right;font-family:monospace">${newPlainPassword}</td></tr>`);

          await resend.emails.send({
            from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
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

  const { portal_password: _pw, ...safeData } = data;
  return NextResponse.json({ ...safeData, has_portal_password: !!_pw });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(_req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();

  const { error } = await db.from("sales_reps").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
