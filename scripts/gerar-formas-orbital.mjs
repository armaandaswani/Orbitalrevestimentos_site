/**
 * Gera src/components/movimento/formasOrbital.ts a partir dos SVGs oficiais da
 * marca (Redesign 2026) em public/images/brand/, cópias sem alteração dos
 * arquivos do dono:
 *
 *   node scripts/gerar-formas-orbital.mjs
 *
 * Os paths saem dos arquivos; o que muda é só a precisão (regra 40 do ledger
 * movimento-luxo), para a intro pesar menos no HTML de todas as páginas:
 *  - símbolo: os paths oficiais são polilinhas densas (M, centenas de L, Z).
 *    Saem os pontos que ficam a menos de TOLERANCIA do segmento entre os
 *    vizinhos mantidos (Ramer-Douglas-Peucker), e o resto é arredondado a uma
 *    casa decimal e escrito em coordenadas relativas (a diferença entre dois
 *    pontos já arredondados, então não acumula erro);
 *  - logotipo: cada número arredondado a uma casa decimal, comandos iguais.
 * Nenhum ponto é movido além do arredondamento; não é edição de desenho.
 * Conferência visual: o logo montado com estes paths contra o arquivo oficial,
 * a 2x, por diferença de pixels (relatório r2b do ledger).
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const MARCA = path.join(RAIZ, "public/images/brand");
const DESTINO = path.join(RAIZ, "src/components/movimento/formasOrbital.ts");

/**
 * Tolerância do corte de pontos, nas unidades internas do símbolo (o grupo
 * oficial escala por 0,96126, então 0,05 aqui é 0,048 do viewBox, menos de
 * 0,06 px com o logo a 760 px).
 */
const TOLERANCIA = 0.05;

function ler(nome) {
  const s = fs.readFileSync(path.join(MARCA, nome), "utf8");
  const viewBox = s.match(/<svg[^>]*viewBox="([^"]+)"/)[1];
  const transformacao = s.match(/<g transform="([^"]+)"/)[1];
  const dentro = s.slice(s.indexOf("<g "), s.indexOf("</g>"));
  const fora = s.slice(s.indexOf("</g>"));
  const paths = (t) => [...t.matchAll(/<path d="([^"]+)" fill="([^"]+)"\/>/g)].map((m) => ({ fill: m[2], d: m[1] }));
  return { viewBox, transformacao, simbolo: paths(dentro), assinatura: paths(fora) };
}

/** Número com uma casa, sem zero à esquerda nem ".0" sobrando. */
function num(v) {
  let t = (Math.round(v * 10) / 10).toFixed(1);
  if (t === "-0.0") t = "0.0";
  t = t.replace(/\.0$/, "");
  return t.replace(/^(-?)0\./, "$1.");
}

/** Junta números no menor texto válido de path ("-" e um segundo "." separam sozinhos). */
function juntar(ns) {
  let s = "";
  let anterior = null;
  for (const n of ns) {
    if (anterior === null) s += n;
    else if (n.startsWith("-") || (n.startsWith(".") && anterior.includes("."))) s += n;
    else s += " " + n;
    anterior = n;
  }
  return s;
}

function distanciaAoSegmento(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Ramer-Douglas-Peucker iterativo: índices dos pontos mantidos. */
function rdp(pts, tol) {
  const manter = new Uint8Array(pts.length);
  manter[0] = manter[pts.length - 1] = 1;
  const pilha = [[0, pts.length - 1]];
  while (pilha.length) {
    const [i, j] = pilha.pop();
    let max = 0, k = -1;
    for (let m = i + 1; m < j; m++) {
      const d = distanciaAoSegmento(pts[m], pts[i], pts[j]);
      if (d > max) { max = d; k = m; }
    }
    if (k !== -1 && max > tol) {
      manter[k] = 1;
      pilha.push([i, k], [k, j]);
    }
  }
  return pts.filter((_, i) => manter[i]);
}

/** Polilinha oficial (M x,y L x,y ... Z) reduzida e escrita em relativo. */
function reduzirPolilinha(d) {
  if (!/^M[\d.,\sL-]+Z$/.test(d)) throw new Error("path do símbolo fora do formato M/L/Z");
  const pts = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  // Anel fechado: corta no ponto mais distante do início, para os dois lados terem forma.
  let longe = 0, dl = 0;
  pts.forEach((p, i) => { const x = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]); if (x > dl) { dl = x; longe = i; } });
  const ida = rdp(pts.slice(0, longe + 1), TOLERANCIA);
  const volta = rdp([...pts.slice(longe), pts[0]], TOLERANCIA).slice(1, -1);
  const r = [...ida, ...volta].map(([x, y]) => [Math.round(x * 10), Math.round(y * 10)]);
  const unicos = r.filter((p, i) => i === 0 || p[0] !== r[i - 1][0] || p[1] !== r[i - 1][1]);
  const [x0, y0] = unicos[0];
  const rel = [];
  for (let i = 1; i < unicos.length; i++) {
    rel.push(num((unicos[i][0] - unicos[i - 1][0]) / 10), num((unicos[i][1] - unicos[i - 1][1]) / 10));
  }
  return { d: `M${juntar([num(x0 / 10), num(y0 / 10)])}l${juntar(rel)}z`, antes: pts.length, depois: unicos.length };
}

