import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { aniversariantes } from "@/lib/aniversarios-server";
import { contaDoToken, tokenDoPedido } from "@/lib/instagram-agenda";

/**
 * Aniversariantes de hoje e dos próximos 7 dias — profissionais da planilha,
 * PARCEIROS e REPRESENTANTES, sem duplicados (a mesma lista do e-mail das 5h) —
 * para a tarefa dos Stories de aniversário no Mac. Antes ela lia só a aba
 * "Profissionais" da planilha e esqueceu um parceiro (07/11/2026).
 *
 * Autorização: o token do Instagram da @orbitalrevestimentos (o mesmo do
 * publicador), conferido na Meta; nada de senha do painel.
 *   GET → { hoje: "dd/mm", pessoas: [{ data, nome, tipo, detalhe, instagram, instagramConfirmado, whatsapp }] }
 */

export const dynamic = "force-dynamic";

const dm = (dia: number, mes: number) => `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;

export async function GET(req: NextRequest) {
  if (!(await contaDoToken(tokenDoPedido(req)))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { hoje, deHoje, proximos } = await aniversariantes(supabaseAdmin());
  const pessoas = [...deHoje, ...proximos].map((a) => ({
    data: dm(a.dia, a.mes), nome: a.nome, tipo: a.tipo, detalhe: a.detalhe,
    instagram: a.instagram, instagramConfirmado: a.instagramConfirmado, whatsapp: a.whatsapp,
  }));
  return NextResponse.json({ hoje: dm(hoje.dia, hoje.mes), pessoas });
}
