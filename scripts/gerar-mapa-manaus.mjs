/**
 * Gera o mapa de Manaus da página /onde-comprar a partir do OpenStreetMap: a
 * água (rio Negro e igarapés), as vias principais e os parques, num SVG estático
 * nas cores da marca. Nada de mapa interativo nem de tiles de terceiros: o mapa
 * é desenhado uma vez aqui e a página só carrega o resultado.
 *
 *   node scripts/gerar-mapa-manaus.mjs [--osm <arquivo.json>] [--cache <pasta>]
 *                                      [--prototipo <pasta> [--pontos <coordenadas.json>]]
 *
 * Grava public/images/onde-comprar/mapa-manaus.svg (o desenho: um <path id> por
 * camada dentro de <defs>, sem cor; a página desenha cada camada com
 * <use href="/images/onde-comprar/mapa-manaus.svg#camada">, fora do HTML e do
 * payload RSC) e src/components/onde-comprar/dados-mapa-manaus.ts (caixa, cores,
 * larguras e rótulos). Nenhum dos dois se edita à mão. Com --prototipo grava também, na pasta indicada, o protótipo
 * da Fase 0 (mapa-manaus.svg e mapa-manaus.json, com os pontos de --pontos).
 *
 * Fonte: OpenStreetMap, © colaboradores do OpenStreetMap, licença ODbL
 * (https://www.openstreetmap.org/copyright). A página mostra "© OpenStreetMap"
 * no canto do mapa. Os dados vêm de UMA consulta à Overpass API
 * (overpass-api.de), com User-Agent próprio, na caixa de DOWNLOAD (maior que a
 * do desenho, para dar para ajustar o recorte sem consultar de novo). A
 * resposta bruta fica em --cache (ou numa pasta temporária, ou é lida de --osm)
 * e nunca entra no repositório: só o resultado, que é pequeno.
 *
 * Como funciona:
 * - Projeção equirretangular da CAIXA para um viewBox de LADO unidades de
 *   largura; a altura sai da proporção da caixa (na latitude de Manaus o
 *   cosseno é 0,9986, então grau de latitude e de longitude valem o mesmo).
 * - Água: as bordas dos polígonos de água (ways fechadas e membros de
 *   multipolígono `natural=water` e `waterway=riverbank`) são emendadas pelas
 *   pontas, recortadas na caixa e fechadas pela borda da caixa. Cada face que
 *   sobra é água ou terra pela paridade: conta quantas bordas o segmento entre
 *   um ponto sabidamente no rio (PONTO_RIO) e a face cruza. Assim o rio, que é
 *   um multipolígono enorme, sai sem precisar baixar o polígono inteiro.
 *   Igarapés mapeados só como linha (`waterway=river|stream|canal`) saem como
 *   traço fino da cor da água.
 * - Vias: trunk/primary (traço mais largo), secondary, tertiary (mais claro);
 *   residenciais ficam de fora (veja RESIDENCIAIS).
 * - Parques: `leisure=park` fechados, recortados na caixa.
 * - Simplificação: Douglas–Peucker em unidades do viewBox, coordenadas a 0,1
 *   unidade, path relativo.
 *
 * Protótipo (--prototipo): `mapa-manaus.svg` com os pontos de --pontos (o
 * coordenadas.json da Fase 0) e `mapa-manaus.json` com os paths, a caixa, os
 * rótulos sugeridos e os tamanhos. Serve para conferir que o desenho não mudou.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const OVERPASS = "https://overpass-api.de/api/interpreter";
/** Mesmo endereço do BASE_URL de src/app/layout.tsx. */
const SITE = "https://orbitalrevestimentos.com.br";
const UA = `OrbitalRevestimentos-site/1.0 (+${SITE}; mapa /onde-comprar; gerar-mapa-manaus.mjs)`;
/** Relativo à raiz do repositório; o script grava aí de qualquer pasta em que rode. */
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA_TS = path.join(RAIZ, "src/components/onde-comprar/dados-mapa-manaus.ts");
const SAIDA_SVG = path.join(RAIZ, "public/images/onde-comprar/mapa-manaus.svg");
/** Camadas do SVG público, cada uma com este `id` (a ordem de desenho é a do MapaManaus). */
const CAMADAS_SVG = ["agua", "ilhas", "igarapes", "parques", "principal", "secundaria", "terciaria"];
const ARQUIVO_CACHE = "overpass-manaus.json";

