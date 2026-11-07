/**
 * Verificações do Painel Flexível em Fibra de Bambu (PFB) no navegador, por etapa.
 *
 *   node scripts/verificar-pfb.mjs --base http://localhost:3004 --etapa 1
 *   node scripts/verificar-pfb.mjs --base https://orbitalrevestimentos.com.br --etapa 1 --so-redirecionamentos
 *
 * Opções:
 *   --base <url>            site a verificar (obrigatório; local: o next start com o mock do Supabase)
 *   --etapa <1|2|4>         etapa da Verification Plan (só a 1 está implementada)
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
 *   2. Nível completo: deviceMemory e hardwareConcurrency valem 8.
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
    registrar(nome, dim, "falhou", `erro: ${String(e?.message ?? e).split("\n")[0]}`);
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
const esperado = (medido, esperadoValor) => `medido ${medido}; esperado ${esperadoValor}`;

// ── HTTP (redirecionamentos, sitemap, QR) ───────────────────────────────────

async function semSeguir(caminho) {
  const r = await fetch(url(caminho), { redirect: "manual" });
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

async function redirecionamentosEtapa1() {
  await verificarRedirecionamento("/produtos/pfb?modelo=orb-003", 307, catalogoPath({ modelo: "orb-003" }));
  await verificarRedirecionamento("/produtos?modelo=orb-003", 307, catalogoPath({ modelo: "orb-003" }));
  await verificarRedirecionamento("/produtos/pfb", 307, catalogoPath({}));

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

  // Foco 4: o sitemap não lista endereço que redireciona.
  await verificar(`GET /sitemap.xml: tem ${CATALOGO_PATH} e nenhum <loc> terminado em /produtos/pfb`, null, async () => {
    const r = await fetch(url("/sitemap.xml"), { redirect: "manual" });
    const xml = await r.text();
    const locs = [...xml.matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/g)].map((m) => m[1]);
    const temCatalogo = locs.some((l) => l.endsWith(CATALOGO_PATH));
    const velhos = locs.filter((l) => /\/produtos\/pfb\/?$/.test(l));
    return {
      ok: r.status === 200 && temCatalogo && velhos.length === 0,
      detalhe: `status ${r.status}; ${locs.length} <loc>; catálogo ${temCatalogo ? "presente" : "ausente"}; terminados em /produtos/pfb: ${velhos.length ? velhos.join(", ") : "nenhum"}`,
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
    const r = await fetch(url("/api/products"));
    status = r.status;
    const corpo = await r.text();
    try {
      produtos = JSON.parse(corpo);
    } catch (e) {
      erroJson = `corpo não é JSON (${e?.message ?? e}; início: ${JSON.stringify(corpo.slice(0, 60))})`;
    }
  } catch (e) {
    status = `erro ${e?.message ?? e}`;
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

/** Contexto novo com o corte das análises, o nível 8/8, sem cortina e com o observador de CLS. */
async function novoContexto(browser, dim) {
  const ctx = await browser.newContext({ viewport: { width: dim[0], height: dim[1] } });
  await ctx.route(ANALISES, (r) => r.abort());
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    try {
      sessionStorage.setItem("orbital-intro", "1");
    } catch {}
  });
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

/** Texto lido no estado atual: main sem [data-texto-banco], atributos fora deles, título e ld-catalogo. */
function lerTextos(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main");
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
      textoModal,
      atributos,
      titulo: document.title,
      ld: document.querySelector("script#ld-catalogo")?.textContent ?? "",
    };
  });
}

function procurarProibidos(t) {
  const fontes = [
    ["main", t.textoMain],
    ["atributos", t.atributos.join("\n")],
    ["document.title", t.titulo],
    ["ld-catalogo", t.ld],
  ];
  const achados = [];
  for (const [fonte, texto] of fontes) {
    const baixo = texto.toLowerCase();
    for (const termo of PROIBIDOS) {
      const i = baixo.indexOf(termo.toLowerCase());
      if (i >= 0) achados.push(`"${termo}" em ${fonte} (…${texto.slice(Math.max(0, i - 40), i + 40).replace(/\s+/g, " ")}…)`);
    }
  }
  return achados;
}

// ── Verificações da Etapa 1 no navegador ────────────────────────────────────

