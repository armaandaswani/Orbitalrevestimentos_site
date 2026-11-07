import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as C from "./camadas.ts";

const css = fs.readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const inicio = css.indexOf("/* ── PFB: a placa por dentro");
const fim = css.indexOf("/* ── ", inicio + 1);
const bloco = css.slice(inicio, fim === -1 ? undefined : fim);

const perto = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} ≠ ${b}`);

/** "x,y x,y …" em pares de números. */
const pontos = (s) => s.split(" ").map((p) => p.split(",").map(Number));

test("polígonos: topo, frente e lado nos pontos da base, somados a (0, d)", () => {
  assert.deepEqual(C.BASE, { FL: [80, 420], FR: [400, 420], BR: [560, 340], BL: [240, 340] });
  assert.equal(C.poligonos(4).topo, "80,420 400,420 560,340 240,340");
  assert.equal(C.poligonos(0, -13).topo, "80,407 400,407 560,327 240,327");
  // Substrato (espessura 16): frente e lado descem 16 a partir da aresta da frente e do lado.
  assert.equal(C.poligonos(4).frente, "80,420 400,420 400,436 80,436");
  assert.equal(C.poligonos(4).lado, "400,420 560,340 560,356 400,436");
});

test("deslocamentos da pilha fechada e soma das espessuras = 29", () => {
  assert.equal(C.CAMADAS_DESENHO.length, 5);
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => C.deslocamentoFechado(i)), [-13, -11, -8, -6, 0]);
  assert.equal(C.CAMADAS_DESENHO.reduce((s, c) => s + c.espessura, 0), 29);
  assert.deepEqual(C.CAMADAS_DESENHO.map((c) => c.extras), [null, "veios", null, null, "fibras"]);
  assert.equal(C.VEIOS.length, 3);
  assert.equal(C.FIBRAS.length, 5);
});

test("aberta, a figura cabe no viewBox (com o deslize da camada ativa)", () => {
  assert.equal(C.VIEWBOX, "56 56 552 400");
  let menorY = Infinity, maiorY = -Infinity, maiorX = -Infinity;
  for (let i = 0; i < 5; i++) {
    const p = C.poligonos(i, C.deslocamentoFechado(i) - C.elevacao(i));
    for (const face of [p.topo, p.frente, p.lado]) {
      for (const [x, y] of pontos(face)) {
        menorY = Math.min(menorY, y);
        maiorY = Math.max(maiorY, y);
        maiorX = Math.max(maiorX, x);
      }
    }
  }
  assert.ok(menorY >= 56, `menor y ${menorY} < 56`);
  assert.ok(maiorY <= 456, `maior y ${maiorY} > 456`);
  assert.ok(maiorX + C.DESLOCA_ATIVA <= 608, `maior x ${maiorX} + ${C.DESLOCA_ATIVA} > 608`);
});

test("inicioDoPasso e elevacao", () => {
  perto(C.inicioDoPasso(0), 0.35, "inicioDoPasso(0)");
  perto(C.inicioDoPasso(4), 0.75, "inicioDoPasso(4)");
  assert.equal(C.elevacao(0), 256);
  assert.equal(C.elevacao(4), 0);
});

test("tempos: PASSO_INICIO e PASSO batem com o bloco do CSS", () => {
  assert.ok(inicio !== -1, "bloco \"PFB: a placa por dentro\" ausente do globals.css");
  // Cada número vem seguido do que o CSS escreve depois dele (" -", ")", ","): um
  // decimal que ganhe dígitos numa ponta só (0.15, 0.35) não passa como substring.
  assert.ok(bloco.includes(`var(--a) + ${C.PASSO} -`), `CSS sem "var(--a) + ${C.PASSO} -"`);
  assert.ok(bloco.includes("- 0.85)"), "CSS sem o fechamento em 0.85");
  perto(C.PASSO_INICIO + 5 * C.PASSO, 0.85, "o passo da última camada termina onde o fechamento começa");
  assert.ok(bloco.includes("- 0.05) / 0.3,"), "CSS sem a abertura de 0.05 a 0.35");
  perto(C.PASSO_INICIO, 0.05 + 0.3, "PASSO_INICIO é o fim da abertura");
});

test("geometria: VAO e DESLOCA_ATIVA batem com o bloco do CSS", () => {
  assert.ok(inicio !== -1, "bloco \"PFB: a placa por dentro\" ausente do globals.css");
  assert.ok(bloco.includes(`* -${C.VAO}px`), `CSS sem "* -${C.VAO}px"`);
  assert.ok(bloco.includes(`* ${C.DESLOCA_ATIVA}px`), `CSS sem "* ${C.DESLOCA_ATIVA}px"`);
});
