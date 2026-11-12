import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../supabase";
import { identityKeys, type Asset, type Fields, type Project, type Intel } from "./domain";

export const bucket = "orbital-radar-evidence";
type Local = { assets: Map<string, Asset>; images: Map<string, Buffer>; projects: Map<string, Project>; keys: Map<string, string>; intel: Map<string,Intel> };
const g = globalThis as typeof globalThis & { orbitalRadarSandbox?: Local };
function sandbox() {
  if (process.env.NODE_ENV !== "development" || process.env.RADAR_SANDBOX !== "1") return null;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("Sandbox exige ambiente sem Supabase configurado.");
  return g.orbitalRadarSandbox ??= { assets: new Map(), images: new Map(), projects: new Map(), keys: new Map(), intel: new Map() };
}
function db() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase do Radar não configurado.");
  return supabaseAdmin();
}
export async function list(offset = 0) {
  const local = sandbox();
  if (local) return { assets: [...local.assets.values()].reverse().slice(offset,offset+50), projects: [...local.projects.values()].reverse().slice(offset,offset+50), sandbox: true };
  const [a,p] = await Promise.all([
    db().from("radar_assets").select("*").order("created_at",{ascending:false}).order("id").range(offset,offset+49),
    db().from("radar_projects").select("*").order("created_at",{ascending:false}).order("id").range(offset,offset+49),
  ]);
  if (a.error || p.error) throw new Error("Não foi possível consultar o Radar. Confira a migração e a configuração.");
  return { assets: a.data as Asset[], projects: p.data as Project[], sandbox: false };
}
export async function getAsset(id: string) {
  const local = sandbox();
  if (local) return local.assets.get(id) ?? null;
  const result = await db().from("radar_assets").select("*").eq("id",id).maybeSingle();
  if (result.error) throw new Error("Não foi possível localizar a evidência.");
  return result.data as Asset | null;
}
export async function addAsset(sha: string, batch: string, mime: string, bytes: Buffer) {
  const local = sandbox();
  if (local) {
    const existing = [...local.assets.values()].find(a => a.sha === sha);
    if (existing) return { asset: existing, duplicate: true };
    if (local.assets.size >= 60) throw new Error("Limite do sandbox atingido.");
    const time = new Date().toISOString();
    const asset: Asset = { id: randomUUID(), batch, sha, mime, status: "pending", version: 0, attempts: 0, observations: {}, error: null, project_id: null, created_at: time, updated_at: time };
    local.assets.set(asset.id,asset); local.images.set(sha, bytes);
    return { asset, duplicate: false };
  }
  const prior = await db().from("radar_assets").select("*").eq("sha",sha).maybeSingle();
  if (prior.error) throw new Error("Não foi possível conferir a duplicidade da foto.");
  if (prior.data) return { asset: prior.data as Asset, duplicate: true };
  const upload = await db().storage.from(bucket).upload(sha,bytes,{contentType:mime,upsert:false});
  if (upload.error && !["409","Duplicate"].includes(String(upload.error.statusCode)) && !/already exists/i.test(upload.error.message))
    throw new Error("Não foi possível guardar a evidência privada.");
  const inserted = await db().from("radar_assets").upsert({sha,batch,mime},{onConflict:"sha",ignoreDuplicates:true}).select().maybeSingle();
  if (inserted.error) throw new Error("A foto foi guardada, mas o registro falhou. Reenvie para recuperar.");
  if (inserted.data) return {asset: inserted.data as Asset, duplicate: false};
  const same = await db().from("radar_assets").select("*").eq("sha",sha).single();
  if (same.error) throw new Error("Não foi possível recuperar a foto duplicada.");
  return {asset: same.data as Asset, duplicate: true};
}
export async function evidence(asset: Asset) {
  const local = sandbox();
  if (local) {
    const bytes = local.images.get(asset.sha);
    if (!bytes) throw new Error("Evidência indisponível.");
    return bytes;
  }
  const result = await db().storage.from(bucket).download(asset.sha);
  if (result.error) throw new Error("Evidência indisponível.");
  return Buffer.from(await result.data.arrayBuffer());
}
export async function transition(asset: Asset, changes: Partial<Pick<Asset,"status"|"attempts"|"observations"|"error">>) {
  const patch = { ...changes, version: asset.version+1, updated_at: new Date().toISOString() };
  const local = sandbox();
  if (local) {
    const current = local.assets.get(asset.id);
    if (current?.version !== asset.version) return null;
    const updated = { ...current, ...patch };
    local.assets.set(asset.id,updated); return updated;
  }
  const result = await db().from("radar_assets").update(patch).eq("id",asset.id).eq("version",asset.version).select().maybeSingle();
  if (result.error) throw new Error("Não foi possível atualizar a foto.");
  return result.data as Asset | null;
}
export async function review(asset: Asset, fields: Fields) {
  const keys = identityKeys(fields);
  const local = sandbox();
  if (local) {
    const current = local.assets.get(asset.id);
    if (current?.status === "saved") return { id: current.project_id, duplicate: true };
    if (!current || current.version !== asset.version || !["failed","review"].includes(current.status)) throw new Error("RADAR_STALE");
    const ids = [...new Set(keys.flatMap(k => local.keys.get(k) ?? []))];
    if (ids.length > 1) throw new Error("RADAR_CONFLICT");
    const existing = ids[0] ? local.projects.get(ids[0]) : undefined;
    if (existing && (["permit","process","city","state"] as const).some(k => fields[k] && existing.fields[k] && fields[k] !== existing.fields[k])) throw new Error("RADAR_CONFLICT");
    const time = new Date().toISOString();
    const project: Project = { id: existing?.id ?? randomUUID(), fields: { ...fields,...existing?.fields }, created_at: existing?.created_at ?? time, updated_at: time };
    local.projects.set(project.id,project);
    for (const key of keys) local.keys.set(key,project.id);
    local.assets.set(asset.id,{...current,project_id:project.id,status:"saved",version:current.version+1,updated_at:time,error:null});
    return {id:project.id,duplicate:Boolean(existing)};
  }
  const {data,error} = await db().rpc("radar_review",{p_asset:asset.id,p_version:asset.version,p_fields:fields,p_keys:keys});
  if (error) throw new Error(error.message.startsWith("RADAR_") ? error.message : "Não foi possível salvar a revisão.");
  return data as {id:string;duplicate:boolean};
}


