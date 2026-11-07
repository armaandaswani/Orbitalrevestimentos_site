/**
 * Gera o mapa de Manaus da página /onde-comprar: o rio Negro, o Solimões e o
 * Amazonas, com o encontro das águas, recortados numa caixa fixa da cidade.
 *
 *   node scripts/gerar-mapa-manaus.mjs --saida <pasta> [--pontos <coordenadas.json>]
 *                                      [--geojson <arquivo>] [--cache <pasta>]
 *
 * Fonte: Natural Earth 1:10m, camada "rivers_lake_centerlines" (domínio público,
 * https://www.naturalearthdata.com/about/terms-of-use/), na cópia em GeoJSON do
 * repositório nvkelso/natural-earth-vector. O arquivo bruto é baixado para uma
 * pasta temporária (ou lido de --geojson) e nunca entra no repositório: só o
 * resultado, que é pequeno. Sem ruas e sem OpenStreetMap (sem atribuição ODbL).
 *
 * Como funciona: pega as linhas de centro do rio Negro e do Amazonas (o Natural
 * Earth chama de "Amazonas" também o trecho acima de Manaus, o Solimões), corta
 * a linha do Amazonas no vértice mais perto da foz do Negro (o encontro das
 * águas: rio abaixo é Amazonas, rio acima é Solimões), recorta cada segmento na
 * CAIXA com uma folga (para a ponta arredondada do traço cair fora da tela) e
 * projeta em equirretangular para um viewBox 0 0 400 400:
 *   x = (lng − LNG_MIN) / (LNG_MAX − LNG_MIN) × 400
 *   y = (LAT_MAX − lat) / (LAT_MAX − LAT_MIN) × 400
 * Na latitude de Manaus (~3° S) o cosseno é 0,9986, então a caixa de 0,25° × 0,25°
 * vira um quadrado sem distorção visível. Cada rio sai como um path em
 * coordenadas relativas, arredondadas a 0,1 unidade, para ficar curto. Depois do
 * encontro, um traço escuro mais fino corre na margem norte do Amazonas (a água
 * preta do Negro ao lado da barrenta, que é o que faz o encontro ser reconhecido).
 *
 * Generalização do 1:10m: o Negro passa 1 a 2,5 km ao sul do leito real na
 * metade oeste da caixa (Ponta Negra, Compensa) e ~0,5 km perto do encontro. Num
 * mapa ilustrado de 27 km de lado isso não muda a leitura; a Fase 0 conferiu o
 * print e manteve o Natural Earth (sem o traço desenhado à mão).
 *
 * Fase 0 (esta versão): grava em --saida um protótipo `mapa-manaus.svg`, com os
 * pontos de --pontos (o coordenadas.json da Fase 0) para conferir a
 * legibilidade. A Tarefa 6 troca a saída por src/components/onde-comprar/mapaManaus.ts.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const URL_FONTE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson";
const ARQUIVO_FONTE = "ne_10m_rivers_lake_centerlines.geojson";

/** Caixa de Manaus (a mesma do projetarManaus e do dentroDeManaus). */
const LAT_MIN = -3.2;
const LAT_MAX = -2.95;
const LNG_MIN = -60.1;
const LNG_MAX = -59.85;
/** Lado do viewBox, em unidades. */
const LADO = 400;
/** Folga do recorte, em graus: o traço passa da borda e a ponta redonda some. */
const FOLGA = 0.03;

/** Largura do traço de cada rio, em unidades do viewBox (~70 m por unidade). */
const LARGURA = { negro: 26, solimoes: 20, amazonas: 30, lingua: 11 };
/** Água preta ao lado da barrenta depois do encontro (unidades do viewBox). */
const LINGUA = { comprimento: 80, desvio: 8 };
const COR = { fundo: "#F6F5F2", negro: "#0B1F45", barro: "#C8AE86", texto: "#43474e" };

function lerArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--geojson") a.geojson = argv[++i];
    else if (argv[i] === "--cache") a.cache = argv[++i];
    else if (argv[i] === "--saida") a.saida = argv[++i];
    else if (argv[i] === "--pontos") a.pontos = argv[++i];
  }
  return a;
}

function obterGeojson(args) {
  if (args.geojson) return fs.readFileSync(args.geojson, "utf8");
  const pasta = args.cache || fs.mkdtempSync(path.join(os.tmpdir(), "natural-earth-"));
  const arquivo = path.join(pasta, ARQUIVO_FONTE);
  if (!fs.existsSync(arquivo)) {
    execFileSync("curl", ["-sSfL", "-o", arquivo, URL_FONTE], { stdio: "inherit" });
  }
  return fs.readFileSync(arquivo, "utf8");
}

/** Todas as linhas (LineString ou MultiLineString) das feições com esse nome. */
function linhasDo(geo, nome) {
  const linhas = [];
  for (const f of geo.features) {
    const g = f.geometry;
    if (!g || f.properties?.name !== nome) continue;
    if (g.type === "LineString") linhas.push(g.coordinates);
    else if (g.type === "MultiLineString") linhas.push(...g.coordinates);
  }
  return linhas;
}

