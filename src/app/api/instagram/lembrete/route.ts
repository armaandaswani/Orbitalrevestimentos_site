import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  apagarLembrete, contaDoToken, dataValida, garantirBucket, gravarLembrete, hojeManaus, listarLembretes, tokenDoPedido,
} from "@/lib/instagram-agenda";

/**
 * Lembretes ao dono no dia do aniversário de quem ficou sem Story (falta foto ou @ e ele
 * quer resolver no dia, 13/11/2026). O cron /api/cron/instagram-stories manda às 8h de Manaus
 * pelo WhatsApp da Ste, mesmo com o Mac fechado. Quem chama é o publicador do Mac, com o
 * token do Instagram da Orbital.
 *   POST   { data, nome, motivo } → { id }
 *   GET    → { lembretes: [...] }
 *   DELETE { id, data } → { ok: true }
 */

export const dynamic = "force-dynamic";

const MAX_DIAS = 60;
const limpo = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

export async function POST(req: NextRequest) {
  if (!(await contaDoToken(tokenDoPedido(req)))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!dataValida(b.data)) return NextResponse.json({ error: "data precisa ser AAAA-MM-DD" }, { status: 400 });
  const dias = (Date.parse(b.data) - Date.parse(hojeManaus())) / 86400000;
  if (dias < 0 || dias > MAX_DIAS) return NextResponse.json({ error: `data precisa ser entre hoje e ${MAX_DIAS} dias à frente` }, { status: 400 });
  const nome = limpo(b.nome, 120);
  const motivo = limpo(b.motivo, 200);
  if (!nome || !motivo) return NextResponse.json({ error: "nome e motivo são obrigatórios" }, { status: 400 });

  await garantirBucket();
  // Um lembrete por pessoa e dia: pedir de novo só atualiza o motivo.
  const igual = (await listarLembretes(b.data)).find((l) => l.nome.toLowerCase() === nome.toLowerCase());
  const id = igual?.id ?? crypto.randomBytes(12).toString("hex");
  await gravarLembrete({ id, data: b.data, nome, motivo, status: "pendente", criado_em: igual?.criado_em ?? new Date().toISOString() });
  return NextResponse.json({ id });
}

export async function GET(req: NextRequest) {
  if (!(await contaDoToken(tokenDoPedido(req)))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await garantirBucket();
  return NextResponse.json({ lembretes: await listarLembretes() });
}

export async function DELETE(req: NextRequest) {
  if (!(await contaDoToken(tokenDoPedido(req)))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!dataValida(b.data) || typeof b.id !== "string" || !/^[a-f0-9]{24}$/.test(b.id)) {
    return NextResponse.json({ error: "id e data inválidos" }, { status: 400 });
  }
  await apagarLembrete({ id: b.id, data: b.data });
  return NextResponse.json({ ok: true });
}
