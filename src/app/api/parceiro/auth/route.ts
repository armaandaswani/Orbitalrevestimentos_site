import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  PARTNER_COOKIE,
  hashPassword,
  isHashedPassword,
  verifyPassword,
} from "@/lib/admin-auth";
import { PARTNER_LOGIN_SELECT, partnerLoginPayload, setPortalCookie } from "@/lib/portal-login";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const { coupon_code, email, portal_password } = await req.json();

  if ((!coupon_code && !email) || !portal_password) {
    return NextResponse.json({ error: "E-mail (ou cupom) e senha são obrigatórios." }, { status: 400 });
  }

  const db = supabaseAdmin();
  let query = db
    .from("partners")
    .select(PARTNER_LOGIN_SELECT)
    .eq("status", "active");

  if (email) {
    query = query.ilike("email", (email as string).trim());
  } else {
    query = query.eq("coupon_code", (coupon_code as string).toUpperCase());
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    await sleep(500);
    return NextResponse.json({ error: "Credenciais inválidas ou conta inativa." }, { status: 401 });
  }

  if (!data.portal_password || !verifyPassword(portal_password, data.portal_password)) {
    await sleep(500); // slow down brute force
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  // Lazy migration: upgrade legacy plaintext passwords to scrypt on login.
  if (!isHashedPassword(data.portal_password)) {
    await db
      .from("partners")
      .update({ portal_password: hashPassword(portal_password) })
      .eq("id", data.id);
  }

  const res = NextResponse.json(partnerLoginPayload(data));
  setPortalCookie(res, "partner", data.id);
  return res;
}

/** DELETE → logout (clears the portal session cookie). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PARTNER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
