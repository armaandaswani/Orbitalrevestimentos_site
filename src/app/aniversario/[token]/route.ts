import { NextRequest, NextResponse } from "next/server";
import { COOKIE_CONTATO, lerTokenContato } from "@/lib/aniversario-link";

/**
 * GET /aniversario/<token> — o link do e-mail de aniversários. Guarda o token
 * num cookie (1 h) e manda para /aniversario/contato, sem o token na URL.
 * É rota (não página): não carrega o layout, nem o Analytics.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = NextResponse.redirect(new URL("/aniversario/contato", req.url), 303);
  res.headers.set("Referrer-Policy", "no-referrer");
  if (lerTokenContato(token)) {
    res.cookies.set(COOKIE_CONTATO, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
  }
  return res;
}
