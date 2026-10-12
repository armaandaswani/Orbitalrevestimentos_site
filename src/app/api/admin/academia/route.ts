import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn, isMissingTable } from "@/lib/db-compat";

/** Inscritos no workshop da Academia Orbital (1ª turma e fila da 2ª), mais recentes primeiro. */
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

/**
 * PATCH — ajuste manual de uma inscrição: presença respondida por fora (ex.:
 * no WhatsApp) e troca de turma (chamar alguém da fila quando há desistência).
 * Body: { id, presenca?: "sim" | "nao" | null, turma?: 1 | 2 }
 */
export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { id?: unknown; presenca?: unknown; turma?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const mudar: Record<string, unknown> = {};
  if (body && "presenca" in body) {
    if (body.presenca !== "sim" && body.presenca !== "nao" && body.presenca !== null) {
      return NextResponse.json({ error: "presenca inválida" }, { status: 400 });
    }
    mudar.presenca = body.presenca;
    mudar.presenca_respondida_at = body.presenca ? new Date().toISOString() : null;
  }
  if (body && "turma" in body) {
    if (body.turma !== 1 && body.turma !== 2) return NextResponse.json({ error: "turma inválida" }, { status: 400 });
    mudar.turma = body.turma;
  }
  if (!Object.keys(mudar).length) return NextResponse.json({ error: "nada para mudar" }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("academy_waitlist")
    .update(mudar)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    if (isMissingColumn(error)) {
      return NextResponse.json({ error: "Rode a migration 065 no Supabase primeiro." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Inscrição não encontrada" }, { status: 404 });
  // Vaga liberada ou ocupada: o contador da página muda.
  revalidatePath("/academia");
  return NextResponse.json(data);
}
