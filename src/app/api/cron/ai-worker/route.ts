import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import { rodarWorker } from "@/lib/ia/worker";

export const maxDuration = 60;

/**
 * Cron do runtime de IA (todo dia, 10h UTC = 6h em Manaus, depois do e-mail
 * de aniversários): detecta o que é de hoje e processa a fila em lote curto.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { error } = await db.from("ai_tasks").select("id").limit(1);
  if (error) {
    // Antes da migração 073 o cron não faz nada (e não falha).
    if (isMissingTable(error)) return NextResponse.json({ pulado: "migração 073 pendente" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const resumo = await rodarWorker(db);
  return NextResponse.json(resumo);
}
