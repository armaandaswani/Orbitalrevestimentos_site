/** Month-level delivery forecasts are snapshots, never promises of an exact day. */
export function cleanExpectedDeliveryMonth(value: unknown): string | null {
  return typeof value === "string" && /^20\d{2}-(0[1-9]|1[0-2])$/.test(value.trim()) ? value.trim() : null;
}

export function expectedDeliveryLabel(value: unknown): string | null {
  const month = cleanExpectedDeliveryMonth(value);
  if (!month) return null;
  const date = new Date(`${month}-15T12:00:00Z`);
  return `Entrega prevista: ${new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date)}`;
}

/** An existing order keeps its forecast even when the catalog is later edited. */
export function snapshotDeliveryMonth(input: unknown, previous: unknown, product: unknown): string | null {
  return cleanExpectedDeliveryMonth(input) ?? cleanExpectedDeliveryMonth(previous) ?? cleanExpectedDeliveryMonth(product);
}
