import test from "node:test";
import assert from "node:assert/strict";
import { parseImportQuantity, parseQuantityTable, reviewImportedQuantities, validImportQuantityForProduct } from "./import-quantities.ts";

const products = [
  { id: "imbuia", name: "Imbuia", code: "ORB-002", sale_unit: "placa" },
  { id: "cola", name: "Cola PU-40 de Alta Aderência", code: "ORB-PU", sale_unit: "tubo" },
];
test("preserva materiais repetidos por ambiente e quantidades explícitas", () => {
  const table = parseQuantityTable('ambiente;produto;quantidade;unidade\nLavabo;Imbuia;4;placas\nSala;Imbuia;8;placas\nSala;"Cola PU-40 de Alta Aderência";16;tubos');
  const rows = reviewImportedQuantities(table, products);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => [r.product_id, r.quantity, r.space]), [["imbuia", 4, "Lavabo"], ["imbuia", 8, "Sala"], ["cola", 16, "Sala"]]);
});
test("não aproxima modelos, não aceita ID da IA nem cria produto", () => {
  const rows = reviewImportedQuantities([{ description: "Imbuia Premium", product_id: "imbuia", quantity: 4, space: "Sala" }], products);
  assert.equal(rows[0].product_id, null);
  assert.equal(rows[0].quantity, 4);
});
test("código desconhecido não cai silenciosamente para nome conhecido", () => {
  assert.equal(reviewImportedQuantities([{ description: "Imbuia", code: "ORB-099", quantity: 4 }], products)[0].product_id, null);
});
test("não converte área em placas nem quantidade ausente em 1", () => {
  const [area, missing] = reviewImportedQuantities([{ description: "Imbuia", quantity: 13.92, unit: "m²" }, { description: "Imbuia", quantity: null }], products);
  assert.equal(area.product_id, null);
  assert.equal(area.quantity, 13.92);
  assert.equal(missing.quantity, null);
  assert.ok(area.warnings.some((w) => w.includes("Unidade")));
});
test("quantidade exige número finito positivo e unidade discreta inteira", () => {
  for (const value of [undefined, null, {}, 0, -1, Infinity, NaN, "4 placas", "1.000,5", "1.000", "1,000", 100001]) assert.equal(parseImportQuantity(value), null);
  assert.equal(parseImportQuantity("2,5"), 2.5);
  assert.equal(validImportQuantityForProduct("2,5", products[0]), false);
  assert.equal(validImportQuantityForProduct("2,5", { id: "x", name: "x", sale_unit: "m²" }), true);
});
test("CSV com vírgula e aspas, TSV, CRLF e BOM", () => {
  assert.equal(parseQuantityTable('\uFEFFambiente,produto,quantidade\r\n"Sala, TV",Imbuia,4')[0].space, "Sala, TV");
  assert.equal(parseQuantityTable('ambiente\tproduto\tquantidade\nSala\tImbuia\t4')[0].quantity, "4");
  assert.equal(parseQuantityTable("Sala: 4 placas de Imbuia"), null);
  assert.throws(() => parseQuantityTable('ambiente;produto;quantidade\nSala;"Imbuia;4'));
});
test("limite de linhas e correspondência ambígua exigem revisão", () => {
  assert.throws(() => reviewImportedQuantities(Array.from({ length: 101 }, () => ({})), products));
  assert.equal(reviewImportedQuantities([{ description: "Imbuia", quantity: 4 }], [...products, { ...products[0], id: "clone" }])[0].product_id, null);
});
