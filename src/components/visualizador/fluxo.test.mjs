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
  rotuloZona,
  podeIrParaProximaArea,
  indiceDaArea,
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

test("podeIrParaProximaArea: basta o acabamento, a descrição pode vir depois", () => {
  const semTexto = { productChosen: true, instruction: "" };
  assert.equal(podeIrParaProximaArea(semTexto), true);
  assert.equal(podeIrParaProximaArea({ productChosen: false }), false);
  assert.equal(podeIrParaProximaArea({}), false);
  // Gerar continua exigindo a descrição de toda área.
  assert.equal(podeGerar([semTexto], { canGenerate: true }), false);
});

test("indiceDaArea: a área atual é guardada pelo id", () => {
  const ids = ["a", "b", "c"];
  assert.equal(indiceDaArea(ids, { id: "b", indice: 1 }), 1);
  // Saiu uma área antes da atual: continua na mesma zona, sem pular.
  assert.equal(indiceDaArea(["b", "c"], { id: "b", indice: 1 }), 0);
  assert.equal(indiceDaArea(["a", "c"], { id: "c", indice: 2 }), 1);
  // A atual saiu: cai na seguinte (mesmo índice); era a última: a nova última.
  assert.equal(indiceDaArea(["a", "c"], { id: "b", indice: 1 }), 1);
  assert.equal(indiceDaArea(["a", "b"], { id: "c", indice: 2 }), 1);
  // Sem áreas, ou sem id ainda: índice ajustado.
  assert.equal(indiceDaArea([], { id: "a", indice: 0 }), 0);
  assert.equal(indiceDaArea(ids, { id: null, indice: 0 }), 0);
  assert.equal(indiceDaArea(ids, { id: null, indice: 7 }), 2);
});

test("limitarDivisor e passoTeclado", () => {
  assert.equal(limitarDivisor(130), 100);
  assert.equal(limitarDivisor(-4), 0);
  assert.equal(passoTeclado(98, "ArrowRight"), 100);
  assert.equal(passoTeclado(3, "ArrowLeft"), 0);
  assert.equal(passoTeclado(40, "Home"), 0);
  assert.equal(passoTeclado(40, "End"), 100);
});

test("rotuloZona: Área N até escolher o tipo, depois o tipo com a ordem", () => {
  const espacos = [{ id: "parede", label: "Parede" }, { id: "teto", label: "Teto" }, { id: "movel", label: "Móvel / Marcenaria" }];
  const zs = [
    { id: "a", label: "Área 1", surface: "parede", customLabel: "" },
    { id: "b", label: "Área 2", surface: "teto", customLabel: "" },
    { id: "c", label: "Área 3", surface: "parede", customLabel: "" },
    { id: "d", label: "Lareira", surface: "parede", customLabel: "" },
    { id: "e", label: "Área 5", surface: "__custom__", customLabel: "atrás da TV" },
    { id: "f", label: "Área 6", surface: "sumiu", customLabel: "" },
    { id: "g", label: "Área 7", surface: "movel", customLabel: "" },
    { id: "h", label: "Área 8", surface: "parede", customLabel: "" },
  ];
  const nomes = (escolhidos) => zs.map((_, i) => rotuloZona(zs, i, espacos, escolhidos));
  assert.deepEqual(nomes(new Set()), ["Área 1", "Área 2", "Área 3", "Lareira", "Área 5", "Área 6", "Área 7", "Área 8"]);
  assert.deepEqual(
    nomes(new Set(["b", "c", "e", "f", "g", "h"])),
    ["Área 1", "Teto 1", "Parede 1", "Lareira", "atrás da TV", "Área 6", "Móvel 1", "Parede 2"],
  );
});
