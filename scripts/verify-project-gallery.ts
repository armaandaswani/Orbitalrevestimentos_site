/**
 * Verificação da lógica de galeria de projetos (capa + antes/depois).
 *
 *   node scripts/verify-project-gallery.ts            → cenários sintéticos
 *   node scripts/verify-project-gallery.ts --live     → + dados reais do Supabase
 *
 * Não há framework de teste no repositório; este script é executável direto
 * pelo Node (type stripping nativo) e cobre os cenários exigidos na auditoria.
 */
import {
  buildGalleryItems,
  filterGalleryItems,
  normalizeCategory,
  type GalleryMediaRow,
  type GalleryProject,
} from "../src/lib/project-gallery.ts";

let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

function media(rows: Partial<GalleryMediaRow>[]): GalleryMediaRow[] {
  return rows.map((r, i) => ({
    id: r.id ?? `m${i}`,
    project_slug: r.project_slug ?? "p",
    type: r.type ?? "image",
    url: r.url ?? `u${i}`,
    category: r.category ?? "geral",
    sort_order: r.sort_order ?? i,
    is_cover: r.is_cover ?? false,
    caption: r.caption ?? null,
    description: r.description ?? null,
  }));
}

const proj = (over: Partial<GalleryProject> = {}): GalleryProject => ({
  slug: "p", title: "P", image_after: "capa.jpg", image_before: null, cover_category: "depois", ...over,
});

console.log("\n── Normalização de valores legados ──");
for (const [input, expected] of [
  ["antes", "antes"], ["A", "antes"], ["before", "antes"], ["ANTES", "antes"],
  ["depois", "depois"], ["D", "depois"], ["after", "depois"],
  [null, "geral"], ["", "geral"], ["geral", "geral"], ["lixo", "geral"], [undefined, "geral"],
] as [unknown, string][]) {
  check(`${JSON.stringify(input)} → ${expected}`, normalizeCategory(input) === expected, `veio ${normalizeCategory(input)}`);
}

console.log("\n── 1. Capa nova é 'depois' por padrão ──");
{
  const items = buildGalleryItems(proj({ cover_category: null }), []);
  check("capa sem classificação vira Depois", items[0].category === "depois", items[0].category);
  check("capa nunca cai no filtro Antes", filterGalleryItems(items, "antes").length === 0);
}

console.log("\n── 2. Regressão do 'Hall de Entrada': image_before === capa ──");
{
  const items = buildGalleryItems(
    proj({ image_before: "capa.jpg" }),
    media([{ url: "parede1.jpg", category: "antes" }, { url: "parede2.jpg", category: "antes" }]),
  );
  check("capa aparece uma única vez", items.filter((i) => i.url === "capa.jpg").length === 1);
  check("capa está em Depois", filterGalleryItems(items, "depois").some((i) => i.url === "capa.jpg"));
  check("capa NÃO está em Antes", !filterGalleryItems(items, "antes").some((i) => i.url === "capa.jpg"));
  check("filtro Antes tem só as 2 fotos reais", filterGalleryItems(items, "antes").length === 2,
    String(filterGalleryItems(items, "antes").length));
}

console.log("\n── 3. Capa também gravada como mídia (migração 051) ──");
{
  const items = buildGalleryItems(
    proj(),
    media([{ url: "capa.jpg", category: "depois", is_cover: true, sort_order: -1000 }, { url: "x.jpg", category: "depois" }]),
  );
  check("sem duplicata da capa", items.filter((i) => i.url === "capa.jpg").length === 1);
  check("total de itens = 2", items.length === 2, String(items.length));
  check("capa é a primeira", items[0].url === "capa.jpg" && items[0].isCover);
}

console.log("\n── 4. Mídia sem classificação não entra em Antes nem Depois ──");
{
  const items = buildGalleryItems(proj(), media([{ url: "n1.jpg", category: null }, { url: "n2.jpg", category: "" }]));
  check("filtro Antes vazio", filterGalleryItems(items, "antes").length === 0);
  check("filtro Depois tem só a capa", filterGalleryItems(items, "depois").length === 1);
  check("filtro Todas tem os 3", filterGalleryItems(items, "all").length === 3);
}

