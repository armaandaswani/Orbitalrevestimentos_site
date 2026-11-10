/** Importação é uma proposta revisável; nunca define preço nem grava pedidos. */
export type ImportProduct = { id: string; name: string; code?: string | null; sale_unit?: string | null };
export type ImportedQuantity = { product_id: string; quantity: number; space: string };
export type QuantityReview = {
  description: string; code: string; quantity: number | null; unit: string;
  space: string; evidence: string; product_id: string | null; warnings: string[];
};
export const MAX_IMPORT_ROWS = 100;
export const MAX_IMPORT_BYTES = 4 * 1024 * 1024;
export const MAX_IMPORT_TEXT = 60_000;

const clean = (v: unknown, max = 240): string => typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "";
export const normalizeImport = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function parseImportQuantity(v: unknown): number | null {
  // Portuguese decimals accepted; mixed/thousands separators are ambiguous.
  if (typeof v === "string" && !/^\d+(?:[.,]\d+)?$/.test(v.trim())) return null;
  if (typeof v === "string" && /^[1-9]\d{0,2}[.,]\d{3}$/.test(v.trim())) return null;
  if (typeof v !== "string" && typeof v !== "number") return null;
  const n = typeof v === "number" ? v : Number(v.trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= 100_000 ? n : null;
}
export function canonicalImportUnit(value: string): string {
  const unit = normalizeImport(value.replace("²", "2"));
  if (/^(placas?|paineis|painel)$/.test(unit)) return "placa";
  if (/^(tubos?)$/.test(unit)) return "tubo";
  if (/^(un|und|unid|unidades?|pecas?)$/.test(unit)) return "unidade";
  if (/^(m2|metrosquadrados?)$/.test(unit)) return "m2";
  if (/^(m|ml|metro|metros|metrolinear|metroslineares)$/.test(unit)) return "m";
  return unit;
}
export function validImportQuantityForProduct(quantity: unknown, product: ImportProduct): boolean {
  const n = parseImportQuantity(quantity);
  if (n === null) return false;
  return ["m", "m2", "kg", "l"].includes(canonicalImportUnit(product.sale_unit || "placa")) || Number.isInteger(n);
}
export function reviewImportedQuantities(raw: unknown, products: ImportProduct[]): QuantityReview[] {
  if (!Array.isArray(raw) || raw.length > MAX_IMPORT_ROWS) throw new Error("O documento deve ter até 100 itens. Divida o arquivo por ambiente.");
  return raw.filter((r) => r && typeof r === "object" && !Array.isArray(r)).map((row) => {
    const r = row as Record<string, unknown>;
    const description = clean(r.description), code = clean(r.code, 80), space = clean(r.space, 120);
    const quantity = parseImportQuantity(r.quantity), unit = clean(r.unit, 40), evidence = clean(r.evidence, 450);
    const warnings: string[] = [];
    // Only exact, unique code/name matches. Never use an AI-provided product ID.
    const byCode = code ? products.filter((p) => p.code && normalizeImport(p.code) === normalizeImport(code)) : [];
    const byName = description ? products.filter((p) => normalizeImport(p.name) === normalizeImport(description)) : [];
    const candidates = code ? byCode : byName;
    let product = candidates.length === 1 ? candidates[0] : null;
    if (!product) warnings.push("Selecione o produto do catálogo.");
    if (product && unit && canonicalImportUnit(unit) !== canonicalImportUnit(product.sale_unit || "placa")) {
      warnings.push(`Unidade do documento (${unit}) diferente da venda (${product.sale_unit || "placa"}). Confira a conversão.`);
      product = null;
    }
    if (quantity === null) warnings.push("Quantidade ausente, ambígua ou inválida. Preencha após conferir a fonte.");
    if (product && quantity !== null && !validImportQuantityForProduct(quantity, product)) warnings.push("Este produto exige quantidade inteira.");
    if (!space) warnings.push("Informe o ambiente.");
    return { description, code, quantity, unit, space, evidence, product_id: product?.id ?? null, warnings };
  });
}

/** CSV/TSV com cabeçalhos explícitos. Não interpreta linhas livres como medidas. */
export function parseQuantityTable(text: string): Array<Record<string, unknown>> | null {
  const first = text.replace(/^\uFEFF/, "").split(/\r?\n/)[0] || "";
  const delimiter = first.includes("\t") ? "\t" : first.includes(";") ? ";" : ",";
  const cells: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (ch === delimiter && !quoted) { row.push(cell); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); if (row.some((v) => v.trim())) cells.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (quoted) throw new Error("O CSV contém aspas abertas. Confira o arquivo.");
  row.push(cell); if (row.some((v) => v.trim())) cells.push(row);
  const headers = (cells.shift() || []).map(normalizeImport);
  const index = (names: string[]) => headers.findIndex((h) => names.includes(h));
  const qty = index(["quantidade", "qtd", "quantity", "placas"]), desc = index(["produto", "material", "descricao", "description", "product"]), code = index(["codigo", "code", "sku"]);
  if (qty < 0 || (desc < 0 && code < 0)) return null;
  if (cells.length > MAX_IMPORT_ROWS) throw new Error("O arquivo deve ter até 100 itens.");
  const space = index(["ambiente", "space", "local"]), unit = index(["unidade", "unit"]);
  return cells.map((r) => ({ description: r[desc] || "", code: r[code] || "", quantity: r[qty], space: r[space] || "", unit: r[unit] || (headers[qty] === "placas" ? "placa" : ""), evidence: r.join(" | ") }));
}
