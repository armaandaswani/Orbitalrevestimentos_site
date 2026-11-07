import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizarWhatsapp,
  normalizarInstagram,
  linkWhatsApp,
  origemValida,
  lojaDaUrl,
  acoesDaLoja,
  lerPontosDeVendaDe,
} from "./pontos-de-venda.ts";

test("normalizarWhatsapp aceita os formatos do admin", () => {
  assert.deepEqual(normalizarWhatsapp("+55 (92) 9 9152-5177"), { valor: "5592991525177" });
  assert.deepEqual(normalizarWhatsapp("92991525177"), { valor: "5592991525177" });
  assert.deepEqual(normalizarWhatsapp("(92) 3234-5678"), { valor: "559232345678" });
  assert.deepEqual(normalizarWhatsapp("  "), { valor: null });
  assert.ok("erro" in normalizarWhatsapp("991525177"));        // sem DDD
  assert.ok("erro" in normalizarWhatsapp("55929915251771234"));
});
test("normalizarInstagram tira @ e URL", () => {
  assert.equal(normalizarInstagram("@imperiorevest"), "imperiorevest");
  assert.equal(normalizarInstagram("https://www.instagram.com/rwa_revestimentos/?hl=pt"), "rwa_revestimentos");
  assert.equal(normalizarInstagram(""), null);
});
test("linkWhatsApp codifica o texto", () => {
  assert.equal(linkWhatsApp("5592991554911", "Olá, PFB"), "https://wa.me/5592991554911?text=Ol%C3%A1%2C%20PFB");
});
test("origemValida fecha a lista", () => {
  assert.equal(origemValida("ste"), "ste"); assert.equal(origemValida("STE"), "ste");
  assert.equal(origemValida("facebook"), "outro"); assert.equal(origemValida(null), null);
});
test("lojaDaUrl", () => {
  const s = ["rwa-comercio-de-pisos", "casa-do-piso-vinilico"];
  assert.deepEqual(lojaDaUrl("?loja=rwa-comercio-de-pisos&origem=ste", s), { slug: "rwa-comercio-de-pisos", invalida: null });
  assert.deepEqual(lojaDaUrl("?loja=RWA-Comercio-de-Pisos", s), { slug: "rwa-comercio-de-pisos", invalida: null });
  assert.deepEqual(lojaDaUrl("?loja=loja-fechada", s), { slug: null, invalida: "loja-fechada" });
  assert.deepEqual(lojaDaUrl("?loja=%20&loja=x", s), { slug: null, invalida: "x" });   // vale o último não vazio
  assert.deepEqual(lojaDaUrl("", s), { slug: null, invalida: null });
});
test("acoesDaLoja mostra só o que existe", () => {
  const base = { id: "1", slug: "a", name: "A", address: null, maps_url: null, description: null, bairro: null,
    lat: null, lng: null, whatsapp: null, instagram: null, horario: null };
  assert.deepEqual(acoesDaLoja(base).map((a) => a.tipo), ["rota"]);        // rota sempre (busca pelo nome)
  const cheia = { ...base, whatsapp: "5592991554911", instagram: "rwa", lat: -3.09, lng: -60.02 };
  assert.deepEqual(acoesDaLoja(cheia).map((a) => a.tipo), ["whatsapp", "rota", "waze", "instagram"]);
  assert.ok(acoesDaLoja(cheia).every((a) => !a.href.includes("undefined") && !a.href.includes("null")));
});
test("lerPontosDeVendaDe: plano B quando a coluna nova falta", async () => {
  const pedidos = [];
  const consultar = async (cols) => { pedidos.push(cols);
    return cols.includes("lat") ? { data: null, error: { code: "42703", message: "column lat does not exist" } }
      : { data: [{ id: "1", slug: "a", name: "A", address: "Rua X", maps_url: null, description: null, sort_order: 1 }], error: null }; };
  const r = await lerPontosDeVendaDe(consultar, (e) => e.code === "42703");
  assert.equal(pedidos.length, 2); assert.equal(r.erro, null);
  assert.equal(r.pontos[0].lat, null); assert.equal(r.pontos[0].whatsapp, null);
});
test("lerPontosDeVendaDe: outro erro volta em erro", async () => {
  const r = await lerPontosDeVendaDe(async () => ({ data: null, error: { code: "500", message: "boom" } }), () => false);
  assert.deepEqual(r, { pontos: [], erro: "boom" });
});
test("lerPontosDeVendaDe: erro também na 2ª consulta volta em erro", async () => {
  const r = await lerPontosDeVendaDe(async () => ({ data: null, error: { code: "42703", message: "column kind does not exist" } }), (e) => e.code === "42703");
  assert.deepEqual(r, { pontos: [], erro: "column kind does not exist" });
});
test("lerPontosDeVendaDe: lista vazia é erro (o ISR guarda a versão boa)", async () => {
  const r = await lerPontosDeVendaDe(async () => ({ data: [], error: null }), () => false);
  assert.deepEqual(r, { pontos: [], erro: "nenhum ponto de venda" });
});
test("lerPontosDeVendaDe: coluna ausente na resposta vira null, nunca undefined", async () => {
  const r = await lerPontosDeVendaDe(async () => ({ data: [{ id: "1", slug: "a", name: "A" }], error: null }), () => false);
  assert.ok(Object.values(r.pontos[0]).every((v) => v !== undefined));
});
