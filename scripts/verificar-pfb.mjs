/**
 * Verificações do Painel Flexível em Fibra de Bambu (PFB) no navegador, por etapa.
 *
 *   node scripts/verificar-pfb.mjs --base http://localhost:3004 --etapa 2
 *   node scripts/verificar-pfb.mjs --base https://orbitalrevestimentos.com.br --etapa 2 --so-redirecionamentos
 *
 * Opções:
 *   --base <url>            site a verificar (obrigatório; local: o next start com o mock do Supabase)
 *   --etapa <1|2|4>         etapa da Verification Plan (a 1 e a 2 estão implementadas; a 4 ainda não)
 *   --saida <dir>           pasta do resultado.json e das capturas
 *                           (padrão: .superpowers/checks/saida/pfb-etapa-<n>/)
 *   --so-redirecionamentos  só os redirecionamentos e o sitemap, por HTTP, sem navegador
 *                           nem /api/products (é o que roda contra o site no ar)
 *
 * Grava <saida>/resultado.json ({ etapa, base, inicio, fim, navegador, verificacoes })
 * e sai com código 1 se alguma verificação não terminar em "ok" ("não verificado"
 * conta como falha).
 *
 * Proteções ligadas em todo contexto de navegador, sem opção para desligar:
 *   1. Corte das análises: os pedidos ao GA4, ao Meta Pixel, ao Vercel Analytics e ao
 *      Speed Insights são abortados, para nenhum teste mandar visita ou evento a eles.
 *      O gtag de linha do layout continua empurrando para window.dataLayer, que é o
 *      que as conferências de evento leem.
 *   2. Nível completo: deviceMemory e hardwareConcurrency valem 8 (o caso "Nível
 *      leve" da Etapa 2 pede memória 2 pelo próprio novoContexto).
 *   3. Sem cortina: orbital-intro=1 no sessionStorage.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogoPath, normalizeProductCode, CATALOGO_PATH } from "../src/lib/product-link.ts";

// playwright-core vem do runtime da caixa de ferramentas de web design, como em
// scripts/medir-movimento.mjs (não é dependência do projeto).
const PW_CORE =
  process.env.PW_CORE ||
  "/Users/armaandaswani/Desktop/Webdesign/tools/playwright-runtime/node_modules/playwright-core";
const require = createRequire(import.meta.url);

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOG_MOCK = path.join(RAIZ, ".superpowers/checks/saida/pfb-mock.log");
const FONTE_CATALOGO = path.join(RAIZ, "src/app/produtos/pfb/catalogo/page.tsx");
const PFB_PATH = "/produtos/pfb";

/** Código-fonte lido por "Texto fixo de atributos" (item 15) em cada etapa. */
function fontesDeAtributos(etapa) {
  if (etapa === 1) return [FONTE_CATALOGO];
  const pasta = path.join(RAIZ, "src/components/pfb");
  const pfb = fs
    .readdirSync(pasta)
    .filter((f) => f.endsWith(".tsx"))
    .sort()
    .map((f) => path.join(pasta, f));
  return [FONTE_CATALOGO, ...pfb, path.join(RAIZ, "src/components/SolicitarManual.tsx"), path.join(RAIZ, "src/components/VideoShort.tsx")];
}

const ANALISES = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|connect\.facebook\.net|facebook\.com\/tr|\/_vercel\/insights|\/_vercel\/speed-insights/;
const WHATSAPP = /:\/\/(wa\.me|api\.whatsapp\.com)\//;

const LARGURAS = [
  [320, 568],
  [375, 812],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1440, 900],
  [1920, 1080],
];
const CELULAR = [390, 844];
const DESKTOP = [1440, 900];
const MENOR = [320, 568];

// Ordem dos botões em [data-teste="abas-linha"] (a de `linhas` no catálogo).
const ABA = { todos: 1, Classic: 2, Brilliance: 3, Elegance: 4 };

const PROIBIDOS = ["15 acabamentos", "20 anos", "sem o custo", "impermeáv", "maxiplatê", "2 a 3 horas", "—", "–"];

/**
 * Texto proibido por etapa (lerTextos, fontesVazias e procurarProibidos recebem uma
 * entrada daqui). `ld`: os scripts JSON-LD lidos; `minLd`: quantos têm de existir;
 * `palavras`: termos que só contam como palavra inteira ("UV" e "MDF", para não
 * acusar "chuva" ou "luva"). Na 2, sem "2 a 3 horas" (a Seção 5 o tem por decisão
 * do dono, E-5). O catálogo visitado com --etapa 2 usa a 2 com a união das duas
 * listas de proibidos e minLd 4 (os 3 do layout raiz e o ld-catalogo).
 */