/** Caixa do download (graus): a do desenho com folga. */
const DOWNLOAD = { latMin: -3.175, latMax: -3.04, lngMin: -60.08, lngMax: -59.97 };
/**
 * Caixa do desenho (graus). Tem de ser igual a CAIXA_MANAUS de
 * src/lib/pontos-de-venda.ts; o teste confere. Folga das 4 lojas da Fase 0 até
 * cada borda:
 * - norte (−3,06): a RWA (lat −3,0730) fica 0,013° (~1,4 km) abaixo, o que
 *   deixa o pino de 44 px, que sobe ~1 km acima da ponta, dentro do mapa;
 * - oeste (−60,06): a Casa do Piso Vinílico (lng −60,0429) fica 0,017° (~1,9 km);
 * - leste (−59,985): a RWA (lng −60,0021) fica 0,017° (~1,9 km);
 * - sul (−3,15): a Casa do Eletricista (lat −3,1192) fica 0,031° (~3,4 km), o
 *   que inclui a margem do rio Negro e os igarapés de São Raimundo e de
 *   Educandos, que ajudam a reconhecer a cidade.
 * Norte e oeste saíram um pouco menores que −3,055 e −60,065, onde não havia
 * nada útil. Loja fora da caixa aparece só na lista, sem pino.
 */
const CAIXA = { latMin: -3.15, latMax: -3.06, lngMin: -60.06, lngMax: -59.985 };
/** Largura do viewBox; a altura segue a proporção da caixa. */
const LADO = 400;
/** Um ponto no meio do rio Negro, ao sul do Centro (referência da paridade da água). */
const PONTO_RIO = { lat: -3.147, lng: -60.03 };
/**
 * Residenciais: ficam de fora. Com elas os paths passam de ~40 kB para ~123 kB
 * (gzip de ~16 kB para ~48 kB) e a malha fina enche o fundo atrás dos pinos.
 */
const RESIDENCIAIS = false;
/** Tolerância do Douglas–Peucker, em unidades do viewBox. */
const TOLERANCIA = { agua: 0.35, via: 0.45, parque: 0.6 };
/** Comprimento mínimo de um trecho de via para entrar (unidades). */
const MINIMO_TRECHO = 2;
/** Igarapé só de linha (stream) entra a partir deste comprimento; rio e canal sempre. */
const MINIMO_IGARAPE = 15;

const CLASSES = {
  principal: ["motorway", "trunk", "primary", "motorway_link", "trunk_link", "primary_link"],
  secundaria: ["secondary", "secondary_link"],
  terciaria: ["tertiary", "tertiary_link"],
  residencial: ["residential", "unclassified"],
};

const COR = {
  terra: "#F6F5F2",
  agua: "#BCCADF",
  parque: "#E3EBDD",
  principal: "#FFFFFF",
  principalBorda: "#D3CFC6",
  secundaria: "#FFFFFF",
  terciaria: "#E6E3DC",
  residencial: "#ECE9E2",
};
const LARGURA_VIA = { principal: 4.2, principalBorda: 5.6, secundaria: 2.6, terciaria: 1.4, residencial: 0.8, igarape: 1.6 };

function lerArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--osm") a.osm = argv[++i];
    else if (argv[i] === "--cache") a.cache = argv[++i];
    else if (argv[i] === "--prototipo") a.prototipo = argv[++i];
    else if (argv[i] === "--pontos") a.pontos = argv[++i];
  }
  return a;
}

function consulta() {
  const b = `${DOWNLOAD.latMin},${DOWNLOAD.lngMin},${DOWNLOAD.latMax},${DOWNLOAD.lngMax}`;
  const vias = [...CLASSES.principal, ...CLASSES.secundaria, ...CLASSES.terciaria, ...CLASSES.residencial].join("|");
  return `[out:json][timeout:120];
(
  way["highway"~"^(${vias})$"](${b});
  way["natural"="water"](${b});
  way["waterway"~"^(riverbank|river|stream|canal)$"](${b});
  relation["natural"="water"](${b});
  relation["waterway"="riverbank"](${b});
  way["leisure"="park"](${b});
  node["place"~"^(suburb|neighbourhood|quarter)$"](${b});
);
out geom(${b});`;
}

/** Lê a resposta da Overpass. `temporaria` é a pasta que o script criou e que main() apaga no fim. */
async function obterOsm(args) {
  if (args.osm) return { osm: JSON.parse(fs.readFileSync(args.osm, "utf8")), temporaria: null };
  const temporaria = args.cache ? null : fs.mkdtempSync(path.join(os.tmpdir(), "overpass-manaus-"));
  const pasta = args.cache || temporaria;
  fs.mkdirSync(pasta, { recursive: true });
  const arquivo = path.join(pasta, ARQUIVO_CACHE);
  if (!fs.existsSync(arquivo)) {
    const res = await fetch(OVERPASS, {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(consulta()),
    });
    if (!res.ok) throw new Error(`Overpass respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`);
    fs.writeFileSync(arquivo, await res.text());
    console.log(`Overpass: ${(fs.statSync(arquivo).size / 1e6).toFixed(1)} MB → ${arquivo}`);
  }
  return { osm: JSON.parse(fs.readFileSync(arquivo, "utf8")), temporaria };
}

