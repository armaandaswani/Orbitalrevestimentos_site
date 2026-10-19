import { NextRequest, NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { PARTNER_COOKIE, createPortalToken, hashPassword } from "@/lib/admin-auth";
import { parceiroDoConvite } from "@/lib/partner-invite";
import { EMAIL_EMPRESA } from "@/lib/email-destinos";

/**
 * Convite de parceiro (link enviado pela representante ou pela Orbital, direto
 * do pedido).
 *   GET  ?token=  → dados para a tela de boas-vindas + o que falta preencher
 *   POST { token, password, email?, birthday?, phone? } → completa o cadastro,
 *        cria a senha, ativa e já abre a sessão. E-mail, aniversário e WhatsApp
 *        são obrigatórios só quando ainda não estão no cadastro.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const db = supabaseAdmin();
  const p = await parceiroDoConvite(db, token);
  if (!p) return NextResponse.json({ error: "Convite inválido ou expirado. Peça um novo link à Orbital." }, { status: 404 });

  let repNome: string | null = null;
  if (p.sales_rep_referral_code) {
    const { data } = await db.from("sales_reps").select("name").eq("referral_code", p.sales_rep_referral_code).maybeSingle();
    repNome = (data?.name as string) ?? null;
  }
  return NextResponse.json({
    name: p.name, email: p.email, rep_name: repNome,
    falta: { email: !p.email, birthday: !p.birthday, phone: !p.phone },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const birthday = typeof body?.birthday === "string" ? body.birthday.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  if (password.length < 8) return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });

  const db = supabaseAdmin();
  const p = await parceiroDoConvite(db, token);
  if (!p) return NextResponse.json({ error: "Convite inválido ou expirado. Peça um novo link à Orbital." }, { status: 404 });
  if (p.status === "inactive") return NextResponse.json({ error: "Este cadastro está inativo. Fale com a Orbital." }, { status: 403 });

  // Completa só o que falta no cadastro (o que já existe não é sobrescrito).
  const completar: Record<string, string> = {};
  if (!p.email) {
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    const emailLike = email.replace(/[\\%_]/g, "\\$&");
    const [{ data: outroParceiro }, { data: rep }] = await Promise.all([
      db.from("partners").select("id").ilike("email", emailLike).neq("id", p.id).limit(1).maybeSingle(),
      db.from("sales_reps").select("id").ilike("email", emailLike).limit(1).maybeSingle(),
    ]);
    if (outroParceiro || rep) return NextResponse.json({ error: "Este e-mail já está cadastrado. Use outro ou fale com a Orbital." }, { status: 409 });
    completar.email = email;
  }
  if (!p.birthday) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return NextResponse.json({ error: "Informe a data de aniversário." }, { status: 400 });
    completar.birthday = birthday;
  }
  if (!p.phone) {
    if (phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Informe o WhatsApp com DDD." }, { status: 400 });
    completar.phone = phone;
  }

  const { data, error } = await db
    .from("partners")
    .update({
      ...completar,
      portal_password: hashPassword(password),
      status: "active",
      reset_token: null,
      reset_token_expires_at: null,
    })
    .eq("id", p.id)
    .select("id, name, coupon_code, discount_type, discount_value, commission_type, commission_value, profession, has_special_table")
    .single();
  if (error || !data) return NextResponse.json({ error: "Não foi possível ativar. Tente de novo." }, { status: 500 });

  after(() => avisarAtivacao(data, completar.email ?? p.email, p.sales_rep_referral_code));

  const { token: session, maxAge } = createPortalToken(data.id as string);
  const res = NextResponse.json(data);
  res.cookies.set(PARTNER_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}

/** Boas-vindas ao parceiro + aviso à empresa. Best-effort. */
async function avisarAtivacao(data: Record<string, unknown>, email: string | null, repCode: string | null) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { getResend } = await import("@/lib/resend");
    const { generatePartnerWelcomeEmail, formatValueLabel } = await import("@/lib/partner-email-content");
    const resend = getResend();
    const from = "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>";
    if (email) {
      const { subject, html } = generatePartnerWelcomeEmail({
        partnerName: data.name as string,
        couponCode: data.coupon_code as string,
        discountLabel: (Number(data.discount_value) || 0) > 0
          ? formatValueLabel((data.discount_type as "percentage" | "fixed") ?? "percentage", data.discount_value as number)
          : null,
        bonusLabel: formatValueLabel((data.commission_type as "percentage" | "fixed") ?? "percentage", (data.commission_value as number) ?? 0),
      });
      const r = await resend.emails.send({ from, to: email, subject, html });
      if (r.error) console.error("[convite] boas-vindas não enviado", r.error.name, r.error.message);
    }
    const r2 = await resend.emails.send({
      from,
      to: EMAIL_EMPRESA,
      subject: `Novo parceiro ativo (convite): ${data.name}`,
      text: [
        `${data.name} aceitou o convite e ativou o Portal do Parceiro.`,
        `Cupom: ${data.coupon_code}`,
        `Comissão: ${data.commission_value}% · Desconto ao cliente: ${data.discount_value}%`,
        `Representante: ${repCode || "—"}`,
      ].join("\n"),
    });
    if (r2.error) console.error("[convite] aviso à empresa não enviado", r2.error.name, r2.error.message);
  } catch (e) {
    console.error("[convite] aviso de ativação falhou", e instanceof Error ? e.message : e);
  }
}
