/** A provision plan is read-only. Its insert allowlist cannot change existing stock/prices. */
export type ArrivalCatalogEntry = {
  number: number; code: string; supplier_item: string; name: string; linha: string;
  kind: "carbon" | "techstone" | "profile"; sale_unit: string; planned_quantity: number;
  width_m?: number; height_m?: number; length_m?: number;
  image_path: string | null; texture_download_path: string | null;
  supplier_code: string | null; supplier_code_candidates: string[];
  planned_variants?: Record<string, number>; pending: string[];
};
export type ArrivalCatalogManifest = { version: number; expected_delivery_month: string; entries: ArrivalCatalogEntry[]; global_pending: string[] };
export type ExistingCatalogProduct = { id: string; code: string | null; name: string; [key: string]: unknown };

export function normalizedCatalogCode(value: string): string {
  const code = value.trim().toUpperCase();
  const numeric = code.match(/^ORB-?0*(\d+)$/);
  return numeric ? `ORB-${numeric[1].padStart(3, "0")}` : code;
}
export function validateArrivalManifest(value: unknown): asserts value is ArrivalCatalogManifest {
  const m = value as ArrivalCatalogManifest;
  if (!m || m.version !== 1 || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(m.expected_delivery_month) || !Array.isArray(m.entries) || m.entries.length !== 17) throw Error("Manifesto de chegada inválido.");
  const codes = new Set<string>();
  for (const entry of m.entries) {
    if (!entry || !Number.isInteger(entry.number) || entry.number < 20 || entry.number > 36 || entry.code !== `ORB-${String(entry.number).padStart(3, "0")}` || codes.has(entry.code)) throw Error("SKU duplicado ou inválido no manifesto.");
    codes.add(entry.code);
    if (!entry.name || !["carbon", "techstone", "profile"].includes(entry.kind) || !entry.linha || !["placa", "barra"].includes(entry.sale_unit) || !Number.isInteger(entry.planned_quantity) || entry.planned_quantity < 0) throw Error(`Dados inválidos: ${entry.code}.`);
    for (const path of [entry.image_path, entry.texture_download_path]) if (path !== null && (typeof path !== "string" || !/^\/images\/[a-z0-9/_\-.]+$/.test(path) || path.includes(".."))) throw Error(`Caminho de imagem inválido: ${entry.code}.`);
    if (entry.kind !== "profile" && (![entry.width_m, entry.height_m].every((n) => typeof n === "number" && Number.isFinite(n) && n > 0 && n < 10))) throw Error(`Dimensões inválidas: ${entry.code}.`);
    if (entry.planned_variants && Object.values(entry.planned_variants).reduce((sum, n) => sum + n, 0) !== entry.planned_quantity) throw Error(`Cores não fecham o quantitativo: ${entry.code}.`);
  }
}
export function catalogInsert(entry: ArrivalCatalogEntry, month: string): Record<string, unknown> {
  // Supplier references, uncertain thickness and incoming quantities remain in the manifest.
  // No guessed price, cost, finish, tax rate or physical stock is provisioned.
  const description = entry.kind === "carbon"
    ? "Painel Flexível em Fibra de Bambu, linha Carbon. Produto em chegada."
    : entry.kind === "techstone" ? "TechStone, pedra flexível. Produto em chegada."
      : `Perfil de acabamento em alumínio ${entry.name.match(/alumínio ([TLMW])/)?.[1] || ""}, com 3 m de comprimento. Produto em chegada.`;
  return {
    code: entry.code, name: entry.name, linha: entry.linha, sale_unit: entry.sale_unit, finish: "",
    description, price: null, price_per_m2: null, cost_price: null,
    image_path: entry.image_path || "", render_texture_path: entry.texture_download_path,
    is_active: true, show_in_catalog: false, sort_order: entry.number,
    stock_on_hand: 0, stock_reserved: 0, reorder_point: 0,
    expected_delivery_month: month,
    ...(entry.kind !== "profile" ? { render_panel_width_m: entry.width_m, render_panel_height_m: entry.height_m } : {}),
  };
}
export function buildArrivalCatalogPlan(manifest: ArrivalCatalogManifest, current: ExistingCatalogProduct[]) {
  validateArrivalManifest(manifest);
  const inserts: Record<string, unknown>[] = [], existing: Array<{ code: string; stored_code: string; id: string; name: string; differences: string[] }> = [], conflicts: string[] = [];
  for (const entry of manifest.entries) {
    const matches = current.filter((p) => p.code && normalizedCatalogCode(p.code) === entry.code);
    if (matches.length > 1) { conflicts.push(`Mais de um produto representa ${entry.code}. Revise os aliases antes de continuar.`); continue; }
    if (matches.length === 1) {
      const row = matches[0];
      const differences = [row.name !== entry.name ? "nome diferente" : "", row.expected_delivery_month !== manifest.expected_delivery_month ? "previsão diferente ou ausente" : ""].filter(Boolean);
      existing.push({ code: entry.code, stored_code: row.code!, id: row.id, name: row.name, differences });
      continue; // Never reset existing images, prices, stock, dates, names or IDs.
    }
    inserts.push(catalogInsert(entry, manifest.expected_delivery_month));
  }
  return { inserts, existing, conflicts };
}