// ── Projeção ──────────────────────────────────────────────────────────────
const ESCALA = LADO / (CAIXA.lngMax - CAIXA.lngMin);
const ALTURA = Math.round((CAIXA.latMax - CAIXA.latMin) * ESCALA);
function projetarManaus(lat, lng) {
  return [(lng - CAIXA.lngMin) * ESCALA, (CAIXA.latMax - lat) * ESCALA];
}

/** Geometria de um elemento da Overpass em trechos contínuos de [x, y] (os nós fora da caixa do download vêm nulos). */
function trechosDe(geometria) {
  const trechos = [];
  let atual = [];
  for (const g of geometria ?? []) {
    if (!g) {
      if (atual.length > 1) trechos.push(atual);
      atual = [];
      continue;
    }
    atual.push(projetarManaus(g.lat, g.lon));
  }
  if (atual.length > 1) trechos.push(atual);
  return trechos;
}

const igual = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
const fechado = (t) => t.length > 3 && igual(t[0], t[t.length - 1]);

/** Emenda trechos que se tocam pelas pontas (as ways de um multipolígono). */
function emendar(trechos) {
  const abertos = trechos.filter((t) => !fechado(t)).map((t) => [...t]);
  const prontos = trechos.filter(fechado);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (let i = 0; i < abertos.length && !mudou; i++) {
      for (let j = 0; j < abertos.length && !mudou; j++) {
        if (i === j) continue;
        const a = abertos[i];
        const b = abertos[j];
        let novo = null;
        if (igual(a[a.length - 1], b[0])) novo = [...a, ...b.slice(1)];
        else if (igual(a[a.length - 1], b[b.length - 1])) novo = [...a, ...[...b].reverse().slice(1)];
        else if (igual(a[0], b[b.length - 1])) novo = [...b, ...a.slice(1)];
        else if (igual(a[0], b[0])) novo = [...[...b].reverse(), ...a.slice(1)];
        if (novo) {
          abertos.splice(Math.max(i, j), 1);
          abertos.splice(Math.min(i, j), 1);
          (fechado(novo) ? prontos : abertos).push(novo);
          mudou = true;
        }
      }
    }
  }
  return { fechados: prontos, abertos };
}

// ── Recorte ───────────────────────────────────────────────────────────────
/** Liang–Barsky no retângulo 0..LADO × 0..ALTURA; null se fica todo fora. */
function recortarSegmento([x0, y0], [x1, y1]) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [
    [-dx, x0],
    [dx, LADO - x0],
    [-dy, y0],
    [dy, ALTURA - y0],
  ]) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  return [
    [x0 + t0 * dx, y0 + t0 * dy],
    [x0 + t1 * dx, y0 + t1 * dy],
  ];
}

/** Uma linha recortada vira os pedaços que ficam dentro da caixa. */
function recortarLinha(t) {
  const pedacos = [];
  let atual = null;
  for (let i = 1; i < t.length; i++) {
    const s = recortarSegmento(t[i - 1], t[i]);
    if (!s) {
      if (atual) pedacos.push(atual);
      atual = null;
      continue;
    }
    if (atual && igual(atual[atual.length - 1], s[0])) atual.push(s[1]);
    else {
      if (atual) pedacos.push(atual);
      atual = [s[0], s[1]];
    }
  }
  if (atual) pedacos.push(atual);
  return pedacos;
}

const dentro = ([x, y]) => x > 1e-6 && x < LADO - 1e-6 && y > 1e-6 && y < ALTURA - 1e-6;

/** Sutherland–Hodgman de um anel fechado contra a caixa (para os parques). */
function recortarAnel(anel) {
  let saida = anel.slice(0, -1);
  const lados = [
    (p) => p[0] >= 0,
    (p) => p[0] <= LADO,
    (p) => p[1] >= 0,
    (p) => p[1] <= ALTURA,
  ];
  const corte = [
    (a, b) => [0, a[1] + ((b[1] - a[1]) * (0 - a[0])) / (b[0] - a[0])],
    (a, b) => [LADO, a[1] + ((b[1] - a[1]) * (LADO - a[0])) / (b[0] - a[0])],
    (a, b) => [a[0] + ((b[0] - a[0]) * (0 - a[1])) / (b[1] - a[1]), 0],
    (a, b) => [a[0] + ((b[0] - a[0]) * (ALTURA - a[1])) / (b[1] - a[1]), ALTURA],
  ];
  for (let k = 0; k < 4 && saida.length; k++) {
    const entra = saida;
    saida = [];
    for (let i = 0; i < entra.length; i++) {
      const a = entra[(i + entra.length - 1) % entra.length];
      const b = entra[i];
      if (lados[k](b)) {
        if (!lados[k](a)) saida.push(corte[k](a, b));
        saida.push(b);
      } else if (lados[k](a)) saida.push(corte[k](a, b));
    }
  }
  return saida.length >= 3 ? [...saida, saida[0]] : null;
}

