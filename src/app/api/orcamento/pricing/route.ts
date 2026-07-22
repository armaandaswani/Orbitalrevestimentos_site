import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { computeOrcamento, DEFAULT_CONFIG } from "@/lib/orcamento-pricing";

// POST /api/orcamento/pricing — the AUTHORITATIVE orçamento breakdown. The
// public simulador shows a preview but confirms totals here so placas, Cola PU,
// frete, desconto and parcelas come from one engine + the real Cola PU price.
//
// Body: { plates, pricePerPlate, freteZoneValue? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const plates = Math.max(0, Math.floor(Number(body?.plates) || 0));
  const pricePerPlate = Math.max(0, Number(body?.pricePerPlate) || 0);
  const freteZoneValue = typeof body?.freteZoneValue === "number" ? body.freteZoneValue : null;

  // Cola PU price + availability from the product catalog (SKU ORB-PU). Never
  // hardcoded — a missing/inactive/priceless product flags a warning instead of
  // producing a wrong total.
  let colaUnitPrice = 0;
  let colaAvailable = false;
  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from("products")
      .select("price, is_active, stock_on_hand")
      .eq("code", "ORB-PU")
      .maybeSingle();
    if (data) {
      colaUnitPrice = Number((data as { price?: number }).price) || 0;
      colaAvailable = (data as { is_active?: boolean }).is_active !== false && colaUnitPrice > 0;
    }
  } catch {
    // DB unreachable → Cola PU flagged unavailable; totals still computed for placas+frete.
  }

  const breakdown = computeOrcamento(
    { plates, pricePerPlate, colaUnitPrice, colaAvailable, freteZoneValue },
    DEFAULT_CONFIG
  );

  return NextResponse.json(breakdown);
}
