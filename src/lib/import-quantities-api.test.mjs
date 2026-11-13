import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as helpers from "./import-quantities.ts";
import * as medidas from "./import-medidas.ts";
import * as renderPrompt from "./render-prompt.ts";

function loadRoute({ authenticated = true, extract = async () => { throw Error("Unexpected AI call"); } } = {}) {
  let databaseReads = 0;
  const code = ts.transpileModule(readFileSync(new URL("../app/api/admin/orders/import-quantities/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependencies = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "sharp": { default: () => { throw Error("Invalid image"); } },
    "@/lib/admin-auth": { isAdminRequest: () => authenticated, ADMIN_COOKIE: "admin" },
    "@/lib/supabase": { supabaseAdmin: () => ({ from: (table) => {
      assert.equal(table, "products"); databaseReads++;
      return { select: () => ({ eq: async () => ({ data: [{ id: "pfb", name: "Imbuia", code: "ORB-002", sale_unit: "placa" }], error: null }) }) };
    } }) },
    "@/lib/import-quantities": helpers,
    "@/lib/import-quantities-ai": { extractQuantityDocument: extract },
    "@/lib/import-medidas": medidas,
    "@/lib/render-prompt": renderPrompt,
  };
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)((name) => { assert.ok(dependencies[name], `Unexpected dependency ${name}`); return dependencies[name]; }, loaded, loaded.exports);
  return { ...loaded.exports, reads: () => databaseReads };
}
function request(form, headers = {}) {
  const req = new Request("http://localhost/api/admin/orders/import-quantities", { method: "POST", body: form, headers });
  req.cookies = { get: () => ({ value: "test-session" }) };
  return req;
}
test("API exige sessão antes de ler documento ou acessar catálogo", async () => {
  const route = loadRoute({ authenticated: false });
  const response = await route.POST({});
  assert.equal(response.status, 401); assert.equal(route.reads(), 0);
});
test("API rejeita origem externa e corpo acima do limite", async () => {
  const route = loadRoute();
  const form = new FormData(); form.set("text", "test");
  assert.equal((await route.POST(request(form, { origin: "https://outside.invalid" }))).status, 403);
  assert.equal((await route.POST(request(form, { "content-length": "9000000" }))).status, 413);
  assert.equal(route.reads(), 0);
});
test("CSV real multipart retorna propostas sem IA, preço ou gravação", async () => {
  const route = loadRoute();
  const form = new FormData(); form.set("file", new File(["ambiente;produto;quantidade;unidade\nSala;Imbuia;4;placa\nLavabo;Imbuia;2;placa"], "lista.csv", { type: "text/csv" }));
  const response = await route.POST(request(form));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.source, "table");
  assert.deepEqual(body.items.map((r) => [r.product_id, r.quantity, r.space]), [["pfb", 4, "Sala"], ["pfb", 2, "Lavabo"]]);
  assert.ok(!("price" in body.items[0]));
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("lista de medidas colada vira placas sem IA (Sanmede, 13/11/2026)", async () => {
  const route = loadRoute();
  const form = new FormData(); form.set("text", "Ambiente 1:\nAltura 2.87\nLargura 1.81\n\nAmbiente 2:\naltura: 2.59\nLargura: 2.05 + 1.34\n\nAmbos 002");
  const response = await route.POST(request(form));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.source, "table");
  assert.deepEqual(body.items.map((r) => [r.product_id, r.quantity, r.space]), [["pfb", 2, "Ambiente 1"], ["pfb", 3, "Ambiente 2"]]);
});
test("PDF com assinatura válida vai para extração, resultado segue para revisão", async () => {
  let captured;
  const route = loadRoute({ extract: async (options) => { captured = options; return JSON.stringify({ items: [{ description: "Imbuia", quantity: 4, space: "Sala", unit: "placa", evidence: "p.1: 4 placas" }], warnings: [] }); } });
  const form = new FormData(); form.set("file", new File(["%PDF-fake"], "lista.pdf", { type: "application/pdf" }));
  const response = await route.POST(request(form));
  assert.equal(response.status, 200);
  assert.equal(captured.file.mime, "application/pdf");
  assert.match(captured.system, /NÃO confiáveis/);
  assert.equal((await response.json()).items[0].product_id, "pfb");
});
test("API rejeita foto inválida, PDF falso e extensão executável antes da IA", async () => {
  const route = loadRoute();
  for (const name of ["lista.jpg", "lista.pdf", "lista.exe"]) {
    const form = new FormData(); form.set("file", new File(["not a document"], name));
    assert.equal((await route.POST(request(form))).status, 400);
  }
  assert.equal(route.reads(), 0);
});
test("API limita análises por sessão", async () => {
  const route = loadRoute();
  let response;
  for (let i = 0; i < 9; i++) { const form = new FormData(); form.set("text", "ambiente;produto;quantidade\nSala;Imbuia;4"); response = await route.POST(request(form)); }
  assert.equal(response.status, 429);
});
