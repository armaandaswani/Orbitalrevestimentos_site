import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn, isMissingTable } from "@/lib/db-compat";

/** Inscritos na lista de espera da Academia Orbital, mais recentes primeiro. */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("academy_waitlist")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    // Migration ainda não rodou: a tela mostra o aviso em vez de quebrar.
    if (isMissingTable(error) || isMissingColumn(error)) {
      return NextResponse.json({ error: "migration_pendente" }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "private, no-store" } });
}
