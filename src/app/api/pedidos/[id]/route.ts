import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// PUBLIC read-only view of a commercial document (orçamento/pedido/nota) so the
// CLIENT can open the link we send them by WhatsApp/e-mail — the admin document
// page falls back to this when there's no admin session.
//
// Keyed by the order's UUID (unguessable). Returns ONLY client-safe fields:
// never cost/margin, commissions, partner/rep internals, or unit_cost.

export const dynamic = "force-dynamic";

const SAFE_ITEM = (it: Record<string, unknown>) => ({
  product_name: it.product_name ?? null,
  product_code: it.product_code ?? null,
  panel_w: it.panel_w ?? null,
  panel_h: it.panel_h ?? null,
  plates: it.plates ?? null,
  unit_price: it.unit_price ?? null,
  unit_label: it.unit_label ?? "placa",
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: pedido, error } = await db.from("pedidos").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pedido) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

  const { data: itemRows } = await db
    .from("pedido_items")
    .select("product_id, product_name, plates, unit_price, unit_label")
    .eq("pedido_id", id);
  // Join the product's code + panel dimensions (client-safe) so the document can
  // show "Modelo: ORB-004" and "Placa 2,90 m × 1,20 m × 5 mm".
  const itemProductIds = (itemRows ?? []).map((r) => (r as Record<string, unknown>).product_id).filter(Boolean) as string[];
  const prodMeta = itemProductIds.length
    ? (await db.from("products").select("id, code, render_panel_width_m, render_panel_height_m").in("id", itemProductIds)).data ?? []
    : [];
  const prodMetaById = new Map(prodMeta.map((p) => [(p as Record<string, unknown>).id as string, p as Record<string, unknown>]));
  const items = (itemRows ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const meta = row.product_id ? prodMetaById.get(row.product_id as string) : null;
    return { ...row, product_code: meta?.code ?? null, panel_w: meta?.render_panel_width_m ?? null, panel_h: meta?.render_panel_height_m ?? null };
  });

  const p = pedido as Record<string, unknown>;
  // Whitelist — everything the document renderer needs, nothing internal.
  const safe = {
    id: p.id,
    created_at: p.created_at,
    client_name: p.client_name ?? null,
    client_email: p.client_email ?? null,
    client_phone: p.client_phone ?? null,
    client_zip: p.client_zip ?? null,
    client_address: p.client_address ?? null,
    client_address_complement: p.client_address_complement ?? null,
    client_city: p.client_city ?? null,
    client_state: p.client_state ?? null,
    space: p.space ?? null,
    product_name: p.product_name ?? null,
    area_m2: p.area_m2 ?? null,
    total: p.total ?? null,
    discount_amount: p.discount_amount ?? 0,
    freight_amount: p.freight_amount ?? 0,
    freight_is_revenue: p.freight_is_revenue ?? false,
    payment_methods: p.payment_methods ?? null,
    payment_terms: p.payment_terms ?? null,
    quote_valid_until: p.quote_valid_until ?? null,
    warranty_terms: p.warranty_terms ?? null,
    document_notes: p.document_notes ?? null,
    show_legal_terms: p.show_legal_terms ?? true,
    status: p.status ?? null,
    price_tier: p.price_tier ?? "varejo",
    items: (items ?? []).map((it) => SAFE_ITEM(it as Record<string, unknown>)),
  };

  return NextResponse.json(safe);
}
