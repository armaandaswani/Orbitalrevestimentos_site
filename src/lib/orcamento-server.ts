// Server-side helpers so the authoritative orçamento breakdown is computed the
// SAME way for /api/orcamento/pricing, the formal PDF and the WhatsApp send.
// Everything routes through the central engine (computeOrcamento) — no rule is
// ever re-implemented in a route.

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeOrcamento, DEFAULT_CONFIG, type OrcamentoBreakdown, type OrcamentoConfig } from "@/lib/orcamento-pricing";
import { reservedByActiveOrders } from "@/lib/stock";
import {
  DEFAULT_MATERIALS_CONFIG,
  SUPPORT_PRODUCT_SKUS,
  type ApplicationType,
  type MaterialOverrides,
  type MaterialsConfig,
  type SpaceApplication,
} from "@/lib/orcamento-materials";

// Admin-editable extras (installer + quote validity + automations) stored in the
// same orcamento_settings.config JSONB alongside the engine numbers.
export interface OrcamentoExtras {
  installerName: string;
  installerPhone: string;
  installerWhatsappBase: string;
  quoteValidityDays: number;
  leadMessageEnabled: boolean;
  // Régua do orçamento formalizado (§33) — separada do lead.
  followupEnabled: boolean;
  followup1Hours: number;   // 1º acompanhamento após N horas da formalização
  followup2Hours: number;   // último acompanhamento após N horas
  followup1Message: string; // {nome} {numero} são interpolados
  followup2Message: string;
}

export const DEFAULT_EXTRAS: OrcamentoExtras = {
  installerName: "Werk Engenharia",
  installerPhone: "(92) 99397-4821",
  installerWhatsappBase: "https://wa.me/5592993974821?text=",
  quoteValidityDays: 7,
  leadMessageEnabled: true,
  followupEnabled: false,
  followup1Hours: 24,
  followup2Hours: 72,
  followup1Message: "Olá, {nome}. Passando para saber se ficou alguma dúvida sobre o orçamento {numero} da Orbital. Posso ajudar a ajustar medidas, acabamento ou pagamento — é só responder aqui.",
  followup2Message: "Olá, {nome}. Seu orçamento {numero} da Orbital continua disponível. Se quiser seguir com o pedido ou revisar qualquer detalhe, estou à disposição.",
};

// Load the admin config (orcamento_settings singleton) and merge onto the code
// defaults. Any missing key/row/table falls back to DEFAULT_CONFIG/DEFAULT_EXTRAS,
// so the engine keeps working before migration 044 runs.
export async function loadOrcamentoConfig(
  db: SupabaseClient
): Promise<{ config: OrcamentoConfig; extras: OrcamentoExtras; materialsConfig: MaterialsConfig }> {
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
      followupEnabled: typeof raw.followupEnabled === "boolean" ? raw.followupEnabled : DEFAULT_EXTRAS.followupEnabled,
      followup1Hours: num(raw.followup1Hours, DEFAULT_EXTRAS.followup1Hours),
      followup2Hours: num(raw.followup2Hours, DEFAULT_EXTRAS.followup2Hours),
      followup1Message: str(raw.followup1Message, DEFAULT_EXTRAS.followup1Message),
      followup2Message: str(raw.followup2Message, DEFAULT_EXTRAS.followup2Message),
    };
    return { config, extras, materialsConfig: materialsConfigFrom(raw as Record<string, unknown>) };
  } catch {
    return { config: DEFAULT_CONFIG, extras: DEFAULT_EXTRAS, materialsConfig: DEFAULT_MATERIALS_CONFIG };
  }
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

/**
 * Preço de venda e estoque de TODOS os SKUs internos de instalação.
 *
 * Uma consulta só, para o motor não decidir a embalagem de cola com preço
 * faltando — sem o preço de uma delas a escolha cai no critério de menor sobra.
 * SKU ausente do catálogo simplesmente não entra no mapa (preço 0 → sem preço).
 */
export async function fetchMaterialPrices(
  db: SupabaseClient
): Promise<{ prices: Record<string, number>; stock: Record<string, number>; names: Record<string, string>; units: Record<string, string> }> {
  const prices: Record<string, number> = {};
  const stock: Record<string, number> = {};
  const names: Record<string, string> = {};
  const units: Record<string, string> = {};
  try {
    const { data } = await db
      .from("products")
      .select("id, code, name, price, is_active, stock_on_hand, sale_unit")
      .in("code", SUPPORT_PRODUCT_SKUS as readonly string[]);
    // Mesma definição do resto do sistema: só pedido ativo segura material.
    const reserved = await reservedByActiveOrders(db);
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const code = String(row.code);
      if (row.is_active === false) continue; // inativo → sem preço, o motor avisa
      prices[code] = Number(row.price) || 0;
      stock[code] = Math.max(0, (Number(row.stock_on_hand) || 0) - (reserved[String(row.id)] ?? 0));
      if (row.name) names[code] = String(row.name);
      if (row.sale_unit) units[code] = String(row.sale_unit);
    }
  } catch {
    // DB indisponível → mapas vazios; o motor sinaliza e o total sai sem material.
  }
  return { prices, stock, names, units };
}

