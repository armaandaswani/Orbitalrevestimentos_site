import { supabaseAdmin } from "@/lib/supabase";
import { SUPPORT_PRODUCT_SKUS } from "@/lib/orcamento-materials";
import { agruparPorLinha, type ModeloVitrine } from "@/lib/pfb-modelos-puro";

export type { ModeloVitrine };

/**
 * Filtro do catálogo público: some o que é produto de suporte (cola, espuma) ou
 * está marcado para não aparecer. É o mesmo da API /api/products.
 */
export function visivelNoCatalogo(p: Record<string, unknown>): boolean {
  return p.show_in_catalog !== false && !(SUPPORT_PRODUCT_SKUS as readonly string[]).includes(String(p.code));
}

/**
 * Os modelos da vitrine, agrupados por linha (Classic, Brilliance, Elegance),
 * `porLinha` de cada. Falha de banco vira as três listas vazias, nunca erro.
 */
export async function lerModelosPorLinha(porLinha = 2): Promise<Record<"Classic" | "Brilliance" | "Elegance", ModeloVitrine[]>> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("[pfb-modelos]", error.message);
      return agruparPorLinha([], porLinha);
    }
    const modelos = ((data ?? []) as Array<Record<string, unknown>>)
      .filter(visivelNoCatalogo)
      // Testa o valor cru: String(null) daria "null" e viraria uma imagem quebrada;
      // texto vazio ou só com espaços também sai.
      .filter((p) => p.image_path != null && !(typeof p.image_path === "string" && p.image_path.trim() === ""))
      .map((p) => ({ code: String(p.code), name: String(p.name), linha: String(p.linha), image_path: String(p.image_path) }));
    return agruparPorLinha(modelos, porLinha);
  } catch (e) {
    console.error("[pfb-modelos]", e instanceof Error ? e.message : e);
    return agruparPorLinha([], porLinha);
  }
}
