import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as C from "./pfb-carbon.ts";

/** Cada texto das exportações com o caminho até ele (`TEXTOS.clima.frases.0`). */
function textos(valor, caminho, saida = []) {
  if (typeof valor === "string") saida.push([caminho, valor]);
  else if (Array.isArray(valor)) valor.forEach((v, i) => textos(v, `${caminho}.${i}`, saida));
  else if (valor && typeof valor === "object") for (const [k, v] of Object.entries(valor)) textos(v, `${caminho}.${k}`, saida);
  return saida;
}

test("os cinco modelos da pasta do dono, na ordem da página", () => {
  assert.deepEqual(C.MODELOS_CARBON.map((m) => m.nome), ["Louro Freijó", "Carvalho Natural", "Imbuia", "Jatobá", "Pau Ferro"]);
  assert.equal(new Set(C.MODELOS_CARBON.map((m) => m.slug)).size, 5);
});

test("camadas com os termos do dono (15/11/2026), de cima para baixo", () => {
  assert.deepEqual([...C.CAMADAS_CARBON], [
    "Filme PET",
    "Adesivo de alta aderência",
    "SPC",
    "Substrato em fibra de bambu carbonizado",
    "SPC",
  ]);
});

test("medida, espessura e densidades como o dono passou", () => {
  assert.equal(C.MEDIDA, "2,80 × 1,20 m");
  assert.equal(C.ESPESSURA, "5 mm");
  assert.equal(C.DENSIDADE_BASE, "650 kg/m³");
  assert.equal(C.DENSIDADE_PLACA, "720 kg/m³");
});

test("textura e download de cada modelo existem em public/", () => {
  for (const m of C.MODELOS_CARBON) {
    assert.ok(fs.existsSync(`public${C.textura(m)}`), C.textura(m));
    assert.ok(fs.existsSync(`public${C.texturaDownload(m)}`), C.texturaDownload(m));
  }
});

test("a lista de espera recebe os mesmos cinco nomes", () => {
  assert.deepEqual(C.CATALOGO_ESPERA_CARBON.map((m) => m.nome), C.MODELOS_CARBON.map((m) => m.nome));
});

test("nenhum texto público traz termo vetado", () => {
  // Sem laudo do Carbon: nada de temperatura, percentual ou resistência em
  // número. "cola" virou "adesivo de alta aderência". O resto são regras da marca.
  const vetados = [
    /\bcola\b/i, /curva/i, /banheiro/i, /área úmida|áreas úmidas/i, /fachada/i, /techstone/i,
    /°\s?C/, /%/, /\bMPa\b/, /R\$/, /mais caro|custa mais/i, /instalamos|medimos|projetamos/i, /[—–]/,
  ];
  const todos = textos(C.TEXTOS, "TEXTOS");
  assert.ok(todos.length > 20);
  for (const [caminho, texto] of todos) {
    for (const v of vetados) assert.ok(!v.test(texto), `${caminho}: "${texto}" bate em ${v}`);
  }
});

test("o nome por extenso aparece antes da sigla sozinha na abertura", () => {
  assert.ok(C.TEXTOS.abertura.frases[0].includes("Painel Flexível em Fibra de Bambu"));
});