const dist2 = ([x0, y0], [x1, y1]) => (x0 - x1) ** 2 + (y0 - y1) ** 2;

/**
 * Corta a linha do Amazonas no encontro das águas: o vértice dela mais perto
 * da ponta do Negro que fica rio abaixo (a mais perto do Amazonas). Devolve as
 * duas metades com o vértice do encontro nas duas, para os traços se tocarem.
 */
function separarNoEncontro(amazonas, negro) {
  let melhor = null;
  for (const ln of negro) {
    for (const ponta of [ln[0], ln[ln.length - 1]]) {
      for (let li = 0; li < amazonas.length; li++) {
        const la = amazonas[li];
        for (let i = 0; i < la.length; i++) {
          const d = dist2(ponta, la[i]);
          if (!melhor || d < melhor.d) melhor = { d, li, i };
        }
      }
    }
  }
  if (!melhor) throw new Error("Não achei o encontro do Negro com o Amazonas.");
  const la = amazonas[melhor.li];
  const a = la.slice(0, melhor.i + 1);
  const b = la.slice(melhor.i);
  // O Natural Earth desenha o Amazonas da foz para a nascente: a metade com
  // longitude mais a leste é o Amazonas, a outra é o Solimões.
  const lesteA = Math.max(...a.map((p) => p[0]));
  const lesteB = Math.max(...b.map((p) => p[0]));
  const [abaixo, acima] = lesteA >= lesteB ? [a, b] : [b, a];
  const outras = amazonas.filter((_, k) => k !== melhor.li);
  return { amazonas: [abaixo, ...outras], solimoes: [acima], encontro: la[melhor.i] };
}

/** Liang–Barsky: recorta o segmento p0→p1 na caixa; null se fica todo fora. */
function recortar([x0, y0], [x1, y1], cx0, cy0, cx1, cy1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [
    [-dx, x0 - cx0],
    [dx, cx1 - x0],
    [-dy, y0 - cy0],
    [dy, cy1 - y0],
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

/** Recorta as linhas na caixa com folga e devolve trechos contínuos [lng, lat][]. */
function recortarLinhas(linhas) {
  const cx0 = LNG_MIN - FOLGA;
  const cx1 = LNG_MAX + FOLGA;
  const cy0 = LAT_MIN - FOLGA;
  const cy1 = LAT_MAX + FOLGA;
  const trechos = [];
  for (const ln of linhas) {
    let atual = null;
    for (let i = 1; i < ln.length; i++) {
      const s = recortar(ln[i - 1], ln[i], cx0, cy0, cx1, cy1);
      if (!s) {
        if (atual) trechos.push(atual);
        atual = null;
        continue;
      }
      if (atual && dist2(atual[atual.length - 1], s[0]) < 1e-14) atual.push(s[1]);
      else {
        if (atual) trechos.push(atual);
        atual = [s[0], s[1]];
      }
    }
    if (atual) trechos.push(atual);
  }
  return trechos;
}

function projetarManaus(lng, lat) {
  return [((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * LADO, ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * LADO];
}

const r1 = (n) => {
  const v = Math.round(n * 10) / 10;
  return Object.is(v, -0) ? "0" : String(v);
};

/** Trechos em [lng, lat] → path relativo ("M x y l dx dy ..."), a 0,1 unidade. */
function paraPath(trechos) {
  let d = "";
  for (const t of trechos) {
    const pts = t.map(([lng, lat]) => projetarManaus(lng, lat).map((v) => Math.round(v * 10) / 10));
    d += `M${r1(pts[0][0])} ${r1(pts[0][1])}l`;
    const passos = [];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];
      if (dx === 0 && dy === 0) continue;
      passos.push(`${r1(dx)} ${r1(dy)}`);
    }
    d += passos.join(" ");
  }
  return d;
}

/** A ponta do Negro que chega ao Amazonas passa a ser o próprio vértice do encontro. */
function colarNoEncontro(negro, encontro) {
  let melhor = null;
  for (const ln of negro) {
    for (const i of [0, ln.length - 1]) {
      const d = dist2(ln[i], encontro);
      if (!melhor || d < melhor.d) melhor = { d, ln, i };
    }
  }
  if (melhor) melhor.ln[melhor.i] = [...encontro];
}

/**
 * A água preta do Negro corre ao lado da barrenta por quilômetros depois do
 * encontro. Desenha isso como um traço escuro mais fino na margem norte do
 * Amazonas: os primeiros LINGUA.comprimento unidades a partir do encontro,
 * deslocados LINGUA.desvio unidades para a esquerda de quem desce o rio (norte).
 */
function linguaDoNegro(abaixo, encontro) {
  // O caminho tem de começar no encontro e descer o rio.
  const ordenado = dist2(abaixo[0], encontro) <= dist2(abaixo[abaixo.length - 1], encontro) ? abaixo : [...abaixo].reverse();
  const pts = ordenado.map(([lng, lat]) => projetarManaus(lng, lat));
  const saida = [];
  let andado = 0;
  for (let i = 1; i < pts.length && andado < LINGUA.comprimento; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    const usa = Math.min(seg, LINGUA.comprimento - andado);
    const t = usa / seg;
    // Normal à esquerda de quem anda (y cresce para baixo): (dy, −dx).
    const nx = (y1 - y0) / seg;
    const ny = -(x1 - x0) / seg;
    if (i === 1) saida.push([x0 + nx * LINGUA.desvio, y0 + ny * LINGUA.desvio]);
    saida.push([x0 + (x1 - x0) * t + nx * LINGUA.desvio, y0 + (y1 - y0) * t + ny * LINGUA.desvio]);
    andado += usa;
  }
  const d = `M${r1(saida[0][0])} ${r1(saida[0][1])}l`;
  const passos = [];
  for (let i = 1; i < saida.length; i++) passos.push(`${r1(saida[i][0] - saida[i - 1][0])} ${r1(saida[i][1] - saida[i - 1][1])}`);
  return d + passos.join(" ");
}

function lerPontos(arquivo) {
  if (!arquivo) return [];
  const doc = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  return (doc.lojas ?? []).filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng));
}

