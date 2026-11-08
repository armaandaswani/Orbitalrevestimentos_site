import { NextRequest, NextResponse } from "next/server";
import { contaDoToken, tokenDoPedido } from "@/lib/instagram-agenda";
import { avisarDono } from "@/lib/instagram-aviso";

/**
 * O Mac publicou um Story de aniversário (comando "story" do publicador): o
 * WhatsApp da Ste avisa o dono de que falta marcar o profissional pelo app.
 * O cron dos agendados avisa sozinho. Só aceita o token do Instagram da Orbital;
 * o destino é sempre o número do dono, e o texto é montado aqui.
 *   POST { nome, handle? } → { ok, detalhe }
 */

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await contaDoToken(tokenDoPedido(req)))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const nome = typeof b.nome === "string" ? b.nome.replace(/\s+/g, " ").trim().slice(0, 120) : "";
  if (!nome) return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
  const handle = typeof b.handle === "string" && b.handle.trim() ? b.handle.trim().toLowerCase() : null;
  if (handle && !/^[a-z0-9._]{1,30}$/.test(handle)) return NextResponse.json({ error: "handle inválido" }, { status: 400 });
  const r = await avisarDono(nome, handle);
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
