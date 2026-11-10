import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { cleanItemSpace } from "./pedido-ambientes.ts";

// Exercise the actual route functions with a local database double. No network,
// credentials, inventory writes or customer messages are involved.
function database({ missingSpace = false, itemInsertFails = false } = {}) {
  const writes = [];
  const db = {
    writes,
    from(table) {
      let operation = "select";
      let columns;
      const query = {
        select(value) { columns = value; return query; },
        insert(value) { operation = "insert"; writes.push({ table, operation, value }); return query; },
        update(value) { operation = "update"; writes.push({ table, operation, value }); return query; },
        delete() { operation = "delete"; writes.push({ table, operation }); return query; },
        eq() { return query; },
        in() { return query; },
        limit() { return query; },
        result() {
          if (table === "pedido_items" && columns === "space" && missingSpace) return { data: null, error: { code: "42703", message: "column space does not exist" } };
          if (table === "pedido_items" && operation === "insert" && itemInsertFails) return { data: null, error: { message: "insert failed" } };
          if (operation === "delete" || operation === "insert" && table === "pedido_items") return { data: null, error: null };
          if (table === "products") return { data: [{ id: "pfb", name: "Imbuia", price: 649, cost_price: 200, sale_unit: "placa" }], error: null };
          if (table === "pedido_items") return { data: [{ product_id: "pfb", product_name: "Imbuia", space: "Sala", plates: 4, unit_price: 649, unit_cost: 200 }], error: null };
          return { data: { id: "order", client_name: "Cliente", total: 3894, notes: "interno", partner_commission_amount: 99 }, error: null };
        },
        maybeSingle() { return Promise.resolve(query.result()); },
        single() { return Promise.resolve(query.result()); },
        then(resolve) { return Promise.resolve(query.result()).then(resolve); },
      };
      return query;
    },
  };
  return db;
}

function loadRoute(relativePath, db) {
  const code = ts.transpileModule(readFileSync(new URL(relativePath, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  const dependencies = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "@/lib/admin-auth": { isAdminRequest: () => true },
    "@/lib/supabase": { supabaseAdmin: () => db },
    "@/lib/pedido-ambientes": { cleanItemSpace },
    "@/lib/db-compat": { isMissingColumn: (error) => error.code === "42703", isMissingTable: () => false },
    "@/lib/stock": { syncOrderStock: async () => ({ ok: true, state: "none" }), pedidoBaixaEstoque: () => false, transitionOrderStock: async () => ({ ok: true }) },
  };
  new Function("require", "module", "exports", code)((name) => {
    assert.ok(dependencies[name], `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  return loaded.exports;
}

const payload = { client_name: "Cliente", items: [
  { product_id: "pfb", space: " Sala ", plates: 4, unit_price: 649 },
  { product_id: "pfb", space: "Quarto", plates: 2, unit_price: 649 },
] };
const request = () => ({ json: async () => payload });

test("criação persiste o mesmo modelo em dois ambientes com snapshots independentes", async () => {
  const db = database();
  const { POST } = loadRoute("../app/api/admin/pedidos/route.ts", db);
  const response = await POST(request());
  assert.equal(response.status, 201);
  const rows = db.writes.find((write) => write.table === "pedido_items").value;
  assert.deepEqual(rows.map(({ space, plates }) => ({ space, plates })), [{ space: "Sala", plates: 4 }, { space: "Quarto", plates: 2 }]);
  assert.equal(rows.reduce((sum, row) => sum + row.plates * row.unit_price, 0), 3894);
});

test("schema antigo bloqueia quantitativo por ambiente antes de qualquer gravação", async () => {
  const db = database({ missingSpace: true });
  const { POST } = loadRoute("../app/api/admin/pedidos/route.ts", db);
  const response = await POST(request());
  assert.equal(response.status, 503);
  assert.equal(db.writes.length, 0);
  assert.match((await response.json()).error, /077/);
});

test("falha nos itens desfaz cabeçalho novo em vez de devolver sucesso vazio", async () => {
  const db = database({ itemInsertFails: true });
  const { POST } = loadRoute("../app/api/admin/pedidos/route.ts", db);
  const response = await POST(request());
  assert.equal(response.status, 500);
  assert.ok(db.writes.some((write) => write.table === "pedidos" && write.operation === "delete"));
});

test("API pública inclui ambiente e mantém custos, notas e comissões privados", async () => {
  const db = database();
  const { GET } = loadRoute("../app/api/pedidos/[id]/route.ts", db);
  const response = await GET({}, { params: Promise.resolve({ id: "order" }) });
  const body = await response.json();
  assert.equal(body.items[0].space, "Sala");
  assert.equal(body.items[0].unit_price, 649);
  assert.ok(!("unit_cost" in body.items[0]));
  assert.ok(!("partner_commission_amount" in body));
  assert.ok(!("notes" in body));
});


test("edição também bloqueia schema antigo antes de tocar pedido ou estoque", async () => {
  const db = database({ missingSpace: true });
  const { PATCH } = loadRoute("../app/api/admin/pedidos/[id]/route.ts", db);
  const response = await PATCH(request(), { params: Promise.resolve({ id: "order" }) });
  assert.equal(response.status, 503);
  assert.equal(db.writes.length, 0);
});

test("estoque soma o mesmo produto em ambientes distintos em uma movimentação", async () => {
  const movements = [];
  let onHand = 100;
  const db = {
    from(table) {
      const query = {
        select() { return query; }, eq() { return query; },
        insert(value) { movements.push(value); return query; },
        update(value) { onHand = value.stock_on_hand; return query; },
        result() {
          return { data: table === "pedido_items"
            ? [{ product_id: "pfb", plates: 4 }, { product_id: "pfb", plates: 2 }]
            : { stock_on_hand: onHand, stock_reserved: 0 }, error: null };
        },
        maybeSingle() { return Promise.resolve(query.result()); },
        then(resolve) { return Promise.resolve(query.result()).then(resolve); },
      };
      return query;
    },
  };
  const { transitionOrderStock } = loadRoute("./stock.ts", db);
  const result = await transitionOrderStock(db, "order", "none", "consumed", "test");
  assert.equal(result.ok, true);
  assert.equal(movements.length, 1);
  assert.equal(movements[0].on_hand_delta, -6);
  assert.equal(onHand, 94);
});
