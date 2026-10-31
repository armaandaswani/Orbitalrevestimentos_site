import { supabaseAdmin } from "@/lib/supabase";
import { isMissingColumn, isMissingTable } from "@/lib/db-compat";
import {
  juntarRenders,
  type CategoriaProjeto, type Projeto, type Render, type Showroom,
} from "@/lib/projetos-tipos";

/**
 * Leitura (só servidor) dos dados das páginas de Projetos e de cada showroom.
 *
 * As páginas recebem tudo já no HTML, em vez de buscar quatro APIs depois que o
 * JavaScript carrega. Só sai daqui o que o visitante vê: campos internos do
 * painel (needs_review, review_reason…) ficam no servidor.
 */

type Linha = Record<string, unknown>;
type Db = ReturnType<typeof supabaseAdmin>;

const txt = (v: unknown) => (typeof v === "string" ? v : v == null ? null : String(v));
const num = (v: unknown, padrao: number) => (v == null || v === "" || !Number.isFinite(Number(v)) ? padrao : Number(v));
const lista = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);

function paraProjeto(r: Linha): Projeto {
  return {
    id: String(r.id),
    slug: String(r.slug ?? ""),
    title: String(r.title ?? ""),
    product_code: String(r.product_code ?? ""),
    extra_product_codes: lista(r.extra_product_codes),
    projeto_de: txt(r.projeto_de),
    categories: lista(r.categories),
    image_after: String(r.image_after ?? ""),
    image_before: txt(r.image_before),
    note: txt(r.note),
    short_description: txt(r.short_description),
    is_featured: !!r.is_featured,
    is_new: !!r.is_new,
    feature_order: num(r.feature_order, 0),
    cover_category: txt(r.cover_category),
    primary_category: txt(r.primary_category),
    showroom_id: r.showroom_id ? String(r.showroom_id) : null,
    tags: lista(r.tags),
    cover_focus_x: r.cover_focus_x == null ? null : num(r.cover_focus_x, 0.5),
    cover_focus_y: r.cover_focus_y == null ? null : num(r.cover_focus_y, 0.5),
    cover_zoom: r.cover_zoom == null ? null : num(r.cover_zoom, 1),
  };
}

/** Projetos publicados, na ordem do painel. */
export async function lerProjetos(db: Db = supabaseAdmin()): Promise<Projeto[]> {
  const { data, error } = await db.from("project_photos").select("*").eq("is_active", true).order("sort_order", { ascending: true });
  if (error) {
    console.error("[projetos]", error.message);
    return [];
  }
  return ((data ?? []) as Linha[]).map(paraProjeto).filter((p) => p.image_after.trim() !== "");
}

/**
 * Showrooms e pontos de revenda ativos, cada um com a contagem de ambientes
 * publicados e, sem capa própria, a capa de um dos ambientes. É a mesma conta
 * da API pública /api/project-showrooms.
 */
export function montarShowrooms(linhas: Linha[], projetos: Pick<Projeto, "showroom_id" | "image_after" | "cover_focus_x" | "cover_focus_y" | "cover_zoom">[]): Showroom[] {
  const porShowroom = new Map<string, typeof projetos>();
  for (const p of projetos) {
    if (!p.showroom_id) continue;
    if (!porShowroom.has(p.showroom_id)) porShowroom.set(p.showroom_id, []);
    porShowroom.get(p.showroom_id)!.push(p);
  }
  return linhas.map((r) => {
    const meus = porShowroom.get(String(r.id)) ?? [];
    const comCapa = meus.find((m) => String(m.image_after ?? "").trim() !== "");
    const capaPropria = txt(r.cover_url);
    return {
      id: String(r.id),
      slug: String(r.slug ?? ""),
      name: String(r.name ?? ""),
      kind: r.kind === "revenda" ? "revenda" : "showroom",
      created_at: txt(r.created_at),
      address: txt(r.address),
      maps_url: txt(r.maps_url),
      description: txt(r.description),
      logo_url: txt(r.logo_url),
      cover_url: capaPropria,
      ambient_count: meus.length,
      // Capa própria do parceiro; sem ela, a capa de um ambiente serve de vitrine.
      display_cover: capaPropria || comCapa?.image_after || null,
      display_focus_x: capaPropria ? 0.5 : num(comCapa?.cover_focus_x, 0.5),
      display_focus_y: capaPropria ? 0.5 : num(comCapa?.cover_focus_y, 0.5),
      display_zoom: capaPropria ? 1 : num(comCapa?.cover_zoom, 1),
    };
  });
}

