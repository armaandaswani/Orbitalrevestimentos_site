import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("saved_quotes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });

  // Surface the referring partner's WhatsApp so a client who returns to this
  // link later (not just right after the quote was made) can still reach the
  // person handling their project/installation — not just generic Orbital
  // support. Best-effort: a missing/inactive partner just omits the contact.
  let partnerPhone: string | null = null;
  const partnerId = (data as { partner_id?: string | null }).partner_id;
  if (partnerId) {
    const { data: partner } = await db.from("partners").select("phone").eq("id", partnerId).maybeSingle();
    partnerPhone = (partner?.phone as string | null) ?? null;
  }

  return NextResponse.json({ ...data, partner_phone: partnerPhone });
}

/** PATCH /api/quotes/[slug] — update a saved quote IN PLACE (used by "Editar
 *  este orçamento" so the client's existing link reflects their edits instead
 *  of a brand-new orçamento being created). Refreshes the 7-day validity. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const db = supabaseAdmin();
  // PATCH parcial: só atualiza os campos presentes no corpo. Assim uma edição
  // completa (fluxo "Editar orçamento") altera tudo, mas uma atualização só de
  // contato (ex.: confirmar dados antes de formalizar) NÃO apaga spaces/totais.
  const patch: Record<string, unknown> = {};
  if ("partner_id" in body) patch.partner_id = body.partner_id ?? null;
  if ("partner_name" in body) patch.partner_name = body.partner_name ?? null;
  if ("coupon_code" in body) patch.coupon_code = body.coupon_code ?? null;
  if ("total_plates" in body) patch.total_plates = body.total_plates ?? null;
  if ("total_area_m2" in body) patch.total_area_m2 = body.total_area_m2 ?? null;
  if ("material_total" in body) patch.material_total = body.material_total ?? null;
  if ("material_discounted" in body) patch.material_discounted = body.material_discounted ?? null;
  if ("client_name" in body) patch.client_name = body.client_name ?? null;
  if ("client_email" in body) patch.client_email = body.client_email ?? null;
  if ("client_phone" in body) patch.client_phone = body.client_phone ?? null;
  // Só uma edição de conteúdo (spaces) renova a validade de 7 dias.
  if ("spaces" in body) { patch.spaces = body.spaces ?? []; patch.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); }

  let { data, error } = await db.from("saved_quotes").update(patch).eq("slug", slug).select("slug").single();
  if (error && /client_(name|email|phone)/.test(error.message)) {
    delete patch.client_name; delete patch.client_email; delete patch.client_phone;
    ({ data, error } = await db.from("saved_quotes").update(patch).eq("slug", slug).select("slug").single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
  return NextResponse.json({ slug: data.slug });
}
