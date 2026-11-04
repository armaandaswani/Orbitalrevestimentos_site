import test from "node:test";
import assert from "node:assert/strict";
import {
  LENTE_TAMANHO, LENTE_ZOOM, LENTE_ALTURA_TOQUE, LENTE_SEGURAR_MS,
  posicaoLente, retanguloAjustado,
} from "./lente.ts";

const caixa = { left: 100, top: 200, width: 300, height: 400 };
const centro = { x: 250, y: 400 };

test("valores da especificação", () => {
  assert.equal(LENTE_TAMANHO, 160);
  assert.equal(LENTE_ZOOM, 2.5);
  assert.equal(LENTE_ALTURA_TOQUE, 90);
  assert.equal(LENTE_SEGURAR_MS, 250);
});

test("no centro da caixa, sem toque, a lente fica centrada no ponto", () => {
  const r = posicaoLente(centro, caixa);
  assert.equal(r.left + LENTE_TAMANHO / 2, centro.x);
  assert.equal(r.top + LENTE_TAMANHO / 2, centro.y);
});

test("com toque a lente sobe 90 px", () => {
  const sem = posicaoLente(centro, caixa);
  const com = posicaoLente(centro, caixa, { toque: true });
  assert.equal(com.top, sem.top - 90);
  assert.equal(com.left, sem.left);
  // O que aparece na lente continua sendo o ponto sob o dedo.
  assert.equal(com.fundoX, sem.fundoX);
  assert.equal(com.fundoY, sem.fundoY);
});

test("ponto fora da caixa trava na borda", () => {
  const r = posicaoLente({ x: 9999, y: -50 }, caixa);
  assert.equal(r.left + LENTE_TAMANHO / 2, caixa.left + caixa.width);
  assert.equal(r.top + LENTE_TAMANHO / 2, caixa.top);
  const e = posicaoLente({ x: -10, y: 9999 }, caixa);
  assert.equal(e.left + LENTE_TAMANHO / 2, caixa.left);
  assert.equal(e.top + LENTE_TAMANHO / 2, caixa.top + caixa.height);
});

test("fundoX na borda esquerda vale tamanho / 2", () => {
  const r = posicaoLente({ x: caixa.left, y: centro.y }, caixa);
  assert.equal(r.fundoX, LENTE_TAMANHO / 2);
  const g = posicaoLente({ x: caixa.left, y: centro.y }, caixa, { tamanho: 200 });
  assert.equal(g.fundoX, 100);
});

test("zoom 2,5 multiplica os deslocamentos por 2,5", () => {
  const p = { x: 140, y: 260 }; // 40 px e 60 px da quina
  const r = posicaoLente(p, caixa);
  assert.equal(r.fundoX, 80 - 40 * 2.5);
  assert.equal(r.fundoY, 80 - 60 * 2.5);
  const um = posicaoLente(p, caixa, { zoom: 1 });
  assert.equal(um.fundoX, 80 - 40);
  assert.equal(um.fundoY, 80 - 60);
});

test("tamanho personalizado muda o tamanho da lente", () => {
  const r = posicaoLente(centro, caixa, { tamanho: 100 });
  assert.equal(r.left, centro.x - 50);
  assert.equal(r.top, centro.y - 50);
});

test("cobrir: imagem mais larga que a caixa corta dos lados e fica centrada", () => {
  const r = retanguloAjustado({ left: 0, top: 0, width: 100, height: 200 }, 400, 400, "cobrir");
  assert.equal(r.height, 200);
  assert.equal(r.width, 200);
  assert.equal(r.left, -50);
  assert.equal(r.top, 0);
});

test("cobrir: imagem mais estreita corta em cima e embaixo", () => {
  const r = retanguloAjustado({ left: 10, top: 20, width: 100, height: 100 }, 100, 400, "cobrir");
  assert.equal(r.width, 100);
  assert.equal(r.height, 400);
  assert.equal(r.left, 10);
  assert.equal(r.top, 20 - 150);
});

test("conter: imagem inteira dentro da caixa, centrada", () => {
  const r = retanguloAjustado({ left: 0, top: 0, width: 400, height: 300 }, 200, 400, "conter");
  assert.equal(r.height, 300);
  assert.equal(r.width, 150);
  assert.equal(r.left, 125);
  assert.equal(r.top, 0);
});

test("dimensões inválidas devolvem a própria caixa", () => {
  const c = { left: 1, top: 2, width: 30, height: 40 };
  assert.deepEqual(retanguloAjustado(c, 0, 0, "cobrir"), c);
});
