import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isMissingTable } from "@/lib/db-compat";
import { transitionOrderStock } from "@/lib/stock";

interface OrderItemInput { product_id?: string; plates?: number }

// Pedidos / Produção — what happens AFTER a lead is won: the order is cut,
// finished and delivered. Backed by the `pedidos` table (migration 017). If
// that migration hasn't run yet, GET returns an empty list (so the tab shows a
// clean empty state instead of an error) and POST reports a clear message.

/** GET /api/admin/pedidos?status=em_producao&search=foo */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const db = supabaseAdmin();
  let query = db.from("pedidos").select("*").order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (search && search.trim()) {
    const s = search.trim();
    query = query.or(
      `client_name.ilike.%${s}%,client_email.ilike.%${s}%,client_phone.ilike.%${s}%,product_name.ilike.%${s}%`
    );
  }

  const { data, error } = await query;

  // Migration 017 may not have run yet — degrade to an empty list.
  if (error) {
    if (isMissingTable(error)) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/** POST /api/admin/pedidos — create an order (manually or from a won lead). */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  if (!body.client_name || typeof body.client_name !== "string" || !body.client_name.trim()) {
    return NextResponse.json({ error: "Nome do cliente é obrigatório." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const payload: Record<string, unknown> = {
    lead_id: body.lead_id ?? null,
    client_name: body.client_name.trim(),
    client_email: body.client_email ? String(body.client_email).trim().toLowerCase() : null,
    client_phone: body.client_phone ? String(body.client_phone).trim() : null,
    partner_name: body.partner_name ?? null,
    space: body.space ?? null,
    product_name: body.product_name ?? null,
    area_m2: body.area_m2 ?? null,
    total: body.total ?? null,
    status: body.status ?? "em_producao",
    payment_status: body.payment_status ?? "pendente",
    notes: body.notes ?? null,
    expected_delivery_at: body.expected_delivery_at ?? null,
  };

  const { data, error } = await db.from("pedidos").insert(payload).select().single();

  // Structured line items (model + plate qty) → enables stock + profit. Created
  // alongside the order; reserve stock immediately for active orders. All
  // best-effort: a missing migration 023 must never block order creation.
  if (data && Array.isArray(body.items) && body.items.length > 0) {
    const rawItems = (body.items as OrderItemInput[])
      .filter((it) => it && it.product_id && Number(it.plates) > 0)
      .map((it) => ({ product_id: it.product_id as string, plates: Math.round(Number(it.plates)) }));
    if (rawItems.length > 0) {
      try {
        // Snapshot cost/price per model at order time.
        const ids = [...new Set(rawItems.map((i) => i.product_id))];
        const { data: prods } = await db.from("products").select("id, name, cost_price, price").in("id", ids);
        const byId = new Map((prods ?? []).map((p) => [p.id as string, p]));
        const itemRows = rawItems.map((i) => {
          const p = byId.get(i.product_id);
          return {
            pedido_id: data.id,
            product_id: i.product_id,
            product_name: (p?.name as string) ?? null,
            plates: i.plates,
            unit_cost: p?.cost_price ?? null,
            unit_price: p?.price ?? null,
          };
        });
        await db.from("pedido_items").insert(itemRows);

        const status = (payload.status as string) || "em_producao";
        if (status === "em_producao" || status === "pronto") {
          const r = await transitionOrderStock(db, data.id, "none", "reserved", "admin");
          if (r.ok && r.newState) {
            await db.from("pedidos").update({ stock_state: r.newState }).eq("id", data.id);
          }
        }
      } catch { /* stock/items tables missing — order still created */ }
    }
  }

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json(
        { error: "Tabela de pedidos ainda não existe. Rode a migração 017." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
