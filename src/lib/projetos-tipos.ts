/**
 * Projetos, showrooms e renders — tipos e regras que a página de Projetos, a
 * página de cada showroom e os componentes de src/components/projetos usam.
 * Sem import de servidor: roda no navegador e no servidor.
 */

export interface Projeto {
  id: string;
  slug: string;
  title: string;
  product_code: string;
  /** Migração 067 — modelos além do principal e autoria ("Projeto de …"). */
  extra_product_codes?: string[] | null;
  projeto_de?: string | null;
  categories: string[];
  image_after: string;
  image_before?: string | null;
  note?: string | null;
  short_description?: string | null;
  is_featured?: boolean;
  is_new?: boolean;
  feature_order?: number;
  /** Classificação explícita da capa (migração 051). Ausente → "depois". */
  cover_category?: string | null;
  /** Migração 053 — categoria única + parceiro + recorte da capa. */
  primary_category?: string | null;
  showroom_id?: string | null;
  tags?: string[] | null;
  cover_focus_x?: number | null;
  cover_focus_y?: number | null;
  cover_zoom?: number | null;
}

export interface Showroom {
  id: string;
  slug: string;
  name: string;
  /** Migração 063: showroom parceiro (ambiente decorado) ou ponto de revenda. */
  kind: "showroom" | "revenda";
  created_at?: string | null;
  address: string | null;
  maps_url: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  ambient_count: number;
  display_cover: string | null;
  display_focus_x: number;
  display_focus_y: number;
  display_zoom: number;
}

export interface Render {
  id: string;
  slug: string;
  title: string;
  product_code: string;
  image_path: string;
}

export interface CategoriaProjeto {
  slug: string;
  label: string;
  /** Subtítulo da seção na galeria (migração 052). */
  description?: string | null;
  sort_order: number;
}

/**
 * A qual seção o projeto pertence. primary_category (migração 053) é a
 * resposta certa; o array antigo vale de reserva para registro anterior a ela.
 */
export function secoesDoProjeto(p: Pick<Projeto, "primary_category" | "categories">): string[] {
  const primary = (p.primary_category ?? "").trim();
  if (primary) return [primary];
  return p.categories ?? [];
}

/** Destaques primeiro (na ordem do painel), depois o resto na ordem do banco. */
export function porDestaque(a: Projeto, b: Projeto): number {
  return !!a.is_featured !== !!b.is_featured
    ? (a.is_featured ? -1 : 1)
    : (a.feature_order ?? 0) - (b.feature_order ?? 0);
}

/**
 * O que as APIs públicas de projetos e renders podem devolver. É uma lista do
 * que SAI, não do que fica de fora: coluna nova no banco (ex.: notas internas
 * do painel como needs_review/review_reason) não vaza até alguém incluí-la aqui.
 * O painel lê a linha inteira por ?admin=1, que exige sessão de admin.
 */
export const CAMPOS_PUBLICOS_PROJETO = [
  "id", "slug", "title", "product_code", "extra_product_codes", "projeto_de",
  "categories", "primary_category", "tags", "image_after", "image_before",
  "cover_category", "cover_focus_x", "cover_focus_y", "cover_zoom",
  "short_description", "note", "is_featured", "is_new", "feature_order",
  "show_on_home", "showroom_id", "content_type", "sort_order",
] as const;
export const CAMPOS_PUBLICOS_RENDER = ["id", "slug", "title", "product_code", "image_path"] as const;

/** Só os campos da lista; os que a linha não tem (migração pendente) ficam de fora. */
export function soCampos<T extends string>(linha: Record<string, unknown>, campos: readonly T[]): Partial<Record<T, unknown>> {
  const out: Partial<Record<T, unknown>> = {};
  for (const c of campos) if (c in linha) out[c] = linha[c];
  return out;
}

/**
 * Obras entregues, informado pelo dono (out/2026). É o total de obras da
 * Orbital; as que têm fotos publicadas no site são só uma parte delas.
 */
export const OBRAS_ENTREGUES = "50+";

/** Slug da categoria que agrupa os showrooms parceiros. */
export const CATEGORIA_SHOWROOM = "showroom";

// Rótulo e subtítulo das categorias originais, para o site não empobrecer
// enquanto o banco não tiver o texto. O que estiver preenchido no banco vence.
const TEXTO_CATEGORIA: Record<string, { label: string; description: string }> = {
  residencial: { label: "Residencial", description: "Ambientes residenciais revestidos sem obra" },
  comercial: { label: "Comercial", description: "Restaurantes, escritórios e espaços de uso coletivo" },
  umido: { label: "Áreas Úmidas", description: "Lavabos, banheiros e cozinhas, sem inchar e sem mofar" },
  showroom: { label: "Showroom", description: "Ambientes em exposição: visite e veja de perto" },
  nautico: { label: "Náutico", description: "Revestimento homologado para embarcações" },
};

/** Ordem das categorias do banco; o mapa acima só preenche o que faltar. */
export function ordenarCategorias(cats: CategoriaProjeto[]): CategoriaProjeto[] {
  const rows = cats.length > 0
    ? cats
    : Object.entries(TEXTO_CATEGORIA).map(([slug, t], i) => ({ slug, label: t.label, description: t.description, sort_order: i }));
  return rows
    .map((c) => {
      const seed = TEXTO_CATEGORIA[c.slug];
      if (!seed) return c;
      // Rótulo do banco vence, exceto quando ainda é o slug cru do seed automático.
      const label = c.label && c.label.toLowerCase() !== c.slug.toLowerCase() ? c.label : seed.label;
      return { ...c, label, description: c.description || seed.description };
    })
    // Empate em sort_order não pode deixar a ordem variando: o slug desempata.
    .sort((a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug));
}

