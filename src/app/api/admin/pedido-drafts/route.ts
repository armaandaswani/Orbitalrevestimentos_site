import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isDraftUuid, PEDIDO_DRAFT_COLUMNS } from "@/lib/pedido-drafts";
export const runtime = "nodejs";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return reply({ error: "Sessão expirada. Entre novamente no admin." }, 401);
  const device = new URL(req.url).searchParams.get("device_id");
  if (!isDraftUuid(device)) return reply({ error: "Dispositivo inválido." }, 400);
  try {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60_000).toISOString();
    const { data, error } = await supabaseAdmin().from("admin_pedido_drafts").select(PEDIDO_DRAFT_COLUMNS).eq("device_id", device).gte("updated_at", since).order("updated_at", { ascending: false }).limit(10);
    if (error) return reply({ error: "Não foi possível recuperar os rascunhos." }, 503);
    return reply({ drafts: data ?? [] });
  } catch { return reply({ error: "Não foi possível recuperar os rascunhos." }, 503); }
}
