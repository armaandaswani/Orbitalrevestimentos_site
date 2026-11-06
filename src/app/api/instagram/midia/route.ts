import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Link público temporário para o Instagram buscar o Story da Orbital.
 *
 * Na Instagram API com login do Instagram a Meta só aceita mídia por URL pública
 * (image_url / video_url). O script de publicação pede aqui uma URL assinada de envio, sobe o arquivo direto para o storage
 * (bucket site-images, pasta instagram-temp/), a Meta busca e o script apaga em seguida.
 * Cada novo envio também apaga o que tiver sobrado com mais de 2 h.
 *
 * Autorização: o próprio token do Instagram da Orbital (Authorization: Bearer).
 * A rota confere na Meta que ele é da @orbitalrevestimentos e não guarda nem
 * registra o token.
 *   POST   { nome, tipo }  → { signedUrl, publicUrl, path }
 *   DELETE { path }        → { ok: true }   (só arquivos de instagram-temp/)
 */

export const dynamic = "force-dynamic";

const CONTA = "orbitalrevestimentos";
const BUCKET = "site-images";
const PASTA = "instagram-temp";
const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "video/mp4": "mp4" };

async function contaDoToken(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const res = await fetch("https://graph.instagram.com/v26.0/me?fields=user_id,username", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    return res.ok && data.username === CONTA;
  } catch {
    return false;
  }
}

// Apaga o que um envio interrompido tenha deixado. Pela idade do arquivo, não pela data da pasta:
// um envio de outro Story que a Meta ainda está buscando nunca tem mais de 2 h.
const IDADE_MAX_MS = 2 * 60 * 60 * 1000;

async function limparAntigos() {
  const storage = supabaseAdmin().storage.from(BUCKET);
  const { data: dias } = await storage.list(PASTA, { limit: 100 });
  for (const dia of dias || []) {
    const { data: arquivos } = await storage.list(`${PASTA}/${dia.name}`, { limit: 100 });
    const caminhos = (arquivos || [])
      .filter((a) => a.created_at && Date.now() - Date.parse(a.created_at) > IDADE_MAX_MS)
      .map((a) => `${PASTA}/${dia.name}/${a.name}`);
    if (caminhos.length) await storage.remove(caminhos);
  }
}

export async function POST(req: NextRequest) {
  if (!(await contaDoToken(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { tipo } = await req.json().catch(() => ({}));
  const ext = TIPOS[tipo as string];
  if (!ext) return NextResponse.json({ error: "tipo não aceito", aceitos: Object.keys(TIPOS) }, { status: 400 });

  const hoje = new Date().toISOString().slice(0, 10);
  await limparAntigos().catch(() => {});
  // Nome aleatório: o link só existe enquanto a Meta busca e não revela de quem é o Story.
  const path = `${PASTA}/${hoje}/${crypto.randomBytes(16).toString("hex")}.${ext}`;
  const storage = supabaseAdmin().storage.from(BUCKET);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: error?.message ?? "falha ao preparar o envio" }, { status: 500 });
  const { data: url } = storage.getPublicUrl(path);
  return NextResponse.json({ signedUrl: data.signedUrl, publicUrl: url.publicUrl, path });
}

export async function DELETE(req: NextRequest) {
  if (!(await contaDoToken(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { path } = await req.json().catch(() => ({}));
  if (typeof path !== "string" || !new RegExp(`^${PASTA}/\\d{4}-\\d{2}-\\d{2}/[a-f0-9]{32}\\.(jpg|mp4)$`).test(path)) {
    return NextResponse.json({ error: "só apago arquivos de instagram-temp/" }, { status: 400 });
  }
  const { error } = await supabaseAdmin().storage.from(BUCKET).remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
