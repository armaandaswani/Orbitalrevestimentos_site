/**
 * Medição de movimento por dispositivo.
 *
 *   node scripts/medir-movimento.mjs --url http://localhost:3002/techstone --matriz --cpu 4 --saida <dir>
 *   node scripts/medir-movimento.mjs --url <url> --dispositivo iphone-se --reduzido
 *   node scripts/medir-movimento.mjs --url <url> --dispositivo desktop-1440 --webkit
 *
 * Opções:
 *   --url <url>          página a medir (obrigatório)
 *   --dispositivo <nome> um dispositivo da tabela abaixo (padrão: desktop-1440)
 *   --matriz             roda os oito dispositivos, um após o outro
 *   --cpu <n>            fator de estrangulamento de CPU (padrão 1 = sem estrangular)
 *   --reduzido           liga prefers-reduced-motion: reduce
 *   --saida <dir>        pasta de saída (padrão: <tmp>/medicao-movimento)
 *   --faixa nome=<sel>   (repetível) trecho da página a medir à parte; <sel> é um
 *                        seletor CSS (vai de offsetTop a offsetTop+offsetHeight) ou
 *                        "<ini>-<fim>" em px. Ex.: --faixa clima=.ts-clima --faixa topo=0-900
 *   --repeticoes <n>     roda a rolagem medida n vezes (padrão 1) e reporta a mediana;
 *                        sempre há uma rolagem de aquecimento antes, sem medir
 *   --api-produtos <arq> responde /api/products com esse JSON (para /produtos/pfb/catalogo sem banco local)
 *   --webkit, --firefox  troca o motor, se o runtime tiver o navegador instalado
 *
 * Para cada dispositivo grava <saida>/<dispositivo>/resultado.json
 * ({ dispositivo, quadros, p95Ms, maxMs, acima33, cls, scrollWidth, larguraJanela,
 *    innerHeight, faixas, clsCarga, execucoes }; os campos de tempo são a mediana das
 *    execuções; cada faixa dada por seletor ou por px também traz altura e alturaTelas),
 * quadros.json (os pares [delta ms, scrollY] crus de cada execução, mais os limites
 * de cada faixa), os seis prints (0, 20, 40, 60, 80 e 100% da rolagem) e uma folha de
 * contato (folha.png) com os seis lado a lado. Também grava <saida>/resumo.json.
 *
 * Por que existe: provar com número, e não a olho, que a animação continua fluida
 * em aparelho fraco (CPU lenta), em tela pequena e sem estourar a largura.
 *
 * Três proteções ligadas por padrão, sem opção para desligar:
 *   1. Corte das análises: todo contexto aborta os pedidos ao GA4, ao Meta Pixel, ao
 *      Vercel Analytics e ao Speed Insights, para nenhuma medição mandar visita ou
 *      evento a eles. O custo desses scripts de terceiros sai da medição (carregam
 *      igual em toda página e não fazem parte do que se mede aqui).
 *   2. Nível completo: deviceMemory e hardwareConcurrency valem 8, para o nível ser
 *      "completo" em qualquer máquina (com 4 núcleos ou menos, decidirNivel daria
 *      "leve", o CSS tiraria a cena de 400svh e o portão passaria sem medi-la).
 *   3. Sem cortina: orbital-intro=1 no sessionStorage, para a cortina da IntroOrbita
 *      não entrar na medição (ela tem o seu próprio teste, introTempo.test.mjs).
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// playwright-core não é dependência do projeto de propósito: vem do runtime da
// caixa de ferramentas de web design, para o site não carregar um navegador a mais.
const PW_CORE =
  process.env.PW_CORE ||
  "/Users/armaandaswani/Desktop/Webdesign/tools/playwright-runtime/node_modules/playwright-core";
const require = createRequire(import.meta.url);
const pw = require(PW_CORE);

// nome → largura x altura @ escala; toque ligado nos cinco primeiros.
const DISPOSITIVOS = {
  "iphone-se": { w: 375, h: 667, dpr: 2, toque: true },
  "iphone-15-pro": { w: 393, h: 852, dpr: 3, toque: true },
  "pixel-8": { w: 412, h: 915, dpr: 2.625, toque: true },
  "ipad-mini": { w: 768, h: 1024, dpr: 2, toque: true },
  "ipad-pro": { w: 1366, h: 1024, dpr: 2, toque: true },
  "desktop-1280": { w: 1280, h: 800, dpr: 1, toque: false },
  "desktop-1440": { w: 1440, h: 900, dpr: 1, toque: false },
  "desktop-1920": { w: 1920, h: 1080, dpr: 1, toque: false },
};

const PASSO_PX = 120; // um "clique" de roda de mouse
const PASSO_MS = 16; // um quadro a 60 Hz
const PCTS = [0, 20, 40, 60, 80, 100];
const LIMITE_PASSOS = 3000; // trava de segurança contra página que cresce sem fim

function lerArgs(argv) {
  const a = { cpu: 1, matriz: false, reduzido: false, motor: "chromium", repeticoes: 1, faixas: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--url") a.url = argv[++i];
    else if (k === "--dispositivo") a.dispositivo = argv[++i];
    else if (k === "--matriz") a.matriz = true;
    else if (k === "--cpu") a.cpu = Number(argv[++i]);
    else if (k === "--repeticoes") a.repeticoes = Number(argv[++i]);
    else if (k === "--faixa") {
      const v = argv[++i] || "";
      const eq = v.indexOf("=");
      if (eq < 1 || eq === v.length - 1) {
        console.error(`--faixa espera nome=<seletor>|nome=<ini>-<fim>, recebi: ${v}`);
        process.exit(2);
      }
      const nome = v.slice(0, eq);
      const alvo = v.slice(eq + 1);
      const px = alvo.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
      a.faixas.push(px ? { nome, ini: Number(px[1]), fim: Number(px[2]) } : { nome, seletor: alvo });
    }
    else if (k === "--api-produtos") {
      const v = argv[++i];
      if (!v || v.startsWith("--") || !fs.existsSync(path.resolve(v))) {
        console.error(`--api-produtos espera o caminho de um arquivo JSON existente, recebi: ${v ?? "(nada)"}`);
        process.exit(2);
      }
      a.apiProdutos = path.resolve(v);
    }
    else if (k === "--reduzido") a.reduzido = true;
    else if (k === "--saida") a.saida = argv[++i];
    else if (k === "--webkit") a.motor = "webkit";
    else if (k === "--firefox") a.motor = "firefox";
    else {
      console.error(`opção desconhecida: ${k}`);
      process.exit(2);
    }
  }
  if (!a.url) {
    console.error("uso: node scripts/medir-movimento.mjs --url <url> [--dispositivo <nome>|--matriz] [--cpu 4] [--reduzido] [--saida <dir>]");
    process.exit(2);
  }
  if (!Number.isFinite(a.cpu) || a.cpu < 1) {
    console.error("--cpu precisa ser um número >= 1");
    process.exit(2);
  }
  if (!Number.isInteger(a.repeticoes) || a.repeticoes < 1) {
    console.error("--repeticoes precisa ser um inteiro >= 1");
    process.exit(2);
  }
  a.saida = path.resolve(a.saida || path.join(os.tmpdir(), "medicao-movimento"));
  return a;
}

// Abre o motor pedido. Retorna null (e avisa) quando o runtime não o tem.
async function abrirMotor(motor) {
  if (motor === "chromium") {
    // Chrome instalado primeiro: o Chromium embutido não decodifica h264, e vídeo
    // que não pinta faria a medição "passar" contra o pôster (ver scroll-craft/verify.md).
    try {
      return await pw.chromium.launch({ channel: "chrome" });
    } catch {
      return await pw.chromium.launch();
    }
  }
  try {
    return await pw[motor].launch();
  } catch {
    console.log(`motor indisponível: ${motor} não está instalado neste runtime, pulando`);
    return null;
  }
}

// Percentil por posto mais próximo; a lista já vem ordenada.
function percentil(ordenado, p) {
  if (!ordenado.length) return 0;
  const i = Math.min(ordenado.length - 1, Math.ceil(p * ordenado.length) - 1);
  return ordenado[Math.max(0, i)];
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const arred = (n, casas = 2) => Number(n.toFixed(casas));

// Mediana: com poucas repetições um quadro perdido por acaso (GC, disco) não deve
// decidir o resultado; a mediana ignora a execução fora do padrão.
function mediana(lista) {
  if (!lista.length) return 0;
  const o = lista.slice().sort((a, b) => a - b);
  const m = o.length >> 1;
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

// Métricas de uma execução a partir dos pares [delta ms, scrollY]. Um quadro pertence
// a uma faixa quando o scrollY dele cai dentro dela (início inclusive, fim exclusive).
function metricas(pares, limites) {
  const deltas = pares.map((p) => p[0]);
  const ordenado = deltas.slice().sort((a, b) => a - b);
  const faixas = {};
  for (const [nome, lim] of Object.entries(limites)) {
    if (!lim) continue; // seletor que não achou elemento: já avisado, fica de fora
    // Semântica: o quadro pertence à faixa quando o scrollY dele (topo da janela de
    // visualização) está em [ini, fim). Não é "o elemento aparece na tela".
    const ds = pares.filter((p) => p[1] >= lim[0] && p[1] < lim[1]).map((p) => p[0]);
    faixas[nome] = {
      quadros: ds.length,
      acima33: ds.filter((x) => x > 33).length,
      maxMs: arred(ds.length ? Math.max(...ds) : 0),
    };
  }
  return {
    quadros: deltas.length,
    p95Ms: arred(percentil(ordenado, 0.95)),
    maxMs: arred(ordenado.length ? ordenado[ordenado.length - 1] : 0),
    acima33: deltas.filter((x) => x > 33).length, // quadro > 33 ms = perdeu pelo menos um de 60 Hz
    faixas,
  };
}

const voltarAoTopo = async (page) => {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await dormir(500);
};

// Estado de rolagem lido de dentro da página.
const lerRolagem = (page) =>
  page.evaluate(() => ({
    y: window.scrollY,
    max: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
  }));

// Gira a roda em passos de 120 px a cada 16 ms até chegar em `alvoY` (ou no fim).
// Roda de verdade, e não scrollTo, porque é o que dispara o suavizador de rolagem
// e os efeitos presos à rolagem do jeito que um visitante dispara.
async function rolarAte(page, alvoY) {
  let parado = 0;
  let ultimo = -1;
  for (let passo = 0; passo < LIMITE_PASSOS; passo++) {
    await page.mouse.wheel(0, PASSO_PX);
    await dormir(PASSO_MS);
    // ler a cada 4 passos para a leitura não pesar no ritmo da roda
    if (passo % 4 !== 3) continue;
    const { y, max } = await lerRolagem(page);
    if (y >= Math.min(alvoY, max) - 2) return;
    // sem sair do lugar por muito tempo: chegamos num fim que o `max` não previu
    parado = Math.abs(y - ultimo) < 1 ? parado + 1 : 0;
    ultimo = y;
    if (parado >= 15) return;
  }
}

async function medirDispositivo(browser, nome, d, args) {
  const ctx = await browser.newContext({
    viewport: { width: d.w, height: d.h },
    deviceScaleFactor: d.dpr,
    hasTouch: d.toque,
    isMobile: d.toque && args.motor !== "firefox", // firefox não suporta isMobile
    reducedMotion: args.reduzido ? "reduce" : "no-preference",
  });

  // Corte das análises: nenhuma medição manda visita ou evento ao GA4, ao Meta Pixel,
  // ao Vercel Analytics nem ao Speed Insights.
  await ctx.route(
    /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|connect\.facebook\.net|facebook\.com\/tr|\/_vercel\/insights|\/_vercel\/speed-insights/,
    (r) => r.abort(),
  );
  // Nível completo em qualquer máquina e sem a cortina da abertura. O try cobre o
  // about:blank, onde o sessionStorage pode lançar erro.
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    try {
      sessionStorage.setItem("orbital-intro", "1");
    } catch {}
  });

  const page = await ctx.newPage();

  // Observadores entram antes de qualquer script da página para pegar o carregamento
  // inteiro: um deslocamento de layout na hidratação também é do visitante.
  await page.addInitScript(() => {
    window.__cls = 0;
    try {
      new PerformanceObserver((lista) => {
        for (const e of lista.getEntries()) {
          if (!e.hadRecentInput) window.__cls += e.value; // entrada do usuário não conta
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      /* motor sem layout-shift (webkit/firefox): cls fica 0 */
    }
    window.__pares = []; // [delta em ms, scrollY] de cada quadro
    window.__medindo = false;
    let anterior = 0;
    const tick = (t) => {
      if (window.__medindo) {
        // o primeiro quadro de cada passada só marca o relógio (anterior=0) e é descartado
        if (anterior) window.__pares.push([t - anterior, window.scrollY]);
        anterior = t;
      } else anterior = 0;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // Sem banco local, /produtos/pfb/catalogo não tem modelos: responde /api/products com um JSON salvo.
  if (args.apiProdutos) {
    await page.route("**/api/products", (rota) => rota.fulfill({ path: args.apiProdutos, contentType: "application/json" }));
  }

  await page.goto(args.url, { waitUntil: "load" });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await dormir(1500); // hidratação e fontes antes de começar a contar

  // Estrangulamento só vale com CDP (chromium). Fica ligado apenas na rolagem medida:
  // com ele ligado os prints e as leituras ficariam lentos sem acrescentar nada.
  let cdp = null;
  if (args.cpu > 1) {
    if (args.motor === "chromium") cdp = await ctx.newCDPSession(page);
    else console.log(`aviso: --cpu só funciona no chromium, ignorado em ${args.motor}`);
  }

  await page.mouse.move(d.w / 2, d.h / 2);

  // ---- aquecimento: uma rolagem sem medir ----
  // Mídia preguiçosa, chunks de JS e decodificação de imagem acontecem na primeira
  // descida; sem isto a primeira execução pagaria por eles e as outras não.
  const clsCarga = await page.evaluate(() => window.__cls);
  await rolarAte(page, Infinity);
  await dormir(600);
  // A primeira descida é onde o layout mais se desloca (mídia preguiçosa, seções que
  // hidratam tarde); as execuções medidas já partem dela carregada e não veriam isso.
  const clsAquecimento = (await page.evaluate(() => window.__cls)) - clsCarga;
  await voltarAoTopo(page);

  // Faixas em px da página, resolvidas depois do aquecimento (a altura já é a final).
  // getBoundingClientRect + scrollY dá a posição absoluta (= offsetTop para seção de
  // topo, e continua certo se o elemento estiver aninhado).
  const limites = {};
  for (const f of args.faixas) {
    if (f.seletor === undefined) {
      limites[f.nome] = [f.ini, f.fim];
      continue;
    }
    const lim = await page
      .evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return [r.top + window.scrollY, r.top + window.scrollY + r.height];
      }, f.seletor)
      .catch(() => null); // seletor inválido também cai aqui
    if (!lim) console.log(`aviso: faixa "${f.nome}" ignorada, seletor sem elemento: ${f.seletor}`);
    limites[f.nome] = lim && lim.map((n) => Math.round(n));
  }
  const innerHeight = await page.evaluate(() => window.innerHeight);

  // ---- passadas medidas: rolagem de cima a baixo, n vezes ----
  const execucoes = [];
  const brutos = [];
  for (let i = 0; i < args.repeticoes; i++) {
    if (i > 0) await voltarAoTopo(page);
    const clsAntes = await page.evaluate(() => window.__cls);
    if (cdp) await cdp.send("Emulation.setCPUThrottlingRate", { rate: args.cpu });
    await page.evaluate(() => { window.__pares.length = 0; window.__medindo = true; });
    await rolarAte(page, Infinity);
    await dormir(600); // a cauda da inércia e o último lote de deslocamentos
    const lido = await page.evaluate(() => {
      window.__medindo = false;
      return { pares: window.__pares.slice(), cls: window.__cls };
    });
    if (cdp) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    // cls de cada execução é só o que aconteceu na rolagem; o do carregamento vai em clsCarga
    execucoes.push({ ...metricas(lido.pares, limites), cls: arred(lido.cls - clsAntes, 4) });
    brutos.push(lido.pares.map(([dl, y]) => [arred(dl), arred(y, 1)]));
  }

  // clientWidth e não innerWidth: sob isMobile o Chrome infla innerWidth até a largura
  // do conteúdo que estourou, e o estouro passaria despercebido (innerWidth == scrollWidth).
  const largura = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    larguraJanela: document.documentElement.clientWidth,
  }));

  // ---- passada 2: prints em 0, 20, 40, 60, 80 e 100% ----
  const pasta = path.join(args.saida, nome);
  fs.mkdirSync(pasta, { recursive: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await dormir(500);
  const arquivos = [];
  for (const pct of PCTS) {
    if (pct > 0) {
      const { max } = await lerRolagem(page);
      await rolarAte(page, (max * pct) / 100);
      await dormir(450); // deixa a inércia assentar antes do print
    }
    const arq = path.join(pasta, `rolagem-${String(pct).padStart(3, "0")}.png`);
    await page.screenshot({ path: arq, scale: "css" }); // css: arquivo leve, sem multiplicar pelo dpr
    arquivos.push(arq);
  }
  await ctx.close();

  montarFolha(arquivos, path.join(pasta, "folha.png"), d);

  // Campos de topo = mediana das execuções (com 1 execução, o próprio valor).
  const med = (f) => mediana(execucoes.map(f));
  const faixas = {};
  for (const fn of Object.keys(execucoes[0].faixas)) {
    faixas[fn] = {
      quadros: med((e) => e.faixas[fn].quadros),
      acima33: med((e) => e.faixas[fn].acima33),
      maxMs: arred(med((e) => e.faixas[fn].maxMs)),
    };
    // altura e alturaTelas só existem para faixa com limites (seletor achado ou "<ini>-<fim>")
    if (limites[fn]) {
      const altura = limites[fn][1] - limites[fn][0];
      faixas[fn].altura = altura;
      faixas[fn].alturaTelas = arred(altura / innerHeight, 2);
    }
  }
  const resultado = {
    dispositivo: nome,
    quadros: med((e) => e.quadros),
    p95Ms: arred(med((e) => e.p95Ms)),
    maxMs: arred(med((e) => e.maxMs)),
    acima33: med((e) => e.acima33),
    cls: arred(med((e) => e.cls), 4),
    scrollWidth: largura.scrollWidth,
    larguraJanela: largura.larguraJanela,
    innerHeight,
    faixas,
    clsCarga: arred(clsCarga, 4),
    clsAquecimento: arred(clsAquecimento, 4),
    execucoes,
  };
  fs.writeFileSync(path.join(pasta, "resultado.json"), JSON.stringify(resultado, null, 2) + "\n");
  // pares crus [delta ms, scrollY], uma lista por execução, para análise por faixa depois
  fs.writeFileSync(path.join(pasta, "quadros.json"), JSON.stringify({ faixas: limites, execucoes: brutos }) + "\n");
  return resultado;
}

// Costura os seis prints numa fila com ffmpeg. Cada quadro é reduzido para a folha
// não passar de ~4000 px de largura em desktop largo.
function montarFolha(arquivos, saida, d) {
  const larg = d.w <= 768 ? 360 : 640;
  const alt = 2 * Math.round(((d.h / d.w) * larg) / 2); // par: exigência do codec/escala
  const entradas = arquivos.flatMap((f) => ["-i", f]);
  const filtros =
    arquivos.map((_, i) => `[${i}:v]scale=${larg}:${alt}[v${i}]`).join(";") +
    ";" + arquivos.map((_, i) => `[v${i}]`).join("") + `hstack=inputs=${arquivos.length}`;
  try {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...entradas, "-filter_complex", filtros, "-frames:v", "1", saida]);
  } catch (e) {
    console.log(`aviso: folha de contato não gerada (${e.code === "ENOENT" ? "ffmpeg não encontrado" : "erro no ffmpeg"}); os seis prints continuam na pasta`);
  }
}