// ── Água: faces pela borda da caixa e paridade ───────────────────────────
/** Posição na borda, no sentido horário a partir do canto de cima à esquerda. */
function naBorda([x, y]) {
  const e = 1e-6;
  if (y <= e) return x;
  if (x >= LADO - e) return LADO + y;
  if (y >= ALTURA - e) return LADO + ALTURA + (LADO - x);
  return 2 * LADO + ALTURA + (ALTURA - y);
}
const PERIMETRO = 2 * (LADO + ALTURA);
function cantosEntre(t0, t1) {
  // Cantos da caixa ao andar no sentido horário de t0 até t1.
  const cantos = [
    [LADO, [LADO, 0]],
    [LADO + ALTURA, [LADO, ALTURA]],
    [2 * LADO + ALTURA, [0, ALTURA]],
    [PERIMETRO, [0, 0]],
  ];
  const fim = t1 >= t0 ? t1 : t1 + PERIMETRO;
  const saida = [];
  for (let volta = 0; volta < 2; volta++)
    for (const [t, p] of cantos) {
      const tt = t + volta * PERIMETRO;
      if (tt > t0 + 1e-9 && tt < fim - 1e-9) saida.push(p);
    }
  return saida;
}

function cruzam(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(c, d, a);
  const d2 = o(c, d, b);
  const d3 = o(a, b, c);
  const d4 = o(a, b, d);
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0;
}

function pontoNoAnel(p, anel) {
  let d = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

/** Um ponto bem dentro do anel: o meio de uma aresta, empurrado para o lado de dentro. */
function pontoInterno(anel) {
  const arestas = [];
  for (let i = 1; i < anel.length; i++) arestas.push([anel[i - 1], anel[i]]);
  arestas.sort((a, b) => Math.hypot(b[1][0] - b[0][0], b[1][1] - b[0][1]) - Math.hypot(a[1][0] - a[0][0], a[1][1] - a[0][1]));
  for (const [a, b] of arestas.slice(0, 12)) {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-6) continue;
    for (const lado of [1, -1])
      for (const eps of [0.05, 0.3, 1]) {
        const p = [(a[0] + b[0]) / 2 + (lado * eps * (a[1] - b[1])) / l, (a[1] + b[1]) / 2 + (lado * eps * (b[0] - a[0])) / l];
        if (dentro(p) && pontoNoAnel(p, anel)) return p;
      }
  }
  return null;
}

function faces(pedacos) {
  if (!pedacos.length) return [[[0, 0], [LADO, 0], [LADO, ALTURA], [0, ALTURA], [0, 0]]];
  // Cada pedaço nas duas direções; depois de chegar à borda, anda no sentido
  // horário até a próxima ponta e segue pelo pedaço que sai dali.
  const dirigidos = [];
  for (const p of pedacos) {
    dirigidos.push({ pts: p, ini: naBorda(p[0]), fim: naBorda(p[p.length - 1]) });
    const r = [...p].reverse();
    dirigidos.push({ pts: r, ini: naBorda(r[0]), fim: naBorda(r[r.length - 1]) });
  }
  const usados = new Set();
  const saida = [];
  for (let k = 0; k < dirigidos.length; k++) {
    if (usados.has(k)) continue;
    const anel = [];
    let atual = k;
    for (let passo = 0; passo < dirigidos.length + 1; passo++) {
      usados.add(atual);
      const d = dirigidos[atual];
      anel.push(...d.pts);
      // Próxima ponta no sentido horário a partir de d.fim (entre as que iniciam um dirigido).
      let melhor = null;
      for (let j = 0; j < dirigidos.length; j++) {
        let dt = dirigidos[j].ini - d.fim;
        if (dt <= 1e-9) dt += PERIMETRO;
        if (j === (atual ^ 1) && dt >= PERIMETRO - 1e-9) continue;
        if (!melhor || dt < melhor.dt) melhor = { j, dt };
      }
      anel.push(...cantosEntre(d.fim, dirigidos[melhor.j].ini));
      if (melhor.j === k) break;
      if (usados.has(melhor.j)) break;
      atual = melhor.j;
    }
    anel.push(anel[0]);
    saida.push(anel);
  }
  return saida;
}

