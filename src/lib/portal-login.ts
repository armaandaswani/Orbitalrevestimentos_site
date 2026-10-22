import type { NextResponse } from "next/server";
import { PARTNER_COOKIE, REP_COOKIE, createPortalToken } from "@/lib/admin-auth";

/**
 * O que o login dos portais devolve e o cookie de sessão — o mesmo para o
 * login com senha e com passkey (Face ID). Só servidor.
 */

export const PARTNER_LOGIN_SELECT =
  "id, name, coupon_code, discount_type, discount_value, commission_type, commission_value, portal_password, status, profession, has_special_table";

export const REP_LOGIN_SELECT =
  "id, name, referral_code, commission_type, commission_value, portal_password, status, birthday";

type Row = Record<string, unknown>;

export function partnerLoginPayload(data: Row) {
  return {
    id: data.id,
    name: data.name,
    coupon_code: data.coupon_code,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    commission_type: data.commission_type,
    commission_value: data.commission_value,
    profession: data.profession,
    has_special_table: data.has_special_table,
  };
}

export function repLoginPayload(data: Row) {
  return {
    id: data.id,
    name: data.name,
    referral_code: data.referral_code,
    commission_type: data.commission_type,
    commission_value: data.commission_value,
    birthday: data.birthday ?? null,
  };
}

/** Grava o cookie de sessão do portal (7 dias) na resposta. */
export function setPortalCookie(res: NextResponse, portal: "partner" | "rep", id: string) {
  const { token, maxAge } = createPortalToken(id);
  res.cookies.set(portal === "partner" ? PARTNER_COOKIE : REP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}
