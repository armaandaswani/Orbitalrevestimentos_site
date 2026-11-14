import test from "node:test";
import assert from "node:assert/strict";
import { criarToque } from "./toque.ts";

test("parado não anda", () => {
  const t = criarToque(1000);
  assert.equal(t.avancar(500), 0);
  assert.equal(t.estado, "parado");
});

test("tocando anda pelo tempo e termina em 1", () => {
  const t = criarToque(1000);
  t.tocar();
  assert.equal(t.estado, "tocando");
  assert.equal(t.avancar(500), 0.5);
  assert.equal(t.avancar(1000), 1);
  assert.equal(t.estado, "fim");
});

test("pausar congela o progresso e tocar continua de onde parou", () => {
  const t = criarToque(1000);
  t.tocar();
  t.avancar(250);
  t.pausar();
  assert.equal(t.estado, "pausado");
  assert.equal(t.avancar(500), 0.25);
  t.tocar();
  assert.equal(t.avancar(250), 0.5);
});

test("tocar depois do fim recomeça do zero", () => {
  const t = criarToque(1000);
  t.tocar();
  t.avancar(2000);
  t.tocar();
  assert.equal(t.p, 0);
  assert.equal(t.estado, "tocando");
});

test("zerar volta ao começo, parado; terminar vai ao fim", () => {
  const t = criarToque(1000);
  t.tocar();
  t.avancar(400);
  t.zerar();
  assert.equal(t.p, 0);
  assert.equal(t.estado, "parado");
  t.terminar();
  assert.equal(t.p, 1);
  assert.equal(t.estado, "fim");
});

test("ir para um ponto pausa ali", () => {
  const t = criarToque(1000);
  t.tocar();
  t.ir(0.75);
  assert.equal(t.p, 0.75);
  assert.equal(t.estado, "pausado");
  assert.equal(t.avancar(100), 0.75);
});
