import test from "node:test";
import assert from "node:assert/strict";
import { inclinacao, INCLINACAO_RAIO, INCLINACAO_MAXIMO } from "./inclinacao.ts";

const centro = { x: 500, y: 300 };

test("valores da especificação", () => {
  assert.equal(INCLINACAO_RAIO, 80);
  assert.equal(INCLINACAO_MAXIMO, 6);
});

test("a 100 px de distância não inclina", () => {
  assert.deepEqual(inclinacao({ x: 600, y: 300 }, centro), { x: 0, y: 0 });
});

test("exatamente no raio não inclina", () => {
  assert.deepEqual(inclinacao({ x: 580, y: 300 }, centro), { x: 0, y: 0 });
});

test("40 px à direita inclina 3 px para a direita", () => {
  const r = inclinacao({ x: 540, y: 300 }, centro);
  assert.ok(Math.abs(r.x - 3) < 1e-9);
  assert.ok(Math.abs(r.y) < 1e-9);
});

test("79 px abaixo inclina perto de 5,925 em y", () => {
  const r = inclinacao({ x: 500, y: 379 }, centro);
  assert.ok(Math.abs(r.y - 5.925) < 0.1);
  assert.ok(Math.abs(r.x) < 1e-9);
});

test("diagonal a 60 px mantém a direção e o comprimento 4,5", () => {
  const d = 60 / Math.SQRT2;
  const r = inclinacao({ x: centro.x - d, y: centro.y + d }, centro);
  assert.ok(Math.abs(Math.hypot(r.x, r.y) - 4.5) < 1e-9);
  assert.ok(r.x < 0 && r.y > 0);
  assert.ok(Math.abs(Math.abs(r.x) - Math.abs(r.y)) < 1e-9);
});

test("no centro não inclina", () => {
  assert.deepEqual(inclinacao(centro, centro), { x: 0, y: 0 });
});

test("raio e máximo customizados; o comprimento nunca passa do máximo", () => {
  const r = inclinacao({ x: 100, y: 0 }, { x: 0, y: 0 }, 200, 10);
  assert.ok(Math.abs(r.x - 5) < 1e-9);
  const dentro = inclinacao({ x: 199.9, y: 0 }, { x: 0, y: 0 }, 200, 10);
  assert.ok(Math.hypot(dentro.x, dentro.y) <= 10);
});

test("entradas inválidas (NaN) não inclinam", () => {
  assert.deepEqual(inclinacao({ x: NaN, y: 0 }, centro), { x: 0, y: 0 });
});
