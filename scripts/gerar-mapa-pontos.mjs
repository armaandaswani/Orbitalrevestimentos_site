/**
 * Gera o mapa-múndi em pontos da jornada da home (src/components/home/mapaPontos.ts).
 *
 *   node scripts/gerar-mapa-pontos.mjs [--geojson <arquivo>] [--cache <pasta>]
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

function main() {
  const args = lerArgs(process.argv.slice(2));
  const geo = JSON.parse(obterGeojson(args));
  const lista = aneis(geo);

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
