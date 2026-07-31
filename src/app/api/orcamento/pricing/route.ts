import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { computeOrcamento } from "@/lib/orcamento-pricing";
import { fetchMaterialPrices, loadOrcamentoConfig, spaceApplicationsFrom } from "@/lib/orcamento-server";

// POST /api/orcamento/pricing — the AUTHORITATIVE orçamento breakdown. The
// public simulador shows a preview but confirms totals here so placas, Cola PU,
// frete, desconto and parcelas come from one engine + the real Cola PU price.
//
// Body: { plates, pricePerPlate, freteZoneValue?, spaces? }
//   spaces: [{ plates, applicationType: "parede" | "teto" | "forro" }] — decide
//   quais materiais de instalação entram. Ausente → tudo como parede (PU-40),
//   que é o comportamento anterior ao campo existir.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const plates = Math.max(0, Math.floor(Number(body?.plates) || 0));
  const pricePerPlate = Math.max(0, Number(body?.pricePerPlate) || 0);
  const freteZoneValue = typeof body?.freteZoneValue === "number" ? body.freteZoneValue : null;
  const spaces = spaceApplicationsFrom(Array.isArray(body?.spaces) ? body.spaces : null, plates);

  // Cola PU price + availability from the product catalog (SKU ORB-PU). Never
  // hardcoded — a missing/inactive/priceless product flags a warning instead of
  // producing a wrong total.
  let colaUnitPrice = 0;
  let colaAvailable = false;
  const db = supabaseAdmin();
  try {
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

  const { config, materialsConfig } = await loadOrcamentoConfig(db);
  const { prices, stock, names, units } = await fetchMaterialPrices(db);
  const breakdown = computeOrcamento(
    {
      plates, pricePerPlate, colaUnitPrice, colaAvailable, freteZoneValue,
      spaces, materialPrices: prices, materialStock: stock, materialNames: names, materialUnits: units, materialsConfig,
    },
    config
  );

  return NextResponse.json(breakdown);
}
