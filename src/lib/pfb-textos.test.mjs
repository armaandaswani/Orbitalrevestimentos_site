import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as T from "./pfb-textos.ts";

/**
 * Regras dos textos de /produtos/pfb (v2, 08/11/2026). Na v1 este teste
 * comparava cada literal com o bloco "Textos finais" da spec; na v2 os textos
 * foram encurtados e a ART e a ficha detalhada da antiga Tecnologia voltaram,
 * então o teste confere o que continua sendo regra: as chaves, os números da
 * ficha, as contagens e os termos proibidos.
 */

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

/** A única frase com "±10%": a nota de tolerância da ficha detalhada (pedido do dono, 08/11/2026). */
const TOLERANCIA = "FICHA_DETALHADA.notas.1";

test("chaves", () => {
  assert.deepEqual(Object.keys(T).sort(), [
    "ABERTURA", "AGUA", "ART", "BAMBU", "CAMADAS", "FICHA", "FICHA_DETALHADA", "FOLHA", "INSTALADOR",
    "LINHAS", "MANAUS", "O_QUE_E", "PEDIR", "SELOS", "SERVE",
  ]);
  const chaves = (o) => Object.keys(o);
  assert.deepEqual(chaves(T.ABERTURA), ["titulo", "lead", "estoque", "botaoModelos", "botaoConsultor", "alt"]);
  assert.deepEqual(chaves(T.FICHA), ["titulo", "numeros", "ressalva", "rotuloTrilho"]);
  for (const n of T.FICHA.numeros) assert.deepEqual(chaves(n), ["valor", "rotulo"]);
  assert.deepEqual(chaves(T.ART), ["rotulo", "titulo", "oQueE", "linhas", "porQue"]);
  for (const l of T.ART.linhas) assert.equal(l.length, 2);
  assert.deepEqual(chaves(T.FICHA_DETALHADA), ["rotulo", "titulo", "grupos", "notas", "garantia"]);
  for (const g of T.FICHA_DETALHADA.grupos) for (const l of g.linhas) assert.equal(l.length, 2);
  assert.deepEqual(chaves(T.AGUA), ["titulo", "frase", "controle", "horas"]);
  for (const h of T.AGUA.horas) assert.deepEqual(chaves(h), ["rotulo", "alt"]);
  assert.deepEqual(chaves(T.SERVE), ["titulo", "ondeUsar", "ondeNaoUsar", "comoInstalar", "rotuloFolha", "rotuloPassos"]);
  assert.equal(T.SERVE.comoInstalar.depoisDoManual, ".");
  assert.deepEqual(chaves(T.PEDIR), ["titulo", "frase", "revendas", "orcamento", "botaoConsultor", "reserva"]);
});

test("números e contagens", () => {
  assert.deepEqual(T.SELOS.map((s) => s.icone), ["agua", "pragas", "chamas", "pu", "eco", "flex"]);
  for (const { icone } of T.SELOS) {
    const svg = new URL(`../../public/images/selos/pfb-icone-${icone}.svg`, import.meta.url);
    assert.ok(fs.existsSync(svg), `falta public/images/selos/pfb-icone-${icone}.svg`);
  }
  assert.deepEqual(T.FICHA.numeros.map((n) => n.valor), ["72,3 MPa", "0,2%", "3,2 kg/m²", "550 kg/m³", "0,5%"]);
  for (const n of T.FICHA.numeros) assert.ok(n.rotulo.split(" ").length <= 6, `rótulo longo: ${n.rotulo}`);
  assert.equal(T.FICHA.numeros[1].rotulo, "Absorção de água em 48 h");
  assert.equal(T.ART.linhas.find(([r]) => r === "Número da ART")?.[1], "AM20260593657");
  assert.equal(T.FICHA_DETALHADA.grupos.length, 6);
  assert.deepEqual(T.AGUA.horas.map((h) => h.rotulo), ["0h", "24h", "48h"]);
  assert.deepEqual(T.LINHAS.curtas.map((c) => c.linha), ["Classic", "Brilliance", "Elegance"]);
  assert.equal(T.CAMADAS.nomes.length, 5);
  assert.equal(T.BAMBU.titulo.length, 2);
  assert.equal(T.SERVE.comoInstalar.passos.length, 3);
  assert.equal(T.SERVE.ondeUsar.paragrafos.length, 2);
  assert.equal(T.SERVE.ondeNaoUsar.paragrafos.length, 1);
});

test("regras de fato: absorção, densidade do substrato, banheiro, fachada", () => {
  const tudo = todos.map((t) => t.texto).join("\n");
  assert.ok(!/inchamento/i.test(tudo), "0,2% é absorção, não inchamento");
  // O número sozinho (FICHA.numeros, a linha da ficha detalhada) vem ao lado de um rótulo com "substrato".
  assert.equal(T.FICHA.numeros[3].rotulo, "Densidade do substrato");
  assert.ok(T.FICHA_DETALHADA.grupos.some((g) => g.linhas.some(([r, v]) => v === "550 kg/m³" && /substrato/.test(r))));
  for (const { caminho, texto } of todos) {
    if (/banheiro/i.test(texto) && !/impermeabiliza/i.test(texto)) assert.fail(`${caminho}: banheiro sem a base impermeabilizada: "${texto}"`);
  }
  assert.ok(!/Permitido/.test(tudo), "fachada não é permitida");
});

test("sem termo proibido", () => {
  const proibidos = [/[—–]/, /impermeáv/i, /mais caro/i, /estrutural/i, /\buv\b/i, /R\$/];
  for (const { caminho, texto } of todos) {
    for (const re of proibidos) assert.ok(!re.test(texto), `${caminho} tem ${re}: "${texto}"`);
  }
  const comTolerancia = todos.filter((t) => /±10%/.test(t.texto)).map((t) => t.caminho);
  assert.deepEqual(comTolerancia, [TOLERANCIA]);
  const comMdf = todos.filter((t) => /\bmdf\b/i.test(t.texto)).map((t) => t.caminho);
  assert.deepEqual(comMdf, ["AGUA.horas.0.alt", "AGUA.horas.1.alt", "AGUA.horas.2.alt"]);
});
