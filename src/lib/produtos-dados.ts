import { supabaseAdmin } from "@/lib/supabase";
import { SUPPORT_PRODUCT_SKUS } from "@/lib/orcamento-materials";

/**
 * Leitura (só servidor) do catálogo público: a mesma seleção da API
 * /api/products, sem preço nem custo. A página de Produtos chega pronta do
 * servidor, sem "Carregando…".
 */
export type LinhaProduto = "Classic" | "Brilliance" | "Elegance";

export interface ImagemProduto { id: string; image_path: string; sort_order: number }

export interface Produto {
  id: string;
  code: string;
  name: string;
  linha: LinhaProduto;
  finish: string;
  description: string;
  image_path: string;
  sort_order: number;
  product_images: ImagemProduto[];
  /** Textura plana (painel) que o arquiteto baixa para maquetes; sem ela, a foto. */
  render_texture_path: string | null;
}

type Linha = Record<string, unknown>;

export function paraProduto(r: Linha): Produto {
  const linha = String(r.linha ?? "");
  return {
    id: String(r.id),
    code: String(r.code ?? ""),
    name: String(r.name ?? ""),
    linha: (linha === "Brilliance" || linha === "Elegance" ? linha : "Classic"),
    finish: String(r.finish ?? ""),
    description: String(r.description ?? ""),
    image_path: String(r.image_path ?? ""),
    sort_order: Number(r.sort_order ?? 0) || 0,
    product_images: (Array.isArray(r.product_images) ? r.product_images : []).map((i) => {
      const x = i as Linha;
      return { id: String(x.id), image_path: String(x.image_path ?? ""), sort_order: Number(x.sort_order ?? 0) || 0 };
    }),
    render_texture_path: typeof r.render_texture_path === "string" ? r.render_texture_path : null,
  };
}

/** Todas as fotos de um modelo: capa primeiro, depois a galeria, sem repetir. */
export function fotosDoProduto(p: Produto): string[] {
  const galeria = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.image_path);
  const vistas = new Set<string>();
  return [p.image_path, ...galeria].filter((u) => u && !vistas.has(u) && vistas.add(u));
}

/** Modelos ativos do catálogo, na ordem do painel. Falha de banco vira lista vazia. */
export async function carregarProdutos(): Promise<Produto[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("products")
      .select("*, product_images(id, image_path, sort_order)")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) { console.error("[produtos]", error.message); return []; }
    return ((data ?? []) as Linha[])
      .filter((p) => p.show_in_catalog !== false && !(SUPPORT_PRODUCT_SKUS as readonly string[]).includes(String(p.code)))
      .map(paraProduto)
      .filter((p) => p.image_path.trim() !== "");
  } catch (e) {
    console.error("[produtos]", e instanceof Error ? e.message : e);
    return [];
  }
}
