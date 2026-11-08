/**
 * Gera o mapa-múndi em pontos da jornada da home (src/components/home/mapaPontos.ts).
 *
 *   node scripts/gerar-mapa-pontos.mjs [--geojson <arquivo>] [--cache <pasta>]
 *
 * Com `--recorte america-do-sul`, gera em vez disso os pontos da abertura do
 * /onde-comprar (src/components/onde-comprar/mapaAmerica.ts): a América do Sul
 * numa grade de 1° e, separado, o subconjunto dentro da Amazônia Legal
 * (polígono AMAZONIA_LEGAL, desenhado à mão aqui). A home não é tocada.
 *
 * Fonte: Natural Earth 1:110m, camada "land" (domínio público,
 * https://www.naturalearthdata.com/about/terms-of-use/), na cópia em GeoJSON do
 * repositório nvkelso/natural-earth-vector. O arquivo bruto é baixado para uma
 * pasta temporária (ou lido de --geojson) e nunca entra no repositório: só o
 * resultado, que é pequeno.
 *
 * Como funciona: uma grade regular (um ponto a cada PASSO graus, no centro de
 * cada célula) dentro do recorte LON × LAT; cada ponto que cai em terra (regra
 * par-ímpar sobre todos os anéis, então lagos e mares internos que o Natural
 * Earth traz como buraco ficam vazios) vira um ponto do mapa. A projeção é
 * equirretangular: x = (lon − LON_MIN) × ESCALA, y = (LAT_MAX − lat) × ESCALA.
 * O resultado é um único path de pontos (subcaminhos de comprimento zero,
 * desenhados com stroke-linecap: round), em coordenadas relativas para ficar
 * curto.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const URL_FONTE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson";

/*
 * Recorte: das Américas (o Pacífico de lado) até o leste da Ásia, com folga
 * para os rótulos. A viagem vai da fábrica a Manaus pelo lado da África, então o
 * Pacífico (vazio) fica de fora e o mapa ocupa a largura com terra.
 */
const LON_MIN = -85;
const LON_MAX = 135;
const LAT_MAX = 72;
const LAT_MIN = -56;
/** Um ponto a cada 2,5°. */
const PASSO = 2.5;
/** Unidades do viewBox por grau: o passo da grade vira 10 unidades inteiras. */
const ESCALA = 4;

function lerArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--geojson") a.geojson = argv[++i];
    else if (argv[i] === "--cache") a.cache = argv[++i];
    else if (argv[i] === "--recorte") a.recorte = argv[++i];
  }
  return a;
}

function obterGeojson(args) {
  if (args.geojson) return fs.readFileSync(args.geojson, "utf8");
  const pasta = args.cache || fs.mkdtempSync(path.join(os.tmpdir(), "natural-earth-"));
  const arquivo = path.join(pasta, "ne_110m_land.geojson");
  if (!fs.existsSync(arquivo)) {
    execFileSync("curl", ["-sSfL", "-o", arquivo, URL_FONTE], { stdio: "inherit" });
  }
  return fs.readFileSync(arquivo, "utf8");
}

/** Todos os anéis (exterior e buracos) de todos os polígonos, com caixa para filtrar rápido. */
function aneis(geo) {
  const lista = [];
  for (const f of geo.features) {
    const g = f.geometry;
    if (!g) continue;
    const poligonos = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    for (const pol of poligonos) {
      for (const anel of pol) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const [x, y] of anel) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
        lista.push({ anel, x0, y0, x1, y1 });
      }
    }
  }
  return lista;
}

