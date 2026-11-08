import { SUPPORT_PRODUCT_SKUS } from "@/lib/orcamento-materials";

/**
 * Filtro do catálogo público: some o que é produto de suporte (cola, espuma) ou
 * está marcado para não aparecer. É o mesmo da API /api/products.
 */
export function visivelNoCatalogo(p: Record<string, unknown>): boolean {
  return p.show_in_catalog !== false && !(SUPPORT_PRODUCT_SKUS as readonly string[]).includes(String(p.code));
}
