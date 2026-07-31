// ─────────────────────────────────────────────────────────────────────────────
// Materiais de instalação calculados automaticamente.
//
// A regra depende do TIPO DE APLICAÇÃO:
//   parede       → Cola PU-40
//   teto / forro → cola de contato + espuma expansiva  (nunca PU-40)
//
// Tudo aqui é função pura e parametrizada por MaterialsConfig, para o painel
// poder mudar consumo e embalagens sem tocar em nenhum call site — mesma
// disciplina do motor de preços em orcamento-pricing.ts.
//
// Contas em INTEIROS (mililitros, centavos). Volume em float traz erro de
// arredondamento — 0,25 × 11 e 2,6 × 2 não são exatos em ponto flutuante, e uma
// comparação a menos faria o orçamento sair com cola de menos.
// ─────────────────────────────────────────────────────────────────────────────

export type ApplicationType = "parede" | "teto" | "forro";

export const APPLICATION_LABELS: Record<ApplicationType, string> = {
  parede: "Parede",
  teto: "Teto",
  forro: "Forro",
};

/** Uma embalagem de cola de contato disponível para venda. */
export interface AdhesivePackage {
  /** SKU do produto interno correspondente. */
  code: string;
  /** Volume da embalagem em litros (2.6, 14…). */
  liters: number;
  /** Como aparece no orçamento ("2,6 L"). */
  label: string;
}

export interface MaterialsConfig {
  /** Tubos de PU-40 por placa de parede. */
  pu40TubesPerPanel: number;
  /** Litros de cola de contato por placa de teto/forro. */
  adhesiveLitersPerPanel: number;
  /** Tubos de espuma expansiva por placa de teto/forro. */
  foamTubesPerPanel: number;
  /** Embalagens de cola de contato disponíveis. */
  adhesivePackages: AdhesivePackage[];
  /** SKU do tubo de espuma expansiva. */
  foamCode: string;
  /** SKU da Cola PU-40. */
  pu40Code: string;
  /** Tipos de aplicação que disparam o cálculo de PU-40. */
  pu40AppliesTo: ApplicationType[];
  /** Tipos de aplicação que disparam cola de contato + espuma. */
  adhesiveAppliesTo: ApplicationType[];
}

export const DEFAULT_MATERIALS_CONFIG: MaterialsConfig = {
  pu40TubesPerPanel: 1.5,
  adhesiveLitersPerPanel: 0.25,
  foamTubesPerPanel: 0.75,
  adhesivePackages: [
    { code: "ORB-CC26", liters: 2.6, label: "2,6 L" },
    { code: "ORB-CC14", liters: 14, label: "14 L" },
  ],
  foamCode: "ORB-ESP",
  pu40Code: "ORB-PU",
  pu40AppliesTo: ["parede"],
  adhesiveAppliesTo: ["teto", "forro"],
};

/**
 * SKUs internos de instalação — nunca aparecem no catálogo público.
 *
 * Fonte única: o filtro do /api/products lê daqui, então acrescentar uma
 * embalagem nova não deixa um produto interno vazando para o site por
 * esquecimento de atualizar uma segunda lista.
 */
export const SUPPORT_PRODUCT_SKUS = ["ORB-PU", "ORB-CC26", "ORB-CC14", "ORB-ESP"] as const;

const ML = 1000;
/** Litros → mililitros inteiros, para as comparações não dependerem de float. */
function toMl(liters: number): number {
  return Math.round(liters * ML);
}

/** Tubos de PU-40. Fração de tubo não se vende: sempre arredonda para cima. */
export function pu40TubesFor(panels: number, cfg: MaterialsConfig = DEFAULT_MATERIALS_CONFIG): number {
  if (!panels || panels <= 0) return 0;
  return Math.ceil(panels * cfg.pu40TubesPerPanel);
}

/** Tubos de espuma expansiva. Mesma regra de arredondamento. */
export function foamTubesFor(panels: number, cfg: MaterialsConfig = DEFAULT_MATERIALS_CONFIG): number {
  if (!panels || panels <= 0) return 0;
  return Math.ceil(panels * cfg.foamTubesPerPanel);
}

/** Volume TÉCNICO de cola de contato, antes de virar embalagens. */
export function adhesiveLitersFor(panels: number, cfg: MaterialsConfig = DEFAULT_MATERIALS_CONFIG): number {
  if (!panels || panels <= 0) return 0;
  return Math.round(panels * cfg.adhesiveLitersPerPanel * ML) / ML;
}

export interface AdhesivePick {
  code: string;
  label: string;
  liters: number;
  quantity: number;
}

export interface AdhesivePlan {
  /** Litros exigidos pelo cálculo técnico. */
  requiredLiters: number;
  /** Embalagens escolhidas (só as de quantidade > 0). */
  packages: AdhesivePick[];
  /** Litros efetivamente entregues pelas embalagens. */
  suppliedLiters: number;
  /** Sobra — suppliedLiters − requiredLiters. */
  excessLiters: number;
  /** Preço total das embalagens; 0 quando não há preço cadastrado. */
  totalPrice: number;
  /** false quando faltou preço e a escolha caiu no critério de menor sobra. */
  pricesKnown: boolean;
}

