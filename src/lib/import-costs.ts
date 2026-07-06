// Import landed-cost math — the single source of truth used by BOTH the live
// calculator in ComprasTab and the server-side receive flow, so the preview a
// buyer sees and the cost snapshotted into stock can never disagree.
//
// Mirrors Orbital's import spreadsheet:
//   FOB per line (USD or CNY) → BRL at the PO's FX snapshot
//   Freight (always USD) → BRL
//   ICMS  = icms_rate × (FOB_BRL + freight_BRL)
//   FTI   = fti_rate  × FOB_BRL
//   + armazenagem + despachante + transporte + siscomex/outros (BRL)
//   Grand total distributed across lines by each line's FOB share →
//   landed unit cost (BRL) per product.

export type Currency = "USD" | "CNY" | "BRL";

export interface FxRates {
  usd_brl: number; // BRL per 1 USD
  cny_brl: number; // BRL per 1 CNY (RMB)
}

export interface ImportItemInput {
  qty: number;
  unit_price: number; // in unit_currency
  unit_currency: Currency;
}

export interface ImportCostInput {
  fx: FxRates;
  items: ImportItemInput[];
  freight_usd?: number | null;
  storage_cost?: number | null;   // armazenagem (BRL)
  broker_cost?: number | null;    // despachante (BRL)
  transport_cost?: number | null; // transportadora (BRL)
  other_cost?: number | null;     // siscomex / taxas (BRL)
  icms_rate?: number | null;      // e.g. 0.07
  fti_rate?: number | null;       // e.g. 0.01
}

export interface ImportLineResult {
  fobBRL: number;         // this line's FOB value in BRL
  fobUSD: number;         // same, in USD (for reference)
  landedTotalBRL: number; // this line's share of the grand total
  landedUnitBRL: number;  // per unit — what becomes cost_price
}

export interface ImportCostResult {
  fobTotalBRL: number;
  fobTotalUSD: number;
  freightBRL: number;
  icmsBRL: number;
  ftiBRL: number;
  otherBRL: number; // storage + broker + transport + other
  grandTotalBRL: number;
  lines: ImportLineResult[];
}

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
};

/** Convert an amount in `cur` to BRL using the FX snapshot. */
export function toBRL(amount: number, cur: Currency, fx: FxRates): number {
  if (cur === "BRL") return amount;
  if (cur === "USD") return amount * n(fx.usd_brl);
  return amount * n(fx.cny_brl); // CNY
}

export function computeImportCosts(input: ImportCostInput): ImportCostResult {
  const fx = { usd_brl: n(input.fx.usd_brl), cny_brl: n(input.fx.cny_brl) };
  const usdBRL = fx.usd_brl;

  const perLineFobBRL: number[] = [];
  const perLineFobUSD: number[] = [];
  let fobTotalBRL = 0;
  let fobTotalUSD = 0;

  for (const it of input.items) {
    const qty = n(it.qty);
    const unit = n(it.unit_price);
    const lineBRL = qty * toBRL(unit, it.unit_currency, fx);
    // USD reference: BRL back to USD (0 if no USD rate yet).
    const lineUSD = usdBRL > 0 ? lineBRL / usdBRL : 0;
    perLineFobBRL.push(lineBRL);
    perLineFobUSD.push(lineUSD);
    fobTotalBRL += lineBRL;
    fobTotalUSD += lineUSD;
  }

  const freightBRL = n(input.freight_usd) * usdBRL;
  const icmsBRL = n(input.icms_rate) * (fobTotalBRL + freightBRL);
  const ftiBRL = n(input.fti_rate) * fobTotalBRL;
  const otherBRL = n(input.storage_cost) + n(input.broker_cost) + n(input.transport_cost) + n(input.other_cost);
  const grandTotalBRL = fobTotalBRL + freightBRL + icmsBRL + ftiBRL + otherBRL;

  const lines: ImportLineResult[] = input.items.map((it, i) => {
    const fobBRL = perLineFobBRL[i];
    const share = fobTotalBRL > 0 ? fobBRL / fobTotalBRL : 0;
    const landedTotalBRL = grandTotalBRL * share;
    const qty = n(it.qty);
    return {
      fobBRL,
      fobUSD: perLineFobUSD[i],
      landedTotalBRL,
      landedUnitBRL: qty > 0 ? landedTotalBRL / qty : 0,
    };
  });

  return { fobTotalBRL, fobTotalUSD, freightBRL, icmsBRL, ftiBRL, otherBRL, grandTotalBRL, lines };
}
