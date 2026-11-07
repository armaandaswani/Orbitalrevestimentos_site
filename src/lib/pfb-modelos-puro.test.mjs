import test from "node:test";
import assert from "node:assert/strict";
import { agruparPorLinha } from "./pfb-modelos-puro.ts";

function modelo(code, linha) {
  return { code, name: `Modelo ${code}`, linha, image_path: `${code}.jpg` };
}

test("porLinha 2 corta 0, 1 e 3 modelos em 0, 1 e 2", () => {
  const recebidos = [
    modelo("B1", "Brilliance"),
    modelo("E1", "Elegance"),
    modelo("E2", "Elegance"),
    modelo("E3", "Elegance"),
  ];
  const r = agruparPorLinha(recebidos, 2);
  assert.deepEqual(Object.keys(r).sort(), ["Brilliance", "Classic", "Elegance"]);
  assert.equal(r.Classic.length, 0);
  assert.equal(r.Brilliance.length, 1);
  assert.equal(r.Elegance.length, 2);
  // A ordem recebida é mantida: os dois primeiros, não os dois últimos.
  assert.deepEqual(
    r.Elegance.map((m) => m.code),
    ["E1", "E2"],
  );
});

test("linha fora das três é descartada", () => {
  const r = agruparPorLinha(
    [modelo("C1", "Classic"), modelo("X1", "Outra")],
    2,
  );
  const codes = Object.values(r)
    .flat()
    .map((m) => m.code);
  assert.deepEqual(codes, ["C1"]);
});
