// Porteiro da intro (IntroOrbita.tsx): o .tsx não é importável pelo node --test,
// então o teste lê o arquivo, avalia o template literal do PORTEIRO (o mesmo
// escape que o JSX recebe) e roda a string resultante num `vm` com location,
// sessionStorage, matchMedia e document falsos.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const FONTE = fs.readFileSync(path.join(AQUI, "IntroOrbita.tsx"), "utf8");

function lerPorteiro() {
  const m = /export const PORTEIRO = (`[^`]*`);/.exec(FONTE);
  assert.ok(m, "export const PORTEIRO = `...`; não encontrado em IntroOrbita.tsx");
  assert.ok(!m[1].includes("${"), "o PORTEIRO não pode interpolar nada");
  // Avalia o literal como o compilador: `\\/` vira `\/` na string que vai ao <script>.
  return vm.runInNewContext(m[1]);
}

const PORTEIRO = lerPorteiro();

function rodar(pathname, { guardado = {}, reduzido = false } = {}) {
  const dados = { ...guardado };
  const atributos = {};
  const sessionStorage = {
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => {
      dados[k] = String(v);
    },
  };
  const window = {
    sessionStorage,
    matchMedia: (q) => ({ matches: reduzido && q.includes("reduce") }),
  };
  const contexto = {
    window,
    sessionStorage,
    location: { pathname },
    document: {
      documentElement: {
        setAttribute: (k, v) => {
          atributos[k] = v;
        },
      },
    },
  };
  vm.runInNewContext(PORTEIRO, contexto);
  return { dados, atributos };
}

test("a string do porteiro é JavaScript válido e começa pela regra de /onde-comprar", () => {
  assert.doesNotThrow(() => new vm.Script(PORTEIRO));
  const primeira = PORTEIRO.indexOf("onde-comprar");
  assert.ok(primeira > 0 && primeira < PORTEIRO.indexOf("admin"), "a regra de /onde-comprar vem antes das outras");
});

test("/onde-comprar: grava orbital-intro e não liga data-intro", () => {
  const { dados, atributos } = rodar("/onde-comprar");
  assert.equal(dados["orbital-intro"], "1");
  assert.equal(atributos["data-intro"], undefined);
});

test("/onde-comprar/ com subcaminho também é a página das lojas", () => {
  const { dados, atributos } = rodar("/onde-comprar/qualquer");
  assert.equal(dados["orbital-intro"], "1");
  assert.equal(atributos["data-intro"], undefined);
});

test("/onde-comprar-x não é a página das lojas: a intro segue a regra comum", () => {
  const { atributos } = rodar("/onde-comprar-x");
  assert.equal(atributos["data-intro"], "1");
});

test("/projetos na 1ª visita: liga data-intro", () => {
  const { dados, atributos } = rodar("/projetos");
  assert.equal(dados["orbital-intro"], "1");
  assert.equal(atributos["data-intro"], "1");
});

test("/projetos depois de /onde-comprar na mesma sessão: não liga data-intro", () => {
  const primeira = rodar("/onde-comprar");
  const { atributos } = rodar("/projetos", { guardado: primeira.dados });
  assert.equal(atributos["data-intro"], undefined);
});

test("/admin/x: nada (nem a chave, nem o atributo)", () => {
  const { dados, atributos } = rodar("/admin/x");
  assert.deepEqual(dados, {});
  assert.deepEqual(atributos, {});
});

test("/ com movimento reduzido: nada", () => {
  const { dados, atributos } = rodar("/", { reduzido: true });
  assert.deepEqual(dados, {});
  assert.deepEqual(atributos, {});
});
