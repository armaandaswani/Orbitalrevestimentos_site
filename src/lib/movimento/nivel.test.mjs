import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { decidirNivel, SCRIPT_NIVEL } from "./nivel.ts";

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

// O script embutido no <head> (antes da pintura) repete decidirNivel em
// JavaScript puro. Este teste roda a string em node:vm com todos os sinais e
// confere que o resultado é o de decidirNivel.
function rodarScript(sinais, dataset = {}) {
  const navigator = {};
  if (sinais.memoriaGB !== undefined) navigator.deviceMemory = sinais.memoriaGB;
  if (sinais.nucleos !== undefined) {
    navigator.hardwareConcurrency = sinais.nucleos;
  }
  if (sinais.economiaDados !== undefined) {
    navigator.connection = { saveData: sinais.economiaDados };
  }
  const contexto = {
    document: { documentElement: { dataset } },
    navigator,
    window: { matchMedia: () => ({ matches: sinais.poucosDados }) },
  };
  vm.runInNewContext(SCRIPT_NIVEL, contexto);
  return dataset.mvNivel;
}

test("SCRIPT_NIVEL dá o mesmo nível que decidirNivel", () => {
  let combinacoes = 0;
  for (const poucosDados of [true, false]) {
    for (const economiaDados of [true, false, undefined]) {
      for (const memoriaGB of [undefined, 2, 4, 8]) {
        for (const nucleos of [undefined, 2, 4, 8]) {
          const sinais = { poucosDados, economiaDados, memoriaGB, nucleos };
          combinacoes++;
          assert.equal(
            rodarScript(sinais),
            decidirNivel(sinais),
            JSON.stringify(sinais),
          );
        }
      }
    }
  }
  assert.equal(combinacoes, 96);
});

test("SCRIPT_NIVEL não muda nível já marcado", () => {
  const dataset = { mvNivel: "leve" };
  const nivel = rodarScript(
    { poucosDados: false, economiaDados: false, memoriaGB: 8, nucleos: 8 },
    dataset,
  );
  assert.equal(nivel, "leve");
});
