import test from "node:test";
import assert from "node:assert/strict";
import { nullableProductNumber, productPricePerM2, changeProductLine } from "./product-admin-pricing.ts";

const empty = { linha: "Carbon", finish: "", price: null, price_per_m2: null, render_panel_width_m: 1.22, render_panel_height_m: 2.8 };
test("preços em branco continuam nulos e zero explícito é preservado", () => {
  assert.equal(nullableProductNumber(""), null);
  assert.equal(nullableProductNumber("  "), null);
  assert.equal(nullableProductNumber("0"), 0);
  assert.equal(nullableProductNumber("749.90"), 749.9);
  assert.equal(nullableProductNumber("-1"), null);
});
test("m² usa medida efetiva de Carbon e dos dois formatos TechStone", () => {
  assert.equal(productPricePerM2(1000, 1.22, 2.8), 292.74);
  assert.equal(productPricePerM2(1000, .6, 1.2), 1388.89);
  assert.equal(productPricePerM2(1000, 1.2, 2.4), 347.22);
  assert.equal(productPricePerM2(null, 1.22, 2.8), null);
  assert.equal(productPricePerM2(1000, null, null), null);
  assert.equal(productPricePerM2(1000, 0, 2.8), null);
});
test("edição e troca de linha não sobrescrevem preço, acabamento ou medidas", () => {
  for (const linha of ["Carbon", "TechStone", "Perfis", "Classic"]) {
    const changed = changeProductLine(empty, linha, true);
    assert.equal(changed.price, null);
    assert.equal(changed.price_per_m2, null);
    assert.equal(changed.finish, "");
    assert.equal(changed.render_panel_width_m, 1.22);
    assert.equal(changed.render_panel_height_m, 2.8);
  }
});
test("nova linha não recebe preços ou dimensões de PFB padrão", () => {
  const standard = { ...empty, price: 559, price_per_m2: 161, finish: "Fosco" };
  for (const linha of ["Carbon", "TechStone", "Perfis"]) {
    const changed = changeProductLine(standard, linha, false);
    assert.equal(changed.price, null);
    assert.equal(changed.price_per_m2, null);
    assert.equal(changed.render_panel_width_m, linha === "Carbon" ? 1.22 : null);
  }
  assert.deepEqual(["Classic", "Brilliance", "Elegance"].map((line) => changeProductLine(empty, line, false).price), [559, 589, 649]);
  assert.deepEqual(["Classic", "Brilliance", "Elegance"].map((line) => changeProductLine(empty, line, false).price_per_m2), [161, 169, 186]);
});
