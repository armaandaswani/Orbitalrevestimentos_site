// ─────────────────────────────────────────────────────────────────────────────
// Orbital orçamento — CENTRAL pricing engine (single source of truth).
//
// Every surface (public simulador, result page, PDF, WhatsApp, admin, pedido)
// must derive placas, Cola PU, frete, desconto, parcelas and total from HERE —
// never re-implement a commercial rule inline. The frontend may show a preview,
// but the authoritative numbers come from computeOrcamento() (server-side via
// /api/orcamento/pricing).
//
// All rules are parameterized by OrcamentoConfig so they can later be made
// admin-configurable without touching call sites. The DEFAULT_CONFIG encodes
// the rules the business gave us today.
// ─────────────────────────────────────────────────────────────────────────────

import {
  DEFAULT_MATERIALS_CONFIG,
  checkMaterialStock,
  planMaterialsForSpaces,
  type MaterialLine,
  type MaterialsConfig,
  type MaterialsPlan,
  type SpaceApplication,
  type StockCheck,
} from "@/lib/orcamento-materials";

export const PLATE_M2 = 3.48; // 2,90 m × 1,20 m panel

export type DiscountScope = "placas" | "placas_cola" | "subtotal";

export interface OrcamentoConfig {
  // Cola PU
  colaFactorPerPlate: number;   // tubos per placa (rounded up)
  // Frete
  freteFreeMinPlates: number;   // ≥ this many placas → frete grátis
  freteBase: number;            // estimated base freight below the free threshold
  // Desconto à vista (PIX / espécie / transferência)
  discountPct: number;          // e.g. 3 (percent)
  discountMinPlates: number;    // promo only from this many placas
  discountScope: DiscountScope; // what the % applies to (frete never discounted)
  // Parcelamento sem juros — tiers by plate count [minPlates, maxInstallments]
  installmentTiers: Array<{ minPlates: number; maxInstallments: number }>;
}

// Business rules as given (2026). Change here (or later via admin config) — never
// fork these numbers into a component.
export const DEFAULT_CONFIG: OrcamentoConfig = {
  colaFactorPerPlate: 1.5,
  freteFreeMinPlates: 5,
  freteBase: 150,
  discountPct: 3,
  discountMinPlates: 2,
  discountScope: "placas",
  installmentTiers: [
    { minPlates: 13, maxInstallments: 10 },
    { minPlates: 8, maxInstallments: 6 },
    { minPlates: 5, maxInstallments: 4 },
    { minPlates: 2, maxInstallments: 3 },
  ],
};

export function colaTubosForPlates(plates: number, cfg: OrcamentoConfig = DEFAULT_CONFIG): number {
  if (!plates || plates <= 0) return 0;
  return Math.ceil(plates * cfg.colaFactorPerPlate);
}

// Frete: grátis a partir de N placas; senão a base estimada (confirmada por CEP
// na formalização). freteZoneValue overrides the base once a CEP zone is known.
export function computeFrete(
  plates: number,
  cfg: OrcamentoConfig = DEFAULT_CONFIG,
  freteZoneValue?: number | null
): { free: boolean; value: number; estimated: boolean } {
  if (plates >= cfg.freteFreeMinPlates) return { free: true, value: 0, estimated: false };
  if (typeof freteZoneValue === "number" && freteZoneValue >= 0) {
    return { free: false, value: freteZoneValue, estimated: false };
  }
  return { free: false, value: cfg.freteBase, estimated: true };
}

// Max installments (sem juros) for a plate count; 0 when below the smallest tier.
export function maxInstallmentsForPlates(plates: number, cfg: OrcamentoConfig = DEFAULT_CONFIG): number {
  for (const tier of cfg.installmentTiers) {
    if (plates >= tier.minPlates) return tier.maxInstallments;
  }
  return 0;
}

export interface OrcamentoInput {
  plates: number;
  pricePerPlate: number;      // varejo (or tier) price per placa
  colaUnitPrice: number;      // per tubo (from the ORB-PU product); 0 if unavailable
  colaAvailable?: boolean;    // false → Cola PU misconfigured; excluded, flagged
  freteZoneValue?: number | null; // known CEP-zone freight (formalization)
  /**
   * Espaços com o tipo de aplicação de cada um (parede/teto/forro).
   *
   * Ausente → orçamento antigo, anterior ao campo: tudo conta como parede, que é
   * exatamente o que o sistema fazia antes. Assim nenhum orçamento já salvo muda
   * de valor sozinho.
   */
  spaces?: SpaceApplication[];
  /** Preço unitário de venda por SKU de material (ORB-PU, ORB-CC26, …). */
  materialPrices?: Record<string, number>;
  /** Estoque disponível por SKU — só gera aviso, nunca altera a quantidade. */
  materialStock?: Record<string, number>;
  materialsConfig?: MaterialsConfig;
}

export interface PaymentOption {
  id: "pix" | "cartao";
  label: string;
  // à vista (pix)
  discountPct?: number;
  discountAmount?: number;    // R$ saved
  // cartão
  installments?: number;
  installmentValue?: number;
  total: number;              // final total for THIS option
}

export interface OrcamentoBreakdown {
  plates: number;
  pricePerPlate: number;
  platesSubtotal: number;

  // Cola PU-40. Continua aqui porque toda a exibição já lê estes campos; agora
  // reflete só as placas de PAREDE — em teto/forro o PU-40 não entra.
  colaTubos: number;
  colaUnitPrice: number;
  colaSubtotal: number;
  colaAvailable: boolean;