/** Raio horizontal (par-ímpar): cruza um número ímpar de arestas = dentro. */
function cruza(anel, x, y) {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function emTerra(lista, lon, lat) {
  let dentro = false;
  for (const a of lista) {
    if (lon < a.x0 || lon > a.x1 || lat < a.y0 || lat > a.y1) continue;
    if (cruza(a.anel, lon, lat)) dentro = !dentro;
  }
  return dentro;
}

/*
 * Recorte da abertura do /onde-comprar: a América do Sul inteira, grade de 1°.
 * ESCALA 10: o passo da grade vira 10 unidades e o viewBox fica 480 × 690.
 */
const AM_LON_MIN = -82;
const AM_LON_MAX = -34;
const AM_LAT_MAX = 13;
const AM_LAT_MIN = -56;
const AM_PASSO = 1;
const AM_ESCALA = 10;
/** Centro de Manaus (lon, lat), o alvo da câmera. */
const MANAUS = [-60.02, -3.12];

/**
 * Amazônia Legal simplificada, desenhada à mão (16 vértices, lon/lat), que
 * cobre Acre, Rondônia, Mato Grosso, o oeste do Maranhão, Tocantins, Pará,
 * Amapá, Roraima e Amazonas. É o mesmo polígono do quadro aprovado na Fase 0.
 */
const AMAZONIA_LEGAL = [
  [-73.99, -7.53], [-72.6, -9.9], [-69.6, -10.95], [-65.3, -10.8], [-60.0, -13.6],
  [-60.1, -16.2], [-57.6, -17.6], [-53.2, -18.0], [-50.7, -15.4], [-46.3, -12.8],
  [-44.0, -7.0], [-44.0, -2.3], [-50.0, 1.8], [-60.7, 5.2], [-67.3, 2.1], [-69.9, -4.2],
];

function gerarAmerica(lista) {
  const colunas = Math.round((AM_LON_MAX - AM_LON_MIN) / AM_PASSO);
  const linhas = Math.round((AM_LAT_MAX - AM_LAT_MIN) / AM_PASSO);
  const largura = (AM_LON_MAX - AM_LON_MIN) * AM_ESCALA;
  const altura = (AM_LAT_MAX - AM_LAT_MIN) * AM_ESCALA;
  const passoVb = AM_PASSO * AM_ESCALA;
  const america = [];
  const amazonia = [];
  for (let j = 0; j < linhas; j++) {
    const lat = AM_LAT_MAX - (j + 0.5) * AM_PASSO;
    const y = (j + 0.5) * passoVb;
    for (let i = 0; i < colunas; i++) {
      const lon = AM_LON_MIN + (i + 0.5) * AM_PASSO;
      // Só a América do Sul: corta a América Central acima de 8° N a oeste de −77°.
      if (lat > 8 && lon < -77) continue;
      if (!emTerra(lista, lon, lat)) continue;
      const x = (i + 0.5) * passoVb;
      america.push([x, y]);
      if (cruza(AMAZONIA_LEGAL, lon, lat)) amazonia.push([x, y]);
    }
  }
  const manaus = [
    Math.round((MANAUS[0] - AM_LON_MIN) * AM_ESCALA * 10) / 10,
    Math.round((AM_LAT_MAX - MANAUS[1]) * AM_ESCALA * 10) / 10,
  ];
  const lista2 = (pts) => pts.map(([x, y]) => `[${x},${y}]`).join(",");

  const saida = `/*
 * GERADO por scripts/gerar-mapa-pontos.mjs --recorte america-do-sul; não edite
 * à mão, rode o script.
 *
 * Pontos da abertura do /onde-comprar. Fonte: Natural Earth 1:110m, camada
 * "land" (domínio público; https://www.naturalearthdata.com/about/terms-of-use/),
 * via ${URL_FONTE}.
 * Grade de ${AM_PASSO}° (${america.length} pontos em terra, ${amazonia.length} na Amazônia Legal),
 * recorte lon ${AM_LON_MIN}..${AM_LON_MAX}, lat ${AM_LAT_MIN}..${AM_LAT_MAX}, projeção equirretangular.
 * Só para Server Components: nada disto deve entrar no JS do cliente.
 */

/** Largura e altura do viewBox do continente ("0 0 ${largura} ${altura}"). */
export const AMERICA_LARGURA = ${largura};
export const AMERICA_ALTURA = ${altura};
/** Distância entre pontos vizinhos, em unidades do viewBox. */
export const AMERICA_PASSO = ${passoVb};
/** Manaus (lon ${MANAUS[0]}, lat ${MANAUS[1]}) no viewBox do continente. */
export const MANAUS_AMERICA: [number, number] = [${manaus[0]}, ${manaus[1]}];

/** Todos os pontos em terra da América do Sul (inclui os da Amazônia), [x, y]. */
export const PONTOS_AMERICA: [number, number][] = [${lista2(america)}];

/** O subconjunto dentro da Amazônia Legal (polígono à mão no script), [x, y]. */
export const PONTOS_AMAZONIA: [number, number][] = [${lista2(amazonia)}];
`;
  const destino = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "components", "onde-comprar", "mapaAmerica.ts");
  fs.writeFileSync(destino, saida);
  console.log(`${america.length} pontos (${amazonia.length} na Amazônia), ${Buffer.byteLength(saida)} bytes → ${path.relative(process.cwd(), destino)}`);
}

