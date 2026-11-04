import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  FRACOES,
  INICIO_VIAGEM,
  PARADAS,
  TOTAL_ETAPAS,
  TRECHOS,
  VIAGEM,
  chegada,
  distancia,
} from "./jornadaRota.ts";
import { MAPA_ALTURA, MAPA_LARGURA, MAPA_PONTOS, projetar } from "./mapaPontos.ts";

const perto = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test("seis trechos encadeados, um por etapa", () => {
  assert.equal(TRECHOS.length, TOTAL_ETAPAS);
  assert.equal(PARADAS.length, TOTAL_ETAPAS);
  for (let k = 1; k < TRECHOS.length; k++) {
    assert.deepEqual(TRECHOS[k][0], TRECHOS[k - 1][3], `trecho ${k} começa onde o anterior acaba`);
  }
});

test("a fábrica e Manaus caem nos lugares reais do mapa", () => {
  const [fx, fy] = projetar(113, 23);
  perto(PARADAS[2][0], fx, 2, "fábrica x");
  perto(PARADAS[2][1], fy, 2, "fábrica y");
  const [mx, my] = projetar(-60, -3.1);
  perto(PARADAS[3][0], mx, 1, "Manaus x");
  perto(PARADAS[3][1], my, 1, "Manaus y");
});

test("toda a rota cabe no viewBox do mapa", () => {
  for (const trecho of TRECHOS) {
    for (const [x, y] of trecho) {
      assert.ok(x >= 0 && x <= MAPA_LARGURA && y >= 0 && y <= MAPA_ALTURA, `${x},${y}`);
    }
  }
});

test("frações da rota somam 1 e o arco longo é o maior trecho", () => {
  perto(FRACOES.reduce((a, b) => a + b, 0), 1, 1e-9, "soma");
  assert.equal(FRACOES.indexOf(Math.max(...FRACOES)), 3);
});

test("distância: de 0 a 1, nunca volta, e chega exata em cada parada", () => {
  assert.equal(distancia(0), 0);
  perto(distancia(1), 1, 1e-9, "fim");
  let antes = 0;
  for (let i = 0; i <= 1000; i++) {
    const d = distancia(i / 1000);
    assert.ok(d >= antes - 1e-12, `recuou em p=${i / 1000}`);
    antes = d;
  }
  let acumulado = 0;
  for (let k = 0; k < TOTAL_ETAPAS; k++) {
    acumulado += FRACOES[k];
    perto(distancia(chegada(k)), acumulado, 1e-9, `parada ${k + 1}`);
  }
});

test("o ponto chega antes de o texto da etapa começar a sair", () => {
  for (let k = 0; k < TOTAL_ETAPAS; k++) {
    assert.ok(chegada(k) < (k + 1) / TOTAL_ETAPAS - 0.025, `etapa ${k + 1}`);
  }
});

test("o CSS usa os mesmos tempos (globals.css › Home: jornada)", () => {
  const css = fs.readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  for (let k = 0; k < TOTAL_ETAPAS; k++) {
    const m = css.match(new RegExp(`--jr-t${k}: clamp\\(0, \\(var\\(--p, 0\\) - ([0-9.]+)\\) / ([0-9.]+), 1\\);`));
    assert.ok(m, `--jr-t${k} no CSS`);
    perto(Number(m[1]), k / TOTAL_ETAPAS + INICIO_VIAGEM, 1e-5, `início da viagem ${k + 1}`);
    perto(Number(m[2]), VIAGEM, 1e-9, `duração da viagem ${k + 1}`);
  }
});

test("mapa gerado: pontos suficientes para ler o mundo e arquivo pequeno", () => {
  const pontos = MAPA_PONTOS.match(/h0/g).length;
  assert.ok(pontos > 1000, `${pontos} pontos`);
  assert.ok(MAPA_PONTOS.length < 40000, `${MAPA_PONTOS.length} caracteres`);
});
