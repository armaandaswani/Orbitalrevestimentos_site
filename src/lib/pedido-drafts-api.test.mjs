import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as helpers from './pedido-drafts.ts';
const ID = '814d93f5-07d2-445c-8d21-0c8bcd147ecf';
const DEVICE = '7a3b202a-bec0-4c37-9137-a06463ec6c83';
const OTHER = 'e34b6443-df95-49d0-98d6-0a7348c81505';
const content = { draft: {}, items: [{ product_id: '', plates: 0, space: '' }], step: 2, ui: { expanded: ['Sala'] } };
function load({ authenticated = true } = {}) {
  const records = new Map(); let calls = 0;
  const db = { from(table) {
    assert.equal(table, 'admin_pedido_drafts'); calls++;
    let op = 'read', values, filters = [], limit = 10;
    const execute = () => {
      const matches = [...records.values()].filter(r => filters.every(([key, value, comparison]) => comparison === 'gte' ? r[key] >= value : r[key] === value));
      if (op === 'insert') {
        if (records.has(values.id)) return { data: null, error: { code: '23505' } };
        const row = { ...values, updated_at: new Date().toISOString() }; records.set(row.id, row); return { data: row, error: null };
      }
      if (op === 'update') {
        if (!matches.length) return { data: null, error: null };
        const row = { ...matches[0], ...values, updated_at: new Date().toISOString() }; records.set(row.id, row); return { data: row, error: null };
      }
      if (op === 'delete') { for (const row of matches) records.delete(row.id); return { data: null, error: null }; }
      return { data: matches.sort((a,b) => b.updated_at.localeCompare(a.updated_at)).slice(0,limit), error: null };
    };
    const query = {
      insert(v) { op = 'insert'; values = v; return query; },
      update(v) { op = 'update'; values = v; return query; },
      delete() { op = 'delete'; return query; },
      eq(k,v) { filters.push([k,v]); return query; },
      gte(k,v) { filters.push([k,v,'gte']); return query; },
      order() { return query; }, limit(v) { limit = v; return query; },
      select() { return query; },
      async maybeSingle() { return execute(); },
      then(resolve,reject) { return Promise.resolve().then(execute).then(resolve,reject); }
    }; return query;
  }};
  const dependencies = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/admin-auth': { isAdminRequest: () => authenticated },
    '@/lib/supabase': { supabaseAdmin: () => db },
    '@/lib/pedido-drafts': helpers,
  };
  function route(path) {
    const source = readFileSync(new URL(path, import.meta.url),'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const module = { exports: {} };
    new Function('require','module','exports',code)(name => { assert.ok(dependencies[name],name); return dependencies[name]; },module,module.exports);
    return module.exports;
  }
  return { ...route('../app/api/admin/pedido-drafts/[id]/route.ts'), ...route('../app/api/admin/pedido-drafts/route.ts'), records, calls: () => calls };
}
const ctx = { params: Promise.resolve({ id: ID }) };
const put = (revision = 0, patch = {}, headers = {}) => new Request(`http://localhost/api/admin/pedido-drafts/${ID}`, { method:'PUT', headers: { 'content-type':'application/json', ...headers }, body: JSON.stringify({ id:ID, device_id: DEVICE, revision, content, ...patch }) });
const del = (device = DEVICE) => new Request(`http://localhost/api/admin/pedido-drafts/${ID}?device_id=${device}`, { method:'DELETE' });
const get = (device = DEVICE) => new Request(`http://localhost/api/admin/pedido-drafts?device_id=${device}`);
test('auth rejects before reading content or database', async () => {
 const route = load({ authenticated:false });
 for (const response of [await route.PUT({},ctx),await route.GET({}),await route.DELETE({},ctx)]) assert.equal(response.status,401);
 assert.equal(route.calls(),0);
});
test('incomplete editor saves and returns server revision; never touches orders',async () => {
 const route = load(); const response = await route.PUT(put(),ctx); assert.equal(response.status,200);
 const saved = await response.json(); assert.equal(saved.revision,1); assert.deepEqual(saved.content,content); assert.ok(saved.updated_at);
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal((await (await route.GET(get())).json()).drafts.length,1);
 assert.equal((await (await route.GET(get(OTHER))).json()).drafts.length,0);
});
test('two concurrent updates at same revision have one winner and one 409',async () => {
 const route = load(); await route.PUT(put(),ctx);
 const results = await Promise.all([route.PUT(put(1,{ content:{ ...content, draft:{client_name:'A'} } }),ctx),route.PUT(put(1,{content:{...content,draft:{client_name:'B'}}}),ctx)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]); assert.equal(route.records.get(ID).revision,2);
 const stale = await route.PUT(put(1),ctx); assert.equal(stale.status,409); assert.equal((await stale.json()).code,'DRAFT_CONFLICT');
 assert.equal((await route.PUT(put(0),ctx)).status,409);
});
test('wrong device cannot overwrite or delete and delete is idempotent',async () => {
 const route = load(); await route.PUT(put(),ctx);
 assert.equal((await route.PUT(put(1,{device_id:OTHER}),ctx)).status,409);
 assert.equal((await route.DELETE(del(OTHER),ctx)).status,200); assert.equal(route.records.size,1);
 assert.equal((await route.DELETE(del(),ctx)).status,200); assert.equal(route.records.size,0);
 assert.equal((await route.DELETE(del(),ctx)).status,200);
});
test('rejects external origin, malformed state, invalid ids and oversized streamed body',async () => {
 const route = load(); assert.equal((await route.PUT(put(0,{}, {origin:'https://outside.invalid'}),ctx)).status,403);
 assert.equal((await route.PUT(put(0,{content:{...content,step:9}}),ctx)).status,400);
 assert.equal((await route.PUT(put(0,{id:OTHER}),ctx)).status,400);
 assert.equal((await route.GET(get('invalid'))).status,400);
 assert.equal((await route.PUT(put(0,{content:{...content,draft:{notes:'a'.repeat(helpers.MAX_PEDIDO_DRAFT_BYTES)}}}),ctx)).status,413);
 assert.equal(route.calls(),0);
});
test('migration denies public access and isolates draft state', () => {
 const sql=readFileSync(new URL('../../supabase/migrations/079_admin_pedido_drafts.sql',import.meta.url),'utf8');
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/i); assert.match(sql,/REVOKE ALL ON public\.admin_pedido_drafts FROM PUBLIC, anon, authenticated/i);
 assert.doesNotMatch(sql,/CREATE POLICY/i); assert.doesNotMatch(sql,/REFERENCES\s+(?:public\.)?(?:pedidos|pedido_items|stock)/i);
});
