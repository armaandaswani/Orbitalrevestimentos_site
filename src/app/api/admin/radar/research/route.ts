import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { isAdminRequest } from "@/lib/admin-auth";
import { parseCheck, redact, researchBrief, type Intel } from "@/lib/radar/domain";
import { boundedBody,invalidWriteOrigin,radarEnabled } from "@/lib/radar/http";
import { getProject, getIntel, saveIntel } from "@/lib/radar/store";

export const runtime="nodejs";
const idFormat=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
const error=(message:string,status:number)=>json({error:message},status);
export async function GET(req:NextRequest) {
  if(!isAdminRequest(req)) return error("Entre no admin.",401);
  if(!radarEnabled()) return error("Radar ainda não habilitado neste ambiente.",503);
  const id=req.nextUrl.searchParams.get("project") ?? "";
  if(!idFormat.test(id)) return error("Obra inválida.",400);
  try {
    const project=await getProject(id);
    if(!project) return error("Obra não encontrada.",404);
    return json(await getIntel(id));
  } catch { return error("Pesquisa indisponível. Confira a migração.",503); }
}
export async function POST(req:NextRequest) {
  if(!isAdminRequest(req)) return error("Entre no admin.",401);
  if(!radarEnabled()) return error("Radar ainda não habilitado neste ambiente.",503);
  if(invalidWriteOrigin(req)) return error("Origem inválida.",403);
  const raw=await boundedBody(req,12_000).catch(()=>null);
  if(!raw) return error("Solicitação acima do limite.",413);
  let input: {id?:unknown;version?:unknown;action?:unknown;check?:unknown;draft?:unknown};
  try { input=JSON.parse(raw.toString("utf8")); } catch { return error("Solicitação inválida.",400); }
  if(!input || typeof input.id!=="string" || !idFormat.test(input.id) || !Number.isInteger(input.version)) return error("Obra ou versão inválida.",400);
  try {
    const project=await getProject(input.id);
    if(!project) return error("Obra não encontrada.",404);
    const intel=await getIntel(input.id);
    if(intel.version!==input.version) return error("A pesquisa mudou. Reabra a obra.",409);
    const brief=researchBrief(project,intel);
    let patch: Partial<Intel>;
    if(input.action==="check"){
      if(intel.checks.length>=100) return error("Limite de 100 registros de pesquisa atingido.",409);
      let check;
      try {check=parseCheck(input.check);} catch(e){return error((e as Error).message,400);}
      if(!project.fields[check.role]) return error("O papel selecionado não consta na obra.",400);
      patch={checks:[...intel.checks,{...check,id:randomUUID(),verifiedAt:new Date().toISOString()}],approved_at:null};
    } else if(input.action==="draft"){
      if(!brief.canDraft) return error("Verifique um vínculo e confira a supressão antes de preparar texto.",409);
      const draft=input.draft ?? brief.draft;
      if(typeof draft!=="string" || !draft.trim() || draft.length>1500 || redact(draft)!==draft) return error("Rascunho inválido. Remova identificadores pessoais.",400);
      patch={draft:draft.trim(),approved_at:null};
    } else if(input.action==="approve"){
      if(!brief.canDraft || !brief.publishedChannel || !intel.draft) return error("Verifique o vínculo e documente um canal comercial antes de aprovar o texto.",409);
      patch={approved_at:new Date().toISOString()};
    } else if(input.action==="suppress"){
      patch={suppressed:true,approved_at:null};
    } else return error("Ação inválida.",400);
    const next=await saveIntel(intel,patch);
    return next ? json(next) : error("A pesquisa mudou. Reabra a obra.",409);
  } catch {return error("Não foi possível registrar a pesquisa.",503);}
}