export async function createUploadTicket() {
  if (sandbox()) throw new Error("Use o envio local do sandbox.");
  const id=randomUUID();
  const path=`incoming/${id}`;
  const result=await db().storage.from(bucket).createSignedUploadUrl(path,{upsert:false});
  if (result.error) throw new Error("Não foi possível autorizar o envio.");
  return { id,path,token:result.data.token };
}
export async function readIncoming(id: string) {
  const result=await db().storage.from(bucket).download(`incoming/${id}`);
  if (result.error) throw new Error("Arquivo temporário não encontrado.");
  return result.data;
}
export async function clearIncoming(id: string) {
  await db().storage.from(bucket).remove([`incoming/${id}`]);
}
export async function signedEvidence(asset: Asset) {
  const result=await db().storage.from(bucket).createSignedUrl(asset.sha,60);
  if (result.error) throw new Error("Evidência indisponível.");
  return result.data.signedUrl;
}

export async function getProject(id: string) {
  const local=sandbox();
  if(local) return local.projects.get(id) ?? null;
  const r=await db().from("radar_projects").select("*").eq("id",id).maybeSingle();
  if(r.error) throw new Error("Não foi possível consultar a obra.");
  return r.data as Project|null;
}
function emptyIntel(id:string): Intel {
  return {project_id:id,version:0,checks:[],draft:null,approved_at:null,suppressed:false,updated_at:new Date().toISOString()};
}
export async function getIntel(id:string): Promise<Intel> {
  const local=sandbox();
  if(local) return local.intel.get(id) ?? emptyIntel(id);
  const r=await db().from("radar_intelligence").select("*").eq("project_id",id).maybeSingle();
  if(r.error) throw new Error("Não foi possível consultar a pesquisa.");
  return r.data as Intel ?? emptyIntel(id);
}
export async function saveIntel(current:Intel,patch:Partial<Pick<Intel,"checks"|"draft"|"approved_at"|"suppressed">>) {
  const local=sandbox();
  const next={...current,...patch,version:current.version+1,updated_at:new Date().toISOString()};
  if(local) {
    if((local.intel.get(current.project_id)?.version ?? 0)!==current.version) return null;
    local.intel.set(current.project_id,next);return next;
  }
  const table=db().from("radar_intelligence");
  const r=current.version===0
    ? await table.upsert(next,{onConflict:"project_id",ignoreDuplicates:true}).select().maybeSingle()
    : await table.update(next).eq("project_id",current.project_id).eq("version",current.version).select().maybeSingle();
  if(r.error) throw new Error("Não foi possível salvar a pesquisa.");
  return r.data as Intel|null;
}
export async function counts() {
  const local=sandbox();
  if(local) {
    const assets=[...local.assets.values()];
    return {read:assets.filter(a=>Object.keys(a.observations).length>0).length,review:assets.filter(a=>a.status==="review"||a.status==="failed").length,projects:local.projects.size};
  }
  const [read,review,projects]=await Promise.all([
    db().from("radar_assets").select("id",{count:"exact",head:true}).neq("observations","{}"),
    db().from("radar_assets").select("id",{count:"exact",head:true}).in("status",["review","failed"]),
    db().from("radar_projects").select("id",{count:"exact",head:true}),
  ]);
  if(read.error||review.error||projects.error) throw new Error("Contagens indisponíveis.");
  return {read:read.count ?? 0,review:review.count ?? 0,projects:projects.count ?? 0};
}
