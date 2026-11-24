import test from "node:test";
import assert from "node:assert/strict";
import { DURACAO_AGUA_MS, horaDoTeste } from "./pfb-agua.ts";

test("o teste começa em 0h, para em 24h e termina em 48h", () => {
  assert.equal(horaDoTeste(0), 0);
  assert.equal(horaDoTeste(0.1), 0);
  assert.equal(horaDoTeste(0.5), 1);
  assert.equal(horaDoTeste(1), 2);
});

test("anda sempre para a frente, sem pular", () => {
  let antes = 0;
  for (let i = 1; i <= 200; i++) {
    const h = horaDoTeste(i / 200);
    assert.ok(h >= antes && h - antes < 0.1, `p=${i / 200}: ${antes} → ${h}`);
    antes = h;
  }
});

test("cada hora fica parada um tempo na tela, e o teste inteiro é curto", () => {
  const parado = (alvo) => Array.from({ length: 1001 }, (_, i) => i / 1000).filter((p) => horaDoTeste(p) === alvo).length / 1000;
  for (const h of [0, 1, 2]) assert.ok(parado(h) * DURACAO_AGUA_MS >= 900, `${h * 24}h parada só ${Math.round(parado(h) * DURACAO_AGUA_MS)} ms`);
  assert.ok(DURACAO_AGUA_MS >= 5000 && DURACAO_AGUA_MS <= 9000);
});

test("fora de 0..1 fica nas pontas", () => {
  assert.equal(horaDoTeste(-1), 0);
  assert.equal(horaDoTeste(2), 2);
});
