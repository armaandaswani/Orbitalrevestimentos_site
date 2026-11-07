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
  CAIXA_MANAUS,
  LARGURA_MAPA,
  ALTURA_MAPA,
  MINIMO_PINO,
  dentroDeManaus,
  projetarManaus,
  cabePino,
  aproximarPinos,
  rotulosDeBairro,
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

// ── Geometria do mapa de Manaus ───────────────────────────────────────────
const TOL = 1e-6;
const perto = (a, b, msg) => assert.ok(Math.abs(a - b) < TOL, `${msg ?? ""} ${a} != ${b}`);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const FOLGA = 1e-9;
const LOJAS = [
  { nome: "Casa do Eletricista", lat: -3.11924, lng: -60.02185 },
  { nome: "Casa do Piso Vinílico", lat: -3.0897271, lng: -60.0428509 },
  { nome: "Império", lat: -3.0884093, lng: -60.0147925 },
  { nome: "RWA", lat: -3.0729976, lng: -60.0021491 },
];

test("constantes do mapa", () => {
  assert.deepEqual(CAIXA_MANAUS, { latMin: -3.15, latMax: -3.06, lngMin: -60.06, lngMax: -59.985 });
  assert.equal(LARGURA_MAPA, 400);
  assert.equal(ALTURA_MAPA, 480);
  assert.equal(MINIMO_PINO, 62);
});
test("projetarManaus: cantos e centro", () => {
  const nw = projetarManaus(-3.06, -60.06);
  perto(nw.x, 0); perto(nw.y, 0);
  const se = projetarManaus(-3.15, -59.985);
  perto(se.x, 400); perto(se.y, 480);
  const c = projetarManaus(-3.105, -60.0225);
  perto(c.x, 200); perto(c.y, 240);
});
test("dentroDeManaus", () => {
  assert.equal(dentroDeManaus(-3.3, -60), false);
  assert.equal(dentroDeManaus(-3.1, -61), false);
  for (const l of LOJAS) assert.equal(dentroDeManaus(l.lat, l.lng), true, l.nome);
});
test("cabePino: as 4 lojas reais cabem; borda e topo não", () => {
  for (const l of LOJAS) assert.equal(cabePino(projetarManaus(l.lat, l.lng)), true, l.nome);
  assert.ok(Math.abs(projetarManaus(-3.0729976, -60.0021491).y - 69.3) < 0.1, "RWA y");
  assert.equal(cabePino({ x: 200, y: 40 }), false);   // o pino vazaria pelo topo
  assert.equal(cabePino({ x: 20, y: 200 }), false);
  assert.equal(cabePino({ x: 390, y: 200 }), false);
  assert.equal(cabePino({ x: 200, y: 470 }), false);
  assert.equal(cabePino({ x: 200, y: 200 }), true);
});
test("aproximarPinos: as 4 lojas reais não se movem", () => {
  const pinos = LOJAS.map((l) => projetarManaus(l.lat, l.lng));
  assert.deepEqual(aproximarPinos(pinos), pinos);
});
test("aproximarPinos: acha o par próximo que não é vizinho na ordem de x", () => {
  const A = { x: 100, y: 0 }, B = { x: 105, y: 200 }, C = { x: 110, y: 5 };
  const r = aproximarPinos([A, B, C]);
  assert.ok(dist(r[0], r[2]) >= 62 - FOLGA);
  assert.deepEqual(r[1], B);
});
test("aproximarPinos: dois colados, média dos x mantida e y intactos", () => {
  const r = aproximarPinos([{ x: 200, y: 100 }, { x: 210, y: 104 }]);
  assert.ok(dist(r[0], r[1]) >= 62 - FOLGA);
  perto((r[0].x + r[1].x) / 2, 205);
  assert.equal(r[0].y, 100); assert.equal(r[1].y, 104);
});
test("aproximarPinos: não muta a entrada, mantém a ordem e os outros campos", () => {
  const entrada = [{ id: "b", x: 210, y: 104 }, { id: "a", x: 200, y: 100 }];
  const copia = JSON.parse(JSON.stringify(entrada));
  const r = aproximarPinos(entrada);
  assert.deepEqual(entrada, copia);
  assert.deepEqual(r.map((p) => p.id), ["b", "a"]);
  assert.ok(r[0].x > r[1].x);   // quem estava à direita continua à direita
});
test("aproximarPinos: três colados ficam a >= 62 entre si", () => {
  const r = aproximarPinos([{ x: 200, y: 100 }, { x: 203, y: 100 }, { x: 206, y: 101 }]);
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) assert.ok(dist(r[i], r[j]) >= 62 - FOLGA);
  perto((r[0].x + r[1].x + r[2].x) / 3, 203);
});
test("aproximarPinos: dois colados perto da borda deslocam o grupo inteiro", () => {
  const r = aproximarPinos([{ x: 390, y: 200 }, { x: 395, y: 200 }]);
  for (const p of r) assert.ok(p.x >= 31 - FOLGA && p.x <= 369 + FOLGA, `x ${p.x}`);
  assert.ok(dist(r[0], r[1]) >= 62 - FOLGA);
});
test("aproximarPinos: dois colados na borda esquerda deslocam o grupo inteiro", () => {
  const r = aproximarPinos([{ x: 5, y: 200 }, { x: 10, y: 200 }]);
  for (const p of r) assert.ok(p.x >= 31 - FOLGA && p.x <= 369 + FOLGA, `x ${p.x}`);
  assert.ok(dist(r[0], r[1]) >= 62 - FOLGA);
  assert.ok(r[0].x < r[1].x);
});
function confere(entrada, r) {
  assert.equal(r.length, entrada.length);
  r.forEach((p, i) => {
    assert.equal(p.y, entrada[i].y);
    assert.ok(p.x >= 31 - FOLGA && p.x <= 369 + FOLGA, `x ${p.x}`);
  });
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) assert.ok(dist(r[i], r[j]) >= 62 - FOLGA, `${i}-${j}`);
}
test("aproximarPinos: dois grupos que se encostam depois de espalhados (4 pinos)", () => {
  const entrada = [{ x: 100, y: 100 }, { x: 102, y: 100 }, { x: 165, y: 100 }, { x: 167, y: 100 }];
  confere(entrada, aproximarPinos(entrada));
});
test("aproximarPinos: grupo de dois que encosta num pino solto (3 pinos)", () => {
  const entrada = [{ x: 100, y: 0 }, { x: 102, y: 0 }, { x: 165, y: 0 }];
  confere(entrada, aproximarPinos(entrada));
});
test("aproximarPinos: propriedade, 2.000 casos semeados de 2 a 6 pinos nunca lançam", () => {
  let semente = 123456789;
  const aleatorio = () => {   // mulberry32
    semente = (semente + 0x6d2b79f5) | 0;
    let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let caso = 0; caso < 2000; caso++) {
    const n = 2 + Math.floor(aleatorio() * 5);
    const entrada = Array.from({ length: n }, (_, k) => ({ id: k, x: 100 + aleatorio() * 160, y: 100 + aleatorio() * 10 }));
    const copia = JSON.parse(JSON.stringify(entrada));
    const r = aproximarPinos(entrada);
    assert.deepEqual(entrada, copia);
    assert.deepEqual(r.map((p) => p.id), entrada.map((p) => p.id));
    confere(entrada, r);
  }
});
test("aproximarPinos: pinos distantes não se movem; lista vazia e um só", () => {
  const longe = [{ x: 50, y: 100 }, { x: 150, y: 100 }, { x: 250, y: 300 }];
  assert.deepEqual(aproximarPinos(longe), longe);
  assert.deepEqual(aproximarPinos([]), []);
  assert.deepEqual(aproximarPinos([{ x: 5, y: 5 }]), [{ x: 5, y: 5 }]);
});
test("aproximarPinos: sem como separar, lança em vez de publicar pinos sobrepostos", () => {
  const muitos = Array.from({ length: 8 }, (_, i) => ({ x: 200 + i, y: 100 }));   // 8 × 62 > 400
  assert.throws(() => aproximarPinos(muitos), /aproximarPinos não estabilizou/);
});
test("rotulosDeBairro: ignora sem bairro ou sem coordenada, um por bairro, 34 abaixo do mais baixo", () => {
  const base = { id: "1", slug: "a", name: "A", address: null, maps_url: null, description: null, bairro: null,
    lat: null, lng: null, whatsapp: null, instagram: null, horario: null };
  const pontos = [
    { ...base, id: "1", bairro: "Centro", lat: -3.1, lng: -60.03 },
    { ...base, id: "2", bairro: "Centro", lat: -3.12, lng: -60.01 },
    { ...base, id: "3", bairro: null, lat: -3.1, lng: -60.0 },
    { ...base, id: "4", bairro: "Cachoeirinha", lat: null, lng: null },
    { ...base, id: "5", bairro: "Flores", lat: -3.08, lng: -60.0 },
    { ...base, id: "6", bairro: "Longe", lat: -3.3, lng: -60.0 },
  ];
  const r = rotulosDeBairro(pontos);
  assert.deepEqual(r.map((x) => x.bairro).sort(), ["Centro", "Flores"]);
  const p1 = projetarManaus(-3.1, -60.03), p2 = projetarManaus(-3.12, -60.01);
  const centro = r.find((x) => x.bairro === "Centro");
  perto(centro.x, (p1.x + p2.x) / 2);
  perto(centro.y, Math.max(p1.y, p2.y) + 34);
});
test("rotulosDeBairro: só conta loja com pino (cabePino) e limita o y do rótulo", () => {
  const base = { id: "1", slug: "a", name: "A", address: null, maps_url: null, description: null, bairro: null,
    lat: null, lng: null, whatsapp: null, instagram: null, horario: null };
  const pontos = [
    { ...base, id: "1", bairro: "Topo", lat: -3.0605, lng: -60.0 },        // y ≈ 3: o pino vazaria pelo topo
    { ...base, id: "2", bairro: "Beira", lat: -3.1, lng: -60.059 },        // x ≈ 5: o pino vazaria pela esquerda
    { ...base, id: "3", bairro: "Sul", lat: -3.145, lng: -60.0 },          // y ≈ 453: 453 + 34 passa do mapa
  ];
  const r = rotulosDeBairro(pontos);
  assert.deepEqual(r.map((x) => x.bairro), ["Sul"]);
  assert.equal(r[0].y, ALTURA_MAPA - 8);
});
