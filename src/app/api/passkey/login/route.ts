import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import { ADMIN_COOKIE, createSessionToken } from "@/lib/admin-auth";
import {
  PARTNER_LOGIN_SELECT, REP_LOGIN_SELECT, partnerLoginPayload, repLoginPayload, setPortalCookie,
} from "@/lib/portal-login";
import { clearChallengeCookie, parseTipo, readChallengeCookie, relyingParty, setChallengeCookie } from "@/lib/passkeys";

/**
 * Entrar com passkey (Face ID), sem senha.
 * POST { tipo, step: "options" }            → desafio para o navegador
 * POST { tipo, step: "verify", response }   → confere e abre a sessão, igual ao login com senha
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tipo = parseTipo(body?.tipo);
  if (!tipo) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  const rp = relyingParty(req);
  if (!rp) return NextResponse.json({ error: "Origem inválida." }, { status: 400 });

  if (body?.step === "options") {
    // Com o id da passkey deste aparelho, o navegador vai direto ao Face ID.
    // Sem ele, o aparelho mostra as passkeys da Orbital que tiver.
    const cred = typeof body?.credential_id === "string" && /^[A-Za-z0-9_-]{16,1400}$/.test(body.credential_id)
      ? body.credential_id : null;
    const options = await generateAuthenticationOptions({
      rpID: rp.rpID,
      userVerification: "required",
      allowCredentials: cred ? [{ id: cred, transports: ["internal", "hybrid"] }] : undefined,
    });
    const res = NextResponse.json(options);
    setChallengeCookie(res, { c: options.challenge, p: "auth", t: tipo });
    return res;
  }

  if (body?.step !== "verify") return NextResponse.json({ error: "Etapa inválida." }, { status: 400 });

  const desafio = readChallengeCookie(req, "auth", tipo);
  if (!desafio) return NextResponse.json({ error: "O pedido expirou. Tente de novo." }, { status: 400 });
  const response = body.response as AuthenticationResponseJSON;
  if (!response?.id) return NextResponse.json({ error: "Resposta inválida." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: pk, error } = await db
    .from("passkeys").select("*").eq("credential_id", response.id).eq("user_type", tipo).maybeSingle();
  if (error) {
    const semTabela = isMissingTable(error);
    return NextResponse.json({ error: semTabela ? "Passkeys ainda não ativadas no banco (migração 070)." : error.message }, { status: semTabela ? 503 : 500 });
  }
  if (!pk) {
    await sleep(400);
    return NextResponse.json({ error: "Esta passkey não está cadastrada neste login. Entre com a senha e ative o Face ID de novo." }, { status: 401 });
  }

  let verificacao;
  try {
    verificacao = await verifyAuthenticationResponse({
      response,
      expectedChallenge: desafio.c,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      credential: {
        id: pk.credential_id as string,
        publicKey: new Uint8Array(Buffer.from(pk.public_key as string, "base64url")),
        counter: Number(pk.counter) || 0,
        transports: (pk.transports as string[] | null) ?? undefined,
      },
      requireUserVerification: true,
    });
  } catch {
    verificacao = null;
  }
  if (!verificacao?.verified) {
    await sleep(400);
    return NextResponse.json({ error: "Não foi possível confirmar a passkey." }, { status: 401 });
  }

  await db.from("passkeys")
    .update({ counter: verificacao.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
    .eq("id", pk.id);

  const userId = pk.user_id as string;
  let res: NextResponse;
  if (tipo === "admin") {
    const { token, maxAge } = createSessionToken();
    res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  } else if (tipo === "partner") {
    const { data } = await db.from("partners").select(PARTNER_LOGIN_SELECT).eq("id", userId).eq("status", "active").maybeSingle();
    if (!data) return NextResponse.json({ error: "Conta inativa." }, { status: 401 });
    res = NextResponse.json(partnerLoginPayload(data));
    setPortalCookie(res, "partner", userId);
  } else {
    const { data } = await db.from("sales_reps").select(REP_LOGIN_SELECT).eq("id", userId).eq("status", "active").maybeSingle();
    if (!data) return NextResponse.json({ error: "Conta inativa." }, { status: 401 });
    res = NextResponse.json(repLoginPayload(data));
    setPortalCookie(res, "rep", userId);
  }
  clearChallengeCookie(res);
  return res;
}