/**
 * Escolhe as embalagens de cola de contato.
 *
 * NÃO arredonda placas por rendimento de embalagem: calcula o volume real e
 * compara as combinações válidas. Prioridade, nesta ordem:
 *   1. nunca entregar menos que o necessário;
 *   2. menor preço total;
 *   3. menor sobra (também quando não há preço cadastrado);
 *   4. menos embalagens.
 *
 * `prices` mapeia SKU → preço unitário de venda. Ausente ou zero = sem preço.
 */
export function chooseAdhesivePackages(
  requiredLiters: number,
  packages: AdhesivePackage[],
  prices: Record<string, number> = {},
): AdhesivePlan {
  const empty: AdhesivePlan = {
    requiredLiters: Math.max(0, requiredLiters),
    packages: [], suppliedLiters: 0, excessLiters: 0, totalPrice: 0, pricesKnown: true,
  };
  if (!requiredLiters || requiredLiters <= 0) return empty;

  const usable = packages.filter((p) => p.liters > 0);
  if (usable.length === 0) return empty;

  const requiredMl = toMl(requiredLiters);
  // Só confiamos no critério de preço quando TODAS as embalagens têm preço;
  // com preço parcial a comparação escolheria pelo que falta cadastrar.
  const pricesKnown = usable.every((p) => (prices[p.code] ?? 0) > 0);

  // Teto de busca por embalagem: o suficiente para cobrir tudo sozinha, mais uma
  // — além disso a combinação só cresce em sobra e em preço.
  const limits = usable.map((p) => Math.ceil(requiredMl / toMl(p.liters)) + 1);

  let best: { counts: number[]; suppliedMl: number; price: number; total: number } | null = null;

  const counts = new Array(usable.length).fill(0);
  const walk = (i: number, suppliedMl: number, price: number, total: number) => {
    if (i === usable.length) {
      if (suppliedMl < requiredMl) return; // (1) nunca menos que o necessário
      if (total === 0) return;
      const cand = { counts: [...counts], suppliedMl, price, total };
      if (!best) { best = cand; return; }
      const b = best as { counts: number[]; suppliedMl: number; price: number; total: number };
      if (pricesKnown && cand.price !== b.price) {            // (2) menor preço
        if (cand.price < b.price) best = cand;
        return;
      }
      if (cand.suppliedMl !== b.suppliedMl) {                 // (3) menor sobra
        if (cand.suppliedMl < b.suppliedMl) best = cand;
        return;
      }
      if (cand.total < b.total) best = cand;                  // (4) menos embalagens
      return;
    }
    for (let n = 0; n <= limits[i]; n++) {
      counts[i] = n;
      walk(i + 1, suppliedMl + n * toMl(usable[i].liters), price + n * (prices[usable[i].code] ?? 0), total + n);
    }
    counts[i] = 0;
  };
  walk(0, 0, 0, 0);

  if (!best) return empty;
  const chosen = best as { counts: number[]; suppliedMl: number; price: number; total: number };

  const picks: AdhesivePick[] = usable
    .map((p, i) => ({ code: p.code, label: p.label, liters: p.liters, quantity: chosen.counts[i] }))
    .filter((p) => p.quantity > 0);

  return {
    requiredLiters: Math.round(requiredMl) / ML,
    packages: picks,
    suppliedLiters: chosen.suppliedMl / ML,
    excessLiters: Math.round(chosen.suppliedMl - requiredMl) / ML,
    totalPrice: Math.round(chosen.price * 100) / 100,
    pricesKnown,
  };
}

export interface MaterialLine {
  /** SKU do produto interno. */
  code: string;
  /** Unidade vendável ("tubo", "lata"). */
  unit: string;
  /** Quantidade de unidades inteiras. */
  quantity: number;
  /** Rótulo da embalagem, quando houver ("2,6 L"). */
  packageLabel?: string;
  /** Tipo de aplicação que disparou o cálculo — vai para o orçamento. */
  reason: ApplicationType;
  /**
   * Todos os tipos que contribuíram. Um orçamento com teto E forro soma as duas
   * áreas na mesma embalagem, então a linha nasce de mais de um tipo.
   */
  reasons: ApplicationType[];
  /** Consumo técnico, para a interface administrativa. */
  technical: string;
}

/** Um espaço do orçamento com seu tipo de aplicação. */
export interface SpaceApplication {
  applicationType: ApplicationType;
  panels: number;
}

export function applicationReasonLabel(reasons: ApplicationType[]): string {
  const uniq = [...new Set(reasons)];
  if (uniq.length === 0) return "";
  if (uniq.length === 1) return APPLICATION_LABELS[uniq[0]];
  const labels = uniq.map((r) => APPLICATION_LABELS[r].toLowerCase());
  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
}

export interface MaterialsPlan {
  /** Placas por tipo de aplicação, já somadas. */
  panelsByType: Record<ApplicationType, number>;
  panels: number;
  lines: MaterialLine[];
  /** Placas que caem na regra do PU-40. */
  pu40Panels: number;
  /** Placas que caem na regra de cola + espuma. */
  adhesivePanels: number;
  /** Volume técnico de cola de contato; 0 quando não há teto/forro. */
  adhesiveLiters: number;
  adhesivePlan: AdhesivePlan | null;
  warnings: string[];
}

