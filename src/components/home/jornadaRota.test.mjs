import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  FRACOES,
  FUSAO,
  INICIO_VIAGEM,
  LUGARES,
  PARADAS,
  TOTAL_ETAPAS,
  TRECHOS,
  VIAGEM,
  chegada,
  distancia,
  projetar as projetarRota,
} from "./jornadaRota.ts";
import { MAPA_ALTURA, MAPA_LARGURA, MAPA_PASSO, MAPA_PONTOS, projetar } from "./mapaPontos.ts";

/** Centros dos pontos de terra do mapa gerado (o path é relativo dentro de cada linha). */
function pontosDeTerra() {
  const lista = [];
  let x = 0;
  let y = 0;
  for (const m of MAPA_PONTOS.matchAll(/([Mm])(-?[0-9.]+) (-?[0-9.]+)h0/g)) {
    if (m[1] === "M") {
      x = Number(m[2]);
      y = Number(m[3]);
    } else {
      x += Number(m[2]);
      y += Number(m[3]);
    }
    lista.push([x, y]);
  }
  return lista;
}

const perto = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test("seis trechos encadeados, um por etapa", () => {
  assert.equal(TRECHOS.length, TOTAL_ETAPAS);
  assert.equal(PARADAS.length, TOTAL_ETAPAS);
  for (let k = 1; k < TRECHOS.length; k++) {
    assert.deepEqual(TRECHOS[k][0], TRECHOS[k - 1][3], `trecho ${k} começa onde o anterior acaba`);
  }
});

test("partida e paradas vêm de graus pela mesma projeção do mapa", () => {
  for (const [lon, lat] of LUGARES) assert.deepEqual(projetarRota(lon, lat), projetar(lon, lat));
  assert.deepEqual(TRECHOS[0][0], projetar(...LUGARES[0]));
  PARADAS.forEach((p, k) => assert.deepEqual(p, projetar(...LUGARES[k + 1]), `parada ${k + 1}`));
});

test("a fábrica e Manaus caem nos lugares reais", () => {
  assert.deepEqual(LUGARES[3], [113, 23]);
  assert.deepEqual(LUGARES[4], [-60, -3.1]);
});

test("partida e paradas 1 a 3 ficam no sul da Ásia, em volta da fábrica", () => {
  for (const [lon, lat] of LUGARES.slice(0, 4)) {
    assert.ok(lon >= 100 && lon <= 120 && lat >= 20 && lat <= 27, `${lon}, ${lat}`);
  }
});

test("estoque e obra colados em Manaus, mas distintos (10 a 15 unidades)", () => {
  for (const k of [4, 5]) {
    const d = Math.hypot(PARADAS[k][0] - PARADAS[k - 1][0], PARADAS[k][1] - PARADAS[k - 1][1]);
    assert.ok(d >= 10 && d <= 15, `parada ${k + 1}: ${d.toFixed(1)}`);
  }
});

test("partida e todas as paradas têm um ponto de terra a até um passo da grade", () => {
  const terra = pontosDeTerra();
  assert.ok(terra.length > 1000);
  [TRECHOS[0][0], ...PARADAS].forEach(([x, y], k) => {
    const d = Math.min(...terra.map(([a, b]) => Math.hypot(a - x, b - y)));
    assert.ok(d <= MAPA_PASSO, `${k === 0 ? "partida" : `parada ${k}`} a ${d.toFixed(1)} do ponto de terra mais perto`);
  });
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
    assert.ok(chegada(k) < (k + 1) / TOTAL_ETAPAS - FUSAO, `etapa ${k + 1}`);
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
  const etapa = css.match(/\.jr-etapa \{[^}]*opacity: min\(clamp\(0, \(var\(--p, 0\) - var\(--a\)\) \/ ([0-9.]+), 1\), clamp\(0, \(var\(--b\) - var\(--p, 0\)\) \/ ([0-9.]+), 1\)\);/);
  assert.ok(etapa, ".jr-etapa no CSS");
  assert.equal(Number(etapa[1]), FUSAO);
  assert.equal(Number(etapa[2]), FUSAO);
});

test("mapa gerado: pontos suficientes para ler o mundo e arquivo pequeno", () => {
  const pontos = MAPA_PONTOS.match(/h0/g).length;
  assert.ok(pontos > 1000, `${pontos} pontos`);
  assert.ok(MAPA_PONTOS.length < 40000, `${MAPA_PONTOS.length} caracteres`);
});