function main() {
  const args = lerArgs(process.argv.slice(2));
  const geo = JSON.parse(obterGeojson(args));
  const lista = aneis(geo);
  if (args.recorte === "america-do-sul") return gerarAmerica(lista);
  if (args.recorte) throw new Error(`Recorte desconhecido: ${args.recorte} (só "america-do-sul").`);

  const colunas = Math.round((LON_MAX - LON_MIN) / PASSO);
  const linhas = Math.round((LAT_MAX - LAT_MIN) / PASSO);
  const largura = (LON_MAX - LON_MIN) * ESCALA;
  const altura = (LAT_MAX - LAT_MIN) * ESCALA;
  const passoVb = PASSO * ESCALA;

  // Path relativo: "M x y h0" abre cada linha; "m dx 0h0" anda até o próximo
  // ponto da mesma linha. Coordenadas inteiras (o centro da célula cai em
  // passo/2 = 5 unidades).
  let d = "";
  let total = 0;
  for (let j = 0; j < linhas; j++) {
    const lat = LAT_MAX - (j + 0.5) * PASSO;
    const y = (j + 0.5) * passoVb;
    let ultimoX = null;
    for (let i = 0; i < colunas; i++) {
      const lon = LON_MIN + (i + 0.5) * PASSO;
      if (!emTerra(lista, lon, lat)) continue;
      const x = (i + 0.5) * passoVb;
      d += ultimoX === null ? `M${x} ${y}h0` : `m${x - ultimoX} 0h0`;
      ultimoX = x;
      total++;
    }
  }

  const saida = `/*
 * GERADO por scripts/gerar-mapa-pontos.mjs; não edite à mão, rode o script.
 *
 * Mapa-múndi em pontos para a jornada da home. Fonte: Natural Earth 1:110m,
 * camada "land" (domínio público; https://www.naturalearthdata.com/about/terms-of-use/),
 * via ${URL_FONTE}.
 * Grade de ${PASSO}° (${total} pontos em terra), recorte lon ${LON_MIN}..${LON_MAX},
 * lat ${LAT_MIN}..${LAT_MAX}, projeção equirretangular.
 */

/** Largura e altura do viewBox ("0 0 ${largura} ${altura}"). */
export const MAPA_LARGURA = ${largura};
export const MAPA_ALTURA = ${altura};
/** Distância entre pontos vizinhos, em unidades do viewBox. */
export const MAPA_PASSO = ${passoVb};

/** Longitude e latitude (graus, oeste e sul negativos) para o viewBox do mapa. */
export function projetar(lon: number, lat: number): [number, number] {
  return [(lon ${LON_MIN < 0 ? `+ ${-LON_MIN}` : `- ${LON_MIN}`}) * ${ESCALA}, (${LAT_MAX} - lat) * ${ESCALA}];
}

/** Um subcaminho de comprimento zero por ponto: desenhe com stroke-linecap round. */
export const MAPA_PONTOS =
  "${d}";
`;

  const destino = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "components", "home", "mapaPontos.ts");
  fs.writeFileSync(destino, saida);
  console.log(`${total} pontos, ${Buffer.byteLength(saida)} bytes → ${path.relative(process.cwd(), destino)}`);
}

main();
