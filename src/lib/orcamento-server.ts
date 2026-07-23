// Server-side helpers so the authoritative orçamento breakdown is computed the
// SAME way for /api/orcamento/pricing, the formal PDF and the WhatsApp send.
// Everything routes through the central engine (computeOrcamento) — no rule is
// ever re-implemented in a route.

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeOrcamento, DEFAULT_CONFIG, type OrcamentoBreakdown } from "@/lib/orcamento-pricing";

// Cola PU unit price + availability from the product catalog (SKU ORB-PU).
export async function fetchColaPrice(db: SupabaseClient): Promise<{ colaUnitPrice: number; colaAvailable: boolean }> {
  try {
    const { data } = await db.from("products").select("price, is_active").eq("code", "ORB-PU").maybeSingle();
    if (data) {
      const price = Number((data as { price?: number }).price) || 0;
      return { colaUnitPrice: price, colaAvailable: (data as { is_active?: boolean }).is_active !== false && price > 0 };
    }
  } catch {
    // DB unreachable → flagged unavailable; totals still computed for placas+frete.
  }
  return { colaUnitPrice: 0, colaAvailable: false };
}

export interface QuoteLike {
  total_plates?: number | null;
  material_discounted?: number | null;
  material_total?: number | null;
  spaces?: Array<{ plates?: number; total?: number }> | null;
}

// Derive plates + blended price-per-plate from a saved quote, then run the engine.
export async function breakdownForQuote(
  db: SupabaseClient,
  quote: QuoteLike,
  freteZoneValue?: number | null
): Promise<OrcamentoBreakdown> {
  const spaces = Array.isArray(quote.spaces) ? quote.spaces : [];
  const plates =
    Number(quote.total_plates) ||
    spaces.reduce((s, sp) => s + (Number(sp?.plates) || 0), 0);
  const subtotal =
    Number(quote.material_discounted) ||
    spaces.reduce((s, sp) => s + (Number(sp?.total) || 0), 0) ||
    Number(quote.material_total) || 0;
  const pricePerPlate = plates > 0 ? subtotal / plates : 0;
  const { colaUnitPrice, colaAvailable } = await fetchColaPrice(db);
  return computeOrcamento(
    { plates, pricePerPlate, colaUnitPrice, colaAvailable, freteZoneValue },
    DEFAULT_CONFIG
  );
}

// Legible formal number: ORC-<MMYY>-<4 chars of slug/uuid>. Deterministic per
// quote so re-generating the PDF keeps the same number.
export function formalNumberFor(slug: string, createdAt?: string | null): string {
  const d = createdAt ? new Date(createdAt) : new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const tail = (slug || "").replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "0000";
  return `ORC-${mm}${yy}-${tail}`;
}