/** Rótulo das características (tags) que viram o filtro "Tipo". */
const TEXTO_TAG: Record<string, string> = {
  umido: "Áreas úmidas",
  cozinha: "Cozinha",
  parede: "Parede",
  teto: "Teto",
};
export const rotuloTag = (slug: string) =>
  TEXTO_TAG[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");

/** "Novo" nos 120 dias depois do cadastro. */
export function lugarNovo(createdAt?: string | null, agora = Date.now()): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  return Number.isFinite(t) && agora - t < 120 * 24 * 60 * 60 * 1000;
}

/** Link "Como chegar": o do painel, ou uma busca no Google Maps pelo nome + endereço. */
export function linkComoChegar(s: Pick<Showroom, "maps_url" | "name" | "address">): string {
  if (s.maps_url) return s.maps_url;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address ?? ""} Manaus AM`.trim())}`;
}

/** "1 ambiente" / "4 ambientes" */
export const contaAmbientes = (n: number) => `${n} ${n === 1 ? "ambiente" : "ambientes"}`;

/**
 * Ponto de revenda que aparece enquanto a migração 063 não rodou (sem a coluna
 * "kind", nenhum lugar vem como revenda). Com um ponto ativo no banco, sai.
 */
export const REVENDA_RESERVA: Showroom[] = [
  {
    id: "revenda-casa-do-eletricista", slug: "casa-do-eletricista-centro", name: "Casa do Eletricista — Centro", kind: "revenda",
    address: null, maps_url: null, description: "Todos os modelos do Painel Flexível Fibra de Bambu em display, no tamanho real.",
    logo_url: null, cover_url: null, ambient_count: 0, display_cover: null, display_focus_x: 0.5, display_focus_y: 0.5, display_zoom: 1,
  },
];

/** Renders de IA fixos — base que os do banco completam (o banco vence por slug). */
export const RENDERS_FIXOS: Render[] = [
  { id: "s1", slug: "orb001-consultorio-odonto", title: "Consultório Odontológico", product_code: "ORB-001", image_path: "/images/renders/orb001-consultorio-odonto.png" },
  { id: "s2", slug: "orb001-sala", title: "Sala de Estar", product_code: "ORB-001", image_path: "/images/renders/orb001-sala.png" },
  { id: "s3", slug: "orb002-mesa-estudos", title: "Mesa de Estudos", product_code: "ORB-002", image_path: "/images/renders/orb002-mesa-estudos.jpg" },
  { id: "s4", slug: "orb002-restaurante", title: "Restaurante", product_code: "ORB-002", image_path: "/images/renders/orb002-restaurante.png" },
  { id: "s5", slug: "orb003-restaurante", title: "Restaurante", product_code: "ORB-003", image_path: "/images/renders/orb003-restaurante.png" },
  { id: "s6", slug: "orb003-sala-conf", title: "Sala de Conferências", product_code: "ORB-003", image_path: "/images/renders/orb003-sala-conf.png" },
  { id: "s7", slug: "orb004-comercio-teto", title: "Comércio", product_code: "ORB-004", image_path: "/images/renders/orb004-comercio-teto.png" },
  { id: "s8", slug: "orb005-consultorio-oftalmo", title: "Consultório Oftalmológico", product_code: "ORB-005", image_path: "/images/renders/orb005-consultorio-oftalmo.png" },
  { id: "s9", slug: "orb006-banheiro", title: "Banheiro", product_code: "ORB-006", image_path: "/images/renders/orb006-banheiro.png" },
  { id: "s10", slug: "orb007-banheiro", title: "Banheiro", product_code: "ORB-007", image_path: "/images/renders/orb007-banheiro.png" },
  { id: "s11", slug: "orb007-pediatria", title: "Clínica Pediátrica", product_code: "ORB-007", image_path: "/images/renders/orb007-pediatria.png" },
  { id: "s12", slug: "orb008-sala", title: "Sala de Estar", product_code: "ORB-008", image_path: "/images/renders/orb008-sala.png" },
  { id: "s13", slug: "orb009-banheiro", title: "Banheiro", product_code: "ORB-009", image_path: "/images/renders/orb009-banheiro.png" },
  { id: "s14", slug: "orb012-cozinha", title: "Cozinha", product_code: "ORB-012", image_path: "/images/renders/orb012-cozinha.png" },
  { id: "s15", slug: "orb012-sala", title: "Sala de Estar", product_code: "ORB-012", image_path: "/images/renders/orb012-sala.png" },
  { id: "s16", slug: "orb013-quarto", title: "Quarto", product_code: "ORB-013", image_path: "/images/renders/orb013-quarto.png" },
  { id: "s17", slug: "orb013-restaurante", title: "Restaurante", product_code: "ORB-013", image_path: "/images/renders/orb013-restaurante.png" },
  { id: "s18", slug: "orb014-escritorio", title: "Escritório", product_code: "ORB-014", image_path: "/images/renders/orb014-escritorio.png" },
  { id: "s19", slug: "orb015-banheiro", title: "Banheiro", product_code: "ORB-015", image_path: "/images/renders/orb015-banheiro.png" },
];

/** Renders do banco + os fixos que o banco não substituiu (por slug). */
export function juntarRenders(doBanco: Render[]): Render[] {
  const slugs = new Set(doBanco.map((r) => r.slug));
  return [...doBanco, ...RENDERS_FIXOS.filter((r) => !slugs.has(r.slug))];
}