/** Configuração dos materiais, mesclando o que o painel gravou sobre os padrões. */
export function materialsConfigFrom(raw: Record<string, unknown> | null | undefined): MaterialsConfig {
  const r = raw ?? {};
  const pkgs = Array.isArray(r.adhesivePackages) ? (r.adhesivePackages as MaterialsConfig["adhesivePackages"]) : null;
  const appTypes = (v: unknown, fallback: ApplicationType[]): ApplicationType[] =>
    Array.isArray(v) && v.length ? (v as ApplicationType[]) : fallback;
  return {
    pu40TubesPerPanel: num(r.pu40TubesPerPanel, DEFAULT_MATERIALS_CONFIG.pu40TubesPerPanel),
    adhesiveLitersPerPanel: num(r.adhesiveLitersPerPanel, DEFAULT_MATERIALS_CONFIG.adhesiveLitersPerPanel),
    foamTubesPerPanel: num(r.foamTubesPerPanel, DEFAULT_MATERIALS_CONFIG.foamTubesPerPanel),
    adhesivePackages: pkgs && pkgs.length ? pkgs : DEFAULT_MATERIALS_CONFIG.adhesivePackages,
    foamCode: str(r.foamCode, DEFAULT_MATERIALS_CONFIG.foamCode),
    pu40Code: str(r.pu40Code, DEFAULT_MATERIALS_CONFIG.pu40Code),
    pu40AppliesTo: appTypes(r.pu40AppliesTo, DEFAULT_MATERIALS_CONFIG.pu40AppliesTo),
    adhesiveAppliesTo: appTypes(r.adhesiveAppliesTo, DEFAULT_MATERIALS_CONFIG.adhesiveAppliesTo),
  };
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
  spaces?: Array<{ plates?: number; total?: number; applicationType?: string | null }> | null;
  /** Ajuste manual dos materiais (migração 055). Ausente = cálculo automático. */
  material_overrides?: MaterialOverrides | null;
}

/** Tipos de aplicação dos espaços salvos. Espaço sem tipo conta como parede. */
export function spaceApplicationsFrom(
  spaces: QuoteLike["spaces"],
  fallbackPlates: number,
): SpaceApplication[] {
  const list = Array.isArray(spaces) ? spaces : [];
  const out: SpaceApplication[] = [];
  for (const s of list) {
    const panels = Number(s?.plates) || 0;
    if (panels <= 0) continue;
    const t = String(s?.applicationType ?? "").toLowerCase();
    // Orçamento salvo antes do campo existir → parede, que é o que ele já era.
    const applicationType: ApplicationType = t === "teto" || t === "forro" ? t : "parede";
    out.push({ applicationType, panels });
  }
  if (out.length === 0 && fallbackPlates > 0) out.push({ applicationType: "parede", panels: fallbackPlates });
  return out;
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
  const { config, materialsConfig } = await loadOrcamentoConfig(db);
  const { prices, stock, names, units } = await fetchMaterialPrices(db);
  return computeOrcamento(
    {
      plates, pricePerPlate, colaUnitPrice, colaAvailable, freteZoneValue,
      spaces: spaceApplicationsFrom(quote.spaces, plates),
      materialPrices: prices, materialStock: stock, materialNames: names, materialUnits: units, materialsConfig,
      materialOverrides: quote.material_overrides ?? null,
    },
    config
  );
}

// Valor de frete para um CEP, segundo as zonas cadastradas (frete_zones). Casa
// por faixa (cep_start..cep_end) ou por lista (cep_list, separada por vírgula/
// espaço/linha). Menor `priority` vence. Retorna null quando nenhuma zona casa —
// aí o motor usa o frete-base. Nunca lança (tabela ausente → null).
export async function freteValueForCep(db: SupabaseClient, cep: string | null | undefined): Promise<number | null> {
  const digits = (cep ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  try {
    const { data } = await db.from("frete_zones").select("*").eq("active", true).order("priority", { ascending: true });
    if (!Array.isArray(data)) return null;
    for (const z of data as Array<Record<string, unknown>>) {
      const start = String(z.cep_start ?? "").replace(/\D/g, "");
      const end = String(z.cep_end ?? "").replace(/\D/g, "");
      if (start && end && digits >= start && digits <= end) return Number(z.value) || 0;
      const list = String(z.cep_list ?? "").split(/[\s,;\n]+/).map((c) => c.replace(/\D/g, "")).filter(Boolean);
      if (list.includes(digits)) return Number(z.value) || 0;
    }
  } catch {
    // tabela ausente / DB indisponível → cai no frete-base.
  }
  return null;
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
