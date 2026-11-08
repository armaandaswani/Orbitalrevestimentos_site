import test from "node:test";
import assert from "node:assert/strict";

const M = await import("./smclick-messages.ts");

const summary = M.visualizadorRenderMessage([{ local: "Parede", productName: "Calacatta Michelangelo", productCode: "ORB-014" }]);

test("com o nome digitado no site, a saudação usa o primeiro nome (dono, 08/11/2026)", () => {
  const c = M.visualizadorCaption(summary, "https://orbitalrevestimentos.com.br/v/a0b2050d86ec", "mariana souza");
  assert.ok(c.startsWith("Oi, Mariana, tudo bem? Aqui é a Ste, da Orbital 😊"));
  assert.ok(c.includes("Parede: *Calacatta Michelangelo* (ORB-014)\nhttps://orbitalrevestimentos.com.br/v/a0b2050d86ec"));
  assert.ok(c.endsWith("O que você achou do resultado?"));
});

test("sem nome (ou com algo que não parece nome), fica como era", () => {
  for (const n of [undefined, null, "", "  ", "x", "12345"]) assert.ok(M.visualizadorCaption(summary, "L", n).startsWith("Oi, tudo bem? Aqui é a Ste"));
});

test("primeiro nome como as pessoas escrevem", () => {
  assert.equal(M.greetingName("JOÃO PEDRO"), "João");
  assert.equal(M.greetingName("  ana  "), "Ana");
  assert.equal(M.greetingName("Dr. Felipe"), "Felipe");
  assert.equal(M.greetingName(null), null);
});
