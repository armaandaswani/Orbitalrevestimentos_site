/** Ambiente belongs to each line; legacy orders retain the order-level value. */
export function cleanItemSpace(value: unknown): string | null {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 120) || null : null;
}

export function groupPedidoItems<T extends { space?: unknown; plates?: unknown; unit_price?: unknown }>(items: T[], legacySpace?: string | null): Array<{ space: string | null; items: T[]; subtotal: number }> {
  const hasItemSpaces = items.some((item) => cleanItemSpace(item.space));
  const groups = new Map<string, { space: string | null; items: T[]; subtotal: number }>();
  for (const item of items) {
    const space = cleanItemSpace(item.space) ?? (hasItemSpaces ? null : cleanItemSpace(legacySpace));
    const key = space?.toLocaleLowerCase("pt-BR") ?? "";
    let group = groups.get(key);
    if (!group) {
      group = { space, items: [], subtotal: 0 };
      groups.set(key, group);
    }
    group.items.push(item);
    group.subtotal += (Number(item.plates) || 0) * (Number(item.unit_price) || 0);
  }
  return [...groups.values()];
}