function agua(elementos) {
  const bordas = [];
  const linhas = [];
  for (const el of elementos) {
    const t = el.tags ?? {};
    const ehPoligono = t.natural === "water" || t.waterway === "riverbank";
    if (el.type === "way" && ehPoligono) {
      bordas.push(...trechosDe(el.geometry));
    } else if (el.type === "relation" && ehPoligono) {
      for (const m of el.members ?? []) if (m.type === "way") bordas.push(...trechosDe(m.geometry));
    } else if (el.type === "way" && /^(river|stream|canal)$/.test(t.waterway ?? "")) {
      for (const tr of trechosDe(el.geometry)) linhas.push({ pts: tr, minimo: t.waterway === "stream" ? MINIMO_IGARAPE : MINIMO_TRECHO });
    }
  }
  const { fechados, abertos } = emendar(bordas);
  const pedacos = [];
  const aneisDentro = [];
  const soltas = [];
  for (const t of [...fechados, ...abertos]) {
    if (fechado(t) && t.every(dentro)) {
      aneisDentro.push(t);
      continue;
    }
    const recortes = recortarLinha(t);
    // Anel que cruza a borda: o recorte parte o pedaço no vértice inicial do
    // anel, que fica dentro da caixa. Emenda o último pedaço com o primeiro.
    if (fechado(t) && recortes.length > 1) {
      const ultimo = recortes[recortes.length - 1];
      if (igual(ultimo[ultimo.length - 1], recortes[0][0]) && dentro(recortes[0][0])) {
        recortes[0] = [...ultimo, ...recortes[0].slice(1)];
        recortes.pop();
      }
    }
    for (const p of recortes) {
      if (dentro(p[0]) || dentro(p[p.length - 1])) {
        soltas.push({ inicio: p[0].map((v) => +v.toFixed(1)), fim: p[p.length - 1].map((v) => +v.toFixed(1)), comprimento: +comprimento(p).toFixed(1) });
        continue;
      }
      pedacos.push(p);
    }
  }
  // Paridade: quantas bordas o segmento PONTO_RIO → p cruza.
  const todas = [...pedacos, ...aneisDentro];
  const rio = projetarManaus(PONTO_RIO.lat, PONTO_RIO.lng);
  const ehAgua = (p) => {
    let n = 0;
    for (const t of todas) for (let i = 1; i < t.length; i++) if (cruzam(rio, p, t[i - 1], t[i])) n++;
    return n % 2 === 0;
  };
  const poligonos = [];
  for (const f of faces(pedacos)) {
    const p = pontoInterno(f);
    if (p && ehAgua(p)) poligonos.push({ anel: f, agua: true });
  }
  // Anéis inteiros dentro da caixa: lago (água) ou ilha (terra por cima).
  aneisDentro.sort((a, b) => area(b) - area(a));
  for (const a of aneisDentro) {
    const p = pontoInterno(a);
    if (p) poligonos.push({ anel: a, agua: ehAgua(p) });
  }
  const igarapes = linhas.flatMap(({ pts, minimo }) => recortarLinha(pts).filter((l) => comprimento(l) >= minimo));
  return { poligonos, igarapes, pontasSoltas: soltas.length, soltas, rio };
}

function area(anel) {
  let s = 0;
  for (let i = 1; i < anel.length; i++) s += anel[i - 1][0] * anel[i][1] - anel[i][0] * anel[i - 1][1];
  return Math.abs(s / 2);
}
function comprimento(l) {
  let s = 0;
  for (let i = 1; i < l.length; i++) s += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]);
  return s;
}

// ── Simplificação e path ─────────────────────────────────────────────────
function douglasPeucker(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-9) {
    // Anel fechado: parte no vértice mais longe do primeiro e simplifica as duas metades.
    let k = 1;
    for (let i = 1; i < pts.length - 1; i++) if (Math.hypot(pts[i][0] - a[0], pts[i][1] - a[1]) > Math.hypot(pts[k][0] - a[0], pts[k][1] - a[1])) k = i;
    return [...douglasPeucker(pts.slice(0, k + 1), tol).slice(0, -1), ...douglasPeucker(pts.slice(k), tol)];
  }
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1e-9;
  let maior = -1;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / l;
    if (d > maior) {
      maior = d;
      idx = i;
    }
  }
  if (maior <= tol) return [a, b];
  return [...douglasPeucker(pts.slice(0, idx + 1), tol).slice(0, -1), ...douglasPeucker(pts.slice(idx), tol)];
}

const r1 = (n) => {
  const v = Math.round(n * 10) / 10;
  return Object.is(v, -0) || v === 0 ? "0" : String(v);
};

