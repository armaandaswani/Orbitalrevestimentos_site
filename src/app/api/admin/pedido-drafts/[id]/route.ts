import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isDraftUuid, PEDIDO_DRAFT_COLUMNS, readPedidoDraftBody, validPedidoDraftContent } from "@/lib/pedido-drafts";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const conflict = () => reply({ error: "Este rascunho mudou em outra aba. Reabra a versão salva antes de continuar.", code: "DRAFT_CONFLICT" }, 409);
function authorized(req: NextRequest) {
  if (!isAdminRequest(req)) return reply({ error: "Sessão expirada. Entre novamente no admin." }, 401);
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return reply({ error: "Origem não permitida." }, 403);
  return null;
}
export async function PUT(req: NextRequest, context: Context) {
  const denied = authorized(req); if (denied) return denied;
  const { id } = await context.params;
  if (!isDraftUuid(id)) return reply({ error: "Rascunho inválido." }, 400);
  let body: unknown;
  try { body = await readPedidoDraftBody(req); } catch (error) {
    return error instanceof Error && error.message === "TOO_LARGE" ? reply({ error: "O rascunho excede 250 KB." }, 413) : reply({ error: "Dados do rascunho inválidos." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "Dados do rascunho inválidos." }, 400);
  const { id: bodyId, device_id, content, revision } = body as Record<string, unknown>;
  if (bodyId !== id || !isDraftUuid(device_id) || !Number.isSafeInteger(revision) || Number(revision) < 0 || Number(revision) >= 2147483647 || !validPedidoDraftContent(content)) return reply({ error: "Dados do rascunho inválidos." }, 400);
  try {
    const table = supabaseAdmin().from("admin_pedido_drafts");
    const next = Number(revision) + 1;
    const query = revision === 0
      ? table.insert({ id, device_id, content, revision: next })
      : table.update({ content, revision: next }).eq("id", id).eq("device_id", device_id).eq("revision", revision);
    const { data, error } = await query.select(PEDIDO_DRAFT_COLUMNS).maybeSingle();
    if (error?.code === "23505") return conflict();
    if (error) return reply({ error: "Não foi possível salvar o rascunho. Tente novamente." }, 503);
    if (!data) return conflict();
    return reply(data);
  } catch { return reply({ error: "Não foi possível salvar o rascunho. Tente novamente." }, 503); }
}
export async function DELETE(req: NextRequest, context: Context) {
  const denied = authorized(req); if (denied) return denied;
  const { id } = await context.params;
  const device = new URL(req.url).searchParams.get("device_id");
  if (!isDraftUuid(id) || !isDraftUuid(device)) return reply({ error: "Rascunho ou dispositivo inválido." }, 400);
  try {
    const { error } = await supabaseAdmin().from("admin_pedido_drafts").delete().eq("id", id).eq("device_id", device);
    if (error) return reply({ error: "Não foi possível excluir o rascunho." }, 503);
    return reply({ ok: true });
  } catch { return reply({ error: "Não foi possível excluir o rascunho." }, 503); }
}