// O cls impresso é o pior entre a primeira descida (aquecimento) e a mediana das
// execuções medidas, para o portão não deixar passar deslocamento só da primeira descida.
function linha(r, motor) {
  const ok = r.scrollWidth === r.larguraJanela;
  const principal =
    `${r.dispositivo.padEnd(14)} [${motor}] quadros=${r.quadros} p95=${r.p95Ms}ms max=${r.maxMs}ms ` +
    `acima33=${r.acima33} cls=${Math.max(r.clsAquecimento, r.cls)} scrollWidth=${r.scrollWidth} janela=${r.larguraJanela} ` +
    (ok ? "sem-estouro" : "ESTOURO-HORIZONTAL");
  const porFaixa = Object.entries(r.faixas).map(
    ([n, f]) => `    faixa ${n}: quadros=${f.quadros} acima33=${f.acima33} max=${f.maxMs}ms`,
  );
  return [principal, ...porFaixa].join("\n");
}

async function main() {
  const args = lerArgs(process.argv.slice(2));
  let nomes;
  if (args.matriz) nomes = Object.keys(DISPOSITIVOS);
  else {
    const n = args.dispositivo || "desktop-1440";
    if (!DISPOSITIVOS[n]) {
      console.error(`dispositivo desconhecido: ${n}\ndisponíveis: ${Object.keys(DISPOSITIVOS).join(", ")}`);
      process.exit(2);
    }
    nomes = [n];
  }

  const browser = await abrirMotor(args.motor);
  if (!browser) return; // motor indisponível já foi avisado
  fs.mkdirSync(args.saida, { recursive: true });

  const resumo = [];
  try {
    for (const nome of nomes) {
      const r = await medirDispositivo(browser, nome, DISPOSITIVOS[nome], args);
      resumo.push(r);
      console.log(linha(r, args.motor));
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(args.saida, "resumo.json"), JSON.stringify(resumo, null, 2) + "\n");
  console.log(`saída: ${args.saida}`);
}

await main();
