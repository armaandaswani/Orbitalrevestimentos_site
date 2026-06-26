import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { applyStockMovement, deltasForKind, type ManualExitType, type MovementKind } from "@/lib/stock";

const MIGRATION_HINT = "Recurso indisponível — rode a migração 023 (estoque) no Supabase.";
const MANUAL_EXIT_TYPES = new Set(["sale", "loss", "sample", "internal"]);

function isMissingStock(err: { message?: string } | null): boolean {
  const m = err?.message?.toLowerCase() ?? "";
  return m.includes("stock_on_hand") || m.includes("stock_movements") || m.includes("does not exist");
}

/** GET /api/admin/stock — every product with its stock counters + valuation. */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("products")
    .select("id, name, code, linha, price, cost_price, stock_on_hand, stock_reserved, reorder_point, is_active")
    .order("sort_order", { ascending: true });

  if (error && isMissingStock(error)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((p) => {
    const onHand = p.stock_on_hand ?? 0;
    const reserved = p.stock_reserved ?? 0;
    return {
      ...p,
      available: Math.max(0, onHand - reserved),
      stock_value: p.cost_price ? onHand * Number(p.cost_price) : 0,
      low: p.reorder_point > 0 && onHand - reserved <= p.reorder_point,
    };
  });

  const totalValue = rows.reduce((s, r) => s + (r.stock_value || 0), 0);
  return NextResponse.json({ products: rows, total_value: totalValue });
}

/**
 * POST /api/admin/stock — record a MANUAL movement.
 *   { product_id, kind: 'manual_in'|'manual_out'|'adjust', qty, reason, manual_exit_type?, sale_amount? }
 * For 'adjust', qty is the new absolute on-hand count (we compute the delta).
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const productId = body.product_id;
  const kind = body.kind as MovementKind;
  const qty = Number(body.qty);
  if (!productId || !["manual_in", "manual_out", "adjust"].includes(kind)) {
    return NextResponse.json({ error: "product_id e tipo (manual_in/manual_out/adjust) obrigatórios." }, { status: 400 });
  }
  if (!Number.isFinite(qty) || qty < 0) {
    return NextResponse.json({ error: "Quantidade inválida." }, { status: 400 });
  }

  const sb = supabaseAdmin();

  let onHandDelta: number;
  if (kind === "adjust") {
    // qty is the target on-hand count → delta from current.
    const { data: prod, error: readErr } = await sb
      .from("products").select("stock_on_hand").eq("id", productId).maybeSingle();
    if (readErr && isMissingStock(readErr)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
    if (!prod) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    onHandDelta = Math.round(qty) - (prod.stock_on_hand ?? 0);
  } else {
    onHandDelta = deltasForKind(kind, Math.round(qty)).onHand;
  }

  const rawExitType = typeof body.manual_exit_type === "string" ? body.manual_exit_type : "";
  const manualExitType: ManualExitType | null =
    kind === "manual_out"
      ? (MANUAL_EXIT_TYPES.has(rawExitType) ? rawExitType as ManualExitType : "loss")
      : null;
  const rawSaleAmount = Number(body.sale_amount);
  const saleAmount =
    manualExitType === "sale" && Number.isFinite(rawSaleAmount) && rawSaleAmount >= 0
      ? rawSaleAmount
      : null;

  const res = await applyStockMovement(sb, {
    productId,
    kind,
    onHandDelta,
    reservedDelta: 0,
    reason: typeof body.reason === "string" ? body.reason.trim() || null : null,
    createdBy: "admin",
    manualExitType,
    saleAmount,
  });

  if (!res.ok && isMissingStock({ message: res.error })) {
    return NextResponse.json({ error: MIGRATION_HINT }, { status: 503 });
  }
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({ ok: true, on_hand: res.on_hand, reserved: res.reserved });
}
