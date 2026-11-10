import { NextRequest, NextResponse } from "next/server";
import { contaDoToken, dataValida, tokenDoPedido } from "@/lib/instagram-agenda";
import { avisarDono, avisarSemana } from "@/lib/instagram-aviso";

/**
 * Avisos dos Stories de aniversário ao dono pelo WhatsApp da Ste, pedidos pelo
 * publicador do Mac. Só aceita o token do Instagram da Orbital; o destino é
 * sempre o número do dono, e o texto é montado aqui.
 *   POST { nome, handle? }                              → Story no ar, falta marcar
 *        (o cron dos agendados avisa sozinho)
 *   POST { tipo: "semana", inicio, fim, prontos, faltaFoto: [{ nome, data }] }
 *        → semana pronta para aprovar (tarefa do sábado 8h)
 *   ← { ok, detalhe }
 */

export const dynamic = "force-dynamic";

const nomeLimpo = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 120) : "");

export async function POST(req: NextRequest) {
  if (!(await contaDoToken(tokenDoPedido(req)))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));

  if (b.tipo === "semana") {
    const prontos = Number(b.prontos);
    const lista: unknown[] = Array.isArray(b.faltaFoto) ? b.faltaFoto : [];
    if (!dataValida(b.inicio) || !dataValida(b.fim) || b.fim < b.inicio || !Number.isInteger(prontos) || prontos < 0 || prontos > 100 || lista.length > 50) {
      return NextResponse.json({ error: "semana inválida" }, { status: 400 });
    }
    const faltaFoto = lista.map((f) => {
      const x = (f ?? {}) as { nome?: unknown; data?: unknown };
      return { nome: nomeLimpo(x.nome), data: x.data };
    });
    if (faltaFoto.some((f) => !f.nome || !dataValida(f.data))) return NextResponse.json({ error: "faltaFoto inválida" }, { status: 400 });
    const r = await avisarSemana({ inicio: b.inicio, fim: b.fim, prontos, faltaFoto: faltaFoto as { nome: string; data: string }[] });
    return NextResponse.json(r, { status: r.ok ? 200 : 502 });
  }

  const nome = nomeLimpo(b.nome);
  if (!nome) return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
  const handle = typeof b.handle === "string" && b.handle.trim() ? b.handle.trim().toLowerCase() : null;
  if (handle && !/^[a-z0-9._]{1,30}$/.test(handle)) return NextResponse.json({ error: "handle inválido" }, { status: 400 });
  const r = await avisarDono(nome, handle);
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
