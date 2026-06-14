import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { smclickConfigured, sendText, normalizePhone } from "@/lib/smclick";

/**
 * POST /api/admin/leads/:id/whatsapp — send a one-off WhatsApp message to a
 * lead via SM Click, straight from the Leads/CRM tab.
 * Body: { message: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (!smclickConfigured()) {
    return NextResponse.json(
      { error: "SM Click não configurado. Defina SMCLICK_API_URL, SMCLICK_API_KEY e SMCLICK_INSTANCE_ID." },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: lead, error } = await db
    .from("leads")
    .select("id, phone")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

  const telephone = normalizePhone(lead.phone as string | null);
  if (!telephone) return NextResponse.json({ error: "Lead sem telefone válido." }, { status: 400 });

  const res = await sendText(telephone, message);
  if (!res.ok) {
    return NextResponse.json(
      { error: `Falha ao enviar WhatsApp: ${res.error ?? `HTTP ${res.status}`}` },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
