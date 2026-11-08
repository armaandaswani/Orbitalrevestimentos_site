import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
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
  deveTocarAbertura,
  DURACAO_ABERTURA_MS,
  CHAVE_ABERTURA,
  SCRIPT_ABERTURA_PDV,
  CSS_LOJA_PRIMEIRO,
  CARTAO_PDV,
  parceirosNaGrade,
  camposRevendaDoCorpo,
  mensagemErroSalvar,
} from "./pontos-de-venda.ts";
import { CAIXA_GERADA, LARGURA, ALTURA, ROTULOS_FIXOS, MAPA_SVG, CAMADAS_MANAUS } from "../components/onde-comprar/dados-mapa-manaus.ts";

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
test("normalizarInstagram aceita www./m. e recusa o que não é perfil", () => {
  assert.equal(normalizarInstagram("https://m.instagram.com/rwa_revestimentos"), "rwa_revestimentos");
  assert.equal(normalizarInstagram("m.instagram.com/rwa"), "rwa");
  assert.equal(normalizarInstagram("www.instagram.com/rwa/"), "rwa");
  assert.equal(normalizarInstagram("instagram.com/rwa"), "rwa");
  assert.equal(normalizarInstagram("instagram.com/p/xyz"), null);
  assert.equal(normalizarInstagram("https://www.instagram.com/reel/abc/"), null);
  assert.equal(normalizarInstagram("instagram.com/reels/abc"), null);
  assert.equal(normalizarInstagram("instagram.com/explore/tags/x"), null);
  assert.equal(normalizarInstagram("instagram.com/stories/rwa/123"), null);
  assert.equal(normalizarInstagram("m.instagram.com"), null);
  assert.equal(normalizarInstagram("instagram.com"), null);
  assert.equal(normalizarInstagram("rwa."), null);
  assert.equal(normalizarInstagram("rwa.com"), null);
  assert.equal(normalizarInstagram("@rwa.revest"), "rwa.revest");
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

// ---------------------------------------------------------------------------
// Abertura animada: decisão e script inline (antes da primeira pintura)
// ---------------------------------------------------------------------------

const BASE_ABERTURA = {
  temLoja: false,
  reduzMovimento: false,
  reduzDados: false,
  saveData: false,
  jaTocou: false,
};

test("deveTocarAbertura: sem sinais restritivos toca", () => {
  assert.equal(deveTocarAbertura(BASE_ABERTURA), true);
  assert.equal(DURACAO_ABERTURA_MS, 3800);
  assert.equal(CHAVE_ABERTURA, "orbital-pdv-abertura");
});

for (const s of [
  { temLoja: true },
  { reduzMovimento: true },
  { reduzDados: true },
  { saveData: true },
  { jaTocou: true },
  { tipoConexao: "slow-2g" },
  { tipoConexao: "2g" },
  { tipoConexao: "3g" },
  { memoria: 2 },
  { memoria: 3.5 },
  { memoria: 8, nucleos: 4 },
  { memoria: 8, nucleos: 2 },
]) {
  test(`deveTocarAbertura é false com ${JSON.stringify(s)}`, () => {
    assert.equal(deveTocarAbertura({ ...BASE_ABERTURA, ...s }), false);
  });
}

for (const s of [
  { tipoConexao: "4g" },
  { memoria: 4, nucleos: 8 },
  { memoria: 8, nucleos: 8 },
  { memoria: 8 },
  // iPhone: o WebKit não expõe deviceMemory e trava os núcleos em 4.
  { nucleos: 4 },
  { nucleos: 2 },
]) {
  test(`deveTocarAbertura é true com ${JSON.stringify(s)}`, () => {
    assert.equal(deveTocarAbertura({ ...BASE_ABERTURA, ...s }), true);
  });
}

// Roda o SCRIPT_ABERTURA_PDV em node:vm com um contexto falso e devolve o que o
// script fez: o atributo no <html>, os listeners registrados e o storage.
function rodarAbertura(sinais = {}, opcoes = {}) {
  const atributos = {};
  const ouvintes = { janela: {}, documento: {} };
  const temporizadores = [];
  const contagem = { remocoes: 0 };
  const estilos = [];
  const guardado = opcoes.guardado ?? {};
  const navigator = {};
  if (sinais.memoria !== undefined) navigator.deviceMemory = sinais.memoria;
  if (sinais.nucleos !== undefined) navigator.hardwareConcurrency = sinais.nucleos;
  if (sinais.saveData !== undefined || sinais.tipoConexao !== undefined) {
    navigator.connection = { saveData: sinais.saveData, effectiveType: sinais.tipoConexao };
  }
  const contexto = {
    location: { search: sinais.search ?? "" },
    navigator,
    matchMedia: (q) => ({
      matches:
        q === "(prefers-reduced-motion: reduce)"
          ? !!sinais.reduzMovimento
          : q === "(prefers-reduced-data: reduce)"
            ? !!sinais.reduzDados
            : false,
    }),
    setTimeout: (fn, ms) => temporizadores.push({ fn, ms }),
    addEventListener: (tipo, fn, op) => {
      if (opcoes.janelaLanca) throw new Error("addEventListener quebrado");
      ouvintes.janela[tipo] = { fn, op };
    },
    document: {
      documentElement: {
        setAttribute: (k, v) => {
          atributos[k] = String(v);
        },
        removeAttribute: (k) => {
          contagem.remocoes++;
          delete atributos[k];
        },
        getAttribute: (k) => (k in atributos ? atributos[k] : null),
      },
      addEventListener: (tipo, fn, op) => {
        ouvintes.documento[tipo] = { fn, op };
      },
      createElement: (tag) => ({ tag, textContent: "" }),
      head: { appendChild: (el) => estilos.push(el) },
    },
  };
  if (opcoes.storageLanca) {
    Object.defineProperty(contexto, "sessionStorage", {
      get() {
        throw new Error("bloqueado");
      },
    });
  } else {
    contexto.sessionStorage = guardado;
  }
  contexto.window = contexto;
  vm.runInNewContext(SCRIPT_ABERTURA_PDV, contexto);
  return {
    atributo: contexto.document.documentElement.getAttribute("data-pdv-abertura"),
    atributos,
    ouvintes,
    temporizadores,
    contagem,
    guardado,
    estilos,
    documento: contexto.document,
  };
}

test("J1: ?loja=<slug> injeta o <style> que põe a loja em primeiro na lista", () => {
  const r = rodarAbertura({ search: "?loja=rwa-comercio-de-pisos" });
  assert.equal(r.estilos.length, 1);
  assert.equal(r.estilos[0].tag, "style");
  assert.equal(r.estilos[0].textContent, `#loja-rwa-comercio-de-pisos${CSS_LOJA_PRIMEIRO}`);
  assert.match(CSS_LOJA_PRIMEIRO, /order:-1/);
  assert.equal(r.atributo, null); // com loja a abertura não toca
});

test("J1: vale o último valor não vazio, em minúsculas, com utm e origem em volta", () => {
  assert.equal(rodarAbertura({ search: "?loja=a&loja=" }).estilos[0].textContent, `#loja-a${CSS_LOJA_PRIMEIRO}`);
  assert.equal(rodarAbertura({ search: "?utm_source=ste&loja=RWA-Comercio-de-Pisos&origem=ste" }).estilos[0].textContent, `#loja-rwa-comercio-de-pisos${CSS_LOJA_PRIMEIRO}`);
});

test("J1: texto fora do padrão de slug não entra no CSS", () => {
  for (const search of ["?loja=<script>", "?loja=%3Cscript%3E", "?loja=a%7Bcolor:red%7D", "?loja=%E0%A4%A", "?loja=a.b", `?loja=${"a".repeat(81)}`, "?loja=", ""]) {
    let r;
    assert.doesNotThrow(() => {
      r = rodarAbertura({ search });
    }, search);
    assert.equal(r.estilos.length, 0, search);
  }
});

test("SCRIPT_ABERTURA_PDV lê location.search (o catch não esconde erro)", () => {
  assert.equal(rodarAbertura({ search: "?loja=x" }).atributo, null);
  // Sem loja o mesmo contexto toca: o script chegou até o fim.
  assert.equal(rodarAbertura({ search: "" }).atributo, "1");
  // loja vazia não conta como loja.
  assert.equal(rodarAbertura({ search: "?loja=" }).atributo, "1");
  assert.equal(rodarAbertura({ search: "?a=1&loja=y" }).atributo, null);
});

test("SCRIPT_ABERTURA_PDV dá a mesma decisão que deveTocarAbertura", () => {
  const matriz = [
    { nome: "nada", sinais: {} },
    { nome: "loja", sinais: { search: "?loja=ste" } },
    { nome: "movimento reduzido", sinais: { reduzMovimento: true } },
    { nome: "poucos dados", sinais: { reduzDados: true } },
    { nome: "save-data", sinais: { saveData: true } },
    { nome: "3g", sinais: { tipoConexao: "3g" } },
    { nome: "4g", sinais: { tipoConexao: "4g" } },
    { nome: "2 GB", sinais: { memoria: 2 } },
    { nome: "8 GB, 4 núcleos", sinais: { memoria: 8, nucleos: 4 } },
    { nome: "8 GB, 8 núcleos", sinais: { memoria: 8, nucleos: 8 } },
    { nome: "iPhone", sinais: { nucleos: 4 } },
    { nome: "2g", sinais: { tipoConexao: "2g" } },
    { nome: "slow-2g", sinais: { tipoConexao: "slow-2g" } },
    // Na divisa: 4 GB com 8 núcleos toca (trocar <4 por <=4 na string quebraria este).
    { nome: "4 GB, 8 núcleos", sinais: { memoria: 4, nucleos: 8 } },
    { nome: "3,5 GB sem núcleos", sinais: { memoria: 3.5 } },
    { nome: "já tocou", sinais: {}, guardado: { [CHAVE_ABERTURA]: "1" } },
    {
      nome: "tudo ruim",
      sinais: { search: "?loja=a", reduzMovimento: true, saveData: true, memoria: 1, nucleos: 2 },
    },
  ];
  assert.equal(matriz.length, 17);
  for (const { nome, sinais, guardado } of matriz) {
    const r = rodarAbertura(sinais, { guardado: guardado ? { ...guardado } : {} });
    const esperado = deveTocarAbertura({
      temLoja: /[?&]loja=[^&]/.test(sinais.search ?? ""),
      reduzMovimento: !!sinais.reduzMovimento,
      reduzDados: !!sinais.reduzDados,
      saveData: !!sinais.saveData,
      tipoConexao: sinais.tipoConexao,
      memoria: sinais.memoria,
      nucleos: sinais.nucleos,
      jaTocou: !!guardado,
    });
    assert.equal(r.atributo === "1", esperado, nome);
  }
});

test("SCRIPT_ABERTURA_PDV grava a chave e agenda o desligamento", () => {
  const r = rodarAbertura({});
  assert.equal(r.atributo, "1");
  assert.equal(r.guardado[CHAVE_ABERTURA], "1");
  assert.equal(r.temporizadores.length, 1);
  assert.equal(r.temporizadores[0].ms, DURACAO_ABERTURA_MS);
  for (const tipo of ["pointerdown", "keydown", "scroll"]) {
    // Campo a campo: o objeto nasce no outro realm do vm, com outro protótipo.
    assert.equal(r.ouvintes.janela[tipo].op.once, true, tipo);
    assert.equal(r.ouvintes.janela[tipo].op.passive, true, tipo);
  }
  assert.ok(r.ouvintes.documento.click);
});

test("sessionStorage que lança não quebra", () => {
  let r;
  assert.doesNotThrow(() => {
    r = rodarAbertura({}, { storageLanca: true });
  });
  assert.equal(r.atributo, null);
});

test("sessionStorage que lança ao gravar não liga", () => {
  const guardado = {};
  Object.defineProperty(guardado, CHAVE_ABERTURA, {
    get: () => undefined,
    set() {
      throw new Error("cheio");
    },
  });
  const r = rodarAbertura({}, { guardado });
  assert.equal(r.atributo, null);
});

test("já tocou nesta sessão", () => {
  const r = rodarAbertura({}, { guardado: { [CHAVE_ABERTURA]: "1" } });
  assert.equal(r.atributo, null);
});

test("rolar ou tocar desliga a abertura", () => {
  for (const tipo of ["scroll", "pointerdown", "keydown"]) {
    const r = rodarAbertura({});
    assert.equal(r.atributo, "1");
    r.ouvintes.janela[tipo].fn({});
    assert.equal(r.atributos["data-pdv-abertura"], undefined, tipo);
  }
});

test("o tempo acaba e desliga a abertura", () => {
  const r = rodarAbertura({});
  r.temporizadores[0].fn();
  assert.equal(r.atributos["data-pdv-abertura"], undefined);
});

test("clicar em [data-pdv-pular] desliga; outro clique não", () => {
  const r = rodarAbertura({});
  r.ouvintes.documento.click.fn({ target: { closest: () => null } });
  assert.equal(r.atributos["data-pdv-abertura"], "1");
  r.ouvintes.documento.click.fn({
    target: { closest: (sel) => (sel === "[data-pdv-pular]" ? {} : null) },
  });
  assert.equal(r.atributos["data-pdv-abertura"], undefined);
});

test("clicar no Pular leva o foco ao h1 do main", () => {
  const r = rodarAbertura({});
  let focado = null;
  let seletor = null;
  r.documento.querySelector = (sel) => {
    seletor = sel;
    return { focus: () => (focado = sel) };
  };
  r.ouvintes.documento.click.fn({ target: { closest: () => null } });
  assert.equal(focado, null);
  r.ouvintes.documento.click.fn({ target: { closest: (sel) => (sel === "[data-pdv-pular]" ? {} : null) } });
  assert.equal(seletor, "main h1");
  assert.equal(focado, "main h1");
});

test("pointerdown no Pular agenda o foco no h1 (depois do mousedown); fora dele, não", () => {
  const fora = rodarAbertura({});
  fora.ouvintes.janela.pointerdown.fn({ target: { closest: () => null } });
  assert.equal(fora.atributos["data-pdv-abertura"], undefined);
  assert.equal(fora.temporizadores.length, 1);

  const r = rodarAbertura({});
  let focado = false;
  r.documento.querySelector = () => ({ focus: () => (focado = true) });
  r.ouvintes.janela.pointerdown.fn({ target: { closest: (sel) => (sel === "[data-pdv-pular]" ? {} : null) } });
  assert.equal(r.atributos["data-pdv-abertura"], undefined);
  assert.equal(r.temporizadores.length, 2);
  assert.equal(r.temporizadores[1].ms, 0);
  assert.equal(focado, false);
  r.temporizadores[1].fn();
  assert.equal(focado, true);
});

for (const [nomeTecla, tecla] of [["Espaço", " "], ["Enter", "Enter"]]) {
  test(`${nomeTecla} no Pular desliga, cancela o padrão e foca o h1 sem rolar`, () => {
    const r = rodarAbertura({});
    let opcoesFoco = null;
    r.documento.querySelector = () => ({ focus: (op) => (opcoesFoco = op) });
    let cancelou = false;
    r.ouvintes.documento.keydown.fn({ key: tecla, target: { closest: (sel) => (sel === "[data-pdv-pular]" ? {} : null) }, preventDefault: () => (cancelou = true) });
    assert.equal(r.atributos["data-pdv-abertura"], undefined);
    assert.equal(cancelou, true);
    assert.equal(opcoesFoco?.preventScroll, true);
  });
}

test("Espaço fora do Pular não cancela nada nem mexe no foco", () => {
  const r = rodarAbertura({});
  let focou = false;
  r.documento.querySelector = () => ({ focus: () => (focou = true) });
  let cancelou = false;
  r.ouvintes.documento.keydown.fn({ key: " ", target: { closest: () => null }, preventDefault: () => (cancelou = true) });
  assert.equal(cancelou, false);
  assert.equal(focou, false);
  assert.equal(r.atributos["data-pdv-abertura"], "1"); // quem desliga é o keydown da janela
});

test("se algo lança depois de ligar, o catch tira data-pdv-abertura", () => {
  let r;
  assert.doesNotThrow(() => {
    r = rodarAbertura({}, { janelaLanca: true });
  });
  assert.equal(r.atributo, null);
  assert.equal(r.contagem.remocoes, 1);
  // Sem ter ligado, o catch não mexe no atributo.
  const s = rodarAbertura({}, { storageLanca: true });
  assert.equal(s.contagem.remocoes, 0);
});

test("o desligamento remove o atributo uma vez só", () => {
  const r = rodarAbertura({});
  r.ouvintes.janela.scroll.fn({});
  r.ouvintes.janela.keydown.fn({});
  r.ouvintes.janela.pointerdown.fn({});
  r.ouvintes.documento.click.fn({ target: { closest: () => ({}) } });
  r.temporizadores[0].fn();
  assert.equal(r.contagem.remocoes, 1);
});

test("SCRIPT_ABERTURA_PDV é ES5 e leva os valores do módulo", () => {
  assert.doesNotMatch(SCRIPT_ABERTURA_PDV, /=>|\blet\b|\bconst\b|`|\$\{/);
  assert.ok(SCRIPT_ABERTURA_PDV.includes(CHAVE_ABERTURA));
  assert.ok(SCRIPT_ABERTURA_PDV.includes(String(DURACAO_ABERTURA_MS)));
});

// ── Mapa gerado (scripts/gerar-mapa-manaus.mjs) ───────────────────────────
test("a caixa do mapa gerado é a CAIXA_MANAUS da projeção", () => {
  assert.deepEqual({ ...CAIXA_GERADA }, { ...CAIXA_MANAUS });
  assert.equal(LARGURA, LARGURA_MAPA);
  assert.equal(ALTURA, ALTURA_MAPA);
});
test("o SVG público do mapa tem o viewBox da caixa e um path com id por camada", () => {
  const svg = fs.readFileSync(new URL(`../../public${MAPA_SVG}`, import.meta.url), "utf8");
  assert.match(svg, new RegExp(`viewBox="0 0 ${LARGURA_MAPA} ${ALTURA_MAPA}"`));
  assert.equal(CAMADAS_MANAUS.length, 7);
  for (const id of CAMADAS_MANAUS) {
    const achados = svg.match(new RegExp(`<path id="${id}" d="M[^"]+"/>`, "g")) ?? [];
    assert.equal(achados.length, 1, id);
  }
  // Sem cor no arquivo: quem pinta é o <use> do MapaManaus.
  assert.doesNotMatch(svg, /fill=|stroke=/);
});
test("o mapa gerado traz os dois rótulos fixos dentro do viewBox", () => {
  const textos = ROTULOS_FIXOS.map((r) => r.texto);
  assert.ok(textos.includes("Rio Negro"));
  assert.ok(textos.some((t) => t.startsWith("Av. ")));
  assert.equal(ROTULOS_FIXOS.length, 2);
  for (const r of ROTULOS_FIXOS) {
    assert.ok(r.x >= 0 && r.x <= LARGURA_MAPA, `${r.texto}: x ${r.x}`);
    assert.ok(r.y >= 0 && r.y <= ALTURA_MAPA, `${r.texto}: y ${r.y}`);
    assert.ok(Number.isFinite(r.rotacao));
  }
});

// ── Cartão único "Pontos de venda" nas grades (home, /projetos, /produtos/pfb) ──
const lugar = (id, kind) => ({
  id, slug: id, name: id, kind, address: null, maps_url: null, description: null, logo_url: null, cover_url: null,
  ambient_count: 0, display_cover: null, display_focus_x: 0.5, display_focus_y: 0.5, display_zoom: 1,
});

test("CARTAO_PDV é uma revenda sintética com o texto aprovado", () => {
  assert.equal(CARTAO_PDV.id, "pontos-de-venda");
  assert.equal(CARTAO_PDV.slug, "pontos-de-venda");
  assert.equal(CARTAO_PDV.kind, "revenda");
  assert.equal(CARTAO_PDV.name, "Pontos de venda");
  assert.equal(CARTAO_PDV.description, "Lojas em Manaus");
  assert.equal(CARTAO_PDV.ambient_count, 0);
  assert.equal(CARTAO_PDV.display_focus_x, 0.5);
  assert.equal(CARTAO_PDV.display_focus_y, 0.5);
  assert.equal(CARTAO_PDV.display_zoom, 1);
  assert.equal(CARTAO_PDV.address, null);
  assert.equal(CARTAO_PDV.display_cover, null);
});

test("parceirosNaGrade: 4 showrooms e 4 revendas viram 5 itens e o cartão fica no fim", () => {
  const entrada = [
    lugar("s1", "showroom"), lugar("r1", "revenda"), lugar("s2", "showroom"), lugar("r2", "revenda"),
    lugar("s3", "showroom"), lugar("r3", "revenda"), lugar("s4", "showroom"), lugar("r4", "revenda"),
  ];
  const saida = parceirosNaGrade(entrada);
  assert.equal(saida.length, 5);
  assert.deepEqual(saida.slice(0, 4).map((l) => l.id), ["s1", "s2", "s3", "s4"]);
  assert.equal(saida[4], CARTAO_PDV);
  assert.equal(entrada.length, 8);
});

test("parceirosNaGrade: sem revendas o cartão aparece do mesmo jeito", () => {
  const saida = parceirosNaGrade([lugar("s1", "showroom"), lugar("s2", "showroom")]);
  assert.deepEqual(saida.map((l) => l.id), ["s1", "s2", "pontos-de-venda"]);
});

test("parceirosNaGrade: sem showrooms devolve só o cartão", () => {
  assert.deepEqual(parceirosNaGrade([]), [CARTAO_PDV]);
  assert.deepEqual(parceirosNaGrade([lugar("r1", "revenda")]), [CARTAO_PDV]);
});

// ── Admin: validação comum ao PATCH e ao POST e texto fixo do 500 ─────────────
test("camposRevendaDoCorpo: só os campos que vieram, normalizados", () => {
  assert.deepEqual(camposRevendaDoCorpo({ name: "x" }), { campos: {} });
  assert.deepEqual(
    camposRevendaDoCorpo({ bairro: "  Centro ", horario: "", whatsapp: "(92) 99152-5177", instagram: "https://instagram.com/loja.x/", lat: -3.1, lng: "" }),
    { campos: { bairro: "Centro", horario: null, whatsapp: "5592991525177", instagram: "loja.x", lat: -3.1, lng: null } },
  );
});

test("camposRevendaDoCorpo: mensagens do 400", () => {
  assert.match(camposRevendaDoCorpo({ whatsapp: "9915" }).erro, /^WhatsApp inválido/);
  assert.match(camposRevendaDoCorpo({ instagram: "instagram.com/p/abc" }).erro, /^Instagram inválido/);
  assert.match(camposRevendaDoCorpo({ lat: 91 }).erro, /^Latitude inválida/);
  assert.match(camposRevendaDoCorpo({ lng: "-60,02" }).erro, /^Longitude inválida/);
});

test("mensagemErroSalvar: coluna faltando pede a 076; o resto, texto fixo", () => {
  assert.equal(mensagemErroSalvar("column partner_showrooms.bairro does not exist"), "Falta aplicar a migração 076 no banco.");
  assert.equal(mensagemErroSalvar("Could not find the 'bairro' column of 'partner_showrooms' in the schema cache"), "Falta aplicar a migração 076 no banco.");
  assert.equal(mensagemErroSalvar("connection refused"), "Não foi possível salvar. Tente de novo; se continuar, avise o suporte.");
  assert.equal(mensagemErroSalvar(null), "Não foi possível salvar. Tente de novo; se continuar, avise o suporte.");
});
