#!/usr/bin/env node
import { readFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { buildArrivalCatalogPlan, validateArrivalManifest } from "../src/lib/catalog-provision.ts";

// Default: offline, read-only preview. --inspect reads the full live catalog.
// Writes require both --apply and the SHA-256 of the exact reviewed manifest.
const args = process.argv.slice(2);
const apply = args.includes("--apply"), inspect = args.includes("--inspect") || apply;
const approval = args.find((a) => a.startsWith("--approved-sha256="))?.slice("--approved-sha256=".length);
const manifestUrl = new URL("./catalogo/chegada-2027-02.json", import.meta.url);
const publicUrl = new URL("../public/", import.meta.url);

async function run() {
  if (args.some((a) => !["--apply", "--inspect"].includes(a) && !/^--approved-sha256=[a-f0-9]{64}$/.test(a))) throw Error("Use --inspect ou --apply --approved-sha256=<hash revisado>.");
  const source = await readFile(manifestUrl, "utf8"), hash = createHash("sha256").update(source).digest("hex");
  const manifest = JSON.parse(source); validateArrivalManifest(manifest);
  for (const entry of manifest.entries) for (const path of [entry.image_path, entry.texture_download_path].filter(Boolean)) {
    try { await access(fileURLToPath(new URL(path.slice(1), publicUrl))); }
    catch { throw Error(`Imagem local ausente para ${entry.code}: ${path}`); }
  }
  console.log(`Manifesto SHA-256: ${hash}`);
  if (apply && approval !== hash) throw Error("A gravação exige o hash do manifesto já revisado. Nenhuma alteração realizada.");
  let db, current = [];
  if (inspect) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente. As credenciais não são exibidas.");
    db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    // Read all active/inactive aliases so the script cannot create an alternate SKU.
    const response = await db.from("products").select("id,code,name,expected_delivery_month").limit(5000);
    if (response.error || !response.data || response.data.length === 5000) throw Error("Não foi possível conferir o catálogo completo e a migração 078. Nenhuma alteração realizada.");
    current = response.data;
  }
  const plan = buildArrivalCatalogPlan(manifest, current);
  console.log(JSON.stringify({ mode: apply ? "apply" : inspect ? "inspect-read-only" : "offline-dry-run", live_catalog_checked: inspect, expected_delivery_month: manifest.expected_delivery_month,
    insert_count: plan.inserts.length, existing_count: plan.existing.length, conflicts: plan.conflicts,
    existing_preserved: plan.existing,
    proposed: plan.inserts.map((p) => ({ code: p.code, name: p.name, linha: p.linha, price: p.price, stock_on_hand: p.stock_on_hand, sale_unit: p.sale_unit, image_path: p.image_path, expected_delivery_month: p.expected_delivery_month })),
    pending: manifest.global_pending,
    note: "Quantidades da compra, referências do fornecedor e divergências de espessura ficam somente no manifesto. Produtos existentes são preservados integralmente. A vitrine pública não será alterada." }, null, 2));
  if (plan.conflicts.length) throw Error("Conflitos de SKU exigem revisão. Nenhuma alteração realizada.");
  if (!apply || !plan.inserts.length) return;
  // Ignore duplicates atomically by canonical code. Never overwrite a product.
  // Requires a UNIQUE constraint/index on products.code; otherwise Supabase rejects
  // this one statement and nothing is inserted (no unsafe fallback).
  const response = await db.from("products").upsert(plan.inserts, { onConflict: "code", ignoreDuplicates: true }).select("id,code,name");
  if (response.error) throw Error(`Falha ao cadastrar (código ${response.error.code || "indisponível"}). Confira migração 078, nullabilidade dos preços e índice UNIQUE em products.code; não há retentativa sem proteção.`);
  console.log(JSON.stringify({ inserted: response.data?.map(({ code, name }) => ({ code, name })) || [], stock_movements_created: 0 }, null, 2));
}
run().catch((error) => { console.error(error instanceof Error ? error.message : "Falha no provisionamento."); process.exitCode = 1; });
