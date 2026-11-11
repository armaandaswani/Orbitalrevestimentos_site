import test from "node:test";
import assert from "node:assert/strict";
import { pedidoItemUnitInfo } from "./pedido-item-unit.ts";

const plate = { unit_label: "placa", panel_h: 1.2, panel_w: 0.6 };
test("TechStone SKUs omit unconfirmed thickness, including supplier aliases", () => {
  for (const product_code of ["ORB-024", "ORB-032", "ORB0024"]) {
    assert.equal(pedidoItemUnitInfo({ ...plate, product_code }).detail, "Placa 1,20 m × 0,60 m");
  }
});
test("TechStone name protects documents even without a SKU", () => {
  assert.equal(pedidoItemUnitInfo({ ...plate, product_name: "TechStone — Taj Mahal" }).detail, "Placa 1,20 m × 0,60 m");
});
test("known Carbon panels and legacy PFB retain the approved 5 mm specification", () => {
  assert.equal(pedidoItemUnitInfo({ ...plate, panel_h: 2.8, panel_w: 1.22, product_code: "ORB-020", product_name: "PFB Carbon — Louro Freijó" }).detail, "Placa 2,80 m × 1,22 m × 5 mm");
  assert.equal(pedidoItemUnitInfo({ ...plate, panel_h: 2.9, panel_w: 1.2, product_code: "ORB-002" }).detail, "Placa 2,90 m × 1,20 m × 5 mm");
});
test("support materials and unknown dimensions do not gain panel specifications", () => {
  assert.deepEqual(pedidoItemUnitInfo({ unit_label: "tubo" }), { short: "Tubo", detail: "Tubo" });
  assert.equal(pedidoItemUnitInfo({ ...plate, panel_h: null }).detail, "Placa");
});
