import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";

const KINDS = new Set(["payment_terms", "payment_method"]);

/** GET /api/admin/pedido-presets?kind=payment_terms|payment_method — saved
 * reusable text for the Pedidos editor (Condição de pagamento / Forma de
 * pagamento), so the admin doesn't retype the same wording every order. */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const db = supabaseAdmin();
  let query = db.from("pedido_presets").select("id, kind, label, created_at").order("label", { ascending: true });
  if (kind && KINDS.has(kind)) query = query.eq("kind", kind);

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return NextResponse.json([]); // migration 034 not run yet
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

/** POST /api/admin/pedido-presets — { kind, label } */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const kind = body?.kind;
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  if (!KINDS.has(kind) || !label) {
    return NextResponse.json({ error: "kind e label obrigatórios." }, { status: 400 });
  }

  const db = supabaseAdmin();
  // Avoid duplicate presets (case-insensitive) for the same kind.
  const { data: existing } = await db.from("pedido_presets").select("id").eq("kind", kind).ilike("label", label).maybeSingle();
  if (existing) return NextResponse.json(existing);

  const { data, error } = await db.from("pedido_presets").insert({ kind, label }).select("id, kind, label, created_at").single();
  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ error: "Rode a migração 034 (pedido_presets) no Supabase." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
