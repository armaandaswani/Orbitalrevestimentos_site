import test from "node:test";
import assert from "node:assert/strict";
import {
  etapaVisivel,
  podeConcluirMarcacao,
  podeGerar,
  areaSeguinte,
  ajustarAreaAtual,
  limitarDivisor,
  passoTeclado,
} from "./fluxo.ts";

test("etapaVisivel mapeia os passos", () => {
  assert.equal(etapaVisivel("upload", "mark"), 0);
  assert.equal(etapaVisivel("zones", "mark"), 1);
  assert.equal(etapaVisivel("zones", "confirm"), 2);
  assert.equal(etapaVisivel("zones", "model"), 2);
  assert.equal(etapaVisivel("result", "model"), 3);
});

test("podeConcluirMarcacao", () => {
  assert.equal(podeConcluirMarcacao([]), false);
  assert.equal(podeConcluirMarcacao([{ detecting: true }]), false);
  assert.equal(podeConcluirMarcacao([{ detecting: false }]), true);
});

test("podeGerar exige modelo e descrição em todas", () => {
  const ok = { productChosen: true, instruction: "painel na parede" };
  const base = { canGenerate: true };
  assert.equal(podeGerar([ok, ok], base), true);
  assert.equal(podeGerar([ok, { ...ok, instruction: "  " }], base), false);
  assert.equal(podeGerar([ok, { ...ok, productChosen: false }], base), false);
  assert.equal(podeGerar([ok, ok], { canGenerate: false }), false);
});

test("areaSeguinte", () => {
  assert.equal(areaSeguinte(0, 2), 1);
  assert.equal(areaSeguinte(1, 2), null);
  assert.equal(areaSeguinte(0, 1), null);
});

test("ajustarAreaAtual", () => {
  assert.equal(ajustarAreaAtual(2, 2), 1);
  assert.equal(ajustarAreaAtual(0, 0), 0);
  assert.equal(ajustarAreaAtual(-1, 3), 0);
});

test("limitarDivisor e passoTeclado", () => {
  assert.equal(limitarDivisor(130), 100);
  assert.equal(limitarDivisor(-4), 0);
  assert.equal(passoTeclado(98, "ArrowRight"), 100);
  assert.equal(passoTeclado(3, "ArrowLeft"), 0);
  assert.equal(passoTeclado(40, "Home"), 0);
  assert.equal(passoTeclado(40, "End"), 100);
});
