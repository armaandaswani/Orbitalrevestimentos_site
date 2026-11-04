import test from "node:test";
import assert from "node:assert/strict";
import { LUZ_ALCANCE_PCT, posicaoNaSuperficie } from "./luz.ts";

test("no meio da superfície a luz não se inclina", () => {
  assert.equal(posicaoNaSuperficie(150, 100, 100), 0);
});

test("bordas dão -1 e 1", () => {
  assert.equal(posicaoNaSuperficie(100, 100, 100), -1);
  assert.equal(posicaoNaSuperficie(200, 100, 100), 1);
});

test("fora da superfície trava nas bordas", () => {
  assert.equal(posicaoNaSuperficie(0, 100, 100), -1);
  assert.equal(posicaoNaSuperficie(900, 100, 100), 1);
});

test("largura zero não divide por zero", () => {
  assert.equal(posicaoNaSuperficie(10, 10, 0), 0);
});

test("o alcance continua discreto", () => {
  assert.ok(LUZ_ALCANCE_PCT > 0 && LUZ_ALCANCE_PCT <= 20);
});
