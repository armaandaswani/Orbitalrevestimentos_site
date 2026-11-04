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
  { nucleos: 4, memoriaGB: 8 },
]) {
  test(`leve com ${JSON.stringify(s)}`, () => {
    assert.equal(decidirNivel(s), "leve");
  });
}

test("máquina folgada é completo", () => {
  assert.equal(decidirNivel({ memoriaGB: 8, nucleos: 8 }), "completo");
});

// O WebKit trava hardwareConcurrency em 4 (ou 2) em iPhone e iPad e não expõe
// deviceMemory: núcleos sozinhos não provam aparelho fraco.
test("núcleos sem deviceMemory são ignorados (Safari/iPhone)", () => {
  assert.equal(decidirNivel({ nucleos: 4 }), "completo");
  assert.equal(decidirNivel({ nucleos: 2 }), "completo");
});

test("economia de dados vale mesmo com núcleos sem deviceMemory", () => {
  assert.equal(decidirNivel({ nucleos: 8, economiaDados: true }), "leve");
});
