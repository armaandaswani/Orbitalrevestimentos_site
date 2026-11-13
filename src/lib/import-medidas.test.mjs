import test from "node:test";
import assert from "node:assert/strict";
import { parseMeasurementList } from "./import-medidas.ts";
import { reviewImportedQuantities } from "./import-quantities.ts";
import { panelGrid } from "./render-prompt.ts";

const produtos = [
  { id: "p4", name: "Carvalho Europeu", code: "ORB-004", sale_unit: "placa" },
  { id: "p2", name: "Imbuia", code: "ORB-002", sale_unit: "placa" },
];

test("lista do Sanmede (13/11/2026): medidas por ambiente viram placas do 004", () => {
  const texto = "Ambiente 1:\nAltura 2.87\nLargura 1.81\n\nAmbiente 2:\naltura: 2.59\nLargura: 2.05 + 1.34\n\nAmbos 004";
  const linhas = parseMeasurementList(texto, produtos, panelGrid);
  const r = reviewImportedQuantities(linhas, produtos);
  assert.deepEqual(r.map((x) => [x.space, x.quantity, x.product_id]), [["Ambiente 1", 2, "p4"], ["Ambiente 2", 3, "p4"]]);
  assert.deepEqual(r.map((x) => x.warnings), [[], []]);
  assert.match(r[1].evidence, /2,05 \+ 1,34 = 3,39 m/);
});

test("parede mais alta que a placa ganha fileira extra; vírgula decimal e modelo por ambiente", () => {
  const r = parseMeasurementList("Sala\nlargura 2,40\naltura 3,20\nmodelo 002", produtos, panelGrid);
  assert.equal(r[0].code, "ORB-002");
  assert.equal(r[0].quantity, panelGrid(2.4, 3.2, 1.2, 2.9).count);
});

test("teto usa o maior entre m² e largura", () => {
  const r = parseMeasurementList("Teto da sala\nlargura 3.88\ncomprimento 1.80", produtos, panelGrid);
  assert.equal(r[0].quantity, 3);
});

test("sem código: linha sai com pendência para escolher o produto", () => {
  const r = reviewImportedQuantities(parseMeasurementList("Lavabo\naltura 2.6\nlargura 1.5", produtos, panelGrid), produtos);
  assert.equal(r[0].quantity, 2);
  assert.match(r[0].warnings.join(" "), /Selecione o produto/);
});

test("texto que não é lista de medidas devolve null (segue para a IA)", () => {
  assert.equal(parseMeasurementList("Imbuia 4 placas no lavabo e 8 na sala", produtos, panelGrid), null);
  assert.equal(parseMeasurementList("Lavabo\nImbuia\n4 placas", produtos, panelGrid), null);
});