async function etapa1Navegador(browser, produtos) {
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
          if (e.linha) await esperarAbaAtiva(page, e.linha);
          if (e.modelo) await modal(page).waitFor({ state: "visible" });
          if (e.ampliada) {
            await modal(page).locator('button[aria-label="Ampliar foto"]').click();
            await page.locator('[role="dialog"][data-texto-banco]').waitFor({ state: "visible" });
          }
          if (e.aviso) await esperarAviso(page);
          await dormir(300);
          const t = await lerTextos(page);
          await capturar(page, e.estado, dim);
          const achados = procurarProibidos(t);
          // Estado 3: o texto corrigido tem de estar no próprio modal (os cartões ao fundo
          // também têm a medida, e lê-los esconderia um modal sem ela).
          const ondeExige = e.exigeNoModal ? "modal-modelo" : "main";
          const textoExige = e.exigeNoModal ? (t.textoModal ?? "") : t.textoMain;
          const faltando = e.exige && !textoExige.includes(e.exige) ? [`falta "${e.exige}" no texto de ${ondeExige}${t.textoModal === null && e.exigeNoModal ? " (modal ausente)" : ""}`] : [];
          const ok = achados.length === 0 && faltando.length === 0;
          return {
            ok,
            detalhe: ok
              ? `nenhum termo proibido em main (${t.textoMain.length} caracteres), ${t.atributos.length} atributos, document.title e ld-catalogo${e.exige ? `; "${e.exige}" presente em ${ondeExige} (${textoExige.length} caracteres)` : ""}`
              : [...achados, ...faltando].join("; "),
          };
        } finally {
          await ctx.close();
        }
      });
    }
  }

  // Texto fixo de atributos no código-fonte do catálogo.
  await verificar("Texto fixo de alt, aria-label e title sem travessão em src/app/produtos/pfb/catalogo/page.tsx", null, async () => {
    const fonte = fs.readFileSync(FONTE_CATALOGO, "utf8");
    const achados = [...fonte.matchAll(ATRIBUTO_COM_TRAVESSAO)].map((m) => {
      const linhaN = fonte.slice(0, m.index).split("\n").length;
      return `linha ${linhaN}: ${m[0].replace(/\s+/g, " ").slice(0, 120)}`;
    });
    return { ok: achados.length === 0, detalhe: achados.length ? achados.join("; ") : "nenhum atributo com — ou – no texto fixo" };
  });

  // QR em SVG.
  const qr = `/api/product-qr/${encodeURIComponent(normalizeProductCode(primeiro.code))}?format=svg`;
  await verificar(`GET ${qr}: 200 e content-type image/svg+xml`, null, async () => {
    const r = await fetch(url(qr), { redirect: "manual" });
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

  // Evento do manual em /tecnologia (cartão, não o link do texto).
  await verificar("Evento manual_solicitado em /tecnologia", CELULAR, async () => {
    const { ctx, page } = await novoContexto(browser, CELULAR);
    try {
      await ctx.route(WHATSAPP, (r) => r.abort());
      ctx.on("page", (p) => {
        if (p !== page) p.close().catch(() => {});
      });
      await page.goto(url("/tecnologia"));
      await page.waitForFunction(() => typeof window.gtag === "function");
      const cartao = page.locator("button", { hasText: "Solicitar manual" });
      const quantos = await cartao.count();
      await cartao.first().click();
      const dialogo = page.locator('[role="dialog"][aria-labelledby="solicitar-manual-titulo"]');
      await dialogo.waitFor({ state: "visible" });
      const perfil = "Arquiteto(a)";
      await dialogo.getByRole("button", { name: perfil, exact: true }).click();
      await dialogo.getByText("Solicitar pelo WhatsApp", { exact: true }).click();
      const achou = await esperarEvento(page, "manual_solicitado", (p) => p?.pagina === "/tecnologia" && p?.perfil === perfil);
      return {
        ok: achou.ok,
        detalhe: `cartões "Solicitar manual": ${quantos}; dataLayer: ${achou.vistos.length ? achou.vistos.join(" | ") : "nenhuma entrada manual_solicitado"} (esperado pagina "/tecnologia" e perfil "${perfil}")`,
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
  if (args.etapa !== 1) {
    registrar(`Etapa ${args.etapa}`, null, "não verificado", "não verificado: etapa ainda não implementada");
    terminar();
  }

  if (args.soRedirecionamentos) {
    await redirecionamentosEtapa1();
    terminar();
  }

  let produtos = null;
  if (ehLocal) {
    produtos = await conferirMock();
    if (!produtos) terminar();
  } else {
    const r = await fetch(url("/api/products"));
    produtos = await r.json();
  }
  if (!Array.isArray(produtos) || produtos.length === 0) {
    registrar("GET /api/products devolve a lista de modelos", null, "não verificado", "não verificado: /api/products sem modelos");
    terminar();
  }
  if (!produtos.some((p) => p.linha === "Classic")) {
    registrar("GET /api/products tem um modelo Classic", null, "não verificado", "não verificado: nenhum modelo Classic em /api/products");
    terminar();
  }

  await redirecionamentosEtapa1();

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
    await etapa1Navegador(motor.browser, produtos);
  } finally {
    await motor.browser.close();
  }
  terminar();
}

principal().catch((e) => {
  registrar("Execução do script", null, "não verificado", `não verificado: ${String(e?.stack ?? e).split("\n")[0]}`);
  terminar();
});
