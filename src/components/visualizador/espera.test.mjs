import test from "node:test";
import assert from "node:assert/strict";
import {
  ETAPAS_ESPERA,
  TOTAL_ETAPAS,
  etapaAlvo,
  proximoPasso,
  fracaoBarra,
  textoVivo,
  textoDaEtapa,
} from "./espera.ts";

const s = (o) => ({ inicio: 0, stream: false, previas: 0, fim: false, ...o });

test("textos: 6 a 8 etapas, sem travessão, PFB por extenso", () => {
  assert.ok(TOTAL_ETAPAS >= 6 && TOTAL_ETAPAS <= 8);
  const tudo = ETAPAS_ESPERA.map((e) => `${e.titulo} ${e.texto}`).join(" ");
  assert.ok(!/[—–]/.test(tudo));
  assert.ok(tudo.includes("Painel Flexível em Fibra de Bambu (PFB)"));
});

test("etapaAlvo sem stream: só o tempo, e segura na última", () => {
  assert.equal(etapaAlvo(s({}), 0), 0);
  assert.equal(etapaAlvo(s({}), 7500), 2);
  assert.equal(etapaAlvo(s({}), 600000), TOTAL_ETAPAS - 1);
});

test("etapaAlvo com stream: não passa da prévia que ainda não chegou", () => {
  assert.equal(etapaAlvo(s({ stream: true }), 60000), 4);
  assert.equal(etapaAlvo(s({ stream: true, previas: 1 }), 3000), 5);
  assert.equal(etapaAlvo(s({ stream: true, previas: 1 }), 60000), 5);
  assert.equal(etapaAlvo(s({ stream: true, previas: 2 }), 30000), 6);
  assert.equal(etapaAlvo(s({ stream: true, previas: 2 }), 50000), 7);
});

test("etapaAlvo: a imagem final completa tudo", () => {
  assert.equal(etapaAlvo(s({ fim: true }), 1000), TOTAL_ETAPAS);
});

test("proximoPasso: um por vez, devagar no ritmo e depressa quando atrasado", () => {
  assert.equal(proximoPasso(2, 3, 1000), 2);
  assert.equal(proximoPasso(2, 3, 1800), 3);
  assert.equal(proximoPasso(2, 5, 450), 3);
  assert.equal(proximoPasso(6, TOTAL_ETAPAS, 380), 7);
  assert.equal(proximoPasso(4, 4, 99999), 4);
});

test("fracaoBarra: sobe sempre, nunca completa antes do fim", () => {
  let antes = -1;
  for (let t = 0; t <= 600000; t += 5000) {
    const f = fracaoBarra(TOTAL_ETAPAS - 1, t);
    assert.ok(f >= antes);
    assert.ok(f < 1);
    antes = f;
  }
  assert.ok(fracaoBarra(4, 9999999) < 5 / TOTAL_ETAPAS);
  assert.equal(fracaoBarra(TOTAL_ETAPAS, 0), 1);
});

test("textoVivo: só quando segura além do previsto, e alterna", () => {
  assert.equal(textoVivo(4, 1000), null);
  const a = textoVivo(TOTAL_ETAPAS - 1, 3500);
  const b = textoVivo(TOTAL_ETAPAS - 1, 7500);
  assert.ok(a && b && a !== b);
  assert.equal(textoVivo(TOTAL_ETAPAS, 99999), null);
});

test("textoDaEtapa: nome do modelo, vários ou nenhum", () => {
  const e = ETAPAS_ESPERA.find((x) => x.texto.includes("{modelo}"));
  assert.equal(textoDaEtapa(e, ["Carrara"]), "Carrara na escala das placas.");
  assert.equal(textoDaEtapa(e, ["A", "B"]), "Os acabamentos escolhidos na escala das placas.");
  assert.equal(textoDaEtapa(e, []), "O acabamento na escala das placas.");
});
