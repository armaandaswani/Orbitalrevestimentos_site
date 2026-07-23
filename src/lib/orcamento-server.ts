// Server-side helpers so the authoritative orçamento breakdown is computed the
// SAME way for /api/orcamento/pricing, the formal PDF and the WhatsApp send.
// Everything routes through the central engine (computeOrcamento) — no rule is
// ever re-implemented in a route.

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeOrcamento, DEFAULT_CONFIG, type OrcamentoBreakdown, type OrcamentoConfig } from "@/lib/orcamento-pricing";

// Admin-editable extras (installer + quote validity + automations) stored in the
// same orcamento_settings.config JSONB alongside the engine numbers.
export interface OrcamentoExtras {
  installerName: string;
  installerPhone: string;
  installerWhatsappBase: string;
  quoteValidityDays: number;
  leadMessageEnabled: boolean;
}

export const DEFAULT_EXTRAS: OrcamentoExtras = {
  installerName: "Werk Engenharia",
  installerPhone: "(92) 99397-4821",
  installerWhatsappBase: "https://wa.me/5592993974821?text=",
  quoteValidityDays: 7,
  leadMessageEnabled: true,
};

// Load the admin config (orcamento_settings singleton) and merge onto the code
// defaults. Any missing key/row/table falls back to DEFAULT_CONFIG/DEFAULT_EXTRAS,
// so the engine keeps working before migration 044 runs.
export async function loadOrcamentoConfig(
  db: SupabaseClient
): Promise<{ config: OrcamentoConfig; extras: OrcamentoExtras }> {
  try {
    const { data } = await db.from("orcamento_settings").select("config").eq("id", 1).maybeSingle();
    const raw = (data?.config ?? {}) as Partial<OrcamentoConfig & OrcamentoExtras> & { installmentTiers?: OrcamentoConfig["installmentTiers"] };
    const config: OrcamentoConfig = {
      colaFactorPerPlate: num(raw.colaFactorPerPlate, DEFAULT_CONFIG.colaFactorPerPlate),
      freteFreeMinPlates: num(raw.freteFreeMinPlates, DEFAULT_CONFIG.freteFreeMinPlates),
      freteBase: num(raw.freteBase, DEFAULT_CONFIG.freteBase),
      discountPct: num(raw.discountPct, DEFAULT_CONFIG.discountPct),
      discountMinPlates: num(raw.discountMinPlates, DEFAULT_CONFIG.discountMinPlates),
      discountScope: raw.discountScope ?? DEFAULT_CONFIG.discountScope,
      installmentTiers: Array.isArray(raw.installmentTiers) && raw.installmentTiers.length ? raw.installmentTiers : DEFAULT_CONFIG.installmentTiers,
    };
    const extras: OrcamentoExtras = {
      installerName: str(raw.installerName, DEFAULT_EXTRAS.installerName),
      installerPhone: str(raw.installerPhone, DEFAULT_EXTRAS.installerPhone),
      installerWhatsappBase: str(raw.installerWhatsappBase, DEFAULT_EXTRAS.installerWhatsappBase),
      quoteValidityDays: num(raw.quoteValidityDays, DEFAULT_EXTRAS.quoteValidityDays),
      leadMessageEnabled: typeof raw.leadMessageEnabled === "boolean" ? raw.leadMessageEnabled : DEFAULT_EXTRAS.leadMessageEnabled,
    };
    return { config, extras };
  } catch {
    return { config: DEFAULT_CONFIG, extras: DEFAULT_EXTRAS };
  }
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

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
  const { config } = await loadOrcamentoConfig(db);
  return computeOrcamento(
    { plates, pricePerPlate, colaUnitPrice, colaAvailable, freteZoneValue },
    config
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
