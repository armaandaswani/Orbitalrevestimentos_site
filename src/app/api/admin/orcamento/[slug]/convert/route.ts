import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, ADMIN_COOKIE } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { breakdownForQuote } from "@/lib/orcamento-server";

export const runtime = "nodejs";

interface QuoteSpaceRow {
  spaceName?: string; productCode?: string; productName?: string;
  plates?: number; area?: number; pricePerPlate?: number; total?: number;
}

// POST /api/admin/orcamento/[slug]/convert — turn a FORMALIZED quote into a
// pedido reusing everything (cliente, endereço, produto, placas, Cola PU, frete,
// desconto, condição, parceiro) — no re-typing. Delegates to POST /api/admin/
// pedidos so line items, estoque e comissões seguem a mesma lógica.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  const db = supabaseAdmin();

  const { data: quote, error } = await db.from("saved_quotes").select("*").eq("slug", slug).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!quote) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
  const q = quote as Record<string, unknown>;

  if (q.pedido_id) {
    return NextResponse.json({ error: "Este orçamento já foi convertido em pedido.", pedidoId: q.pedido_id }, { status: 409 });
  }

  const spaces = (Array.isArray(q.spaces) ? q.spaces : []) as QuoteSpaceRow[];
  const freteZone = typeof q.frete_amount === "number" && !q.frete_free ? (q.frete_amount as number) : null;
  const breakdown = await breakdownForQuote(db, q, freteZone);

  // Resolve product_id from the códigos stored on each space (+ ORB-PU for cola).
  const codes = [...new Set(spaces.map((s) => s.productCode).filter(Boolean) as string[])];
  const wanted = [...codes, "ORB-PU"];
  const { data: prods } = await db.from("products").select("id, code, price").in("code", wanted);
  const byCode = new Map((prods ?? []).map((p) => [p.code as string, p as { id: string; price: number }]));

  const items: Array<{ product_id: string; plates: number; unit_price: number | null }> = [];
  for (const sp of spaces) {
    const prod = sp.productCode ? byCode.get(sp.productCode) : null;
    if (prod && Number(sp.plates) > 0) {
      items.push({ product_id: prod.id, plates: Math.round(Number(sp.plates)), unit_price: Number(sp.pricePerPlate) || null });
    }
  }
  // Cola PU as a line item (real ORB-PU product), so it flows into estoque/custo.
  const colaProd = byCode.get("ORB-PU");
  if (colaProd && breakdown.colaAvailable && breakdown.colaTubos > 0) {
    items.push({ product_id: colaProd.id, plates: breakdown.colaTubos, unit_price: breakdown.colaUnitPrice || null });
  }

  const sel = breakdown.paymentOptions.find((o) => o.id === q.payment_condition) ?? breakdown.paymentOptions[0];
  const paymentTerms = sel?.id === "pix"
    ? `PIX ou espécie — ${sel.discountPct}% à vista`
    : sel
      ? `Cartão até ${sel.installments}x sem juros`
      : "A combinar";

  const spaceLabel = spaces.map((s) => s.spaceName).filter(Boolean).join(", ") || null;
  const productLabel = spaces.length === 1
    ? [spaces[0].productCode, spaces[0].productName].filter(Boolean).join(" ")
    : `${spaces.length} ambiente(s)`;

  const pedidoBody = {
    client_name: q.client_name ?? "Cliente",
    client_email: q.client_email ?? null,
    client_phone: q.client_phone ?? null,
    partner_id: q.partner_id ?? null,
    partner_name: q.partner_name ?? null,
    space: spaceLabel,
    product_name: productLabel,
    area_m2: q.total_area_m2 ?? null,
    total: breakdown.platesSubtotal + breakdown.colaSubtotal,
    status: "em_producao",
    payment_terms: paymentTerms,
    payment_methods: sel?.id === "pix" ? ["Pix"] : ["Cartão de crédito"],
    discount_amount: sel?.id === "pix" ? sel.discountAmount ?? 0 : 0,
    freight_amount: breakdown.frete.value,
    freight_is_revenue: false,
    quote_valid_until: q.expires_at ?? null,
    client_zip: q.client_zip ?? null,
    client_address: [q.client_address, q.client_number].filter(Boolean).join(", ") || null,
    client_address_complement: [q.client_complement, q.client_condo].filter(Boolean).join(" · ") || null,
    client_city: q.client_city ?? null,
    client_state: q.client_state ?? null,
    notes: q.delivery_notes ?? null,
    items,
  };

  // Delegate to the canonical pedido-creation route (forward the admin cookie).
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  const res = await fetch(`${req.nextUrl.origin}/api/admin/pedidos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookie ? `${ADMIN_COOKIE}=${cookie}` : "" },
    body: JSON.stringify(pedidoBody),
  });
  const created = await res.json().catch(() => null);
  if (!res.ok || !created?.id) {
    return NextResponse.json({ error: created?.error ?? "Falha ao criar o pedido." }, { status: 502 });
  }

  // Link the quote → pedido and mark stage. Best-effort (won't fail conversion).
  await db.from("saved_quotes").update({ stage: "pedido", pedido_id: created.id }).eq("slug", slug).then(() => {}, () => {});

  return NextResponse.json({ ok: true, pedidoId: created.id });
}
