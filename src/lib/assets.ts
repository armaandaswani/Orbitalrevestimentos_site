/**
 * Site-asset overrides stored as a JSON manifest in Supabase Storage.
 * Server components call getAssetOverrides() once, then use resolveAsset()
 * per image. Falls back silently to the static /images/… path if no override.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const MANIFEST_PATH = "assets/manifest.json";
export const MANIFEST_PUBLIC_URL = `${SUPABASE_URL}/storage/v1/object/public/site-images/${MANIFEST_PATH}`;

/** Fetch asset overrides with a 60-second revalidation window. */
export async function getAssetOverrides(): Promise<Record<string, string>> {
  if (!SUPABASE_URL) return {};
  try {
    const res = await fetch(MANIFEST_PUBLIC_URL, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    return typeof data === "object" && data !== null ? data : {};
  } catch {
    return {};
  }
}

/** Return the override URL for `key`, or `fallback` if none exists. */
export function resolveAsset(
  key: string,
  fallback: string,
  overrides: Record<string, string>
): string {
  return overrides[key] ?? fallback;
}

/**
 * Manifest of all swappable site images.
 * nativeSize  — actual pixel dimensions of the source file
 * displayInfo — how it renders on the site
 */
export const SITE_ASSET_MANIFEST = [
  {
    key: "pfb-water-0h",
    label: "Teste de Água — 0h (início)",
    section: "Tecnologia · Resistência à Água",
    staticPath: "/images/catalogue/pfb-mdf-0h.png",
    nativeW: 1536,
    nativeH: 2752,
    displayInfo: "Retrato · ~320 × 573 px (desktop) | 1/3 da largura do container",
  },
  {
    key: "pfb-water-24h",
    label: "Teste de Água — 24h",
    section: "Tecnologia · Resistência à Água",
    staticPath: "/images/catalogue/pfb-mdf-24h.png",
    nativeW: 1536,
    nativeH: 2752,
    displayInfo: "Retrato · ~320 × 573 px (desktop) | 1/3 da largura do container",
  },
  {
    key: "pfb-water-48h",
    label: "Teste de Água — 48h (resultado)",
    section: "Tecnologia · Resistência à Água",
    staticPath: "/images/catalogue/pfb-mdf-48h.png",
    nativeW: 1536,
    nativeH: 2752,
    displayInfo: "Retrato · ~320 × 573 px (desktop) | 1/3 da largura do container",
  },
  {
    key: "product-anatomy",
    label: "Anatomia da Placa (seção transversal)",
    section: "Tecnologia · Anatomia",
    staticPath: "/images/catalogue/product-anatomy.png",
    nativeW: 732,
    nativeH: 1638,
    displayInfo: "Retrato · max 220 px altura (mobile) / 620 px (desktop)",
  },
  {
    key: "onde-aplicar-main",
    label: "Foto de Impacto Ambiental",
    section: "Tecnologia · Impacto Ambiental",
    staticPath: "/images/catalogue/onde-aplicar-main.jpeg",
    nativeW: 1674,
    nativeH: 1982,
    displayInfo: "Quadrado/retrato · 50% da largura da tela (desktop)",
  },
  {
    key: "hero-cover",
    label: "Capa Hero (homepage)",
    section: "Homepage · Hero",
    staticPath: "/images/catalogue/hero-cover.png",
    nativeW: 1869,
    nativeH: 1460,
    displayInfo: "Paisagem · fullscreen background cover",
  },
  {
    key: "lavabo-real",
    label: "Foto Lavabo Real",
    section: "Homepage / Produtos",
    staticPath: "/images/catalogue/lavabo-real.jpeg",
    nativeW: 8064,
    nativeH: 6048,
    displayInfo: "Paisagem · usado como destaque de aplicação",
  },
  {
    key: "aplicacao-cozinha",
    label: "Foto Aplicação — Cozinha",
    section: "Produtos · Onde Aplicar",
    staticPath: "/images/catalogue/aplicacao-cozinha.jpeg",
    nativeW: 0,
    nativeH: 0,
    displayInfo: "Quadrado · grid de aplicações",
  },
  {
    key: "aplicacao-sala",
    label: "Foto Aplicação — Sala",
    section: "Produtos · Onde Aplicar",
    staticPath: "/images/catalogue/aplicacao-sala.jpeg",
    nativeW: 0,
    nativeH: 0,
    displayInfo: "Quadrado · grid de aplicações",
  },
] as const;

export type AssetKey = (typeof SITE_ASSET_MANIFEST)[number]["key"];