/**
 * Materiais de instalação para os espaços de um orçamento.
 *
 * As placas são somadas POR REGRA, não por espaço: dois tetos e um forro no
 * mesmo orçamento compartilham as mesmas latas de cola, e otimizar a embalagem
 * espaço a espaço compraria lata sobrando à toa.
 *
 * Devolve SEMPRE o conjunto completo — quem recalcula substitui o plano inteiro,
 * e é isso que impede sobrar material de um tipo que não existe mais.
 */
export function planMaterialsForSpaces(
  spaces: SpaceApplication[],
  prices: Record<string, number> = {},
  cfg: MaterialsConfig = DEFAULT_MATERIALS_CONFIG,
): MaterialsPlan {
  const panelsByType: Record<ApplicationType, number> = { parede: 0, teto: 0, forro: 0 };
  for (const s of spaces ?? []) {
    const n = Math.max(0, Math.floor(s?.panels || 0));
    if (n > 0 && s.applicationType in panelsByType) panelsByType[s.applicationType] += n;
  }

  const pu40Panels = cfg.pu40AppliesTo.reduce((sum, t) => sum + panelsByType[t], 0);
  const adhesivePanels = cfg.adhesiveAppliesTo.reduce((sum, t) => sum + panelsByType[t], 0);
  const adhesiveReasons = cfg.adhesiveAppliesTo.filter((t) => panelsByType[t] > 0);
  const pu40Reasons = cfg.pu40AppliesTo.filter((t) => panelsByType[t] > 0);

  const lines: MaterialLine[] = [];
  const warnings: string[] = [];

  if (pu40Panels > 0) {
    const tubes = pu40TubesFor(pu40Panels, cfg);
    if (tubes > 0) {
      lines.push({
        code: cfg.pu40Code, unit: "tubo", quantity: tubes,
        reason: pu40Reasons[0] ?? "parede", reasons: pu40Reasons,
        technical: `${cfg.pu40TubesPerPanel} tubo(s) por placa × ${pu40Panels} placa(s)`,
      });
    }
  }

  let adhesiveLiters = 0;
  let adhesivePlan: AdhesivePlan | null = null;

  if (adhesivePanels > 0) {
    adhesiveLiters = adhesiveLitersFor(adhesivePanels, cfg);
    adhesivePlan = chooseAdhesivePackages(adhesiveLiters, cfg.adhesivePackages, prices);
    if (adhesivePlan.packages.length === 0) {
      warnings.push("Nenhuma embalagem de cola de contato cadastrada — cola não incluída.");
    } else if (!adhesivePlan.pricesKnown) {
      warnings.push("Embalagem de cola sem preço cadastrado — escolhida pela menor sobra, não pelo menor custo.");
    }
    for (const p of adhesivePlan.packages) {
      lines.push({
        code: p.code, unit: "lata", quantity: p.quantity, packageLabel: p.label,
        reason: adhesiveReasons[0] ?? "teto", reasons: adhesiveReasons,
        technical: `${cfg.adhesiveLitersPerPanel} L por placa × ${adhesivePanels} placa(s) = ${adhesiveLiters} L`,
      });
    }

    const foam = foamTubesFor(adhesivePanels, cfg);
    if (foam > 0) {
      lines.push({
        code: cfg.foamCode, unit: "tubo", quantity: foam,
        reason: adhesiveReasons[0] ?? "teto", reasons: adhesiveReasons,
        technical: `${cfg.foamTubesPerPanel} tubo(s) por placa × ${adhesivePanels} placa(s)`,
      });
    }
  }

  return {
    panelsByType, panels: pu40Panels + adhesivePanels,
    lines, pu40Panels, adhesivePanels, adhesiveLiters, adhesivePlan, warnings,
  };
}

/** Atalho para um tipo só — o caso do orçamento com um único tipo de aplicação. */
export function planMaterials(
  applicationType: ApplicationType,
  panels: number,
  prices: Record<string, number> = {},
  cfg: MaterialsConfig = DEFAULT_MATERIALS_CONFIG,
): MaterialsPlan {
  return planMaterialsForSpaces([{ applicationType, panels }], prices, cfg);
}

export interface StockCheck {
  code: string;
  required: number;
  available: number;
  missing: number;
  sufficient: boolean;
}

/**
 * Confere estoque SEM mexer no cálculo técnico.
 *
 * A quantidade exigida permanece intacta de propósito: faltar material é um
 * aviso para o administrador resolver, nunca motivo para o sistema reduzir
 * silenciosamente o que a obra precisa.
 */
export function checkMaterialStock(
  lines: MaterialLine[],
  stockByCode: Record<string, number>,
): StockCheck[] {
  return lines.map((l) => {
    const available = Math.max(0, Number(stockByCode[l.code] ?? 0));
    const missing = Math.max(0, l.quantity - available);
    return { code: l.code, required: l.quantity, available, missing, sufficient: missing === 0 };
  });
}
