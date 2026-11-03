import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn, isMissingTable } from "@/lib/db-compat";

/** Inscritos na lista de espera das linhas em chegada, mais antigos primeiro. */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("site_lista_espera")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(5000);

  if (error) {
    if (isMissingTable(error) || isMissingColumn(error)) {
      return NextResponse.json({ error: "migration_pendente" }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "private, no-store" } });
}

/**
 * Marca (ou desmarca) que a pessoa recebeu o aviso de chegada.
 * Corpo: { id, avisado: boolean }. Devolve a data gravada.
 */
export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { id?: unknown; avisado?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || typeof body?.avisado !== "boolean") {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const avisado_em = body.avisado ? new Date().toISOString() : null;
  const { error } = await supabaseAdmin().from("site_lista_espera").update({ avisado_em }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, avisado_em });
}
