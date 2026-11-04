import test from "node:test";
import assert from "node:assert/strict";
import { fatorSuavizacao, aproximar, TAU_PADRAO_MS, DT_MAX_MS } from "./suavizar.ts";

test("constantes padrão", () => {
  assert.equal(TAU_PADRAO_MS, 110);
  assert.equal(DT_MAX_MS, 50);
});

test("fator a 60 Hz fica perto de 0,1406", () => {
  assert.ok(Math.abs(fatorSuavizacao(16.667, 110) - 0.1406) < 0.001);
});

test("tau zero segue o alvo na hora", () => {
  assert.equal(fatorSuavizacao(16, 0), 1);
  assert.equal(fatorSuavizacao(0, 0), 1);
});

test("dt é limitado a 50 ms", () => {
  assert.equal(fatorSuavizacao(1000, 110), fatorSuavizacao(50, 110));
});

test("mesma chegada em 60 Hz e 120 Hz", () => {
  let a = 0;
  for (let i = 0; i < 6; i++) a = aproximar(a, 1, 16.667, 110);
  let b = 0;
  for (let i = 0; i < 12; i++) b = aproximar(b, 1, 8.333, 110);
  assert.ok(Math.abs(a - b) < 0.002, `${a} vs ${b}`);
});

test("dentro do epsilon devolve o alvo exato", () => {
  assert.equal(aproximar(0.99975, 1, 16, 110), 1);
});

test("fora do epsilon anda sem passar do alvo", () => {
  const v = aproximar(0, 1, 16, 110);
  assert.ok(v > 0 && v < 1);
});
