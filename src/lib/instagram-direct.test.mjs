import test from "node:test";
import assert from "node:assert/strict";
import { PARABENS, JANELA_MS, saudacao, primeiroNome, variante, textoDirect, decidir } from "./instagram-direct.ts";

// Manaus é UTC-4 o ano todo: 23/11/2026 vai de 2026-11-23T04:00Z a 2026-11-24T04:00Z.
const HOJE = "2026-11-23";
const AGORA = new Date("2026-11-23T20:00:00Z"); // 16h em Manaus
const meta = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "+0000"); // formato da Meta
const ORBITAL = { username: "orbitalrevestimentos", id: "1" };
const PESSOA = { username: "arq.maria", id: "2" };

test("saudação pela hora de Manaus nas fronteiras", () => {
  assert.equal(saudacao(4), "Boa noiteee");
  assert.equal(saudacao(5), "Bom diaaa");
  assert.equal(saudacao(11), "Bom diaaa");
  assert.equal(saudacao(12), "Boa tardeee");
  assert.equal(saudacao(17), "Boa tardeee");
  assert.equal(saudacao(18), "Boa noiteee");
  assert.ok(textoDirect("Maria Souza", 4, "x").startsWith("Boa noiteee Maria!!\n"));
  assert.ok(textoDirect("Maria Souza", 5, "x").startsWith("Bom diaaa Maria!!\n"));
  assert.ok(textoDirect("Maria Souza", 12, "x").startsWith("Boa tardeee Maria!!\n"));
  assert.ok(textoDirect("Maria Souza", 18, "x").startsWith("Boa noiteee Maria!!\n"));
});

test("primeiro nome ignora o que está entre parênteses", () => {
  assert.equal(primeiroNome("(Arq.) Maria Souza"), "Maria");
  assert.equal(primeiroNome("Maria (Mari) Souza"), "Maria");
  assert.equal(primeiroNome("  João   Pedro "), "João");
  assert.ok(textoDirect("(Studio X) Ana Lima", 9, "k").startsWith("Bom diaaa Ana!!\n"));
});

test("texto segue o modelo do dono e não leva link", () => {
  for (const chave of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
    const t = textoDirect("Maria Souza", 10, chave);
    assert.doesNotMatch(t, /https?:|www\.|instagram\.com|\.com\//i);
    const linhas = t.split("\n");
    const [linha, bencao, assinatura] = PARABENS[variante(chave)];
    assert.deepEqual(linhas, ["Bom diaaa Maria!!", linha, "", bencao, "", assinatura]);
  }
});

test("variante estável por chave e diferente entre pessoas", () => {
  const chaves = ["3f1a", "9bc2", "a0d4", "77e1", "c5c5", "0f0f", "1234", "abcd", "ffff", "beef"];
  for (const k of chaves) {
    assert.equal(textoDirect("Ana", 9, k), textoDirect("Ana", 9, k));
    assert.ok(variante(k) >= 0 && variante(k) < PARABENS.length);
  }
  assert.ok(new Set(chaves.map((k) => textoDirect("Ana", 9, k))).size >= 3);
});

test("ja_tinha: parabéns da Orbital hoje (data de Manaus) não repete", () => {
  const msgs = [
    { from: PESSOA, created_time: meta(AGORA - 3600e3), story: { mention: { id: "s" } } },
    { from: ORBITAL, created_time: "2026-11-23T13:00:00+0000", message: "Bom diaaa Maria!!\nParabéns pelo seu dia!" },
  ];
  assert.deepEqual(decidir(msgs, AGORA, HOJE), { acao: "ja_tinha" });
  // 22h de 23/11 em Manaus já é 24/11 em UTC, mas ainda é hoje.
  const noite = [{ from: ORBITAL, created_time: "2026-11-24T02:00:00+0000", message: "Feliz aniversário!" }];
  assert.deepEqual(decidir(noite, new Date("2026-11-24T03:00:00Z"), HOJE), { acao: "ja_tinha" });
});

test("parabéns da Orbital de ontem não conta como ja_tinha", () => {
  const msgs = [
    { from: PESSOA, created_time: meta(AGORA - 2 * 3600e3), message: "obrigada!!" },
    { from: ORBITAL, created_time: "2026-11-22T13:00:00+0000", message: "Parabéns pelo seu dia!" },
    // 23h de 22/11 em Manaus (03h UTC de 23/11): ainda é ontem.
    { from: ORBITAL, created_time: "2026-11-23T03:00:00+0000", message: "Feliz aniversário!" },
  ];
  assert.deepEqual(decidir(msgs, AGORA, HOJE), { acao: "enviar" });
});

test("mensagem da Orbital hoje sem parabéns não conta como ja_tinha", () => {
  const msgs = [
    { from: PESSOA, created_time: meta(AGORA - 3600e3), message: "oi" },
    { from: ORBITAL, created_time: meta(AGORA - 1800e3), message: "Oi Maria, tudo bem?" },
  ];
  assert.deepEqual(decidir(msgs, AGORA, HOJE), { acao: "enviar" });
});

test("janela: 22 h envia, 24 h não", () => {
  const com = (h) => [{ from: PESSOA, created_time: meta(AGORA - h * 3600e3), story: { mention: { id: "s" } } }];
  assert.deepEqual(decidir(com(22), AGORA, HOJE), { acao: "enviar" });
  assert.deepEqual(decidir(com(24), AGORA, HOJE), { acao: "sem_janela" });
  assert.equal(JANELA_MS, 23 * 3600e3);
});

test("pessoa nunca escreveu: sem janela", () => {
  assert.deepEqual(decidir([], AGORA, HOJE), { acao: "sem_janela" });
  const soOrbital = [{ from: ORBITAL, created_time: meta(AGORA - 600e3), message: "Oi!" }];
  assert.deepEqual(decidir(soOrbital, AGORA, HOJE), { acao: "sem_janela" });
});

test("a menção da própria Orbital no Story não abre janela", () => {
  const msgs = [
    { from: ORBITAL, created_time: meta(AGORA - 3600e3), story: { mention: { id: "s" } } },
    { from: PESSOA, created_time: meta(AGORA - 30 * 3600e3), message: "mensagem antiga" },
  ];
  assert.deepEqual(decidir(msgs, AGORA, HOJE), { acao: "sem_janela" });
  // A resposta da pessoa ao Story abre.
  msgs.push({ from: PESSOA, created_time: meta(AGORA - 600e3), story: { reply_to: { id: "s" } }, message: "🥰" });
  assert.deepEqual(decidir(msgs, AGORA, HOJE), { acao: "enviar" });
});
