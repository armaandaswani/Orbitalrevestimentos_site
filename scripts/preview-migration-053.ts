/**
 * Prévia da migração 053 — mostra o que ela FARÁ com os dados reais, sem
 * escrever nada. Reimplementa a mesma derivação do SQL (categoria principal,
 * showroom parceiro, tags, "Revisão necessária") para que o resultado possa ser
 * conferido projeto a projeto antes de rodar a migração no Supabase.
 *
 *   node scripts/preview-migration-053.ts
 *
 * Atenção: isto valida a LÓGICA, não a sintaxe do SQL — não há Postgres local
 * neste ambiente para executar o arquivo de migração.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TAG_SLUGS = ["umido", "cozinha", "lavabo", "parede", "teto"];
/** Mesma precedência do SQL. */
const MAIN_RANK: Record<string, number> = { showroom: 0, nautico: 1, comercial: 2, residencial: 3 };

type Cat = { slug: string; label: string; is_showroom: boolean; active: boolean };
type Proj = { slug: string; title: string; categories: string[] | null; is_active: boolean };

const { data: catRows } = await db.from("project_categories").select("slug,label,is_showroom,active");
const { data: projRows } = await db.from("project_photos").select("slug,title,categories,is_active");
const cats = (catRows ?? []) as Cat[];
const projects = (projRows ?? []) as Proj[];

const partners = cats.filter((c) => c.is_showroom).map((c) => c.slug);
const tags = cats.filter((c) => TAG_SLUGS.includes(c.slug)).map((c) => c.slug);
const mainCats = cats
  .filter((c) => c.active && !c.is_showroom && !tags.includes(c.slug))
  .map((c) => c.slug);

console.log(`\nShowrooms parceiros criados : ${partners.join(", ") || "(nenhum)"}`);
console.log(`Características (tags)      : ${tags.join(", ") || "(nenhuma)"}`);
console.log(`Categorias principais       : ${mainCats.join(", ")}\n`);

const rows: string[] = [];
let review = 0;
for (const p of projects) {
  const has = p.categories ?? [];
  const mains = mainCats
    .filter((s) => has.includes(s))
    .sort((a, b) => (MAIN_RANK[a] ?? 9) - (MAIN_RANK[b] ?? 9));
  const partner = partners.find((s) => has.includes(s)) ?? null;
  const tg = tags.filter((s) => has.includes(s));

  const needsReview = mains.length === 0 || mains.length > 1 || (mains[0] === "showroom" && !partner);
  const reason = mains.length === 0
    ? "sem categoria principal"
    : mains[0] === "showroom" && !partner
      ? "showroom sem parceiro identificado"
      : mains.length > 1
        ? `mais de uma principal: ${mains.join(", ")}`
        : "";
  if (needsReview) review++;

  rows.push(
    `${needsReview ? "⚠" : " "} ${p.title.slice(0, 26).padEnd(26)} ` +
    `${(mains[0] ?? "—").padEnd(12)} ${(partner ?? "—").padEnd(9)} ` +
    `${(tg.join("+") || "—").padEnd(10)} ${reason}`,
  );
}

console.log(`  ${"PROJETO".padEnd(26)} ${"PRINCIPAL".padEnd(12)} ${"PARCEIRO".padEnd(9)} ${"TAGS".padEnd(10)} MOTIVO`);
console.log("  " + "─".repeat(88));
console.log(rows.join("\n"));
console.log(`\n${projects.length} projetos · ${review} marcados "Revisão necessária" · 0 escritas (prévia)\n`);
