import test from "node:test";
import assert from "node:assert/strict";
import { dataIso, dataValida, mascaraData } from "./parcerias-data.ts";

test("máscara: só dígitos viram DD/MM/AAAA enquanto digita", () => {
  assert.equal(mascaraData("0"), "0");
  assert.equal(mascaraData("0102"), "01/02");
  assert.equal(mascaraData("01021990"), "01/02/1990");
  assert.equal(mascaraData("01/02/1990 extra 99"), "01/02/1990");
});

test("máscara: data ISO do preenchimento automático (AAAA-MM-DD) vira DD/MM/AAAA", () => {
  assert.equal(mascaraData("1990-05-12"), "12/05/1990");
});

test("data válida: dia, mês e ano que existem", () => {
  assert.equal(dataValida("01/02/1990", 2026), true);
  assert.equal(dataValida("29/02/2000", 2026), true);
  assert.equal(dataValida("31/12/1950", 2026), true);
});

test("data inválida: dia ou mês que não existem, ano fora da faixa, incompleta", () => {
  assert.equal(dataValida("31/02/1990", 2026), false);
  assert.equal(dataValida("29/02/1999", 2026), false);
  assert.equal(dataValida("00/00/0000", 2026), false);
  assert.equal(dataValida("12/13/1990", 2026), false);
  assert.equal(dataValida("01/01/1899", 2026), false);
  assert.equal(dataValida("01/01/2027", 2026), false);
  assert.equal(dataValida("01/02", 2026), false);
  assert.equal(dataValida("", 2026), false);
});

test("DD/MM/AAAA vira AAAA-MM-DD", () => {
  assert.equal(dataIso("01/02/1990"), "1990-02-01");
  assert.equal(dataIso("12/05/1990"), "1990-05-12");
});

// Código do representante nos links entre as páginas de parceria.
import { comRep } from "./parcerias-link.ts";

test("sem código, o link não muda", () => {
  assert.equal(comRep("/parcerias/arquitetos", ""), "/parcerias/arquitetos");
});

test("o código entra nos links de parceria e da revenda, antes da âncora", () => {
  assert.equal(comRep("/parcerias/arquitetos", "JOAO"), "/parcerias/arquitetos?rep=JOAO");
  assert.equal(comRep("/parcerias", "JOAO"), "/parcerias?rep=JOAO");
  assert.equal(comRep("/onde-comprar#quero-revender", "JOAO"), "/onde-comprar?rep=JOAO#quero-revender");
  assert.equal(comRep("/parcerias/marceneiros#cadastro", "A B"), "/parcerias/marceneiros?rep=A%20B#cadastro");
});

test("links de fora das parcerias ficam como estão", () => {
  assert.equal(comRep("/academia", "JOAO"), "/academia");
  assert.equal(comRep("/parceiro", "JOAO"), "/parceiro");
});