/** Rótulo do bairro: na média das lojas daquele bairro, abaixo do ponto mais baixo. */
function rotulosDeBairro(pontos) {
  const grupos = new Map();
  for (const p of pontos) {
    const [x, y] = projetarManaus(p.lng, p.lat);
    const g = grupos.get(p.bairro) ?? [];
    g.push([x, y]);
    grupos.set(p.bairro, g);
  }
  return [...grupos].map(([bairro, xy]) => ({
    bairro,
    x: xy.reduce((s, [x]) => s + x, 0) / xy.length,
    y: Math.max(...xy.map(([, y]) => y)) + 22,
  }));
}

function main() {
  const args = lerArgs(process.argv.slice(2));
  if (!args.saida) {
    console.error("Uso: node scripts/gerar-mapa-manaus.mjs --saida <pasta> [--pontos coordenadas.json] [--geojson arq] [--cache pasta]");
    process.exit(1);
  }
  const geo = JSON.parse(obterGeojson(args));
  const negro = linhasDo(geo, "Negro");
  const { amazonas, solimoes, encontro } = separarNoEncontro(linhasDo(geo, "Amazonas"), negro);
  colarNoEncontro(negro, encontro);

  const rios = {
    negro: paraPath(recortarLinhas(negro)),
    solimoes: paraPath(recortarLinhas(solimoes)),
    amazonas: paraPath(recortarLinhas(amazonas)),
    lingua: linguaDoNegro(amazonas[0], encontro),
  };
  const [ex, ey] = projetarManaus(encontro[0], encontro[1]);

  const pontos = lerPontos(args.pontos);
  const marcas = pontos
    .map((p) => {
      const [x, y] = projetarManaus(p.lng, p.lat);
      return `  <circle cx="${r1(x)}" cy="${r1(y)}" r="5" fill="#36A35C" stroke="#fff" stroke-width="2"><title>${p.nome}</title></circle>`;
    })
    .join("\n");
  const rotulos = rotulosDeBairro(pontos)
    .map(
      (r) =>
        `  <text x="${r1(r.x)}" y="${r1(r.y)}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="13" fill="${COR.texto}">${r.bairro}</text>`,
    )
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADO} ${LADO}" width="${LADO}" height="${LADO}">
  <!-- GERADO por scripts/gerar-mapa-manaus.mjs (protótipo da Fase 0). Fonte: Natural Earth 1:10m
       rivers_lake_centerlines (domínio público), via ${URL_FONTE}.
       Caixa lat ${LAT_MIN}..${LAT_MAX}, lng ${LNG_MIN}..${LNG_MAX}; encontro das águas em ${r1(ex)}, ${r1(ey)}. -->
  <rect width="${LADO}" height="${LADO}" fill="${COR.fundo}"/>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="${rios.negro}" stroke="${COR.negro}" stroke-width="${LARGURA.negro}"/>
    <path d="${rios.solimoes}" stroke="${COR.barro}" stroke-width="${LARGURA.solimoes}"/>
    <path d="${rios.amazonas}" stroke="${COR.barro}" stroke-width="${LARGURA.amazonas}"/>
    <path d="${rios.lingua}" stroke="${COR.negro}" stroke-width="${LARGURA.lingua}"/>
  </g>
${marcas}
${rotulos}
</svg>
`;
  fs.mkdirSync(args.saida, { recursive: true });
  const destino = path.join(args.saida, "mapa-manaus.svg");
  fs.writeFileSync(destino, svg);
  const bytes = Object.values(rios).reduce((s, d) => s + Buffer.byteLength(d), 0);
  console.log(
    `rios: negro ${rios.negro.length} c, solimões ${rios.solimoes.length} c, amazonas ${rios.amazonas.length} c (${bytes} bytes de path); ` +
      `encontro em ${r1(ex)}, ${r1(ey)}; ${pontos.length} pontos → ${destino}`,
  );
}

main();
