import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, partnerIdFromRequest, hashPassword, verifyPassword } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

// Fields a logged-in partner may update on their own record — profile basics
// plus how they split their commission pool between a client discount and their
// own commission (capped at commission_pool_pct, validated below).
const PARTNER_SELF_FIELDS = ["name", "email", "phone", "profession", "birthday", "discount_value", "commission_value"] as const;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const isAdmin = isAdminRequest(req);
  const isSelf = partnerIdFromRequest(req) === id;
  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Non-admins (the partner themselves) may only touch a whitelist of fields.
  let update: Record<string, unknown> = body;
  if (!isAdmin) {
    update = {};
    for (const f of PARTNER_SELF_FIELDS) {
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

  // Fetch current record (change detection + commission-pool validation).
  const { data: current } = await db
    .from("partners")
    .select("name, email, portal_password, coupon_code, status, profession, has_special_table, discount_value, commission_value, discount_type, commission_type")
    .eq("id", id)
    .single();

  // The pool column may not exist yet (migration 026) — fetch it tolerantly.
  let currentPool: number | null = null;
  try {
    const { data: pp } = await db.from("partners").select("commission_pool_pct").eq("id", id).single();
    currentPool = (pp?.commission_pool_pct as number | null) ?? null;
  } catch { currentPool = null; }

  // Commission-pool cap: client discount + partner commission can't exceed the
  // % the admin made available. Admin sets the pool; the partner splits within
  // it. Only enforced for percentage-based values.
  {
    const num = (v: unknown): number | null => {
      if (v === undefined || v === null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const bodyPool = isAdmin ? num(body.commission_pool_pct) : null;
    const pool = bodyPool ?? currentPool;
    const touchingAlloc = "discount_value" in update || "commission_value" in update || bodyPool !== null;
    const dType = (update.discount_type as string) ?? (current?.discount_type as string) ?? "percentage";
    const cType = (update.commission_type as string) ?? (current?.commission_type as string) ?? "percentage";
    if (touchingAlloc && pool != null && pool > 0 && dType === "percentage" && cType === "percentage") {
      const d = num(update.discount_value) ?? (current?.discount_value as number | null) ?? 0;
      const c = num(update.commission_value) ?? (current?.commission_value as number | null) ?? 0;
      if (d < 0 || c < 0) {
        return NextResponse.json({ error: "Desconto e comissão não podem ser negativos." }, { status: 400 });
      }
      if (d + c > pool + 0.001) {
        return NextResponse.json(
          { error: `Desconto + comissão (${d}% + ${c}%) excede o repasse disponível de ${pool}%.` },
          { status: 400 }
        );
      }
    }
  }

  // Audit the commission-split change: who last moved the slider and when.
  const touchingSplit = "discount_value" in update || "commission_value" in update;
  if (touchingSplit) {
    update.commission_updated_at = new Date().toISOString();
    update.commission_updated_by = isAdmin ? "Admin" : ((current?.name as string) || "Parceiro");
  }

  let { data, error } = await db.from("partners").update(update).eq("id", id).select().single();
  // Newer columns may not exist yet (migrations 026/041) — drop them and retry.
  if (error && /commission_pool_pct|commission_updated_at|commission_updated_by/i.test(error.message)) {
    delete update.commission_pool_pct;
    delete update.commission_updated_at;
    delete update.commission_updated_by;
    ({ data, error } = await db.from("partners").update(update).eq("id", id).select().single());
  }

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
          discountLabel: (Number(data.discount_value) || 0) > 0
            ? formatValueLabel((data.discount_type as "percentage" | "fixed") ?? "percentage", data.discount_value as number)
            : null,
          bonusLabel: formatValueLabel(
            (data.commission_type as "percentage" | "fixed") ?? "percentage",
            (data.commission_value as number) ?? 0
          ),
        });
        await resend.emails.send({
          from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
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
        const { data: pricingRows } = await supabaseAdmin().from("line_pricing").select("linha, special_price, public_price");
        const fetchedPricing: Record<string, { special_price: number; public_price: number }> = {};
        (pricingRows ?? []).forEach((r: { linha: string; special_price: number; public_price: number }) => {
          fetchedPricing[r.linha] = { special_price: r.special_price, public_price: r.public_price };
        });
        const { subject, html } = generatePartnerSpecialTableEmail({
          partnerName: data.name as string,
          couponCode: data.coupon_code as string,
          linePricing: fetchedPricing,
        });
        await resend.emails.send({
          from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
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

  await db.from("coupon_uses").delete().eq("partner_id", id);
  const { error } = await db.from("partners").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