/** Linhas (ou anéis, com fecha=true) → path relativo a 0,1 unidade. */
function paraPath(linhas, tol, fecha = false) {
  let d = "";
  for (const linha of linhas) {
    const pts = douglasPeucker(linha, tol).map(([x, y]) => [Math.round(x * 10), Math.round(y * 10)]);
    const limpos = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
    if (limpos.length < 2) continue;
    d += `M${r1(limpos[0][0] / 10)} ${r1(limpos[0][1] / 10)}`;
    let ultimo = "";
    for (let i = 1; i < limpos.length; i++) {
      const par = `${r1((limpos[i][0] - limpos[i - 1][0]) / 10)} ${r1((limpos[i][1] - limpos[i - 1][1]) / 10)}`;
      d += i === 1 ? `l${par}` : par.startsWith("-") ? par : ` ${par}`;
      ultimo = par;
    }
    if (fecha && ultimo) d += "z";
  }
  return d;
}

// ── Vias e parques ───────────────────────────────────────────────────────
function vias(elementos) {
  const porClasse = { principal: [], secundaria: [], terciaria: [], residencial: [] };
  const nomes = new Map();
  for (const el of elementos) {
    if (el.type !== "way" || !el.tags?.highway) continue;
    const classe = Object.keys(CLASSES).find((c) => CLASSES[c].includes(el.tags.highway));
    if (!classe || (classe === "residencial" && !RESIDENCIAIS)) continue;
    for (const t of trechosDe(el.geometry))
      for (const p of recortarLinha(t)) {
        if (comprimento(p) < MINIMO_TRECHO) continue;
        porClasse[classe].push(p);
        if (el.tags.name && classe === "principal") {
          const n = nomes.get(el.tags.name) ?? { total: 0, maior: null };
          n.total += comprimento(p);
          if (!n.maior || comprimento(p) > comprimento(n.maior)) n.maior = p;
          nomes.set(el.tags.name, n);
        }
      }
  }
  return { porClasse, nomes };
}

function parques(elementos) {
  const aneis = [];
  for (const el of elementos) {
    if (el.type !== "way" || el.tags?.leisure !== "park") continue;
    for (const t of trechosDe(el.geometry)) {
      if (!fechado(t)) continue;
      const r = recortarAnel(t);
      if (r && area(r) > 40) aneis.push(r);
    }
  }
  return aneis;
}

function lerPontos(arquivo) {
  if (!arquivo) return [];
  const doc = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  return (doc.lojas ?? []).filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng));
}

/** Texto para dentro de um elemento XML/SVG. */
const escapar = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n) => +n.toFixed(1);

/** Rótulos fixos do quadro aprovado: o rio, em posição fixa, e a avenida mais longa. */
const RIO_NEGRO = { texto: "Rio Negro", x: 62, y: 440, rotacao: -24 };
function rotulosFixos(avenidas) {
  const av = avenidas[0];
  if (!av) throw new Error("nenhuma avenida principal com nome na caixa: não há rótulo para a avenida");
  return [RIO_NEGRO, { texto: av.nome.replace(/^Avenida /, "Av. "), x: num(av.x + 7), y: num(av.y - 10), rotacao: av.angulo }];
}

/** Endereço público do SVG (o que o <use href> pede). */
const SVG_PUBLICO = "/images/onde-comprar/mapa-manaus.svg";

/**
 * O SVG público: cada camada uma vez, num <path id> dentro de <defs> (sozinho o
 * arquivo não pinta nada). Cor, largura e ordem ficam no MapaManaus, nos <use>:
 * o traço e o preenchimento passam por herança do <use> para a cópia.
 */
