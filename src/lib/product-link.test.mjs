import test from "node:test";
import assert from "node:assert/strict";

// SITE_URL é lido no momento em que o módulo é importado: a variável sai antes
// do import para o teste não depender do terminal de quem roda.
delete process.env.NEXT_PUBLIC_SITE_URL;
const L = await import("./product-link.ts");

test("catalogoPath sem nada vai para o catálogo", () => {
  assert.equal(L.catalogoPath({}), "/produtos/pfb/catalogo");
});

test("catalogoPath com modelo normaliza o código", () => {
  assert.equal(L.catalogoPath({ modelo: "ORB-003" }), "/produtos/pfb/catalogo?modelo=orb-003");
});

test("catalogoPath com linha usa o slug", () => {
  assert.equal(L.catalogoPath({ linha: "Classic" }), "/produtos/pfb/catalogo?linha=classic");
});

test("catalogoPath com linha e modelo põe a linha primeiro", () => {
  assert.equal(
    L.catalogoPath({ linha: "Classic", modelo: "ORB-003" }),
    "/produtos/pfb/catalogo?linha=classic&modelo=orb-003",
  );
});

test("catalogoPath deixa 'todos' e modelo vazio fora da query", () => {
  assert.equal(L.catalogoPath({ linha: "todos", modelo: "" }), "/produtos/pfb/catalogo");
});

test("productPath aponta para o catálogo e apara espaços", () => {
  assert.equal(L.productPath(" ORB-012 "), "/produtos/pfb/catalogo?modelo=orb-012");
});

test("productUrl usa o domínio padrão sem NEXT_PUBLIC_SITE_URL", () => {
  assert.equal(
    L.productUrl("ORB-003"),
    "https://orbitalrevestimentos.com.br/produtos/pfb/catalogo?modelo=orb-003",
  );
});

test("linhaDaUrl lê a linha sem diferenciar maiúsculas", () => {
  assert.equal(L.linhaDaUrl("?linha=CLASSIC"), "Classic");
});

test("linhaDaUrl ignora os outros parâmetros", () => {
  assert.equal(L.linhaDaUrl("?linha=brilliance&modelo=orb-009"), "Brilliance");
});

test("linhaDaUrl com valor desconhecido devolve todos", () => {
  assert.equal(L.linhaDaUrl("?linha=xyz"), "todos");
});

test("linhaDaUrl sem query devolve todos", () => {
  assert.equal(L.linhaDaUrl(""), "todos");
});
