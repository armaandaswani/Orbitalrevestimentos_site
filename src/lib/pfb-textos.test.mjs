import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as T from "./pfb-textos.ts";

/** Bloco ```ts de "## Textos finais" na spec (autoridade dos textos). */
const spec = fs.readFileSync(
  new URL("../../docs/superpowers/specs/2026-11-07-pfb-experiencia-design.md", import.meta.url),
  "utf8",
);
const secao = spec.indexOf("## Textos finais");
const abre = spec.indexOf("```ts", secao);
const fecha = spec.indexOf("```", abre + 5);
const bloco = spec.slice(abre + 5, fecha);

/** Todo `"…"` do bloco, sem os comentários de linha (`// fonte: …`). */
const literais = bloco
  .split("\n")
  .map((linha) => {
    const i = linha.indexOf("//");
    return i === -1 ? linha : linha.slice(0, i);
  })
  .flatMap((linha) => [...linha.matchAll(/"([^"]*)"/g)].map((m) => m[1]));

/** Cada texto das exportações com o caminho até ele (`AGUA.horas.0.alt`). */
function textos(valor, caminho, saida = []) {
  if (typeof valor === "string") saida.push({ caminho, texto: valor });
  else if (Array.isArray(valor)) valor.forEach((v, i) => textos(v, `${caminho}.${i}`, saida));
  else if (valor && typeof valor === "object") {
    for (const [k, v] of Object.entries(valor)) textos(v, `${caminho}.${k}`, saida);
  }
  return saida;
}
const todos = Object.entries(T).flatMap(([nome, v]) => textos(v, nome));
const valores = new Set(todos.map((t) => t.texto));

test("todo literal do bloco Textos da spec está em pfb-textos.ts", () => {
  assert.ok(abre > secao && secao !== -1, "bloco ```ts de \"## Textos finais\" não achado na spec");
  assert.ok(literais.length > 50, `só ${literais.length} literais no bloco: o recorte falhou`);
  const faltam = literais.filter((l) => !valores.has(l));
  assert.deepEqual(faltam, [], "literais da spec sem valor igual em pfb-textos.ts");
});

test("chaves da spec, e nenhuma a mais", () => {
  assert.deepEqual(Object.keys(T).sort(), [
    "ABERTURA", "AGUA", "BAMBU", "CAMADAS", "FICHA", "FICHA_COMPLETA", "INSTALADOR",
    "LINHAS", "MANAUS", "O_QUE_E", "PEDIR", "SELOS", "SERVE",
  ]);
  const chaves = (o) => Object.keys(o);
  assert.deepEqual(chaves(T.ABERTURA), ["titulo", "lead", "estoque", "botaoModelos", "botaoConsultor", "alt"]);
  assert.deepEqual(chaves(T.O_QUE_E), ["frase", "medidas"]);
  for (const s of T.SELOS) assert.deepEqual(chaves(s), ["icone", "nome"]);
  assert.deepEqual(chaves(T.CAMADAS), ["titulo", "lead", "nomes"]);
  assert.deepEqual(chaves(T.FICHA), ["titulo", "numeros", "ressalva"]);
  for (const n of T.FICHA.numeros) assert.deepEqual(chaves(n), ["valor", "frase"]);
  assert.deepEqual(chaves(T.FICHA_COMPLETA), ["resumo", "linhas"]);
  for (const l of T.FICHA_COMPLETA.linhas) assert.equal(l.length, 2);
  assert.deepEqual(chaves(T.AGUA), ["titulo", "frase", "horas", "aviso"]);
  for (const h of T.AGUA.horas) assert.deepEqual(chaves(h), ["rotulo", "legenda", "alt"]);
  assert.deepEqual(chaves(T.MANAUS), ["titulo", "pontos"]);
  assert.deepEqual(chaves(T.LINHAS), ["titulo", "curtas", "botaoModelos"]);
  for (const c of T.LINHAS.curtas) assert.deepEqual(chaves(c), ["linha", "frase"]);
  assert.deepEqual(chaves(T.INSTALADOR), ["titulo", "frase"]);
  assert.deepEqual(chaves(T.SERVE), ["titulo", "ondeUsar", "ondeNaoUsar", "comoInstalar"]);
  assert.deepEqual(chaves(T.SERVE.ondeUsar), ["titulo", "resumo", "paragrafos"]);
  assert.deepEqual(chaves(T.SERVE.ondeNaoUsar), ["titulo", "resumo", "paragrafos"]);
  assert.deepEqual(chaves(T.SERVE.comoInstalar), ["titulo", "resumo", "paragrafos", "antesDoManual", "depoisDoManual"]);
  assert.equal(T.SERVE.ondeUsar.paragrafos.length, 2);
  assert.equal(T.SERVE.ondeNaoUsar.paragrafos.length, 1);
  assert.equal(T.SERVE.comoInstalar.depoisDoManual, ".");
  assert.deepEqual(chaves(T.BAMBU), ["titulo", "frase"]);
  assert.deepEqual(chaves(T.PEDIR), ["titulo", "frase", "revendas", "orcamento", "botaoConsultor", "reserva"]);
  assert.deepEqual(chaves(T.PEDIR.reserva), ["link"]);
});

test("contagens", () => {
  assert.deepEqual(T.SELOS.map((s) => s.icone), ["agua", "pragas", "chamas", "pu", "eco", "flex"]);
  for (const { icone } of T.SELOS) {
    const svg = new URL(`../../public/images/selos/pfb-icone-${icone}.svg`, import.meta.url);
    assert.ok(fs.existsSync(svg), `falta public/images/selos/pfb-icone-${icone}.svg`);
  }
  assert.equal(T.FICHA.numeros.length, 5);
  assert.equal(T.FICHA.numeros[0].valor, "72,3 MPa");
  assert.equal(T.FICHA_COMPLETA.linhas.length, 9);
  assert.deepEqual(T.AGUA.horas.map((h) => h.rotulo), ["0h", "24h", "48h"]);
  assert.deepEqual(T.LINHAS.curtas.map((c) => c.linha), ["Classic", "Brilliance", "Elegance"]);
  assert.equal(T.CAMADAS.nomes.length, 5);
  assert.equal(T.BAMBU.titulo.length, 2);
});

test("sem termo proibido", () => {
  const proibidos = [/[—–]/, /impermeáv/i, /mais caro/i, /estrutural/i, /±10%/, /\buv\b/i];
  for (const { caminho, texto } of todos) {
    for (const re of proibidos) assert.ok(!re.test(texto), `${caminho} tem ${re}: "${texto}"`);
  }
  const comMdf = todos.filter((t) => /\bmdf\b/i.test(t.texto)).map((t) => t.caminho);
  assert.deepEqual(comMdf, ["AGUA.horas.0.alt", "AGUA.horas.1.alt", "AGUA.horas.2.alt"]);
});