function svgPublico(osm, camadas) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADO} ${ALTURA}">
<!-- GERADO por scripts/gerar-mapa-manaus.mjs, não editar. Dados © colaboradores do OpenStreetMap, ODbL (https://www.openstreetmap.org/copyright); obra produzida (Produced Work, ODbL 4.5). Base de ${escapar(osm.osm3s?.timestamp_osm_base)}. -->
<defs>
${CAMADAS_SVG.map((k) => `<path id="${k}" d="${camadas[k]}"/>`).join("\n")}
</defs>
</svg>
`;
}

/** O módulo que a página importa: números e strings literais, sem import. */
function moduloTs(osm, camadas, avenidas) {
  const base = osm.osm3s?.timestamp_osm_base;
  if (!base) throw new Error("a resposta da Overpass não traz osm3s.timestamp_osm_base");
  const fixos = rotulosFixos(avenidas);
  const textos = [...new Set(fixos.map((r) => JSON.stringify(r.texto)))].join(" | ");
  const J = (v) => JSON.stringify(v);
  /** Objeto de valores simples como literal TS: { a: 1, b: "x" }. */
  const lit = (o) => `{ ${Object.entries(o).map(([k, v]) => `${k}: ${J(v)}`).join(", ")} }`;
  const cor = { terra: COR.terra, agua: COR.agua, parque: COR.parque, principal: COR.principal, principalBorda: COR.principalBorda, secundaria: COR.secundaria, terciaria: COR.terciaria };
  const largura = {
    principal: LARGURA_VIA.principal,
    principalBorda: LARGURA_VIA.principalBorda,
    secundaria: LARGURA_VIA.secundaria,
    secundariaBorda: num(LARGURA_VIA.secundaria + 1.2),
    terciaria: LARGURA_VIA.terciaria,
    igarape: LARGURA_VIA.igarape,
  };
  return `/**
 * GERADO por scripts/gerar-mapa-manaus.mjs, não editar. Para refazer:
 *   node scripts/gerar-mapa-manaus.mjs [--osm <resposta da Overpass>]
 *
 * Dados © colaboradores do OpenStreetMap, ODbL (https://www.openstreetmap.org/copyright);
 * obra produzida (Produced Work, ODbL 4.5).
 * Base do OpenStreetMap de ${base}, lida da ${osm.generator ?? "Overpass API"} (overpass-api.de).
 */

export const CAIXA_GERADA = ${lit(CAIXA)} as const;
export const LARGURA = ${LADO};
export const ALTURA = ${ALTURA};

/**
 * O desenho fica em ${SVG_PUBLICO} (um <path id> por camada, sem cor), fora do
 * HTML e do payload RSC; o MapaManaus desenha cada camada com <use href="…#id">.
 */
export const MAPA_SVG = ${J(SVG_PUBLICO)};
export const CAMADAS_MANAUS = ${J(CAMADAS_SVG)} as const;

export const ESTILO_MANAUS = {
  cor: ${lit(cor)},
  largura: ${lit(largura)},
} as const;

export const ROTULOS_FIXOS: { texto: ${textos}; x: number; y: number; rotacao: number }[] = [
${fixos.map((r) => `  { texto: ${J(r.texto)}, x: ${r.x}, y: ${r.y}, rotacao: ${r.rotacao} },`).join("\n")}
];
`;
}

function gerar(osm, args) {
  const els = osm.elements ?? [];

  const a = agua(els);
  const v = vias(els);
  const pq = parques(els);

  const camadas = {
    parques: paraPath(pq, TOLERANCIA.parque, true),
    agua: paraPath(
      a.poligonos.filter((p) => p.agua).map((p) => p.anel),
      TOLERANCIA.agua,
      true,
    ),
    ilhas: paraPath(
      a.poligonos.filter((p) => !p.agua).map((p) => p.anel),
      TOLERANCIA.agua,
      true,
    ),
    igarapes: paraPath(a.igarapes, TOLERANCIA.agua),
    residencial: paraPath(v.porClasse.residencial, TOLERANCIA.via),
    terciaria: paraPath(v.porClasse.terciaria, TOLERANCIA.via),
    secundaria: paraPath(v.porClasse.secundaria, TOLERANCIA.via),
    principal: paraPath(v.porClasse.principal, TOLERANCIA.via),
  };

  // Avenidas principais mais longas, com o meio e o ângulo do maior trecho (âncora de rótulo).
  const avenidas = [...v.nomes]
    .sort((x, y) => y[1].total - x[1].total)
    .slice(0, 6)
    .map(([nome, n]) => {
      const p = n.maior;
      const meio = p[Math.floor(p.length / 2)];
      const [a, b] = [p[0], p[p.length - 1]];
      return { nome, comprimento: Math.round(n.total), x: +meio[0].toFixed(1), y: +meio[1].toFixed(1), angulo: Math.round((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI) };
    });

  const ts = moduloTs(osm, camadas, avenidas);
  fs.mkdirSync(path.dirname(SAIDA_TS), { recursive: true });
  fs.writeFileSync(SAIDA_TS, ts);
  const svg = svgPublico(osm, camadas);
  fs.mkdirSync(path.dirname(SAIDA_SVG), { recursive: true });
  fs.writeFileSync(SAIDA_SVG, svg);

  const tudo = Object.values(camadas).join("");
  const bytes = Buffer.byteLength(tudo);
  const gzip = zlib.gzipSync(tudo, { level: 9 }).length;
  const porCamada = Object.fromEntries(Object.entries(camadas).map(([k, d]) => [k, Buffer.byteLength(d)]));

  console.log(
    `caixa ${LADO}×${ALTURA}; água ${a.poligonos.length} polígonos (pontas soltas descartadas: ${a.pontasSoltas}), ` +
      `igarapés ${a.igarapes.length}, parques ${pq.length}; paths ${(bytes / 1024).toFixed(1)} kB, gzip ${(gzip / 1024).toFixed(1)} kB`,
  );
  console.log(`${SAIDA_TS}: ${Buffer.byteLength(ts)} bytes, gzip ${zlib.gzipSync(ts, { level: 9 }).length} bytes`);
  console.log(`${SAIDA_SVG}: ${Buffer.byteLength(svg)} bytes, gzip ${zlib.gzipSync(svg, { level: 9 }).length} bytes`);
  if (a.soltas.length) console.warn("AVISO: bordas de água com ponta solta dentro da caixa (descartadas):", JSON.stringify(a.soltas));
  console.log("por camada (bytes):", porCamada);
  console.log("avenidas principais:", avenidas.map((x) => `${x.nome} (${x.comprimento} u; meio ${x.x},${x.y}; ${x.angulo}°)`).join("; "));

  if (args.prototipo) prototipo(args, els, camadas, avenidas, { bytes, gzip, porCamada });
}

/** Protótipo da Fase 0: SVG com os pontos e JSON com os paths, para conferir que o desenho não mudou. */
function prototipo(args, els, camadas, avenidas, tamanhos) {
  const pontos = lerPontos(args.pontos).map((p) => {
    const [x, y] = projetarManaus(p.lat, p.lng);
    return { slug: p.slug, nome: p.nome, bairro: p.bairro, x: +x.toFixed(1), y: +y.toFixed(1) };
  });
  const lugares = els
    .filter((e) => e.type === "node" && e.tags?.name)
    .map((e) => {
      const [x, y] = projetarManaus(e.lat, e.lon);
      return { nome: e.tags.name, tipo: e.tags.place, x: +x.toFixed(1), y: +y.toFixed(1) };
    })
    .filter((l) => dentro([l.x, l.y]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADO} ${ALTURA}" width="${LADO}" height="${ALTURA}">
  <!-- GERADO por scripts/gerar-mapa-manaus.mjs (protótipo da Fase 0). Dados © colaboradores do OpenStreetMap (ODbL).
       Caixa lat ${CAIXA.latMin}..${CAIXA.latMax}, lng ${CAIXA.lngMin}..${CAIXA.lngMax}. -->
  <rect width="${LADO}" height="${ALTURA}" fill="${COR.terra}"/>
  <path d="${camadas.parques}" fill="${COR.parque}"/>
  <path d="${camadas.agua}" fill="${COR.agua}"/>
  <path d="${camadas.ilhas}" fill="${COR.terra}"/>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="${camadas.igarapes}" stroke="${COR.agua}" stroke-width="${LARGURA_VIA.igarape}"/>
    <path d="${camadas.residencial}" stroke="${COR.residencial}" stroke-width="${LARGURA_VIA.residencial}"/>
    <path d="${camadas.terciaria}" stroke="${COR.terciaria}" stroke-width="${LARGURA_VIA.terciaria}"/>
    <path d="${camadas.principal}" stroke="${COR.principalBorda}" stroke-width="${LARGURA_VIA.principalBorda}"/>
    <path d="${camadas.secundaria}" stroke="${COR.principalBorda}" stroke-width="${LARGURA_VIA.secundaria + 1.2}"/>
    <path d="${camadas.secundaria}" stroke="${COR.secundaria}" stroke-width="${LARGURA_VIA.secundaria}"/>
    <path d="${camadas.principal}" stroke="${COR.principal}" stroke-width="${LARGURA_VIA.principal}"/>
  </g>
${pontos.map((p) => `  <circle cx="${p.x}" cy="${p.y}" r="4" fill="#0B1F45"><title>${escapar(p.nome)}</title></circle>`).join("\n")}
</svg>
`;
  fs.mkdirSync(args.prototipo, { recursive: true });
  fs.writeFileSync(path.join(args.prototipo, "mapa-manaus.svg"), svg);
  fs.writeFileSync(
    path.join(args.prototipo, "mapa-manaus.json"),
    JSON.stringify({ caixa: CAIXA, largura: LADO, altura: ALTURA, cores: COR, larguras: LARGURA_VIA, camadas, pontos, lugares, avenidas, ...tamanhos }, null, 1),
  );
  console.log(`protótipo gravado em ${args.prototipo}`);
}

async function main() {
  const args = lerArgs(process.argv.slice(2));
  if (args.pontos && !args.prototipo) {
    console.error("--pontos só vale junto com --prototipo <pasta>");
    process.exit(1);
  }
  const { osm, temporaria } = await obterOsm(args);
  try {
    gerar(osm, args);
  } finally {
    if (temporaria) fs.rmSync(temporaria, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
