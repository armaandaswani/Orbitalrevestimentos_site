import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import {
  RP_NAME, clearChallengeCookie, deviceNameFromUA, parseTipo, readChallengeCookie,
  relyingParty, sessionUserId, setChallengeCookie, userHandle, type PasskeyTipo,
} from "@/lib/passkeys";

/**
 * Cadastrar uma passkey (Face ID) no aparelho — só já logado com a senha.
 * POST { tipo, step: "options" }            → opções para o navegador
 * POST { tipo, step: "verify", response }   → confere e salva a passkey
 */

const SEM_TABELA = "Passkeys ainda não ativadas no banco (migração 070).";

async function nomeDoUsuario(tipo: PasskeyTipo, userId: string): Promise<{ userName: string; displayName: string }> {
  if (tipo === "admin") return { userName: "admin", displayName: "Admin Orbital" };
  const db = supabaseAdmin();
  const tabela = tipo === "partner" ? "partners" : "sales_reps";
  const { data } = await db.from(tabela).select("name, email").eq("id", userId).maybeSingle();
  const nome = (data?.name as string | undefined) || (tipo === "partner" ? "Parceiro" : "Representante");
  const rotulo = tipo === "partner" ? "Portal do Parceiro" : "Portal do Representante";
  return { userName: (data?.email as string | undefined) || nome, displayName: `${nome} · ${rotulo}` };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tipo = parseTipo(body?.tipo);
  if (!tipo) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  const userId = sessionUserId(req, tipo);
  if (!userId) return NextResponse.json({ error: "Entre com a senha primeiro." }, { status: 401 });
  const rp = relyingParty(req);
  if (!rp) return NextResponse.json({ error: "Origem inválida." }, { status: 400 });

  const db = supabaseAdmin();

  if (body?.step === "options") {
    const { data: existentes, error } = await db
      .from("passkeys").select("credential_id, transports").eq("user_type", tipo).eq("user_id", userId);
    if (error) {
      return NextResponse.json({ error: isMissingTable(error) ? SEM_TABELA : error.message }, { status: isMissingTable(error) ? 503 : 500 });
    }
    const { userName, displayName } = await nomeDoUsuario(tipo, userId);
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rp.rpID,
      userName,
      userDisplayName: displayName,
      userID: userHandle(tipo, userId),
      attestationType: "none",
      excludeCredentials: (existentes ?? []).map((p) => ({
        id: p.credential_id as string,
        transports: (p.transports as string[] | null) ?? undefined,
      })),
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      preferredAuthenticatorType: "localDevice",
    });
    const res = NextResponse.json(options);
    setChallengeCookie(res, { c: options.challenge, p: "reg", t: tipo, u: userId });
    return res;
  }

  if (body?.step === "verify") {
    const desafio = readChallengeCookie(req, "reg", tipo);
    if (!desafio || desafio.u !== userId) {
      return NextResponse.json({ error: "O pedido expirou. Tente de novo." }, { status: 400 });
    }
    const response = body.response as RegistrationResponseJSON;
    let verificacao;
    try {
      verificacao = await verifyRegistrationResponse({
        response,
        expectedChallenge: desafio.c,
        expectedOrigin: rp.origin,
        expectedRPID: rp.rpID,
        requireUserVerification: true,
      });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Passkey inválida." }, { status: 400 });
    }
    if (!verificacao.verified) return NextResponse.json({ error: "Passkey não confirmada." }, { status: 400 });

    const { credential } = verificacao.registrationInfo;
    const { error } = await db.from("passkeys").upsert({
      user_type: tipo,
      user_id: userId,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: response.response?.transports ?? credential.transports ?? null,
      device_name: deviceNameFromUA(req.headers.get("user-agent")),
    }, { onConflict: "credential_id" });
    if (error) {
      return NextResponse.json({ error: isMissingTable(error) ? SEM_TABELA : error.message }, { status: isMissingTable(error) ? 503 : 500 });
    }
    const res = NextResponse.json({ ok: true });
    clearChallengeCookie(res);
    return res;
  }

  return NextResponse.json({ error: "Etapa inválida." }, { status: 400 });
}
