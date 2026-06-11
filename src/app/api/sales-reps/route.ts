import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, hashPassword } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("sales_reps")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Never expose password hashes — expose only whether a password is set.
  const safe = (data ?? []).map((row: Record<string, unknown>) => {
    const { portal_password, ...rest } = row;
    return { ...rest, has_portal_password: !!portal_password };
  });
  return NextResponse.json(safe);
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name,
    email,
    phone,
    referral_code,
    commission_type,
    commission_value,
    portal_password,
    birthday,
  } = body;

  if (!name || !referral_code) {
    return NextResponse.json({ error: "name e referral_code são obrigatórios." }, { status: 400 });
  }
  if (portal_password && (portal_password as string).length < 8) {
    return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
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
    .from("sales_reps")
    .insert({
      name,
      email: email || null,
      phone: phone || null,
      referral_code: (referral_code as string).toUpperCase(),
      commission_type: commission_type || "percentage",
      commission_value: commission_value ?? 5,
      portal_password: portal_password ? hashPassword(portal_password) : null,
      birthday: birthday || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Código de indicação já existe." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (email) {
    try {
      const { getResend } = await import("@/lib/resend");
      const resend = getResend();
      const portalUrl = "https://orbitalrevestimentos.com.br/representante";

      await resend.emails.send({
        from: "Orbital Revestimentos <noreply@orbitalrevestimentos.com.br>",
        to: email,
        subject: `Bem-vindo à Orbital — seu acesso está pronto`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
            <h2 style="font-size:22px;margin-bottom:8px">Olá, ${name}!</h2>
            <p style="color:#555;margin-bottom:24px">Você foi cadastrado como representante da <strong>Orbital Revestimentos</strong>.</p>
            <div style="background:#f5f5f3;border:1px solid #e2e2e2;padding:20px 24px;margin-bottom:16px">
              <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#74777f">Código de indicação (login)</p>
              <p style="margin:0;font-size:26px;font-weight:bold;letter-spacing:0.15em;color:#002045">${(referral_code as string).toUpperCase()}</p>
            </div>
            ${portal_password ? `
            <div style="background:#f5f5f3;border:1px solid #e2e2e2;padding:20px 24px;margin-bottom:24px">
              <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#74777f">Senha inicial</p>
              <p style="margin:0;font-size:20px;font-weight:bold;letter-spacing:0.1em;color:#002045">${portal_password}</p>
            </div>
            ` : `
            <div style="background:#fffbf0;border:1px solid #f0d080;padding:16px 24px;margin-bottom:24px">
              <p style="margin:0;font-size:13px;color:#7a5c00;">&#9888;&#65039; Nenhuma senha foi configurada para sua conta ainda. Aguarde o contato da equipe Orbital com suas credenciais de acesso.</p>
            </div>
            `}
            <p style="color:#555;font-size:14px;margin-bottom:24px">Portal: <a href="${portalUrl}" style="color:#002045;font-weight:600">${portalUrl}</a></p>
            ${portal_password ? `<p style="color:#555;font-size:13px">Recomendamos alterar sua senha após o primeiro acesso.</p>` : ""}
            <p style="color:#888;font-size:12px;margin-top:32px;border-top:1px solid #eee;padding-top:16px">Orbital Revestimentos · Manaus, AM</p>
          </div>
        `,
      });
    } catch {
      // email failure is non-fatal
    }
  }

  const { portal_password: _pw, ...safeData } = data;
  return NextResponse.json({ ...safeData, has_portal_password: !!portal_password }, { status: 201 });
}
