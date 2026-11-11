type ItemUnitSource = {
  unit_label?: unknown;
  panel_h?: unknown;
  panel_w?: unknown;
  product_code?: unknown;
  product_name?: unknown;
};

/** TechStone thickness is pending confirmation; do not inherit the PFB spec. */
export function pedidoItemUnitInfo(item: ItemUnitSource): { short: string; detail: string } {
  const unit = String(item.unit_label ?? "un").trim() || "un";
  const short = unit.charAt(0).toUpperCase() + unit.slice(1);
  const height = Number(item.panel_h);
  const width = Number(item.panel_w);
  if (!/placa/i.test(unit) || !Number.isFinite(height) || !Number.isFinite(width) || height <= 0 || width <= 0) return { short, detail: short };
  const code = String(item.product_code ?? "").trim().match(/^ORB[-\s]*0*(\d+)$/i);
  const sku = code ? Number(code[1]) : null;
  const techStone = /^tech\s*stone\b/i.test(String(item.product_name ?? "").trim()) || (sku !== null && sku >= 24 && sku <= 32);
  const fmt = (value: number) => value.toFixed(2).replace(".", ",");
  return { short, detail: `Placa ${fmt(height)} m × ${fmt(width)} m${techStone ? "" : " × 5 mm"}` };
}