console.log("\n── 5. Capa marcada manualmente como 'antes' ──");
{
  const items = buildGalleryItems(proj({ cover_category: "antes" }), media([{ url: "d.jpg", category: "depois" }]));
  check("capa em Antes", filterGalleryItems(items, "antes").map((i) => i.url).join() === "capa.jpg");
  check("etiqueta da capa é Antes", items[0].label === "Antes");
}

console.log("\n── 6. Ordem definida no painel é respeitada ──");
{
  const items = buildGalleryItems(proj(), media([
    { url: "c.jpg", sort_order: 3 }, { url: "a.jpg", sort_order: 1 }, { url: "b.jpg", sort_order: 2 },
  ]));
  check("ordem = capa, a, b, c", items.map((i) => i.url).join(",") === "capa.jpg,a.jpg,b.jpg,c.jpg", items.map((i) => i.url).join(","));
}

console.log("\n── 7. Casos-limite ──");
{
  check("projeto sem mídias adicionais", buildGalleryItems(proj(), []).length === 1);
  check("só fotos de depois → filtro Antes vazio",
    filterGalleryItems(buildGalleryItems(proj(), media([{ url: "d.jpg", category: "depois" }])), "antes").length === 0);
  const soAntes = buildGalleryItems(proj({ image_after: "", cover_category: null }), media([{ url: "a.jpg", category: "antes" }]));
  check("projeto sem capa não quebra", soAntes.length === 1 && soAntes[0].category === "antes");
  const vid = buildGalleryItems(proj(), media([{ url: "v.mp4", type: "video", category: "depois" }]));
  check("vídeo respeita a classificação", filterGalleryItems(vid, "depois").length === 2);
  check("filtro de vídeo isola o vídeo", filterGalleryItems(vid, "video").length === 1);
  check("dedupe ignora query string",
    buildGalleryItems(proj(), media([{ url: "capa.jpg?v=2" }])).length === 1);
}

// ── Dados reais ─────────────────────────────────────────────────────────────
if (process.argv.includes("--live")) {
  console.log("\n── Dados de produção ──");
  const fs = await import("node:fs");
  const { createClient } = await import("@supabase/supabase-js");
  const env = Object.fromEntries(
    fs.readFileSync(".env.local", "utf8").split("\n")
      .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: photos } = await db.from("project_photos").select("*");
  const { data: allMedia } = await db.from("project_media").select("*");
  const rows = (allMedia ?? []) as GalleryMediaRow[];

  for (const p of (photos ?? []) as unknown as GalleryProject[] & { is_active: boolean }[]) {
    const items = buildGalleryItems(p, rows.filter((m) => m.project_slug === p.slug));
    const urls = items.map((i) => i.url);
    const dup = urls.length !== new Set(urls).size;
    const coverInAntes = filterGalleryItems(items, "antes").some((i) => i.isCover && normalizeCategory(p.cover_category) !== "antes");
    check(`${p.slug}: sem duplicata`, !dup);
    check(`${p.slug}: capa fora do filtro Antes`, !coverInAntes);
  }

  const orphans = [...new Set(rows.map((m) => m.project_slug))].filter(
    (s) => !(photos ?? []).some((p) => (p as { slug: string }).slug === s));
  // Órfãs não reprovam: são resquício de projetos excluídos antes da correção
  // do DELETE. Ficam sinalizadas para revisão manual — nada é apagado sozinho.
  if (orphans.length > 0) console.log(`  ⚠ mídia órfã (projeto inexistente): ${orphans.join(", ")}`);
  else console.log("  ✓ sem mídia órfã");

  const multiCover = Object.entries(
    rows.filter((m) => m.is_cover).reduce<Record<string, number>>((a, m) => { a[m.project_slug] = (a[m.project_slug] ?? 0) + 1; return a; }, {}),
  ).filter(([, n]) => n > 1);
  check(`no máximo uma capa por projeto (${multiCover.length} violações)`, multiCover.length === 0);

  const badCat = rows.filter((m) => !["antes", "depois", "geral"].includes(String(m.category)));
  check(`nenhum valor de categoria fora do padrão (${badCat.length})`, badCat.length === 0);
}

console.log(`\n${fail === 0 ? "✅" : "❌"}  ${pass} passaram, ${fail} falharam\n`);
process.exit(fail === 0 ? 0 : 1);
