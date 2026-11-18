import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as galeria from "./project-gallery.ts";
import * as cache from "./api-cache.ts";
import { nomeDaFoto } from "../app/admin/projetos/baixarFoto.ts";

const { buildGalleryItems, midiaOculta, semOcultas, tirarAntesOculto } = galeria;

const projeto = { slug: "casa", title: "Casa", image_after: "https://s/capa.webp", image_before: "https://s/antes.webp" };
const linha = (id, url, extra = {}) => ({ id, project_slug: "casa", type: "image", url, category: "depois", sort_order: 1, ...extra });

test("foto oculta sai da galeria; a capa nunca conta como oculta", () => {
  assert.equal(midiaOculta({ is_hidden: true }), true);
  assert.equal(midiaOculta({ is_hidden: true, is_cover: true }), false);
  assert.equal(midiaOculta({}), false);
  const urls = buildGalleryItems(projeto, [linha("a", "https://s/a.webp", { is_hidden: true }), linha("b", "https://s/b.webp")]).map((i) => i.url);
  assert.deepEqual(urls, ["https://s/capa.webp", "https://s/antes.webp", "https://s/b.webp"]);
});

test("a foto 'antes' antiga do projeto também some quando está oculta", () => {
  const urls = buildGalleryItems(projeto, [linha("x", "https://s/antes.webp", { category: "antes", is_hidden: true })]).map((i) => i.url);
  assert.deepEqual(urls, ["https://s/capa.webp"]);
  const [p] = tirarAntesOculto([projeto], [{ project_slug: "casa", url: "https://s/antes.webp?v=1", is_hidden: true }]);
  assert.equal(p.image_before, null);
  // outro projeto, ou linha sem a marca, não muda nada
  assert.equal(tirarAntesOculto([projeto], [{ project_slug: "outra", url: "https://s/antes.webp", is_hidden: true }])[0].image_before, projeto.image_before);
  assert.equal(tirarAntesOculto([projeto], [{ project_slug: "casa", url: "https://s/antes.webp", is_hidden: false }])[0].image_before, projeto.image_before);
});

test("semOcultas funciona antes da migração (coluna ausente)", () => {
  assert.equal(semOcultas([linha("a", "u")]).length, 1);
});

test("nome do arquivo baixado", () => {
  assert.equal(nomeDaFoto("casa-lago", 3, "https://s/x/1.WEBP?v=2"), "casa-lago-03.webp");
  assert.equal(nomeDaFoto(null, 12, "https://s/sem-extensao"), "foto-projeto-12.jpg");
});

// ── Rotas ───────────────────────────────────────────────────────────────────

function fakeDb(rows, log) {
  return { from: () => {
    let lista = rows; let patch = null;
    const q = {
      select: () => q, order: () => q,
      eq: (c, v) => { lista = lista.filter((r) => r[c] === v); return q; },
      update: (b) => { patch = b; log.updates.push(b); return q; },
      single: async () => ({ data: lista[0] ? { ...lista[0], ...(patch ?? {}) } : null, error: null }),
      then: (ok) => ok({ data: lista, error: null }),
    };
    return q;
  } };
}

function carregar(arquivo, { admin, rows }) {
  const log = { updates: [], revalidados: [] };
  const code = ts.transpileModule(readFileSync(new URL(arquivo, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const deps = {
    "next/server": { NextResponse: { json: (b, i) => Response.json(b, i) } },
    "next/cache": { revalidatePath: (p) => log.revalidados.push(p) },
    "@/lib/supabase": { supabaseAdmin: () => fakeDb(rows, log) },
    "@/lib/admin-auth": { isAdminRequest: () => admin },
    "@/lib/project-gallery": galeria,
    "@/lib/api-cache": cache,
  };
  const m = { exports: {} };
  new Function("require", "module", "exports", code)((n) => { assert.ok(deps[n], `dependência inesperada ${n}`); return deps[n]; }, m, m.exports);
  return { ...m.exports, log };
}

const LISTA = "../app/api/projects/media/route.ts";
const ITEM = "../app/api/projects/media/[id]/route.ts";
const pedido = (qs) => ({ nextUrl: new URL(`http://x/api/projects/media${qs}`) });
const patch = (body) => ({ json: async () => body });
const params = (id) => ({ params: Promise.resolve({ id }) });

test("o site nunca recebe a foto oculta, nem com sessão de admin aberta", async () => {
  const rows = [linha("a", "u/a", { is_hidden: true }), linha("b", "u/b")];
  const r = await carregar(LISTA, { admin: true, rows }).GET(pedido("?slug=casa"));
  assert.deepEqual((await r.json()).map((m) => m.id), ["b"]);
});

test("o painel (?admin=1) recebe todas, sem cache; sem sessão é 401", async () => {
  const rows = [linha("a", "u/a", { is_hidden: true }), linha("b", "u/b")];
  const ok = await carregar(LISTA, { admin: true, rows }).GET(pedido("?slug=casa&admin=1"));
  assert.equal((await ok.json()).length, 2);
  assert.equal(ok.headers.get("cache-control"), cache.SEM_CACHE);
  assert.equal((await carregar(LISTA, { admin: false, rows }).GET(pedido("?admin=1"))).status, 401);
});

test("a capa não pode ser ocultada", async () => {
  const rota = carregar(ITEM, { admin: true, rows: [linha("c", "u/c", { is_cover: true })] });
  const r = await rota.PATCH(patch({ is_hidden: true }), params("c"));
  assert.equal(r.status, 409);
  assert.equal(rota.log.updates.length, 0);
});

test("ocultar grava e atualiza a página de projetos; só com sessão", async () => {
  const rota = carregar(ITEM, { admin: true, rows: [linha("a", "u/a")] });
  assert.equal((await rota.PATCH(patch({ is_hidden: true }), params("a"))).status, 200);
  assert.deepEqual(rota.log.updates, [{ is_hidden: true }]);
  assert.ok(rota.log.revalidados.includes("/projetos"));
  assert.equal((await carregar(ITEM, { admin: false, rows: [] }).PATCH(patch({ is_hidden: true }), params("a"))).status, 401);
});

test("foto oculta que vira capa volta a aparecer; a outras mudanças nada é somado", async () => {
  const rota = carregar(ITEM, { admin: true, rows: [linha("a", "u/a", { is_hidden: true })] });
  await rota.PATCH(patch({ is_cover: true }), params("a"));
  assert.deepEqual(rota.log.updates, [{ is_cover: true, is_hidden: false }]);
  const outra = carregar(ITEM, { admin: true, rows: [linha("b", "u/b")] });
  await outra.PATCH(patch({ is_cover: true }), params("b"));
  assert.deepEqual(outra.log.updates, [{ is_cover: true }]);
});
