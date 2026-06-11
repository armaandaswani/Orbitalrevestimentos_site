import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  createSessionToken,
  getStoredPassword,
  isAdminRequest,
  verifyPassword,
} from "@/lib/admin-auth";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST { password } → sets httpOnly admin session cookie. */
export async function POST(req: NextRequest) {
  let password = "";
  try {
    ({ password } = await req.json());
  } catch {
    /* ignore */
  }
  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Senha é obrigatória." }, { status: 400 });
  }

  const stored = await getStoredPassword();
  if (!stored) {
    return NextResponse.json(
      { error: "Senha de admin não configurada no servidor." },
      { status: 500 }
    );
  }

  if (!verifyPassword(password, stored)) {
    await sleep(500); // slow down brute force
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const { token, maxAge } = createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}

/** GET → { authed } (used by the admin page to restore a session). */
export async function GET(req: NextRequest) {
  return NextResponse.json({ authed: isAdminRequest(req) });
}

/** DELETE → logout. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
