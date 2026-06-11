import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  PARTNER_COOKIE,
  createPortalToken,
  hashPassword,
  isHashedPassword,
  verifyPassword,
} from "@/lib/admin-auth";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const { coupon_code, email, portal_password } = await req.json();

  if ((!coupon_code && !email) || !portal_password) {
    return NextResponse.json({ error: "E-mail (ou cupom) e senha são obrigatórios." }, { status: 400 });
  }

  const db = supabaseAdmin();
  let query = db
    .from("partners")
    .select("id, name, coupon_code, discount_type, discount_value, commission_type, commission_value, portal_password, status, profession, has_special_table")
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

  const { token, maxAge } = createPortalToken(data.id);
  const res = NextResponse.json({
    id: data.id,
    name: data.name,
    coupon_code: data.coupon_code,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    commission_type: data.commission_type,
    commission_value: data.commission_value,
    profession: data.profession,
    has_special_table: data.has_special_table,
  });
  res.cookies.set(PARTNER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}

/** DELETE → logout (clears the portal session cookie). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PARTNER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
