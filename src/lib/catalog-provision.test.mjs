import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { buildArrivalCatalogPlan, normalizedCatalogCode, validateArrivalManifest } from "./catalog-provision.ts";
import { MODELOS_TECHSTONE, texturaMiniatura, texturaDownload } from "./techstone.ts";
const manifest = JSON.parse(readFileSync(new URL("../../scripts/catalogo/chegada-2027-02.json", import.meta.url), "utf8"));

test("17 códigos novos e aliases do fornecedor preservam padrão do catálogo", () => {
  validateArrivalManifest(manifest);
  assert.equal(manifest.entries.length, 17);
  assert.deepEqual(manifest.entries.map((e) => e.number), Array.from({ length: 17 }, (_, i) => i + 20));
  assert.equal(normalizedCatalogCode("ORB0020"), "ORB-020");
  assert.equal(normalizedCatalogCode("orb-020"), "ORB-020");
});
test("entrada futura não vira estoque e não inventa preço nem custo", () => {
  const plan = buildArrivalCatalogPlan(manifest, []);
  assert.equal(plan.inserts.length, 17);
  for (const product of plan.inserts) {
    assert.equal(product.stock_on_hand, 0);
    assert.equal(product.stock_reserved, 0);
    assert.equal(product.price, null);
    assert.equal(product.cost_price, null);
    assert.equal(product.expected_delivery_month, "2027-02");
    assert.equal(product.show_in_catalog, false);
    assert.equal(product.is_active, true);
    assert.ok(!("planned_quantity" in product));
    assert.ok(!("supplier_code" in product));
    assert.ok(!("source_thickness_mm" in product));
  }
});
test("produto existente com alias tem ID, estoque, preços e imagem preservados", () => {
  const current = { id: "existing", code: "ORB0020", name: "Nome já aprovado", stock_on_hand: 17, price: 999, image_path: "original.jpg" };
  const before = structuredClone(current);
  const plan = buildArrivalCatalogPlan(manifest, [current]);
  assert.equal(plan.inserts.length, 16);
  assert.equal(plan.existing[0].id, "existing");
  assert.equal(plan.existing[0].stored_code, "ORB0020");
  assert.deepEqual(current, before);
  assert.equal(plan.inserts.some((p) => p.code === "ORB-020"), false);
});
test("execução seguinte é idempotente e aliases duplicados bloqueiam gravação", () => {
  const first = buildArrivalCatalogPlan(manifest, []);
  const next = buildArrivalCatalogPlan(manifest, first.inserts.map((p, i) => ({ ...p, id: `product-${i}` })));
  assert.equal(next.inserts.length, 0);
  assert.equal(next.existing.length, 17);
  const conflict = buildArrivalCatalogPlan(manifest, [{ id: "a", name: "a", code: "ORB-020" }, { id: "b", name: "b", code: "ORB0020" }]);
  assert.equal(conflict.conflicts.length, 1);
});
test("9 modelos TechStone têm nomes canônicos e ambos arquivos reais correspondentes", () => {
  const entries = manifest.entries.filter((e) => e.kind === "techstone");
  assert.equal(entries.length, 9);
  for (const entry of entries) {
    const model = MODELOS_TECHSTONE.find((m) => m.slug === entry.model_slug);
    assert.ok(model);
    assert.equal(entry.model_name, model.nome);
    assert.equal(entry.format, model.formato);
    assert.equal(entry.image_path, texturaMiniatura(model));
    assert.equal(entry.texture_download_path, texturaDownload(model));
    assert.ok(existsSync(new URL(`../../public${entry.image_path}`, import.meta.url)));
    assert.ok(existsSync(new URL(`../../public${entry.texture_download_path}`, import.meta.url)));
  }
});
test("não inventa código ausente/conflitante e mantém discrepância de espessura fora do cadastro", () => {
  assert.equal(manifest.entries.find((e) => e.number === 28).supplier_code, null);
  const entry = manifest.entries.find((e) => e.number === 30);
  assert.equal(entry.supplier_code, null);
  assert.deepEqual(entry.supplier_code_candidates, ["DS6A1072", "DS6A1011"]);
  const products = buildArrivalCatalogPlan(manifest, []).inserts;
  assert.ok(!products.find((p) => p.code === "ORB-030").description.includes("2,7"));
  assert.ok(!products.find((p) => p.code === "ORB-030").description.includes("3,5"));
});
test("quantidades e formatos refletem captura sem modificar estoque físico", () => {
  const total = (kind) => manifest.entries.filter((e) => e.kind === kind).reduce((sum, e) => sum + e.planned_quantity, 0);
  assert.equal(total("carbon"), 1600);
  assert.equal(total("techstone"), 1200);
  assert.equal(total("profile"), 2300);
  const carbon = buildArrivalCatalogPlan(manifest, []).inserts.find((p) => p.code === "ORB-020");
  assert.equal(carbon.render_panel_width_m, 1.22);
  assert.equal(carbon.render_panel_height_m, 2.8);
  for (const entry of manifest.entries.filter((e) => e.kind === "profile")) assert.equal(Object.values(entry.planned_variants).reduce((sum, n) => sum + n, 0), entry.planned_quantity);
});
test("rejeita manifesto com alias duplicado, mês inválido ou traversal de imagem", () => {
  for (const edit of [(m) => { m.entries[1].code = "ORB-020"; }, (m) => { m.expected_delivery_month = "2027-13"; }, (m) => { m.entries[0].image_path = "/images/../secret"; }]) {
    const copy = structuredClone(manifest); edit(copy); assert.throws(() => validateArrivalManifest(copy));
  }
});
