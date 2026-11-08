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
  escolherVariantes,
  etapaEscolhida,
  tituloRevelacao,
  TITULOS_REVELACAO,
  TEXTOS_VIVOS,
  CORES_ETAPA,
  CORES_MARCA,
} from "./espera.ts";

const s = (o) => ({ inicio: 0, stream: false, previas: 0, fim: false, variantes: [], ...o });
const todas = ETAPAS_ESPERA.flat();

/** Contraste WCAG de uma cor #rrggbb contra o branco. */
function contrasteNoBranco(hex) {
  const canal = (i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
  return 1.05 / (l + 0.05);
}

test("cores das etapas: só do manual da marca, contraste de 3:1 no branco, sem vizinhas iguais", () => {
  assert.equal(CORES_ETAPA.length, TOTAL_ETAPAS);
  assert.ok(CORES_ETAPA.every((c) => CORES_MARCA.includes(c)));
  assert.ok(CORES_MARCA.every((c) => contrasteNoBranco(c) >= 3), CORES_MARCA.map(contrasteNoBranco).join(" "));
  assert.ok(CORES_ETAPA.every((c, i) => i === 0 || c !== CORES_ETAPA[i - 1]));
});

test("textos: 6 a 8 etapas, variações em todas, sem travessão, sem instalar", () => {
  assert.ok(TOTAL_ETAPAS >= 6 && TOTAL_ETAPAS <= 8);
  assert.ok(ETAPAS_ESPERA.every((v) => v.length >= 3));
  const tudo = [
    ...todas.flatMap((e) => [e.titulo, e.texto, e.textoVarios ?? "", e.textoSemNome ?? ""]),
    ...TITULOS_REVELACAO,
    ...TEXTOS_VIVOS,
  ].join(" ");
  assert.ok(!/[—–]/.test(tudo));
  assert.ok(!/instal/i.test(tudo));
});

test("a etapa do acabamento traz o PFB por extenso em todas as variações", () => {
  const i = ETAPAS_ESPERA.findIndex((v) => v.some((e) => e.texto.includes("{modelo}")));
  assert.ok(i >= 0);
  for (const e of ETAPAS_ESPERA[i]) {
    assert.ok(e.titulo.includes("Painéis Flexíveis em Fibra de Bambu"), e.titulo);
    assert.ok(e.texto.includes("{modelo}") && e.textoVarios && e.textoSemNome, e.titulo);
  }
});

test("escolherVariantes: nunca repete a da simulação anterior", () => {
  let antes = null;
  let seq = 0;
  const rng = () => ((seq = (seq * 9301 + 49297) % 233280) / 233280);
  for (let n = 0; n < 50; n++) {
    const agora = escolherVariantes(antes, rng);
    assert.equal(agora.length, TOTAL_ETAPAS + 1);
    agora.forEach((v, k) => {
      const opcoes = k < TOTAL_ETAPAS ? ETAPAS_ESPERA[k].length : TITULOS_REVELACAO.length;
      assert.ok(v >= 0 && v < opcoes);
      if (antes) assert.notEqual(v, antes[k]);
    });
    antes = agora;
  }
  assert.equal(escolherVariantes([99, -1], () => 0.999).length, TOTAL_ETAPAS + 1);
});

test("etapaEscolhida e tituloRevelacao seguem as variantes e caem na 1ª sem elas", () => {
  assert.equal(etapaEscolhida(0, [2]).titulo, ETAPAS_ESPERA[0][2].titulo);
  assert.equal(etapaEscolhida(1, []).titulo, ETAPAS_ESPERA[1][0].titulo);
  const v = Array(TOTAL_ETAPAS).fill(0).concat(1);
  assert.equal(tituloRevelacao(v), TITULOS_REVELACAO[1]);
  assert.equal(tituloRevelacao(null), TITULOS_REVELACAO[0]);
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
  const e = todas.find((x) => x.texto.includes("{modelo}"));
  assert.equal(textoDaEtapa(e, ["Carrara"]), "Adorei a escolha do Carrara. Muito bom gosto!");
  assert.equal(textoDaEtapa(e, ["A", "B"]), "Adorei os acabamentos que você escolheu. Muito bom gosto!");
  assert.equal(textoDaEtapa(e, []), "Adorei a sua escolha. Muito bom gosto!");
});
