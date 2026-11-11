/** Empty fields remain unknown; they are never converted to a free product. */
export function nullableProductNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
export function productPricePerM2(price: number | null, width: number | null, height: number | null): number | null {
  if (price === null || !Number.isFinite(price) || price < 0 || !width || !height || width <= 0 || height <= 0 || !Number.isFinite(width * height)) return null;
  return Math.round((price / (width * height)) * 100) / 100;
}
type ProductPricingFields = {
  linha: string; finish: string; price: number | null; price_per_m2: number | null;
  render_panel_width_m: number | null; render_panel_height_m: number | null;
};
export function changeProductLine<T extends ProductPricingFields>(form: T, linha: string, editing: boolean): T {
  // A line change on an existing product must not silently replace its pricing,
  // finish or measured dimensions with defaults from another product family.
  if (editing) return { ...form, linha };
  const defaults: Record<string, { price: number; finish: string }> = {
    Classic: { price: 559, finish: "Fosco" }, Brilliance: { price: 589, finish: "Polido" }, Elegance: { price: 649, finish: "Texturizado" },
  };
  const standard = defaults[linha];
  if (standard) return { ...form, linha, ...standard, render_panel_width_m: 1.2, render_panel_height_m: 2.9, price_per_m2: Math.round(standard.price / 3.48) };
  return { ...form, linha, finish: "", price: null, price_per_m2: null,
    render_panel_width_m: linha === "Carbon" ? 1.22 : null,
    render_panel_height_m: linha === "Carbon" ? 2.8 : null };
}