const COLS_SHOWROOM = "id, slug, name, address, maps_url, description, logo_url, cover_url, sort_order, created_at";

/** Linhas cruas de partner_showrooms ativos. "kind" só existe após a migração 063. */
export async function lerLinhasShowrooms(db: Db = supabaseAdmin()): Promise<{ linhas: Linha[]; erro: string | null }> {
  const consulta = (cols: string) => db.from("partner_showrooms").select(cols).eq("active", true).order("sort_order", { ascending: true });
  let { data, error } = await consulta(`${COLS_SHOWROOM}, kind`);
  if (error && /kind/i.test(error.message)) ({ data, error } = await consulta(COLS_SHOWROOM));
  if (error) return { linhas: [], erro: isMissingTable(error) ? null : error.message };
  return { linhas: (data ?? []) as unknown as Linha[], erro: null };
}

async function lerCategorias(db: Db): Promise<CategoriaProjeto[]> {
  const consulta = (cols: string) => db.from("project_categories").select(cols).eq("active", true).order("sort_order", { ascending: true });
  let { data, error } = await consulta("slug, label, sort_order, description");
  // "description" só existe a partir da migração 052.
  if (isMissingColumn(error)) ({ data, error } = await consulta("slug, label, sort_order"));
  if (error) return [];
  return ((data ?? []) as unknown as Linha[]).map((c) => ({
    slug: String(c.slug), label: String(c.label ?? c.slug), description: txt(c.description), sort_order: num(c.sort_order, 0),
  }));
}

async function lerRenders(db: Db): Promise<Render[]> {
  const { data, error } = await db.from("project_renders").select("id, slug, title, product_code, image_path").eq("is_active", true).order("sort_order", { ascending: true });
  if (error) return [];
  return ((data ?? []) as Linha[]).map((r) => ({
    id: String(r.id), slug: String(r.slug ?? ""), title: String(r.title ?? ""), product_code: String(r.product_code ?? ""), image_path: String(r.image_path ?? ""),
  })).filter((r) => r.image_path);
}

export interface DadosProjetos {
  projetos: Projeto[];
  categorias: CategoriaProjeto[];
  lugares: Showroom[];
  renders: Render[];
}

/** Tudo o que a página /projetos mostra. Falha de banco vira lista vazia, nunca erro. */
export async function carregarProjetos(): Promise<DadosProjetos> {
  try {
    const db = supabaseAdmin();
    const [projetos, categorias, showrooms, renders] = await Promise.all([lerProjetos(db), lerCategorias(db), lerLinhasShowrooms(db), lerRenders(db)]);
    return { projetos, categorias, lugares: montarShowrooms(showrooms.linhas, projetos), renders: juntarRenders(renders) };
  } catch (e) {
    console.error("[projetos]", e instanceof Error ? e.message : e);
    return { projetos: [], categorias: [], lugares: [], renders: juntarRenders([]) };
  }
}

/** Um showroom (ou ponto de revenda) pelo slug, com os ambientes dele. */
export async function carregarShowroom(slug: string): Promise<{ lugar: Showroom; ambientes: Projeto[] } | null> {
  try {
    const db = supabaseAdmin();
    const [{ linhas }, projetos] = await Promise.all([lerLinhasShowrooms(db), lerProjetos(db)]);
    const lugar = montarShowrooms(linhas, projetos).find((s) => s.slug === slug);
    if (!lugar) return null;
    return { lugar, ambientes: projetos.filter((p) => p.showroom_id === lugar.id) };
  } catch (e) {
    console.error("[showroom]", e instanceof Error ? e.message : e);
    return null;
  }
}
