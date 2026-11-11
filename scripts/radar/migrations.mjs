import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

if (!process.env.RADAR_PGLITE_PATH) throw new Error("Aponte RADAR_PGLITE_PATH para o index.js do PGlite instalado fora do projeto.");
const { PGlite } = await import(pathToFileURL(process.env.RADAR_PGLITE_PATH).href);
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(bucket_id text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon;
    grant select on storage.objects to anon;
    create policy fake_existing_global_read on storage.objects for select to anon using (true);
  `);
  for (const migration of ["081_orbital_radar.sql","082_radar_intelligence.sql"])
    await db.exec(await readFile("supabase/migrations/"+migration,"utf8"));
  const {rows:[bucket]}=await db.query("select * from storage.buckets where id='orbital-radar-evidence'");
  assert.equal(bucket.public,false);
  await db.exec("insert into storage.objects values ('orbital-radar-evidence'), ('other'); set role anon");
  assert.deepEqual((await db.query("select * from storage.objects")).rows,[{bucket_id:"other"}]);
  await assert.rejects(()=>db.query("select * from public.radar_assets"),/permission denied/);
  await db.exec("reset role; set role service_role");
  async function asset(n){
    const id=randomUUID();
    await db.query("insert into public.radar_assets(id,batch,sha,mime,status) values($1,$2,$3,'image/png','review')",[id,randomUUID(),n.toString(16).padStart(64,"0")]);
    return id;
  }
  const save=async(id,fields,keys,version=0)=>(await db.query("select public.radar_review($1,$2,$3,$4) as result",[id,version,JSON.stringify(fields),keys])).rows[0].result;
  const a=await asset(1),b=await asset(2),c=await asset(3),d=await asset(4);
  const first=await save(a,{permit:"1/2026",city:"Manaus"},["am:manaus:permit:1/2026"]);
  assert.equal(first.duplicate,false);
  const duplicate=await save(b,{permit:"1/2026",process:"2/2026",city:"Manaus"},["am:manaus:permit:1/2026","am:manaus:process:2/2026"]);
  assert.equal(duplicate.id,first.id);
  assert.equal(duplicate.duplicate,true);
  assert.equal((await save(b,{permit:"1/2026"},["am:manaus:permit:1/2026"])).id,first.id);
  await assert.rejects(()=>save(c,{permit:"3/2026",process:"2/2026",city:"Manaus"},["am:manaus:permit:3/2026","am:manaus:process:2/2026"]),/RADAR_CONFLICT/);
  await assert.rejects(()=>save(d,{permit:"4/2026"},["am:manaus:permit:4/2026"],7),/RADAR_STALE/);
  assert.equal((await db.query("select count(*)::int n from public.radar_review_events")).rows[0].n,2);
  assert.equal((await db.query("select count(*)::int n from public.radar_projects")).rows[0].n,1);
  await assert.rejects(()=>db.query("insert into public.radar_intelligence(project_id,approved_at,suppressed,draft) values ($1,now(),true,'teste')",[first.id]),/check constraint/);
  console.log("Migrações aprovadas em PostgreSQL descartável (PGlite): RLS, bucket privado, idempotência, dedupe, conflito e supressão.");
} finally { await db.close(); }
