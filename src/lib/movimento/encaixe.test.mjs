import test from "node:test";
import assert from "node:assert/strict";
import { escolherTela } from "./encaixe.ts";

const VH = 800;
// Três telas seguidas, depois texto solto: topos relativos à tela (getBoundingClientRect().top).
const telas = (y) => [0, 800, 1600].map((t) => ({ topo: t - y, altura: 800 }));

test("um toque de roda para baixo sai da tela atual e vai à próxima", () => {
  assert.equal(escolherTela(telas(100), VH, 0, 1), 1);
});

test("um toque para cima volta à anterior", () => {
  assert.equal(escolherTela(telas(700), VH, 1, -1), 0);
});

test("parado já no topo de uma tela: nada a fazer", () => {
  assert.equal(escolherTela(telas(800), VH, 1, 1), null);
});

test("rolagem longa: vai à tela mais visível", () => {
  assert.equal(escolherTela(telas(1450), VH, 0, 1), 2);
});

test("descendo da última tela para o texto solto: não puxa de volta", () => {
  assert.equal(escolherTela(telas(1700), VH, 2, 1), null);
});

test("subindo do texto solto: encaixa na tela que aparece em cima", () => {
  assert.equal(escolherTela(telas(2300), VH, null, -1), 2);
});

test("tela que aparece menos de 5%: não encaixa", () => {
  assert.equal(escolherTela(telas(2380), VH, null, -1), null);
});

test("celular com a barra do navegador recolhida: a janela é maior que a seção em svh", () => {
  // Seções de 680 px (100svh) numa janela de 800 px.
  const noTopo = [{ topo: 0, altura: 680 }, { topo: 680, altura: 680 }];
  assert.equal(escolherTela(noTopo, VH, 0, 0), null);
  const saindo = [{ topo: -100, altura: 680 }, { topo: 580, altura: 680 }];
  assert.equal(escolherTela(saindo, VH, 0, 1), 1);
});

test("seção bem mais alta que a tela (mais de 1,6) não é ponto de encaixe", () => {
  const lista = [{ topo: -100, altura: 800 }, { topo: 300, altura: 1300 }];
  assert.equal(escolherTela(lista, VH, 0, 1), null);
});

test("seção um pouco mais alta: encaixa pelo topo e rola livre dentro dela", () => {
  const entrando = [{ topo: -100, altura: 800 }, { topo: 700, altura: 900 }];
  assert.equal(escolherTela(entrando, VH, 0, 1), 1);
  const dentro = [{ topo: -900, altura: 800 }, { topo: -100, altura: 900 }];
  assert.equal(escolherTela(dentro, VH, 1, 1), null);
});

test("faixa curta não é ponto de encaixe", () => {
  const lista = [{ topo: -700, altura: 800 }, { topo: 100, altura: 240 }];
  assert.equal(escolherTela(lista, VH, 0, 1), null);
});