/** Path do logotipo: mesmos comandos, números com uma casa. */
function arredondarPath(d) {
  return d.replace(/([A-Za-z])([^A-Za-z]*)/g, (_, c, resto) => {
    const ns = resto.match(/-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
    return c + juntar(ns.map((n) => num(Number(n))));
  });
}

const h = ler("orbital-evolucao-horizontal-negativo.svg");
const v = ler("orbital-vertical-negativo.svg");
if (JSON.stringify(h.simbolo) !== JSON.stringify(v.simbolo)) throw new Error("símbolos diferentes");
if (h.simbolo.length !== 10 || h.assinatura.length !== 2 || v.assinatura.length !== 2) throw new Error("contagem");

let antes = 0, depois = 0;
const simbolo = h.simbolo.map((f) => {
  const r = reduzirPolilinha(f.d);
  antes += r.antes; depois += r.depois;
  return { fill: f.fill, d: r.d };
});
const assinaturaH = h.assinatura.map((f) => ({ fill: f.fill, d: arredondarPath(f.d) }));
const assinaturaV = v.assinatura.map((f) => ({ fill: f.fill, d: arredondarPath(f.d) }));

const linhas = (fs_) => fs_.map((f) => `  ${JSON.stringify(f)},`).join("\n");
const ts = `/**
 * Formas oficiais da marca (Redesign 2026) para a intro da órbita, tiradas dos
 * SVGs em public/images/brand/: orbital-evolucao-horizontal-negativo.svg (a
 * partir de sm) e orbital-vertical-negativo.svg (celular). Versão negativa porque
 * a intro fica sobre o azul-marinho; o retângulo de fundo (#0B1F45) dos arquivos
 * fica de fora, já que a cortina tem a mesma cor. Ficam em código, e não num
 * <img>, porque cada faixa do símbolo tem a própria máscara e o próprio giro.
 * Gerado por scripts/gerar-formas-orbital.mjs: os paths são os dos arquivos com
 * a precisão reduzida (uma casa decimal; no símbolo, sem os pontos a menos de
 * ${TOLERANCIA} unidade da reta entre os vizinhos), sem mudar o desenho.
 * Não editar à mão: se a marca mudar, rodar o gerador de novo.
 */

/** Um path oficial: cor original e desenho. */
export type Forma = { fill: string; d: string };

/** viewBox de cada arquivo, como está nele. */
export const HORIZONTAL_VIEWBOX = ${JSON.stringify(h.viewBox)};
export const VERTICAL_VIEWBOX = ${JSON.stringify(v.viewBox)};

/** transform do grupo do símbolo em cada arquivo, como está nele. */
export const HORIZONTAL_TRANSFORMACAO = ${JSON.stringify(h.transformacao)};
export const VERTICAL_TRANSFORMACAO = ${JSON.stringify(v.transformacao)};

/**
 * Os dez paths do símbolo, na ordem de pintura dos arquivos (iguais nos dois):
 * cinco faixas azuis (#2F5FD0) e cinco verdes (#36A35C).
 */
export const SIMBOLO_FORMAS: Forma[] = [
${linhas(simbolo)}
];

/** Os dois paths brancos do logotipo (ORBITAL / REVESTIMENTOS) no arquivo horizontal. */
export const ASSINATURA_HORIZONTAL: Forma[] = [
${linhas(assinaturaH)}
];

/** Os dois paths brancos do logotipo no arquivo vertical. */
export const ASSINATURA_VERTICAL: Forma[] = [
${linhas(assinaturaV)}
];
`;
fs.writeFileSync(DESTINO, ts);
const tamanho = (fs_) => fs_.reduce((s, f) => s + f.d.length, 0);
console.log(
  `símbolo: ${antes} → ${depois} pontos, ${tamanho(h.simbolo)} → ${tamanho(simbolo)} caracteres;`,
  `logotipo: ${tamanho(h.assinatura)} → ${tamanho(assinaturaH)} (horizontal), ${tamanho(v.assinatura)} → ${tamanho(assinaturaV)} (vertical)`,
);
