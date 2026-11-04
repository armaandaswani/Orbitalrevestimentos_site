import test from "node:test";
import assert from "node:assert/strict";
import { decidirNivel } from "./nivel.ts";

test("sem sinais é completo", () => {
  assert.equal(decidirNivel({}), "completo");
});

for (const s of [
  { economiaDados: true },
  { poucosDados: true },
  { memoriaGB: 4 },
  { nucleos: 4 },
]) {
  test(`leve com ${JSON.stringify(s)}`, () => {
    assert.equal(decidirNivel(s), "leve");
  });
}

test("máquina folgada é completo", () => {
  assert.equal(decidirNivel({ memoriaGB: 8, nucleos: 8 }), "completo");
});
