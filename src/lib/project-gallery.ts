// Fonte única da lógica de galeria de projetos (capa + mídias adicionais).
//
// Regra do produto, decidida após o bug em que a capa do "Hall de Entrada"
// aparecia etiquetada como ANTES no site:
//   • A capa SEMPRE tem classificação explícita (padrão "depois").
//   • Nada sem classificação entra em "antes" — ausência vira "geral" (neutro),
//     que só aparece no filtro "Todas".
//   • A mesma URL nunca aparece duas vezes na galeria.
//
// Puro (sem I/O) de propósito: a página pública e o script de verificação
// exercitam exatamente este código.

export type MediaCategory = "antes" | "depois" | "geral";

export interface GalleryProject {
  slug: string;
  title: string;
  image_after: string;
  image_before?: string | null;
  /** Classificação explícita da capa (migração 051). Ausente → "depois". */
  cover_category?: string | null;
}

export interface GalleryMediaRow {
  id: string;
  project_slug: string;
  type: "image" | "video";
  url: string;
  caption?: string | null;
  description?: string | null;
  category?: string | null;
  is_cover?: boolean | null;
  sort_order?: number | null;
}

export interface GalleryItem {
  kind: "image" | "video";
  url: string;
  label?: string;
  description?: string;
  category: MediaCategory;
  isCover: boolean;
}

/** Normaliza qualquer valor legado ('A', 'D', 'before', 'after', null, '') para
 *  o vocabulário canônico. Valor desconhecido NUNCA vira "antes". */
export function normalizeCategory(value: unknown): MediaCategory {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "antes" || v === "a" || v === "before") return "antes";
  if (v === "depois" || v === "d" || v === "after") return "depois";
  return "geral";
}

/** Classificação da capa. Só "antes" quando explicitamente marcado assim. */
export function coverCategory(project: Pick<GalleryProject, "cover_category">): MediaCategory {
  const c = normalizeCategory(project.cover_category);
  return c === "antes" ? "antes" : "depois";
}

/** Chave de deduplicação — ignora query string e diferenças de caixa no host. */
function urlKey(url: string): string {
  return String(url ?? "").trim().split("?")[0].toLowerCase();
}

/**
 * Monta a galeria completa de um projeto: capa primeiro, depois a imagem
 * "antes" legada (quando for outro arquivo) e por fim as mídias adicionais na
 * ordem definida no painel. Sem duplicatas.
 *
 * As mídias já podem trazer a capa (migração 051 grava is_cover); por isso a
 * deduplicação por URL é obrigatória e não apenas defensiva.
 */
export function buildGalleryItems(project: GalleryProject, media: GalleryMediaRow[]): GalleryItem[] {
  const items: GalleryItem[] = [];
  const seen = new Set<string>();

  const push = (item: GalleryItem) => {
    const key = urlKey(item.url);
    if (!item.url || seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  if (project.image_after) {
    const cat = coverCategory(project);
    push({
      kind: "image",
      url: project.image_after,
      label: cat === "antes" ? "Antes" : "Depois",
      category: cat,
      isCover: true,
    });
  }

  // Campo legado: só entra se for mesmo um arquivo diferente da capa.
  if (project.image_before) {
    push({ kind: "image", url: project.image_before, label: "Antes", category: "antes", isCover: false });
  }

  const ordered = [...media].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  for (const m of ordered) {
    push({
      kind: m.type === "video" ? "video" : "image",
      url: m.url,
      label: m.caption ?? undefined,
      description: m.description ?? undefined,
      category: normalizeCategory(m.category),
      isCover: m.is_cover === true,
    });
  }

  return items;
}

export type GalleryFilter = "all" | MediaCategory | "video";

/** Filtro da galeria pública. "antes"/"depois" exigem classificação explícita. */
export function filterGalleryItems(items: GalleryItem[], filter: GalleryFilter): GalleryItem[] {
  if (filter === "all") return items;
  if (filter === "video") return items.filter((i) => i.kind === "video");
  return items.filter((i) => i.category === filter);
}