  /**
   * Materiais de instalação calculados automaticamente, PU-40 incluído. Cada
   * linha traz preço unitário, total e o tipo de aplicação que a gerou.
   */
  materials: Array<MaterialLine & { unitPrice: number; total: number }>;
  materialsSubtotal: number;
  materialsPlan: MaterialsPlan;
  /** Faltas de estoque — avisos, sem mexer na quantidade técnica. */
  stockChecks: StockCheck[];

  frete: { free: boolean; value: number; estimated: boolean };

  // Base total BEFORE any payment-condition discount (placas + cola + frete).
  baseTotal: number;

  discount: { eligible: boolean; pct: number; amount: number; scope: DiscountScope };

  // Total with the à-vista discount applied (what PIX pays).
  totalAVista: number;
  // Total without discount (what a cartão / no-discount condition pays).
  totalFull: number;

  paymentOptions: PaymentOption[];
  warnings: string[];
  config: OrcamentoConfig;
}

function round2(n: number) { return Math.round(n * 100) / 100; }

export function computeOrcamento(input: OrcamentoInput, cfg: OrcamentoConfig = DEFAULT_CONFIG): OrcamentoBreakdown {
  const plates = Math.max(0, Math.floor(input.plates || 0));
  const pricePerPlate = Math.max(0, input.pricePerPlate || 0);
  const warnings: string[] = [];

  const platesSubtotal = round2(plates * pricePerPlate);

  // ── Materiais de instalação ────────────────────────────────────────────────
  // O tipo de aplicação de cada espaço decide a regra. Sem espaços informados
  // (orçamento anterior ao campo) tudo conta como parede, preservando o
  // comportamento antigo em vez de mudar um valor já enviado ao cliente.
  const matCfg = input.materialsConfig ?? DEFAULT_MATERIALS_CONFIG;
  const spaces: SpaceApplication[] = input.spaces?.length
    ? input.spaces
    : [{ applicationType: "parede", panels: plates }];

  const prices: Record<string, number> = { ...(input.materialPrices ?? {}) };
  // Retrocompat: quem só sabe o preço da cola PU continua funcionando.
  if (!prices[matCfg.pu40Code] && (input.colaUnitPrice || 0) > 0) {
    prices[matCfg.pu40Code] = Math.max(0, input.colaUnitPrice || 0);
  }

  const materialsPlan = planMaterialsForSpaces(spaces, prices, matCfg);
  warnings.push(...materialsPlan.warnings);

  const materials = materialsPlan.lines.map((l) => {
    const unitPrice = Math.max(0, prices[l.code] ?? 0);
    return { ...l, unitPrice, total: round2(l.quantity * unitPrice) };
  });
  const materialsSubtotal = round2(materials.reduce((s, l) => s + l.total, 0));
  const stockChecks = checkMaterialStock(materialsPlan.lines, input.materialStock ?? {});

  for (const s of stockChecks) {
    if (!s.sufficient) {
      warnings.push(`Estoque insuficiente de ${s.code}: necessário ${s.required}, disponível ${s.available}, faltam ${s.missing}.`);
    }
  }

  // Cola PU-40 — os campos que a exibição já lia, agora só sobre parede.
  const pu40Line = materials.find((l) => l.code === matCfg.pu40Code);
  const colaTubos = pu40Line?.quantity ?? 0;
  const colaAvailable = input.colaAvailable !== false && (prices[matCfg.pu40Code] ?? 0) > 0;
  if (materialsPlan.pu40Panels > 0 && !colaAvailable) {
    warnings.push("Cola PU indisponível ou sem preço configurado — não incluída no total.");
  }
  const colaUnitPrice = colaAvailable ? (prices[matCfg.pu40Code] ?? 0) : 0;
  const colaSubtotal = round2(colaTubos * colaUnitPrice);

  // Frete
  const frete = computeFrete(plates, cfg, input.freteZoneValue);

  const baseTotal = round2(platesSubtotal + materialsSubtotal + frete.value);

  // Desconto à vista — never on frete.
  const discountEligible = plates >= cfg.discountMinPlates && cfg.discountPct > 0;
  const discountableBase =
    cfg.discountScope === "placas" ? platesSubtotal
      // "placas_cola"/"subtotal" passam a incluir TODOS os materiais de
      // instalação, não só o PU-40 — senão um orçamento de teto perderia o
      // desconto sobre a cola de contato que substituiu o PU-40.
      : platesSubtotal + materialsSubtotal; // frete nunca entra
  const discountAmount = discountEligible ? round2(discountableBase * (cfg.discountPct / 100)) : 0;

  const totalFull = baseTotal;
  const totalAVista = round2(baseTotal - discountAmount);

  // Payment options
  const paymentOptions: PaymentOption[] = [];
  if (discountEligible) {
    paymentOptions.push({
      id: "pix",
      label: "PIX ou espécie",
      discountPct: cfg.discountPct,
      discountAmount,
      total: totalAVista,
    });
  }
  const maxInst = maxInstallmentsForPlates(plates, cfg);
  if (maxInst >= 2) {
    paymentOptions.push({
      id: "cartao",
      label: "Cartão de crédito",
      installments: maxInst,
      installmentValue: round2(totalFull / maxInst),
      total: totalFull,
    });
  }

  return {
    plates, pricePerPlate, platesSubtotal,
    colaTubos, colaUnitPrice, colaSubtotal, colaAvailable,
    materials, materialsSubtotal, materialsPlan, stockChecks,
    frete,
    baseTotal,
    discount: { eligible: discountEligible, pct: cfg.discountPct, amount: discountAmount, scope: cfg.discountScope },
    totalAVista, totalFull,
    paymentOptions, warnings, config: cfg,
  };
}
