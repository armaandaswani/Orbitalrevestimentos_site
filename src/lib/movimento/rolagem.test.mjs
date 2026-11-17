import test from "node:test";
import assert from "node:assert/strict";
import { JANELA_VOLTA_MS, posicaoAoChegar, saiDaPagina } from "./rolagem.ts";

const agora = 100_000;

test("página nova pelo link abre no topo, mesmo já tendo passado por ela", () => {
  assert.equal(posicaoAoChegar({ historico: false, ancora: false, saida: null, agora }), 0);
  assert.equal(posicaoAoChegar({ historico: false, ancora: false, saida: { y: 900, em: agora - 1000 }, agora }), 0);
});

test("voltar logo em seguida devolve onde estava", () => {
  assert.equal(posicaoAoChegar({ historico: true, ancora: false, saida: { y: 1811, em: agora - 3000 }, agora }), 1811);
  assert.equal(posicaoAoChegar({ historico: true, ancora: false, saida: { y: 1811, em: agora - JANELA_VOLTA_MS }, agora }), 1811);
});

test("voltar depois de um tempo abre no topo", () => {
  assert.equal(posicaoAoChegar({ historico: true, ancora: false, saida: { y: 1811, em: agora - JANELA_VOLTA_MS - 1 }, agora }), 0);
  assert.equal(posicaoAoChegar({ historico: true, ancora: false, saida: null, agora }), 0);
});

test("link com âncora (#cadastro) fica com o navegador", () => {
  assert.equal(posicaoAoChegar({ historico: false, ancora: true, saida: null, agora }), null);
});

test("a janela de voltar é curta: alguns segundos", () => {
  assert.ok(JANELA_VOLTA_MS >= 5000 && JANELA_VOLTA_MS <= 15000);
});

test("sair por link interno para outro caminho conta como saída; mesma página, âncora, nova aba e outro site não", () => {
  const base = { origem: "https://orbitalrevestimentos.com.br", caminho: "/techstone", novaAba: false, modificador: false };
  assert.equal(saiDaPagina({ ...base, href: "/produtos/pfb" }), true);
  assert.equal(saiDaPagina({ ...base, href: "https://orbitalrevestimentos.com.br/" }), true);
  assert.equal(saiDaPagina({ ...base, href: "/techstone?modelo=x" }), false);
  assert.equal(saiDaPagina({ ...base, href: "#catalogo" }), false);
  assert.equal(saiDaPagina({ ...base, href: "https://wa.me/5592" }), false);
  assert.equal(saiDaPagina({ ...base, href: "/produtos/pfb", novaAba: true }), false);
  assert.equal(saiDaPagina({ ...base, href: "/produtos/pfb", modificador: true }), false);
});