const TEXTO = {
  1: { ld: "script#ld-catalogo", nomeLd: "ld-catalogo", minLd: 1, proibidos: PROIBIDOS, palavras: [] },
  2: {
    ld: 'script[type="application/ld+json"]',
    nomeLd: "ld+json",
    minLd: 7,
    proibidos: ["impermeáv", "mais caro", "estrutural", "±10%", "20 anos", "15 acabamentos", "instalado em 2", "—", "–"],
    palavras: [/\buv\b/i, /\bmdf\b/i],
  },
};
const ATRIBUTO_COM_TRAVESSAO = /(alt|aria-label|title)\s*[=:]\s*\{?\s*[`"'][^`"']*[—–]/g;

const ESPERA_MS = 15000;

// ── Argumentos ──────────────────────────────────────────────────────────────

function lerArgs(argv) {
  const a = { base: null, etapa: null, saida: null, soRedirecionamentos: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--base") a.base = argv[++i];
    else if (k === "--etapa") a.etapa = Number(argv[++i]);
    else if (k === "--saida") a.saida = argv[++i];
    else if (k === "--so-redirecionamentos") a.soRedirecionamentos = true;
    else {
      console.error(`opção desconhecida: ${k}`);
      process.exit(2);
    }
  }
  if (!a.base || ![1, 2, 4].includes(a.etapa)) {
    console.error("uso: node scripts/verificar-pfb.mjs --base <url> --etapa <1|2|4> [--saida <dir>] [--so-redirecionamentos]");
    process.exit(2);
  }
  a.base = a.base.replace(/\/+$/, "");
  a.saida = path.resolve(a.saida || path.join(RAIZ, `.superpowers/checks/saida/pfb-etapa-${a.etapa}`));
  return a;
}

// ── Resultado ───────────────────────────────────────────────────────────────

const args = lerArgs(process.argv.slice(2));
fs.mkdirSync(args.saida, { recursive: true });

const resultado = {
  etapa: args.etapa,
  base: args.base,
  inicio: new Date().toISOString(),
  fim: null,
  navegador: null,
  verificacoes: [],
};
const ARQUIVO_RESULTADO = path.join(args.saida, "resultado.json");
const gravarResultado = () => fs.writeFileSync(ARQUIVO_RESULTADO, JSON.stringify(resultado, null, 2) + "\n");
// Zera o resultado.json logo no início (fim: null, lista vazia): se o processo cair no
// meio, o arquivo que fica não é o "ok" de uma rodada antiga.
gravarResultado();

const rotulo = (dim) => (dim ? `${dim[0]} × ${dim[1]}` : null);

function registrar(nome, dim, estado, detalhe) {
  resultado.verificacoes.push({ nome, largura: rotulo(dim), estado, detalhe });
  const marca = estado === "ok" ? "ok    " : estado === "falhou" ? "FALHOU" : "NÃO VERIFICADO";
  console.log(`${marca} ${nome}${dim ? ` [${rotulo(dim)}]` : ""}: ${detalhe}`);
}

/** Roda uma verificação; `fn` devolve { ok, detalhe }. Erro vira "falhou" com o motivo. */
async function verificar(nome, dim, fn) {
  try {
    const r = await fn();
    registrar(nome, dim, r.ok ? "ok" : "falhou", r.detalhe);
  } catch (e) {
    registrar(nome, dim, "falhou", `erro: ${motivoErro(e)}`);
  }
}

function terminar() {
  resultado.fim = new Date().toISOString();
  const arquivo = ARQUIVO_RESULTADO;
  gravarResultado();
  const conta = {};
  for (const v of resultado.verificacoes) conta[v.estado] = (conta[v.estado] ?? 0) + 1;
  console.log(`\n${arquivo}\n${JSON.stringify(conta)}`);
  const tudoOk = resultado.verificacoes.length > 0 && resultado.verificacoes.every((v) => v.estado === "ok");
  process.exit(tudoOk ? 0 : 1);
}

const url = (caminho) => `${args.base}${caminho}`;

// Todo fetch do Node leva este limite: sem ele valem os 300 s do undici, e a rodada
// --so-redirecionamentos (logo após o deploy, janela de 30 min) ficaria presa num pedido mudo.
const FETCH_MS = 15000;
const buscar = (endereco, opcoes = {}) => fetch(endereco, { ...opcoes, signal: AbortSignal.timeout(FETCH_MS) });
const motivoErro = (e) =>
  // DOMException: o que AbortSignal.timeout faz o fetch lançar (o TimeoutError do Playwright é outra classe e mantém a própria mensagem).
  e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError")
    ? `tempo esgotado (${FETCH_MS / 1000} s sem resposta)`
    : String(e?.message ?? e).split("\n")[0];
const esperado = (medido, esperadoValor) => `medido ${medido}; esperado ${esperadoValor}`;

// ── HTTP (redirecionamentos, sitemap, QR) ───────────────────────────────────

async function semSeguir(caminho) {
  const r = await buscar(url(caminho), { redirect: "manual" });
  const loc = r.headers.get("location");
  const u = loc ? new URL(loc, args.base) : null;
  return { status: r.status, u, destino: u ? u.pathname + u.search : null };
}

async function verificarRedirecionamento(caminho, status, destinoEsperado) {
  await verificar(`GET ${caminho} sem seguir: ${status} para ${destinoEsperado}`, null, async () => {
    const r = await semSeguir(caminho);
    return {
      ok: r.status === status && r.destino === destinoEsperado,
      detalhe: esperado(`${r.status} → ${r.destino ?? "(sem Location)"}`, `${status} → ${destinoEsperado}`),
    };
  });
}

/** Resposta sem Location (a página em si): status esperado e nenhum Location. */
async function verificarSemRedirecionamento(caminho, status) {
  await verificar(`GET ${caminho} sem seguir: ${status} sem Location`, null, async () => {
    const r = await semSeguir(caminho);
    return {
      ok: r.status === status && r.destino === null,
      detalhe: esperado(`${r.status} → ${r.destino ?? "(sem Location)"}`, `${status} sem Location`),
    };
  });
}

/**
 * Redirecionamentos por etapa (Verification Plan e Focos), em dados: `destino` null
 * quer dizer "a página responde, sem Location".
 */
const REDIRECIONAMENTOS = {
  1: [
    ["/produtos/pfb?modelo=orb-003", 307, catalogoPath({ modelo: "orb-003" })],
    ["/produtos?modelo=orb-003", 307, catalogoPath({ modelo: "orb-003" })],
    ["/produtos/pfb", 307, catalogoPath({})],
  ],
  2: [
    ["/produtos/pfb?modelo=orb-003", 308, catalogoPath({ modelo: "orb-003" })],
    ["/produtos?modelo=orb-003", 307, catalogoPath({ modelo: "orb-003" })],
    [PFB_PATH, 200, null],
    ["/tecnologia", 301, PFB_PATH],
    ["/guias/mdf-manaus", 308, PFB_PATH],
  ],
};

/** Sitemap por etapa: caminhos que têm de estar e o padrão de <loc> que não pode estar. */
const SITEMAP = {
  1: { exige: [CATALOGO_PATH], proibido: /\/produtos\/pfb\/?$/, rotuloProibido: "terminados em /produtos/pfb", nome: `tem ${CATALOGO_PATH} e nenhum <loc> terminado em /produtos/pfb` },
  2: { exige: [PFB_PATH, CATALOGO_PATH], proibido: /\/tecnologia/, rotuloProibido: "com /tecnologia", nome: `tem ${PFB_PATH} e ${CATALOGO_PATH} e nenhum <loc> com /tecnologia` },
};

async function redirecionamentos(etapa) {
  for (const [caminho, status, destino] of REDIRECIONAMENTOS[etapa]) {
    if (destino === null) await verificarSemRedirecionamento(caminho, status);
    else await verificarRedirecionamento(caminho, status, destino);
  }

  // Foco 2: parâmetros a mais seguem no Location.
  const comUtm = "/produtos?modelo=orb-003&utm_source=qr";
  await verificar(`GET ${comUtm} sem seguir: 307, Location com modelo=orb-003 e utm_source=qr`, null, async () => {
    const r = await semSeguir(comUtm);
    const q = r.u?.searchParams;
    const ok =
      r.status === 307 &&
      r.u?.pathname === CATALOGO_PATH &&
      q?.get("modelo") === "orb-003" &&
      q?.get("utm_source") === "qr";
    return { ok, detalhe: esperado(`${r.status} → ${r.destino ?? "(sem Location)"}`, `307 → ${CATALOGO_PATH} com modelo=orb-003 e utm_source=qr`) };
  });

  // Foco 1 da Etapa 2: link antigo de /tecnologia com query ou barra final.
  if (etapa === 2) {
    const comUtmTec = "/tecnologia?utm_source=email";
    await verificar(`GET ${comUtmTec} sem seguir: 301, Location ${PFB_PATH} com utm_source=email`, null, async () => {
      const r = await semSeguir(comUtmTec);
      const ok = r.status === 301 && r.u?.pathname === PFB_PATH && r.u?.searchParams.get("utm_source") === "email";
      return { ok, detalhe: esperado(`${r.status} → ${r.destino ?? "(sem Location)"}`, `301 → ${PFB_PATH} com utm_source=email`) };
    });
    await verificar(`GET /tecnologia/ seguido à mão: até 2 saltos, termina em ${PFB_PATH} com 200`, null, async () => {
      const saltos = [];
      let caminho = "/tecnologia/";
      for (let i = 0; i <= 2; i++) {
        const r = await semSeguir(caminho);
        saltos.push(`${caminho} ${r.status}${r.destino ? ` → ${r.destino}` : ""}`);
        if (r.status < 300 || r.status >= 400 || !r.u) {
          const ok = r.status === 200 && caminho === PFB_PATH && i >= 1 && i <= 2;
          return { ok, detalhe: `${saltos.join("; ")} (${i} salto${i === 1 ? "" : "s"}; esperado até 2, terminando em ${PFB_PATH} com 200)` };
        }
        if (r.u.origin !== new URL(args.base).origin) {
          return { ok: false, detalhe: `${saltos.join("; ")}: saiu do site (${r.u.origin})` };
        }
        caminho = r.destino;
      }
      return { ok: false, detalhe: `${saltos.join("; ")}: mais de 2 saltos` };
    });
  }

  // Foco 4 da Etapa 1 (e sitemap da Etapa 2): o sitemap não lista endereço que redireciona.
  const sm = SITEMAP[etapa];
  await verificar(`GET /sitemap.xml: ${sm.nome}`, null, async () => {
    const r = await buscar(url("/sitemap.xml"), { redirect: "manual" });
    const xml = await r.text();
    const locs = [...xml.matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/g)].map((m) => m[1]);
    const faltam = sm.exige.filter((c) => !locs.some((l) => l.endsWith(c)));
    const velhos = locs.filter((l) => sm.proibido.test(l));
    const presentes = etapa === 1
      ? `catálogo ${faltam.length ? "ausente" : "presente"}`
      : `exigidos ${sm.exige.join(", ")}: ${faltam.length ? `faltam ${faltam.join(", ")}` : "presentes"}`;
    return {
      ok: r.status === 200 && faltam.length === 0 && velhos.length === 0,
      detalhe: `status ${r.status}; ${locs.length} <loc>; ${presentes}; ${sm.rotuloProibido}: ${velhos.length ? velhos.join(", ") : "nenhum"}`,
    };
  });
}

// ── Mock e produtos ─────────────────────────────────────────────────────────

const ehLocal = (() => {
  const h = new URL(args.base).hostname;
  return h === "localhost" || h === "127.0.0.1";
})();

/** Primeira verificação no servidor local: o site lê o mock em 127.0.0.1:54329. */
async function conferirMock() {
  const nome = "o site lê o mock";
  if (!fs.existsSync(LOG_MOCK)) {
    registrar(nome, null, "não verificado", `não verificado: o site não lê o mock em 127.0.0.1:54329 (${LOG_MOCK} não existe)`);
    return null;
  }
  const antes = fs.statSync(LOG_MOCK).size;
  let produtos = null;
  let status = "?";
  let erroJson = null;
  try {
    const r = await buscar(url("/api/products"));
    status = r.status;
    const corpo = await r.text();
    try {
      produtos = JSON.parse(corpo);
    } catch (e) {
      erroJson = `corpo não é JSON (${e?.message ?? e}; início: ${JSON.stringify(corpo.slice(0, 60))})`;
    }
  } catch (e) {
    status = `erro: ${motivoErro(e)}`;
  }
  // O mock grava a linha antes de responder, mas dá uma folga ao disco.
  let novas = "";
  for (let i = 0; i < 10; i++) {
    const buf = fs.readFileSync(LOG_MOCK);
    novas = buf.subarray(antes).toString("utf8");
    if (novas.includes(" GET /rest/v1/products")) break;
    await new Promise((res) => setTimeout(res, 100));
  }
  const linha = novas.split("\n").find((l) => l.includes(" GET /rest/v1/products"));
  if (!linha) {
    registrar(nome, null, "não verificado", `não verificado: o site não lê o mock em 127.0.0.1:54329 (GET /api/products: ${status}; nenhuma linha " GET /rest/v1/products" nova no log)`);
    return null;
  }
  if (!Array.isArray(produtos) || produtos.length === 0) {
    const motivo = erroJson ?? (Array.isArray(produtos) ? "lista vazia" : `resposta não é uma lista (${typeof produtos})`);
    registrar(nome, null, "falhou", `o site lê o mock (linha nova no log: ${linha.trim()}), mas GET /api/products: ${status}, ${motivo}`);
    return null;
  }
  registrar(nome, null, "ok", `GET /api/products: ${status}, ${produtos.length} modelos; linha nova no log: ${linha.trim()}`);
  return produtos;
}

function imagensDe(p) {
  const galeria = (p.product_images ?? []).slice().sort((a, b) => a.sort_order - b.sort_order).map((i) => i.image_path);
  return new Set([p.image_path, ...galeria].filter(Boolean)).size;
}

// ── Navegador ───────────────────────────────────────────────────────────────

async function abrirMotor(pw) {
  try {
    return { browser: await pw.chromium.launch({ channel: "chrome" }), canal: "chrome" };
  } catch {
    return { browser: await pw.chromium.launch(), canal: "chromium" };
  }
}

/**
 * Contexto novo com o corte das análises, o nível (memória 8 e 8 núcleos por padrão),
 * sem cortina e com o observador de CLS. `opcoes`: `memoria` (o "Nível leve" usa 2;
 * a propriedade só é definida uma vez, por isso nada de um segundo addInitScript por
 * cima), `js` (false: javaScriptEnabled desligado, os scripts de início não rodam) e
 * `reduzido` (prefers-reduced-motion: reduce).
 */
async function novoContexto(browser, dim, opcoes = {}) {
  const { memoria = 8, js = true, reduzido = false } = opcoes;
  const ctx = await browser.newContext({
    viewport: { width: dim[0], height: dim[1] },
    javaScriptEnabled: js,
    reducedMotion: reduzido ? "reduce" : "no-preference",
  });
  await ctx.route(ANALISES, (r) => r.abort());
  await ctx.addInitScript((m) => {
    Object.defineProperty(navigator, "deviceMemory", { get: () => m });
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    try {
      sessionStorage.setItem("orbital-intro", "1");
    } catch {}
  }, memoria);
  // CLS de carregamento: o mesmo observador de scripts/medir-movimento.mjs.
  await ctx.addInitScript(() => {
    window.__cls = 0;
    try {
      new PerformanceObserver((lista) => {
        for (const e of lista.getEntries()) {
          if (!e.hadRecentInput) window.__cls += e.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
  });
  ctx.setDefaultTimeout(ESPERA_MS);
  const page = await ctx.newPage();
  return { ctx, page };
}

/** Vai ao catálogo com a espera de /api/products registrada antes do goto. */
async function irAoCatalogo(page, caminho) {
  let quandoResposta = 0;
  const resp = page
    .waitForResponse((r) => r.url().includes("/api/products"))
    .then((r) => {
      quandoResposta = Date.now();
      return r;
    });
  // Se o goto lançar, o contexto fecha e esta espera rejeita sem ninguém aguardá-la.
  resp.catch(() => {});
  await page.goto(url(caminho));
  const quandoLoad = Date.now();
  await resp;
  await page.locator('article[data-teste="cartao-modelo"]').first().waitFor({ state: "attached" });
  return { quandoLoad, quandoResposta };
}

const caminhoAtual = (page) => page.evaluate(() => location.pathname + location.search);

async function esperarCaminho(page, alvo) {
  try {
    await page.waitForFunction((a) => location.pathname + location.search === a, alvo, { timeout: 5000 });
  } catch {}
  return caminhoAtual(page);
}

const aba = (page, linha) => page.locator(`[data-teste="abas-linha"] > button:nth-child(${ABA[linha]})`);

async function esperarAbaAtiva(page, linha) {
  try {
    await page.waitForFunction(
      (n) => document.querySelector(`[data-teste="abas-linha"] > button:nth-child(${n})`)?.getAttribute("aria-pressed") === "true",
      ABA[linha],
      { timeout: 5000 },
    );
  } catch {}
  return aba(page, linha).getAttribute("aria-pressed");
}

const modal = (page) => page.locator('[data-teste="modal-modelo"]');

async function tituloDoModal(page) {
  return page.evaluate(() => {
    const m = document.querySelector('[data-teste="modal-modelo"]');
    const id = m?.getAttribute("aria-labelledby");
    return id ? (document.getElementById(id)?.textContent ?? "").trim() : null;
  });
}

const dormir = (ms) => new Promise((res) => setTimeout(res, ms));

async function capturar(page, estado, dim) {
  try {
    await page.screenshot({ path: path.join(args.saida, `${estado}-${dim[0]}x${dim[1]}.png`) });
  } catch {}
}

/** Texto lido no estado atual: main sem [data-texto-banco], atributos fora deles, título e os JSON-LD de `texto.ld`. */
function lerTextos(page, texto) {
  return page.evaluate((seletorLd) => {
    const main = document.querySelector("main");
    const lds = [...document.querySelectorAll(seletorLd)].map((s) => s.textContent ?? "");
    let textoMain = "";
    if (main) {
      const copia = main.cloneNode(true);
      copia.querySelectorAll("[data-texto-banco], script, style").forEach((n) => n.remove());
      textoMain = copia.textContent ?? "";
    }
    const mod = document.querySelector('[data-teste="modal-modelo"]');
    let textoModal = null;
    if (mod) {
      const copia = mod.cloneNode(true);
      copia.querySelectorAll("[data-texto-banco], script, style").forEach((n) => n.remove());
      textoModal = copia.textContent ?? "";
    }
    const atributos = [];
    for (const el of document.querySelectorAll("[alt], [aria-label], [title]")) {
      if (el.closest("[data-texto-banco]") !== null) continue;
      for (const a of ["alt", "aria-label", "title"]) {
        const v = el.getAttribute(a);
        if (v) atributos.push(`${a}="${v}"`);
      }
    }
    return {
      textoMain,
      mainPresente: main !== null,
      ldQuantos: lds.length,
      ldVazios: lds.filter((l) => l.trim() === "").length,
      textoModal,
      atributos,
      titulo: document.title,
      ld: lds.join("\n"),
    };
  }, texto.ld);
}

/** Fonte ausente ou vazia: ler "nada" não pode contar como "nenhum termo proibido". */
function fontesVazias(t, texto) {
  const vazias = [];
  if (!t.mainPresente) vazias.push("main ausente (nenhum <main> na página)");
  else if (t.textoMain.trim() === "") vazias.push("main vazio (sem texto fora de [data-texto-banco])");
  if (t.ldQuantos === 0) vazias.push(`${texto.nomeLd} ausente (nenhum ${texto.ld})`);
  else if (t.ldQuantos < texto.minLd) vazias.push(`${texto.nomeLd}: ${t.ldQuantos} scripts ${texto.ld} (esperado ≥ ${texto.minLd})`);
  if (t.ldVazios > 0) vazias.push(texto.minLd === 1 && t.ldQuantos === 1 ? `${texto.nomeLd} vazio` : `${texto.nomeLd}: ${t.ldVazios} vazio(s)`);
  return vazias;
}

function procurarProibidos(t, texto) {
  const fontes = [
    ["main", t.textoMain],
    ["atributos", t.atributos.join("\n")],
    ["document.title", t.titulo],
    [texto.nomeLd, t.ld],
  ];
  const trecho = (s, i) => s.slice(Math.max(0, i - 40), i + 40).replace(/\s+/g, " ");
  const achados = [];
  for (const [fonte, conteudo] of fontes) {
    const baixo = conteudo.toLowerCase();
    for (const termo of texto.proibidos) {
      const i = baixo.indexOf(termo.toLowerCase());
      if (i >= 0) achados.push(`"${termo}" em ${fonte} (…${trecho(conteudo, i)}…)`);
    }
    for (const re of texto.palavras) {
      const m = re.exec(conteudo);
      if (m) achados.push(`"${m[0]}" (palavra inteira) em ${fonte} (…${trecho(conteudo, m.index)}…)`);
    }
  }
  return achados;
}

// ── Verificações da Etapa 1 no navegador ────────────────────────────────────

async function etapa1Navegador(browser, produtos, etapa) {
  // Com --etapa 2 o catálogo usa a união das listas da 1 e da 2 (o que a E1 limpou continua
  // conferido), as palavras inteiras da 2 e os 4 JSON-LD do catálogo (decisão do controlador,
  // rodada 1 da Tarefa 7). A página /produtos/pfb usa só TEXTO[2].
  const texto =
    etapa === 2
      ? { ...TEXTO[2], minLd: 4, proibidos: [...new Set([...TEXTO[1].proibidos, ...TEXTO[2].proibidos])] }
      : TEXTO[1];
  const primeiro = produtos[0];
  const primeiroDe = (linha) => produtos.find((p) => p.linha === linha);
  const classic = primeiroDe("Classic");
  const maisFotos = produtos.reduce((m, p) => (imagensDe(p) > imagensDe(m) ? p : m), produtos[0]);
  const orb003 = produtos.find((p) => normalizeProductCode(p.code) === "orb-003");
  const mesmoNome = (a, b) => (a ?? "").trim() === (b ?? "").trim();

  // Rolagem lateral em cada largura.
  for (const dim of LARGURAS) {
    await verificar(`Sem rolagem lateral em ${CATALOGO_PATH} (página e abas)`, dim, async () => {
      const { ctx, page } = await novoContexto(browser, dim);
      try {
        await irAoCatalogo(page, CATALOGO_PATH);
        await dormir(300);
        const m = await page.evaluate(() => {
          const abas = document.querySelector('[data-teste="abas-linha"]');
          return {
            sw: document.documentElement.scrollWidth,
            iw: innerWidth,
            asw: abas?.scrollWidth ?? null,
            acw: abas?.clientWidth ?? null,
          };
        });
        await capturar(page, "catalogo", dim);
        return {
          ok: m.sw <= m.iw && m.asw !== null && m.asw <= m.acw,
          detalhe: `página scrollWidth ${m.sw} / innerWidth ${m.iw}; abas scrollWidth ${m.asw} / clientWidth ${m.acw}`,
        };
      } finally {
        await ctx.close();
      }
    });
  }

  // Miniaturas do modal a 320 × 568, no modelo com mais fotos.
  await verificar(`Miniaturas do modal sem rolagem lateral (${maisFotos.code}, ${imagensDe(maisFotos)} fotos)`, MENOR, async () => {
    const { ctx, page } = await novoContexto(browser, MENOR);
    try {
      await irAoCatalogo(page, catalogoPath({ modelo: maisFotos.code }));
      await modal(page).waitFor({ state: "visible" });
      await page.locator('[data-teste="miniaturas-modal"]').waitFor({ state: "attached" });
      await dormir(300);
      const m = await page.evaluate(() => {
        const mini = document.querySelector('[data-teste="miniaturas-modal"]');
        return { msw: mini.scrollWidth, mcw: mini.clientWidth, sw: document.documentElement.scrollWidth, iw: innerWidth };
      });
      await capturar(page, `catalogo-modelo-${normalizeProductCode(maisFotos.code)}`, MENOR);
      return {
        ok: m.msw <= m.mcw && m.sw <= m.iw,
        detalhe: `miniaturas scrollWidth ${m.msw} / clientWidth ${m.mcw}; página scrollWidth ${m.sw} / innerWidth ${m.iw}`,
      };
    } finally {
      await ctx.close();
    }
  });

  // Linha do consultor no modal a 320 × 568.
  await verificar(`Linha do consultor no modal sem estouro nem sobreposição (${primeiro.code})`, MENOR, async () => {
    const { ctx, page } = await novoContexto(browser, MENOR);
    try {
      await irAoCatalogo(page, catalogoPath({ modelo: primeiro.code }));
      await modal(page).waitFor({ state: "visible" });
      await dormir(300);
      const m = await page.evaluate(() => {
        const mod = document.querySelector('[data-teste="modal-modelo"]');
        const p = document.querySelector('[data-teste="linha-consultor"] > p');
        const b = document.querySelector('[data-teste="linha-consultor"] > button');
        const rp = p.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const iw = Math.min(rp.right, rb.right) - Math.max(rp.left, rb.left);
        const ih = Math.min(rp.bottom, rb.bottom) - Math.max(rp.top, rb.top);
        return {
          modSw: mod.scrollWidth, modCw: mod.clientWidth,
          pSw: p.scrollWidth, pCw: p.clientWidth,
          interL: Math.round(iw * 10) / 10, interA: Math.round(ih * 10) / 10,
        };
      });
      await capturar(page, `catalogo-modelo-${normalizeProductCode(primeiro.code)}`, MENOR);
      return {
        ok: m.modSw <= m.modCw && m.pSw <= m.pCw && (m.interL <= 0 || m.interA <= 0),
        detalhe: `modal scrollWidth ${m.modSw} / clientWidth ${m.modCw}; parágrafo scrollWidth ${m.pSw} / clientWidth ${m.pCw}; interseção parágrafo × botão ${m.interL} × ${m.interA} px`,
      };
    } finally {
      await ctx.close();
    }
  });

  // Modal como diálogo.
  await verificar(`?modelo=${normalizeProductCode(primeiro.code)}: modal com role="dialog", aria-modal="true" e título com o nome`, CELULAR, async () => {
    const { ctx, page } = await novoContexto(browser, CELULAR);
    try {
      await irAoCatalogo(page, catalogoPath({ modelo: primeiro.code }));
      await modal(page).waitFor({ state: "visible" });
      const role = await modal(page).getAttribute("role");
      const ariaModal = await modal(page).getAttribute("aria-modal");
      const titulo = await tituloDoModal(page);
      return {
        ok: role === "dialog" && ariaModal === "true" && mesmoNome(titulo, primeiro.name),
        detalhe: `role=${role}; aria-modal=${ariaModal}; aria-labelledby → "${titulo}" (esperado "${primeiro.name}")`,
      };
    } finally {
      await ctx.close();
    }
  });

  // ?linha=classic: filtro, abrir, fechar e history.back().
  await verificar("?linha=classic: aba Classic, só cartões Classic, abrir/fechar e history.back()", CELULAR, async () => {
    const { ctx, page } = await novoContexto(browser, CELULAR);
    try {
      const passos = [];
      let ok = true;
      const conferir = (cond, texto) => {
        if (!cond) ok = false;
        passos.push(`${cond ? "ok" : "FALHOU"}: ${texto}`);
      };
      const lista = catalogoPath({ linha: "Classic" });
      const comModelo = catalogoPath({ linha: "Classic", modelo: classic.code });
      await irAoCatalogo(page, lista);
      conferir((await esperarAbaAtiva(page, "Classic")) === "true", "aba Classic com aria-pressed=true");
      const linhasCartoes = await page.locator('article[data-teste="cartao-modelo"]').evaluateAll((els) => els.map((e) => e.dataset.linha));
      conferir(linhasCartoes.length > 0 && linhasCartoes.every((l) => l === "Classic"), `cartões: ${linhasCartoes.length}, linhas ${[...new Set(linhasCartoes)].join(", ")}`);
      await page.locator('article[data-teste="cartao-modelo"]').first().click();
      await modal(page).waitFor({ state: "visible" });
      let atual = await esperarCaminho(page, comModelo);
      conferir(atual === comModelo, `abrir o 1º cartão: ${atual} (esperado ${comModelo})`);
      await modal(page).locator('button[aria-label="Fechar"]').first().click();
      await modal(page).waitFor({ state: "detached" });
      atual = await esperarCaminho(page, lista);
      conferir(atual === lista, `fechar: ${atual} (esperado ${lista})`);
      await page.locator('article[data-teste="cartao-modelo"]').first().click();
      await modal(page).waitFor({ state: "visible" });
      await esperarCaminho(page, comModelo);
      await page.evaluate(() => history.back());
      let fechou = true;
      try {
        await modal(page).waitFor({ state: "detached", timeout: 5000 });
      } catch {
        fechou = false;
      }
      atual = await esperarCaminho(page, lista);
      conferir(fechou && atual === lista, `history.back(): modal ${fechou ? "fechado" : "ainda aberto"}, ${atual} (esperado ${lista})`);
      return { ok, detalhe: passos.join("; ") };
    } finally {
      await ctx.close();
    }
  });

  // CLS da chegada filtrada.
  for (const dim of [CELULAR, DESKTOP]) {
    await verificar("CLS da chegada filtrada (?linha=classic) < 0,05", dim, async () => {
      const { ctx, page } = await novoContexto(browser, dim);
      try {
        const t = await irAoCatalogo(page, catalogoPath({ linha: "Classic" }));
        const ultimo = Math.max(t.quandoLoad, t.quandoResposta);
        await dormir(Math.max(0, ultimo + 500 - Date.now()));
        const cls = await page.evaluate(() => window.__cls);
        return { ok: cls < 0.05, detalhe: esperado(`clsCarga ${cls.toFixed(4)}`, "< 0,05") };
      } finally {
        await ctx.close();
      }
    });
  }

  // Linha errada na URL com um modelo Classic.
  await verificar(`?linha=elegance&modelo=${normalizeProductCode(classic.code)}: aba Classic e URL corrigida`, CELULAR, async () => {
    const { ctx, page } = await novoContexto(browser, CELULAR);
    try {
      const alvo = catalogoPath({ linha: "Classic", modelo: classic.code });
      await irAoCatalogo(page, `${CATALOGO_PATH}?linha=elegance&modelo=${normalizeProductCode(classic.code)}`);
      const pressed = await esperarAbaAtiva(page, "Classic");
      const atual = await esperarCaminho(page, alvo);
      return {
        ok: pressed === "true" && atual === alvo,
        detalhe: `aba Classic aria-pressed=${pressed}; URL ${atual} (esperado ${alvo})`,
      };
    } finally {
      await ctx.close();
    }
  });

  // Modelo inexistente.
  const aviso = "O modelo ORB-999 não está mais disponível no catálogo.";
  const esperarAviso = async (page) => {
    try {
      await page.waitForFunction((t) => (document.querySelector("main")?.innerText ?? "").includes(t), aviso, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  };
  await verificar("?modelo=orb-999: aviso de modelo fora do catálogo", CELULAR, async () => {
    const { ctx, page } = await novoContexto(browser, CELULAR);
    try {
      await irAoCatalogo(page, catalogoPath({ modelo: "orb-999" }));
      const tem = await esperarAviso(page);
      return { ok: tem, detalhe: `aviso "${aviso}" ${tem ? "presente" : "ausente"}` };
    } finally {
      await ctx.close();
    }
  });

  await verificar("?linha=elegance&modelo=orb-999: aba Elegance, URL sem mudança e aviso", CELULAR, async () => {
    const { ctx, page } = await novoContexto(browser, CELULAR);
    try {
      const pedido = catalogoPath({ linha: "Elegance", modelo: "orb-999" });
      await irAoCatalogo(page, pedido);
      const tem = await esperarAviso(page);
      const pressed = await esperarAbaAtiva(page, "Elegance");
      await dormir(300);
      const atual = await caminhoAtual(page);
      return {
        ok: tem && pressed === "true" && atual === pedido,
        detalhe: `aba Elegance aria-pressed=${pressed}; URL ${atual} (esperado ${pedido}); aviso ${tem ? "presente" : "ausente"}`,
      };
    } finally {
      await ctx.close();
    }
  });

  // Texto proibido nos quatro estados, a 390 × 844 e a 1440 × 900.
  const estados = [
    { estado: "catalogo", rotuloEstado: "página sem query", caminho: CATALOGO_PATH },
    ...["Classic", "Brilliance", "Elegance"].map((l) => ({
      estado: `catalogo-linha-${l.toLowerCase()}`,
      rotuloEstado: `?linha=${l.toLowerCase()}`,
      caminho: catalogoPath({ linha: l }),
      linha: l,
    })),
    ...["Classic", "Brilliance", "Elegance"].flatMap((l) => {
      const p = primeiroDe(l);
      if (!p) return [];
      const c = normalizeProductCode(p.code);
      return [
        { estado: `catalogo-modelo-${c}`, rotuloEstado: `?modelo=${c} com o modal aberto`, caminho: catalogoPath({ modelo: p.code }), modelo: true, exige: "1,20 × 2,90 m × 5 mm", exigeNoModal: true },
        { estado: `catalogo-modelo-${c}-ampliada`, rotuloEstado: `?modelo=${c} com a foto ampliada`, caminho: catalogoPath({ modelo: p.code }), modelo: true, ampliada: true, exige: "1,20 × 2,90 m × 5 mm", exigeNoModal: true },
      ];
    }),
    { estado: "catalogo-modelo-orb-999", rotuloEstado: "?modelo=orb-999", caminho: catalogoPath({ modelo: "orb-999" }), aviso: true, exige: "Veja abaixo os modelos atuais." },
  ];
  for (const linha of ["Classic", "Brilliance", "Elegance"]) {
    if (!primeiroDe(linha)) registrar(`Texto proibido: ?modelo=<primeiro ${linha}>`, null, "não verificado", `nenhum modelo ${linha} em /api/products`);
  }
  for (const dim of [CELULAR, DESKTOP]) {
    for (const e of estados) {
      await verificar(`Texto proibido: ${e.rotuloEstado}`, dim, async () => {
        const { ctx, page } = await novoContexto(browser, dim);
        try {
          await irAoCatalogo(page, e.caminho);
          // Estado ?linha=…: a aba da linha tem de terminar com aria-pressed="true"
          // (esperarAbaAtiva engole o timeout e só devolve o valor medido).
          const pressed = e.linha ? await esperarAbaAtiva(page, e.linha) : null;
          if (e.modelo) await modal(page).waitFor({ state: "visible" });
          if (e.ampliada) {
            await modal(page).locator('button[aria-label="Ampliar foto"]').click();
            await page.locator('[role="dialog"][data-texto-banco]').waitFor({ state: "visible" });
          }
          if (e.aviso) await esperarAviso(page);
          await dormir(300);
          const t = await lerTextos(page, texto);
          await capturar(page, e.estado, dim);
          const achados = procurarProibidos(t, texto);
          const vazias = fontesVazias(t, texto);
          const semFiltro = e.linha && pressed !== "true" ? [`filtro não aplicado: aba ${e.linha} com aria-pressed=${pressed === null ? "(ausente)" : `"${pressed}"`}; esperado "true"`] : [];
          // Estado 3: o texto corrigido tem de estar no próprio modal (os cartões ao fundo
          // também têm a medida, e lê-los esconderia um modal sem ela).
          const ondeExige = e.exigeNoModal ? "modal-modelo" : "main";
          const textoExige = e.exigeNoModal ? (t.textoModal ?? "") : t.textoMain;
          const faltando = e.exige && !textoExige.includes(e.exige) ? [`falta "${e.exige}" no texto de ${ondeExige}${t.textoModal === null && e.exigeNoModal ? " (modal ausente)" : ""}`] : [];
          const ok = achados.length === 0 && faltando.length === 0 && vazias.length === 0 && semFiltro.length === 0;
          return {
            ok,
            detalhe: ok
              ? `nenhum termo proibido em main (${t.textoMain.length} caracteres), ${t.atributos.length} atributos, document.title e ${texto.nomeLd} (${t.ldQuantos} script${t.ldQuantos === 1 ? "" : "s"}, ${t.ld.length} caracteres)${e.linha ? `; aba ${e.linha} aria-pressed=${pressed}` : ""}${e.exige ? `; "${e.exige}" presente em ${ondeExige} (${textoExige.length} caracteres)` : ""}`
              : [...vazias, ...semFiltro, ...achados, ...faltando].join("; "),
          };
        } finally {
          await ctx.close();
        }
      });
    }
  }

  // Texto fixo de atributos no código-fonte (na 1, o catálogo; na 2, também
  // src/components/pfb/*.tsx, SolicitarManual.tsx e VideoShort.tsx).
  const fontes = fontesDeAtributos(etapa);
  const relativo = (f) => path.relative(RAIZ, f);
  const nomeFontes = etapa === 1 ? relativo(FONTE_CATALOGO) : `${fontes.length} arquivos (${fontes.map(relativo).join(", ")})`;
  await verificar(`Texto fixo de alt, aria-label e title sem travessão em ${nomeFontes}`, null, async () => {
    const achados = fontes.flatMap((arquivo) => {
      const fonte = fs.readFileSync(arquivo, "utf8");
      return [...fonte.matchAll(ATRIBUTO_COM_TRAVESSAO)].map((m) => {
        const linhaN = fonte.slice(0, m.index).split("\n").length;
        return `${etapa === 1 ? "" : `${relativo(arquivo)} `}linha ${linhaN}: ${m[0].replace(/\s+/g, " ").slice(0, 120)}`;
      });
    });
    return { ok: achados.length === 0, detalhe: achados.length ? achados.join("; ") : "nenhum atributo com — ou – no texto fixo" };
  });

  // QR em SVG.
  const qr = `/api/product-qr/${encodeURIComponent(normalizeProductCode(primeiro.code))}?format=svg`;
  await verificar(`GET ${qr}: 200 e content-type image/svg+xml`, null, async () => {
    const r = await buscar(url(qr), { redirect: "manual" });
    const tipo = r.headers.get("content-type") ?? "";
    await r.arrayBuffer();
    return { ok: r.status === 200 && tipo.startsWith("image/svg+xml"), detalhe: esperado(`${r.status}, ${tipo || "(sem content-type)"}`, "200, image/svg+xml…") };
  });

  // Evento do consultor.
  await verificar("Evento consultor_clicado no modal do catálogo", CELULAR, async () => {
    const { ctx, page } = await novoContexto(browser, CELULAR);
    try {
      await irAoCatalogo(page, catalogoPath({ modelo: primeiro.code }));
      await modal(page).waitFor({ state: "visible" });
      await page.waitForFunction(() => typeof window.gtag === "function");
      await modal(page).locator('[data-teste="linha-consultor"] > button').click();
      const esperadoProps = { origem: "catalogo-modelo", pagina: CATALOGO_PATH };
      const achou = await esperarEvento(page, "consultor_clicado", (p) => JSON.stringify(ordenar(p)) === JSON.stringify(ordenar(esperadoProps)));
      return {
        ok: achou.ok,
        detalhe: `dataLayer: ${achou.vistos.length ? achou.vistos.join(" | ") : "nenhuma entrada consultor_clicado"} (esperado ${JSON.stringify(esperadoProps)})`,
      };
    } finally {
      await ctx.close();
    }
  });

  // Evento do manual: na 1 em /tecnologia (cartão, não o link do texto); na 2 em
  // /produtos/pfb, no cartão da seção 3 (section#ficha), não no link da seção 5.
  const manual = etapa === 2
    ? { pagina: PFB_PATH, cartao: (page) => page.locator('section#ficha [data-teste="manual-cartao"] button', { hasText: "Solicitar manual" }) }
    : { pagina: "/tecnologia", cartao: (page) => page.locator("button", { hasText: "Solicitar manual" }) };
  await verificar(`Evento manual_solicitado em ${manual.pagina}`, CELULAR, async () => {
    const { ctx, page } = await novoContexto(browser, CELULAR);
    try {
      await ctx.route(WHATSAPP, (r) => r.abort());
      ctx.on("page", (p) => {
        if (p !== page) p.close().catch(() => {});
      });
      await page.goto(url(manual.pagina));
      await page.waitForFunction(() => typeof window.gtag === "function");
      const cartao = manual.cartao(page);
      const quantos = await cartao.count();
      await cartao.first().click();
      const dialogo = page.locator('[role="dialog"][aria-labelledby="solicitar-manual-titulo"]');
      await dialogo.waitFor({ state: "visible" });
      const perfil = "Arquiteto(a)";
      await dialogo.getByRole("button", { name: perfil, exact: true }).click();
      await dialogo.getByText("Solicitar pelo WhatsApp", { exact: true }).click();
      const achou = await esperarEvento(page, "manual_solicitado", (p) => p?.pagina === manual.pagina && p?.perfil === perfil);
      return {
        ok: achou.ok,
        detalhe: `cartões "Solicitar manual": ${quantos}; dataLayer: ${achou.vistos.length ? achou.vistos.join(" | ") : "nenhuma entrada manual_solicitado"} (esperado pagina "${manual.pagina}" e perfil "${perfil}")`,
      };
    } finally {
      await ctx.close();
    }
  });

  // Foco 1: QR antigo com o código em maiúsculas, seguido no navegador.
  for (const antigo of ["/produtos/pfb?modelo=ORB-003", "/produtos?modelo=ORB-003"]) {
    await verificar(`QR em maiúsculas: ${antigo} abre o modal do ORB-003`, CELULAR, async () => {
      if (!orb003) return { ok: false, detalhe: "ORB-003 não está em /api/products" };
      const { ctx, page } = await novoContexto(browser, CELULAR);
      try {
        await irAoCatalogo(page, antigo);
        await modal(page).waitFor({ state: "visible" });
        const titulo = await tituloDoModal(page);
        const atual = await caminhoAtual(page);
        return {
          ok: mesmoNome(titulo, orb003.name),
          detalhe: `chegou em ${atual}; título do modal "${titulo}" (esperado "${orb003.name}")`,
        };
      } finally {
        await ctx.close();
      }
    });
  }

  // Foco 3: linha inválida com um modelo válido.
  await verificar(`?linha=xyz&modelo=${normalizeProductCode(classic.code)}: modal aberto, aba Todos e URL sem mudança`, CELULAR, async () => {
    const { ctx, page } = await novoContexto(browser, CELULAR);
    try {
      const pedido = `${CATALOGO_PATH}?linha=xyz&modelo=${normalizeProductCode(classic.code)}`;
      await irAoCatalogo(page, pedido);
      await modal(page).waitFor({ state: "visible" });
      await dormir(500);
      const titulo = await tituloDoModal(page);
      const pressed = await aba(page, "todos").getAttribute("aria-pressed");
      const atual = await caminhoAtual(page);
      return {
        ok: mesmoNome(titulo, classic.name) && pressed === "true" && atual === pedido,
        detalhe: `modal "${titulo}" (esperado "${classic.name}"); aba Todos aria-pressed=${pressed}; URL ${atual} (esperado ${pedido})`,
      };
    } finally {
      await ctx.close();
    }
  });

  // Foco 5: fechar o modelo depois de chegar por um QR.
  await verificar(`?modelo=${normalizeProductCode(primeiro.code)}: fechar deixa ${CATALOGO_PATH} e recarregar não reabre`, CELULAR, async () => {
    const { ctx, page } = await novoContexto(browser, CELULAR);
    try {
      await irAoCatalogo(page, catalogoPath({ modelo: primeiro.code }));
      await modal(page).waitFor({ state: "visible" });
      await modal(page).locator('button[aria-label="Fechar"]').first().click();
      await modal(page).waitFor({ state: "detached" });
      const atual = await esperarCaminho(page, CATALOGO_PATH);
      const resp = page.waitForResponse((r) => r.url().includes("/api/products"));
      resp.catch(() => {}); // idem: se o reload lançar
      await page.reload();
      await resp;
      await page.locator('article[data-teste="cartao-modelo"]').first().waitFor({ state: "attached" });
      await dormir(500);
      const reaberto = await modal(page).count();
      return {
        ok: atual === CATALOGO_PATH && reaberto === 0,
        detalhe: `depois de fechar: ${atual} (esperado ${CATALOGO_PATH}); depois de recarregar: modal ${reaberto ? "aberto" : "fechado"}`,
      };
    } finally {
      await ctx.close();
    }
  });
}

// ── Verificações da Etapa 2 no navegador: a página /produtos/pfb ────────────

const LINHAS_PFB = ["Classic", "Brilliance", "Elegance"];
const PASSOS_P = Array.from({ length: 11 }, (_, i) => i / 10);
const rotuloP = (p) => `p${String(Math.round(p * 100)).padStart(3, "0")}`;
const fmtP = (p) => p.toFixed(1).replace(".", ",");
// Folga de arredondamento das opacidades calculadas (0,6 pode voltar como 0,5999…).
const TOL = 1e-3;
const ESPERA_CENA_MS = 600;

/** Vai à página e espera o load e uma folga para a hidratação. */
async function irAPagina(page, caminho = PFB_PATH) {
  await page.goto(url(caminho));
  await page.locator("section#tecnologia").waitFor({ state: "attached" });
  await dormir(500);
}

/** Auxiliar único de "rolar até p": topo + p × (altura − innerHeight), sem rolagem suave. */
async function rolarAteP(page, p) {
  await page.evaluate((q) => {
    const r = document.querySelector("section#tecnologia").getBoundingClientRect();
    window.scrollTo({ top: r.top + scrollY + q * (r.height - innerHeight), behavior: "instant" });
  }, p);
}

/** Rola até o topo da página, até o meio da seção 2 no meio da tela ou até o fim da seção 2 no fim da tela. */
async function rolarSecao(page, onde) {
  await page.evaluate((o) => {
    const r = document.querySelector("section#tecnologia").getBoundingClientRect();
    const topo = r.top + scrollY;
    const alvo = o === "topo-da-pagina" ? 0 : o === "meio" ? topo + r.height / 2 - innerHeight / 2 : topo + r.height - innerHeight;
    window.scrollTo({ top: Math.max(0, alvo), behavior: "instant" });
  }, onde);
}

/** Tudo o que as conferências da cena leem, numa leitura só. */
function medirCena(page) {
  return page.evaluate(() => {
    const sec = document.querySelector("section#tecnologia");
    const r = sec.getBoundingClientRect();
    const op = (el) => (el ? Number(getComputedStyle(el).opacity) : null);
    const itens = [...document.querySelectorAll("ol.pfb-cam-lista > li")].map((li) => {
      const ri = li.getBoundingClientRect();
      return {
        liOp: op(li),
        itemOp: op(li.querySelector(".pfb-cam-item")),
        top: ri.top,
        bottom: ri.bottom,
        left: ri.left,
        right: ri.right,
        topoPagina: ri.top + scrollY,
        classe: li.className,
      };
    });
    const g = (i) => document.querySelector(`g.pfb-cam-g[data-indice="${i}"]`)?.getBoundingClientRect().top ?? null;
    const lista = document.querySelector("ol.pfb-cam-lista")?.getBoundingClientRect();
    const quadro = document.querySelector(".pfb-cam-quadro")?.getBoundingClientRect();
    // Borda de baixo do cabeçalho mostrado: o cabeçalho se esconde ao descer e volta ao subir,
    // então vale a maior entre a posição atual e a altura dele (a borda quando ele está no topo).
    const cabEl = document.querySelector("header[data-site]");
    const cab = cabEl ? Math.max(cabEl.getBoundingClientRect().bottom, cabEl.offsetHeight) : null;
    return {
      ehPfbCam: sec.matches("section.pfb-cam"),
      altura: r.height,
      ih: innerHeight,
      iw: innerWidth,
      sw: document.documentElement.scrollWidth,
      p: sec.style.getPropertyValue("--p") || "(sem --p)",
      itens,
      g0: g(0),
      g4: g(4),
      legendaOp: op(document.querySelector("p.pfb-cam-legenda")),
      listaBottom: lista ? lista.bottom : null,
      quadroBottom: quadro ? quadro.bottom : null,
      cabecalhoBottom: cab,
      nivel: document.documentElement.dataset.mvNivel ?? null,
    };
  });
}

const r1 = (n) => (n === null || n === undefined ? "?" : Math.round(n * 10) / 10);
const cenaAtiva = (m) => Math.abs(m.altura - 4 * m.ih) <= 2;
const textoAltura = (m) => `altura ${r1(m.altura)} px, innerHeight ${m.ih} (4 × = ${4 * m.ih}; 2 × = ${2 * m.ih})`;
const produtos5 = (m) => m.itens.map((it) => it.liOp * it.itemOp);
const textoOps = (m) => m.itens.map((it) => `${r1(it.liOp)}×${r1(it.itemOp)}`).join(" ");
/** Todos os itens com opacidade 1 no li e no .pfb-cam-item de dentro. */
const todosOpacos = (m) => m.itens.length === 5 && m.itens.every((it) => it.liOp >= 1 - TOL && it.itemOp >= 1 - TOL);

/** Captura da Etapa 2: <saida>/pfb-<estado>-<L>x<A>.png. */
const capturarPfb = (page, estado, dim) => capturar(page, `pfb-${estado}`, dim);

async function comContexto(browser, dim, opcoes, fn) {
  const { ctx, page } = await novoContexto(browser, dim, opcoes);
  try {
    return await fn(page, ctx);
  } finally {
    await ctx.close();
  }
}

/** Links visíveis de um seletor, com o href resolvido para pathname + search. */
async function linksVisiveis(page, seletor) {
  const saida = [];
  for (const l of await page.locator(seletor).all()) {
    if (!(await l.isVisible())) continue;
    const href = await l.getAttribute("href");
    const u = href ? new URL(href, args.base) : null;
    saida.push(u ? u.pathname + u.search : "(sem href)");
  }
  return saida;
}

/** Conferência da cena num ponto p (1440 × 900 e fallback): piso 0,6, item na tela, camadas e legenda. */
function conferirPonto(m, p, { exigeNaTela = true, exigeQuadro = false } = {}) {
  const falhas = [];
  const prods = produtos5(m);
  if (m.itens.length !== 5) falhas.push(`${m.itens.length} itens na lista (esperado 5)`);
  const minimo = Math.min(...prods);
  if (!(minimo >= 0.6 - TOL)) falhas.push(`produto das opacidades mínimo ${minimo.toFixed(3)} (esperado ≥ 0,6)`);
  if (exigeNaTela) {
    const fora = m.itens.flatMap((it, i) => (it.top < 0 || it.bottom > m.ih ? [`item ${i} em [${r1(it.top)}, ${r1(it.bottom)}]`] : []));
    if (fora.length) falhas.push(`fora de [0, ${m.ih}]: ${fora.join(", ")}`);
  }
  if (exigeQuadro && !(m.listaBottom <= m.quadroBottom)) falhas.push(`lista termina em ${r1(m.listaBottom)}, quadro em ${r1(m.quadroBottom)}`);
  if (Math.abs(p - 0.5) < 1e-9 && !(m.g4 - m.g0 >= 200)) falhas.push(`camada 0 só ${r1(m.g4 - m.g0)} px acima da 4 (esperado ≥ 200)`);
  if (Math.abs(p - 1) < 1e-9 && !(m.legendaOp >= 1 - TOL)) falhas.push(`legenda com opacidade ${m.legendaOp} (esperado 1)`);
  let resumo = `--p ${m.p}; opacidades li×item ${textoOps(m)} (mín ${minimo.toFixed(2)})`;
  if (exigeQuadro) resumo += `; lista ${r1(m.listaBottom)} ≤ quadro ${r1(m.quadroBottom)}`;
  if (Math.abs(p - 0.5) < 1e-9) resumo += `; camada 0 ${r1(m.g4 - m.g0)} px acima da 4`;
  if (Math.abs(p - 1) < 1e-9) resumo += `; legenda ${m.legendaOp}`;
  return { ok: falhas.length === 0, detalhe: falhas.length ? `${falhas.join("; ")} (${resumo})` : resumo };
}

/** Nome do chunk depois de static/chunks/ (o manifesto guarda "static/chunks/x.js" e "/_next/static/chunks/x.js"). */
const nomeDoChunk = (s) => s.replace(/^.*static\/chunks\//, "");

/**
 * Chunks que o build local liga à rota: os de page_client-reference-manifest.js
 * (.next/server/app/<rota>/), lidos como texto, sem rodar o arquivo. null se o
 * arquivo não existe ou não traz a chave da rota.
 */
function chunksDoManifesto(rota) {
  const arquivo = path.join(RAIZ, ".next/server/app", rota.replace(/^\//, ""), "page_client-reference-manifest.js");
  if (!fs.existsSync(arquivo)) return null;
  const texto = fs.readFileSync(arquivo, "utf8");
  if (!texto.includes(`__RSC_MANIFEST[${JSON.stringify(`${rota}/page`)}]`)) return null;
  return new Set((texto.match(/static\/chunks\/[^"\\]+/g) ?? []).map(nomeDoChunk));
}

/**
 * Prova de que os scripts excluídos da soma (fora do HTML da página) não são da
 * própria rota: cada excluído com bytes > 0 não pode estar no manifesto dela.
 * Com --base remota não há build local para ler: a sub-conferência fica registrada
 * como "não verificado" no detalhe, sem mudar o resultado da medição.
 */
function provarExclusao(rota, fora) {
  const excluidos = fora.filter((r) => r.bytes > 0);
  if (!ehLocal) return { ok: true, detalhe: `exclusão em ${rota}: não verificado: sem o build local (${excluidos.length} excluídos com bytes > 0)` };
  const manifesto = chunksDoManifesto(rota);
  if (!manifesto) return { ok: false, detalhe: `exclusão em ${rota}: manifesto de referências de cliente da rota não encontrado em .next/server/app` };
  const daRota = excluidos.filter((r) => manifesto.has(nomeDoChunk(r.nome)));
  return {
    ok: daRota.length === 0,
    detalhe: `exclusão em ${rota}: ${excluidos.length} chunks excluídos com bytes > 0 checados contra o manifesto da rota (${manifesto.size} chunks), ${daRota.length ? `da própria rota: ${daRota.map((r) => `${nomeDoChunk(r.nome)} ${r.bytes}`).join(", ")}` : "nenhum é da própria rota"}`,
  };
}

async function etapa2Navegador(browser, produtos) {
  // Em cada largura: rolagem lateral, #tecnologia e #ficha, "Ver os modelos" e os três links de linha.
  const linhasEsperadas = LINHAS_PFB.map((l) => catalogoPath({ linha: l }));
  for (const dim of LARGURAS) {
    await verificar(`${PFB_PATH}: sem rolagem lateral, #tecnologia (section.pfb-cam) e #ficha, "Ver os modelos" e os três links de linha`, dim, () =>
      comContexto(browser, dim, {}, async (page) => {
        await irAPagina(page);
        const m = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          iw: innerWidth,
          tec: document.querySelector("#tecnologia")?.matches("section.pfb-cam") ?? null,
          ficha: document.querySelector("#ficha") !== null,
        }));
        const verModelos = await linksVisiveis(page, '[data-teste="ver-modelos"]');
        const verLinha = await linksVisiveis(page, '[data-teste="ver-linha"]');
        await capturarPfb(page, "pagina", dim);
        const linhasOk = verLinha.length === 3 && [...verLinha].sort().join() === [...linhasEsperadas].sort().join();
        const ok = m.sw <= m.iw && m.tec === true && m.ficha && verModelos.length >= 1 && verModelos.every((h) => h === CATALOGO_PATH) && linhasOk;
        return {
          ok,
          detalhe: `scrollWidth ${m.sw} / innerWidth ${m.iw}; #tecnologia ${m.tec === null ? "ausente" : m.tec ? "é section.pfb-cam" : "não é section.pfb-cam"}; #ficha ${m.ficha ? "presente" : "ausente"}; "Ver os modelos" visíveis: ${verModelos.join(", ") || "nenhum"} (esperado ${CATALOGO_PATH}); links de linha visíveis: ${verLinha.join(", ") || "nenhum"} (esperado ${linhasEsperadas.join(", ")})`,
        };
      }),
    );
  }

  // A cena a 1440 × 900: altura e os onze pontos de p.
  await comContexto(browser, DESKTOP, {}, async (page) => {
    await verificar("Cena a 1440 × 900: altura de .pfb-cam = 4 × innerHeight (± 2 px)", DESKTOP, async () => {
      await irAPagina(page);
      const m = await medirCena(page);
      return { ok: cenaAtiva(m), detalhe: `${textoAltura(m)}; nível ${m.nivel}` };
    });
    for (const p of PASSOS_P) {
      await verificar(`Cena a 1440 × 900 em p = ${fmtP(p)}: produto das opacidades ≥ 0,6 e item na tela${p === 0.5 ? "; camada 0 ≥ 200 px acima da 4" : ""}${p === 1 ? "; legenda com opacidade 1" : ""}`, DESKTOP, async () => {
        await rolarAteP(page, p);
        await dormir(ESPERA_CENA_MS);
        const m = await medirCena(page);
        await capturarPfb(page, `cena-${rotuloP(p)}`, DESKTOP);
        return conferirPonto(m, p);
      });
    }
  });

  // 1024 × 720, 1280 × 720 e 1440 × 900 com fonte de 20 px: cena ativa e a lista dentro do quadro.
  for (const caso of [
    { dim: [1024, 720], fonte: null },
    { dim: [1280, 720], fonte: null },
    { dim: DESKTOP, fonte: "20px" },
  ]) {
    const nome = `Cena ativa e lista dentro do quadro em p = 0; 0,5 e 1${caso.fonte ? ` (fonte de ${caso.fonte})` : ""}`;
    await verificar(nome, caso.dim, () =>
      comContexto(browser, caso.dim, {}, async (page) => {
        await irAPagina(page);
        if (caso.fonte) {
          await page.evaluate((f) => (document.documentElement.style.fontSize = f), caso.fonte);
          await dormir(300);
        }
        const m0 = await medirCena(page);
        const partes = [textoAltura(m0)];
        let ok = cenaAtiva(m0);
        if (!ok) partes[0] = `cena inativa: ${partes[0]}`;
        for (const p of [0, 0.5, 1]) {
          await rolarAteP(page, p);
          await dormir(ESPERA_CENA_MS);
          const m = await medirCena(page);
          await capturarPfb(page, `quadro${caso.fonte ? "-fonte20" : ""}-${rotuloP(p)}`, caso.dim);
          const cabe = m.listaBottom !== null && m.quadroBottom !== null && m.listaBottom <= m.quadroBottom;
          if (!cabe) ok = false;
          partes.push(`p ${fmtP(p)}: lista ${r1(m.listaBottom)} ${cabe ? "≤" : ">"} quadro ${r1(m.quadroBottom)}`);
        }
        return { ok, detalhe: partes.join("; ") };
      }),
    );
  }

  // Fallback sem animation-timeline (caminho do IntersectionObserver do Revelar).
  await comContexto(browser, DESKTOP, {}, async (page, ctx) => {
    await ctx.addInitScript(() => {
      const o = CSS.supports.bind(CSS);
      CSS.supports = (...a) => (/animation-timeline/.test(a.join(" ")) ? false : o(...a));
    });
    await verificar("Fallback sem animation-timeline: com a página no topo, li com mv-io-espera e opacidade 1; cena ativa", DESKTOP, async () => {
      await irAPagina(page);
      let espera = true;
      try {
        await page.waitForFunction(() => document.querySelector("ol.pfb-cam-lista > li.mv-io-espera") !== null, null, { timeout: 5000 });
      } catch {
        espera = false;
      }
      const m = await medirCena(page);
      const emEspera = m.itens.filter((it) => /\bmv-io-espera\b/.test(it.classe));
      const ok = espera && emEspera.length >= 1 && emEspera.every((it) => it.liOp >= 1 - TOL) && cenaAtiva(m);
      return {
        ok,
        detalhe: `itens com mv-io-espera: ${emEspera.length} (opacidade ${emEspera.map((it) => it.liOp).join(", ") || "-"}); classes ${m.itens.map((it) => it.classe || "(nenhuma)").join(" | ")}; ${cenaAtiva(m) ? "cena ativa" : "cena inativa"}: ${textoAltura(m)}`,
      };
    });
    await verificar("Fallback sem animation-timeline: primeira entrada em p = 0, sem espera extra", DESKTOP, async () => {
      await rolarAteP(page, 0);
      const m = await medirCena(page);
      await capturarPfb(page, "fallback-entrada", DESKTOP);
      return conferirPonto(m, 0, { exigeNaTela: false, exigeQuadro: true });
    });
    for (const p of PASSOS_P) {
      await verificar(`Fallback sem animation-timeline em p = ${fmtP(p)}: produto das opacidades ≥ 0,6 e lista no quadro`, DESKTOP, async () => {
        await rolarAteP(page, p);
        await dormir(ESPERA_CENA_MS);
        const m = await medirCena(page);
        await capturarPfb(page, `fallback-${rotuloP(p)}`, DESKTOP);
        return conferirPonto(m, p, { exigeNaTela: false, exigeQuadro: true });
      });
    }
  });

  // Nível leve (memória 2 pelo novoContexto) a 1440 × 900.
  await verificar("Nível leve: data-mv-nivel=\"leve\" no DOMContentLoaded, .pfb-cam < 2 × innerHeight, clsCarga < 0,001 e itens com opacidade 1 em três posições", DESKTOP, () =>
    comContexto(browser, DESKTOP, { memoria: 2 }, async (page, ctx) => {
      await ctx.addInitScript(() => {
        document.addEventListener("DOMContentLoaded", () => (window.__nivelDcl = document.documentElement.dataset.mvNivel ?? null), { once: true });
      });
      await page.goto(url(PFB_PATH));
      await dormir(500);
      const { nivelDcl, cls } = await page.evaluate(() => ({ nivelDcl: window.__nivelDcl ?? null, cls: window.__cls }));
      const partes = [`nível no DOMContentLoaded ${nivelDcl}`, `clsCarga ${cls.toFixed(4)}`];
      let ok = nivelDcl === "leve" && cls < 0.001;
      for (const onde of ["topo-da-pagina", "meio", "fim"]) {
        await rolarSecao(page, onde);
        await dormir(300);
        const m = await medirCena(page);
        await capturarPfb(page, `leve-${onde}`, DESKTOP);
        if (onde === "topo-da-pagina") {
          if (!(m.altura < 2 * m.ih)) ok = false;
          partes.push(textoAltura(m));
        }
        if (!todosOpacos(m)) ok = false;
        partes.push(`${onde}: ${textoOps(m)}`);
      }
      return { ok, detalhe: partes.join("; ") };
    }),
  );

  // Janela baixa (1280 × 680, nível completo): a mesma conferência de opacidade.
  await verificar("Janela baixa: itens com opacidade 1 em três posições", [1280, 680], () =>
    comContexto(browser, [1280, 680], {}, async (page) => {
      await irAPagina(page);
      const partes = [];
      let ok = true;
      for (const onde of ["topo-da-pagina", "meio", "fim"]) {
        await rolarSecao(page, onde);
        await dormir(300);
        const m = await medirCena(page);
        await capturarPfb(page, `janela-baixa-${onde}`, [1280, 680]);
        if (onde === "topo-da-pagina") partes.push(`${textoAltura(m)}; nível ${m.nivel}`);
        if (!todosOpacos(m)) ok = false;
        partes.push(`${onde}: ${textoOps(m)}`);
      }
      return { ok, detalhe: partes.join("; ") };
    }),
  );

  // #ficha por âncora.
  for (const dim of [CELULAR, DESKTOP]) {
    await verificar(`${PFB_PATH}#ficha: depois de 1500 ms, h2#pfb-ficha-titulo inteiro na tela e abaixo do cabeçalho`, dim, () =>
      comContexto(browser, dim, {}, async (page) => {
        await page.goto(url(`${PFB_PATH}#ficha`));
        await dormir(1500);
        const m = await page.evaluate(() => {
          const h = document.querySelector("h2#pfb-ficha-titulo")?.getBoundingClientRect();
          const cabEl = document.querySelector("header[data-site]");
          const cab = cabEl ? Math.max(cabEl.getBoundingClientRect().bottom, cabEl.offsetHeight) : 0;
          return { top: h?.top ?? null, bottom: h?.bottom ?? null, cab, ih: innerHeight };
        });
        await capturarPfb(page, "ancora-ficha", dim);
        const ok = m.top !== null && m.top >= 0 && m.bottom <= m.ih && m.top >= m.cab;
        return { ok, detalhe: `título em [${r1(m.top)}, ${r1(m.bottom)}], cabeçalho termina em ${r1(m.cab)}, innerHeight ${m.ih}` };
      }),
    );
  }

  // Dados do mock: ≥ 2 miniaturas e ≥ 1 lugar showroom.
  await verificar('Dados: seção 4 com ≥ 2 [data-teste="miniatura"] e seção 6 com ≥ 1 [data-teste="lugar"][data-tipo="showroom"]', CELULAR, () =>
    comContexto(browser, CELULAR, {}, async (page) => {
      await irAPagina(page);
      const m = await page.evaluate(() => ({
        mini: document.querySelectorAll('section#linhas [data-teste="miniatura"]').length,
        showroom: document.querySelectorAll('section#como-pedir [data-teste="lugar"][data-tipo="showroom"]').length,
        lugares: document.querySelectorAll('section#como-pedir [data-teste="lugar"]').length,
      }));
      return { ok: m.mini >= 2 && m.showroom >= 1, detalhe: `miniaturas ${m.mini}; lugares ${m.lugares}, dos quais showroom ${m.showroom}` };
    }),
  );

  // Celular e tablet: sem cena, figura visível, cada item com opacidade 1 no meio da tela, sem sobreposição.
  for (const dim of LARGURAS.filter(([l]) => [375, 390, 430, 768].includes(l))) {
    await verificar(`Celular: .pfb-cam < 2,5 × innerHeight, figura visível, cada li com opacidade 1 no meio da tela e itens sem sobreposição`, dim, () =>
      comContexto(browser, dim, {}, async (page) => {
        await irAPagina(page);
        const m0 = await medirCena(page);
        const svg = page.locator("svg.pfb-cam-svg");
        await svg.scrollIntoViewIfNeeded();
        const caixa = await svg.boundingBox();
        const figura = (await svg.isVisible()) && caixa !== null && caixa.width > 0 && caixa.height > 0;
        const ops = [];
        for (let i = 0; i < m0.itens.length; i++) {
          const op = await page.evaluate(async (k) => {
            const li = document.querySelectorAll("ol.pfb-cam-lista > li")[k];
            const r = li.getBoundingClientRect();
            window.scrollTo({ top: r.top + scrollY + r.height / 2 - innerHeight / 2, behavior: "instant" });
            await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
            return Number(getComputedStyle(li).opacity);
          }, i);
          ops.push(op);
        }
        await capturarPfb(page, "camadas-celular", dim);
        const m = await medirCena(page);
        const sobrepostos = [];
        for (let a = 0; a < m.itens.length; a++) {
          for (let b = a + 1; b < m.itens.length; b++) {
            const A = m.itens[a];
            const B = m.itens[b];
            const w = Math.min(A.right, B.right) - Math.max(A.left, B.left);
            const h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
            if (w > 0 && h > 0) sobrepostos.push(`${a}×${b} (${r1(w)} × ${r1(h)} px)`);
          }
        }
        const baixa = m0.altura < 2.5 * m0.ih;
        const ok = baixa && figura && ops.length === 5 && ops.every((o) => o >= 1 - TOL) && sobrepostos.length === 0;
        return {
          ok,
          detalhe: `altura ${r1(m0.altura)} px (2,5 × innerHeight = ${2.5 * m0.ih}); figura ${figura ? `visível (${r1(caixa.width)} × ${r1(caixa.height)})` : "invisível"}; opacidade de cada li no meio da tela: ${ops.join(", ")}; sobreposições: ${sobrepostos.join(", ") || "nenhuma"}`,
        };
      }),
    );
  }

  // Movimento reduzido a 1440 × 900.
  await verificar("Movimento reduzido: .pfb-cam < 2 × innerHeight e itens com opacidade 1", DESKTOP, () =>
    comContexto(browser, DESKTOP, { reduzido: true }, async (page) => {
      await irAPagina(page);
      const partes = [];
      let ok = true;
      for (const onde of ["topo-da-pagina", "meio"]) {
        await rolarSecao(page, onde);
        await dormir(300);
        const m = await medirCena(page);
        if (onde === "topo-da-pagina") {
          if (!(m.altura < 2 * m.ih)) ok = false;
          partes.push(textoAltura(m));
        } else await capturarPfb(page, "reduzido-meio", DESKTOP);
        if (!todosOpacos(m)) ok = false;
        partes.push(`${onde}: ${textoOps(m)}`);
      }
      return { ok, detalhe: partes.join("; ") };
    }),
  );

  // Texto proibido em /produtos/pfb.
  for (const dim of [CELULAR, DESKTOP]) {
    await verificar(`Texto proibido: ${PFB_PATH} (main, atributos, document.title e todos os JSON-LD)`, dim, () =>
      comContexto(browser, dim, {}, async (page) => {
        await irAPagina(page);
        const t = await lerTextos(page, TEXTO[2]);
        const achados = procurarProibidos(t, TEXTO[2]);
        const vazias = fontesVazias(t, TEXTO[2]);
        const ok = achados.length === 0 && vazias.length === 0;
        return {
          ok,
          detalhe: ok
            ? `nenhum termo proibido em main (${t.textoMain.length} caracteres), ${t.atributos.length} atributos, document.title ("${t.titulo}") e ld+json (${t.ldQuantos} scripts, ${t.ld.length} caracteres)`
            : [...vazias, ...achados].join("; "),
        };
      }),
    );
  }

  // JavaScript transferido: /produtos/pfb ≤ /techstone, um contexto novo (sem cache) por página, a mesma regra nas duas.
  // Só conta o que o HTML do documento pede por <script src> (lido da resposta do goto, não do DOM vivo): a pré-busca dos <Link>/RSC é da página seguinte, não peso desta.
  // A exclusão é provada, não suposta: no build local, todo chunk excluído com bytes > 0 é procurado no
  // page_client-reference-manifest.js da própria rota medida, e se estiver lá (é JS da página, não pré-busca) a verificação falha.
  await verificar(`JavaScript transferido em ${PFB_PATH} ≤ o de /techstone (scripts pedidos pelo HTML da página; excluídos fora do manifesto da rota)`, DESKTOP, async () => {
    const medir = (caminho) =>
      comContexto(browser, DESKTOP, {}, async (page) => {
        // Confirmação, não critério: os pedidos de pré-busca do roteador levam Next-Router-Prefetch ou RSC.
        const preBusca = [];
        page.on("request", (q) => {
          const h = q.headers();
          if (h["next-router-prefetch"] || h["rsc"]) {
            const u = new URL(q.url());
            preBusca.push(`${u.pathname}${h["next-router-prefetch"] ? " (Next-Router-Prefetch)" : " (RSC)"}`);
          }
        });
        const resp = await page.goto(url(caminho), { waitUntil: "load" });
        const html = resp ? await resp.text() : "";
        const doHtml = new Set(
          [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map((m) => new URL(m[1].replace(/&amp;/g, "&"), page.url()).href),
        );
        await dormir(1500);
        const recursos = await page.evaluate(() =>
          performance
            .getEntriesByType("resource")
            .filter((r) => r.initiatorType === "script" || /\.m?js$/.test(new URL(r.name).pathname))
            .map((r) => ({ href: r.name, nome: new URL(r.name).pathname, bytes: r.transferSize || 0, tipo: r.initiatorType })),
        );
        return { doHtml, recursos, preBusca, pedidos: recursos.filter((r) => doHtml.has(r.href)), fora: recursos.filter((r) => !doHtml.has(r.href)) };
      });
    const soma = (lista) => lista.reduce((s, r) => s + r.bytes, 0);
    const curto = (r) => `${r.nome.replace(/^\/_next\/static\/chunks\//, "")} ${r.bytes} (initiatorType ${r.tipo})`;
    const contar = (l) => Object.entries(l.reduce((o, x) => ((o[x] = (o[x] ?? 0) + 1), o), {})).map(([k, n]) => `${k} ×${n}`).join(", ");
    const pfb = await medir(PFB_PATH);
    const ts = await medir("/techstone");
    const a = soma(pfb.pedidos);
    const b = soma(ts.pedidos);
    const linha = (rot, m) =>
      `${rot}: sem pré-busca ${soma(m.pedidos)} bytes (${m.pedidos.length} scripts do HTML, que cita ${m.doHtml.size}); com pré-busca ${soma(m.recursos)} bytes (${m.recursos.length} scripts); de fora: ${m.fora.map(curto).join(", ") || "nenhum"}; pedidos de pré-busca do roteador vistos: ${contar(m.preBusca) || "nenhum"}`;
    const provas = [provarExclusao(PFB_PATH, pfb.fora), provarExclusao("/techstone", ts.fora)];
    return {
      ok: a > 0 && b > 0 && a <= b && provas.every((p) => p.ok),
      detalhe: `${esperado(`${PFB_PATH} ${a} bytes`, `≤ /techstone ${b} bytes`)}; ${provas.map((p) => p.detalhe).join("; ")}; ${linha(PFB_PATH, pfb)}; ${linha("/techstone", ts)}`,
    };
  });

  // Foco 2: sem JavaScript.
  for (const dim of [DESKTOP, CELULAR]) {
    const comNomes = dim === DESKTOP;
    await verificar(`Sem JavaScript: h1, .pfb-cam < 2 × innerHeight${comNomes ? ", os cinco nomes com opacidade 1" : ""} e sem rolagem lateral`, dim, () =>
      comContexto(browser, dim, { js: false }, async (page) => {
        await page.goto(url(PFB_PATH));
        await dormir(300);
        const h1 = await page.evaluate(() => document.querySelector("h1#pfb-titulo")?.textContent?.trim() ?? null);
        if (comNomes) await rolarSecao(page, "meio");
        await dormir(200);
        const m = await medirCena(page);
        await capturarPfb(page, "sem-js", dim);
        const ok = h1 !== null && h1 !== "" && m.altura < 2 * m.ih && m.sw <= m.iw && (!comNomes || todosOpacos(m));
        return {
          ok,
          detalhe: `h1 ${h1 === null ? "ausente" : `"${h1}"`}; ${textoAltura(m)}; scrollWidth ${m.sw} / innerWidth ${m.iw}${comNomes ? `; opacidades li×item ${textoOps(m)}` : ""}`,
        };
      }),
    );
  }

  // Foco 3: a janela muda de tamanho com a página aberta.
  await verificar("Janela que muda de tamanho: 1440 × 900 → 1280 × 680 (sem cena, opacidade 1) → 1440 × 900 (cena de volta, --p acompanha)", DESKTOP, () =>
    comContexto(browser, DESKTOP, {}, async (page) => {
      await irAPagina(page);
      const partes = [];
      const m0 = await medirCena(page);
      let ok = cenaAtiva(m0);
      partes.push(`1440 × 900: ${cenaAtiva(m0) ? "cena ativa" : "cena inativa"}, ${textoAltura(m0)}`);
      await page.setViewportSize({ width: 1280, height: 680 });
      await dormir(800);
      await rolarSecao(page, "meio");
      await dormir(300);
      const mb = await medirCena(page);
      await capturarPfb(page, "redimensionada-baixa", [1280, 680]);
      if (!(mb.altura < 2 * mb.ih) || !todosOpacos(mb)) ok = false;
      partes.push(`1280 × 680: ${textoAltura(mb)}; opacidades ${textoOps(mb)}`);
      await page.setViewportSize({ width: DESKTOP[0], height: DESKTOP[1] });
      await dormir(800);
      const mv = await medirCena(page);
      if (!cenaAtiva(mv)) ok = false;
      await rolarAteP(page, 0.5);
      await dormir(ESPERA_CENA_MS);
      const mp = await medirCena(page);
      await capturarPfb(page, "redimensionada-volta-p050", DESKTOP);
      const pNum = Number(mp.p);
      const acompanha = Number.isFinite(pNum) && Math.abs(pNum - 0.5) <= 0.02;
      if (!acompanha || !(mp.g4 - mp.g0 >= 200)) ok = false;
      partes.push(`de volta a 1440 × 900: ${cenaAtiva(mv) ? "cena ativa" : "cena inativa"}, ${textoAltura(mv)}; em p = 0,5: --p ${mp.p}, camada 0 ${r1(mp.g4 - mp.g0)} px acima da 4`);
      return { ok, detalhe: partes.join("; ") };
    }),
  );

  // Foco 4: chegada por âncora no meio da cena.
  await verificar(`${PFB_PATH}#tecnologia: depois de 1500 ms, h2#pfb-camadas-titulo na tela abaixo do cabeçalho e produto das opacidades ≥ 0,6`, DESKTOP, () =>
    comContexto(browser, DESKTOP, {}, async (page) => {
      await page.goto(url(`${PFB_PATH}#tecnologia`));
      await dormir(1500);
      const h = await page.evaluate(() => {
        const r = document.querySelector("h2#pfb-camadas-titulo")?.getBoundingClientRect();
        return r ? { top: r.top, bottom: r.bottom } : null;
      });
      const m = await medirCena(page);
      await capturarPfb(page, "ancora-tecnologia", DESKTOP);
      const cab = Math.max(0, m.cabecalhoBottom ?? 0);
      const naTela = h !== null && h.top >= cab && h.top >= 0 && h.bottom <= m.ih;
      const minimo = Math.min(...produtos5(m));
      const ok = naTela && m.itens.length === 5 && minimo >= 0.6 - TOL;
      return {
        ok,
        detalhe: `título em [${r1(h?.top)}, ${r1(h?.bottom)}], cabeçalho termina em ${r1(m.cabecalhoBottom)}, innerHeight ${m.ih}; --p ${m.p}; opacidades li×item ${textoOps(m)} (mín ${minimo.toFixed(2)})`,
      };
    }),
  );

  // Foco 5: a miniatura da seção 4 abre o modelo certo.
  await verificar('Miniatura da seção 4: clicar a primeira [data-teste="miniatura"] abre o catálogo nesse modelo', CELULAR, () =>
    comContexto(browser, CELULAR, {}, async (page) => {
      await irAPagina(page);
      const mini = page.locator('section#linhas [data-teste="miniatura"]').first();
      const href = await mini.getAttribute("href");
      const codigo = href ? new URL(href, args.base).searchParams.get("modelo") : null;
      if (!codigo) return { ok: false, detalhe: `href da primeira miniatura sem ?modelo= (${href})` };
      const modelo = produtos.find((p) => normalizeProductCode(p.code) === normalizeProductCode(codigo));
      if (!modelo) return { ok: false, detalhe: `código ${codigo} (do href ${href}) não está em /api/products` };
      const alvo = catalogoPath({ modelo: codigo });
      await mini.click();
      await modal(page).waitFor({ state: "visible" });
      const atual = await esperarCaminho(page, alvo);
      const titulo = await tituloDoModal(page);
      await capturarPfb(page, "miniatura-modal", CELULAR);
      const ok = atual === alvo && (titulo ?? "").trim() === (modelo.name ?? "").trim();
      return { ok, detalhe: `href ${href}; URL ${atual} (esperado ${alvo}); título do modal "${titulo}" (esperado "${modelo.name}")` };
    }),
  );
}

const ordenar = (o) => Object.fromEntries(Object.entries(o ?? {}).sort(([a], [b]) => a.localeCompare(b)));

/** Espera em window.dataLayer uma entrada ("event", nome, props) cujas props passem em `aceita`. */
async function esperarEvento(page, nome, aceita) {
  let vistos = [];
  const limite = Date.now() + 5000;
  while (Date.now() < limite) {
    const entradas = await page.evaluate((n) => {
      return (window.dataLayer ?? [])
        .map((e) => {
          try {
            return Array.from(e);
          } catch {
            return [];
          }
        })
        .filter((a) => a[0] === "event" && a[1] === n)
        .map((a) => a[2] ?? null);
    }, nome);
    vistos = entradas.map((p) => JSON.stringify(p));
    if (entradas.some(aceita)) return { ok: true, vistos };
    await dormir(200);
  }
  return { ok: false, vistos };
}

// ── Principal ───────────────────────────────────────────────────────────────

process.on("unhandledRejection", (e) => {
  registrar("Execução do script", null, "não verificado", `não verificado: rejeição sem tratamento (${String(e?.message ?? e).split("\n")[0]})`);
  terminar();
});

async function principal() {
  if (![1, 2].includes(args.etapa)) {
    registrar(`Etapa ${args.etapa}`, null, "não verificado", "não verificado: etapa ainda não implementada");
    terminar();
  }

  if (args.soRedirecionamentos) {
    await redirecionamentos(args.etapa);
    terminar();
  }

  let produtos = null;
  if (ehLocal) {
    produtos = await conferirMock();
    if (!produtos) terminar();
  } else {
    try {
      const r = await buscar(url("/api/products"));
      produtos = await r.json();
    } catch (e) {
      registrar("GET /api/products devolve a lista de modelos", null, "não verificado", `não verificado: GET /api/products falhou (${motivoErro(e)})`);
      terminar();
    }
  }
  if (!Array.isArray(produtos) || produtos.length === 0) {
    registrar("GET /api/products devolve a lista de modelos", null, "não verificado", "não verificado: /api/products sem modelos");
    terminar();
  }
  if (!produtos.some((p) => p.linha === "Classic")) {
    registrar("GET /api/products tem um modelo Classic", null, "não verificado", "não verificado: nenhum modelo Classic em /api/products");
    terminar();
  }

  await redirecionamentos(args.etapa);

  let pw;
  let motor;
  try {
    pw = require(PW_CORE);
    motor = await abrirMotor(pw);
  } catch (e) {
    registrar("Motor do navegador", null, "não verificado", `não verificado: nem o Chrome nem o Chromium abriram (${String(e?.message ?? e).split("\n")[0]})`);
    terminar();
  }
  resultado.navegador = { canal: motor.canal, versao: motor.browser.version() };
  try {
    await etapa1Navegador(motor.browser, produtos, args.etapa);
    if (args.etapa === 2) await etapa2Navegador(motor.browser, produtos);
  } finally {
    await motor.browser.close();
  }
  terminar();
}

principal().catch((e) => {
  registrar("Execução do script", null, "não verificado", `não verificado: ${String(e?.stack ?? e).split("\n")[0]}`);
  terminar();
});
