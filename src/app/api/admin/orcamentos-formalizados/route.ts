import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/admin/orcamentos-formalizados — orçamentos formais gerados pelo site
// público (saved_quotes com número formal) para acompanhamento + conversão em
// pedido. Retrocompatível: se a migração 043 não rodou, devolve lista vazia.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();

  const cols = "slug, formal_number, stage, pedido_id, client_name, client_phone, client_email, total_plates, total_amount, payment_condition, frete_amount, frete_free, formalized_at, created_at";
  const { data, error } = await db
    .from("saved_quotes")
    .select(cols)
    .not("formal_number", "is", null)
    .order("formalized_at", { ascending: false })
    .limit(100);

  if (error) {
    // Colunas de 043 ainda não existem → nada a listar (não é erro operacional).
    if (/column .* does not exist/i.test(error.message)) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
