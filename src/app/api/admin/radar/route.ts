import { createHash } from "node:crypto";
import { type NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { MAX_BYTES, SERVERLESS_MAX_BYTES, csv, validateFields, type Field, type Project } from "@/lib/radar/domain";
import { extract, InvalidImage, prepareImage } from "@/lib/radar/ocr";
import { boundedBody,invalidWriteOrigin,radarEnabled } from "@/lib/radar/http";
import * as store from "@/lib/radar/store";

export const runtime = "nodejs";
export const maxDuration = 45;
const limit = () => process.env.VERCEL ? SERVERLESS_MAX_BYTES : MAX_BYTES;
const noCache = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (data: unknown, status = 200) => Response.json(data,{status,headers:noCache});
const error = (message: string, status: number) => json({error:message},status);
const denied = () => error("Entre no admin para usar o Radar.",401);

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return denied();
  if (!radarEnabled()) return error("Radar ainda não habilitado neste ambiente.",503);
  const q = req.nextUrl.searchParams;
  try {
    const id = q.get("image");
    if (id !== null) {
      if (!uuid.test(id)) return error("Foto inválida.",400);
      const asset = await store.getAsset(id);
      if (!asset) return error("Foto não encontrada.",404);
      if (process.env.VERCEL) return new Response(null,{status:303,headers:{...noCache,Location:await store.signedEvidence(asset),"Referrer-Policy":"no-referrer"}});
      const bytes = await store.evidence(asset);
      return new Response(new Uint8Array(bytes),{headers:{...noCache,"Content-Type":asset.mime,"Content-Disposition":"inline","Cross-Origin-Resource-Policy":"same-origin"}});
    }
    if (q.get("format") === "csv") {
      const allowed: Field[] = ["city","state","process","permit","expires","type","use","floors","area","neighborhood"];
      const columns = q.get("columns")?.split(",") ?? allowed;
      if (!columns.length || columns.length > allowed.length || new Set(columns).size !== columns.length || columns.some(k => !allowed.includes(k as Field))) return error("Colunas de exportação inválidas.",400);
      const all: Project[] = [];
      for (let offset=0; offset<=1000; offset+=50) {
        const data = await store.list(offset);
        all.push(...data.projects);
        if (all.length > 1000) return error("A exportação está limitada a 1.000 obras.",413);
        if (data.projects.length < 50) break;
      }
      return new Response(csv(all,columns as Field[]),{headers:{...noCache,"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="orbital-radar.csv"'}});
    }
    const offset = Number(q.get("offset") ?? "0");
    if (!Number.isInteger(offset) || offset < 0 || offset > 5000) return error("Página inválida.",400);
    const [rows,counts] = await Promise.all([store.list(offset),store.counts()]);
    return json({ ...rows, counts, maxBytes:MAX_BYTES, directThreshold:limit() });
  } catch { return error("Radar indisponível. Confira a configuração e a migração.",503); }
}
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return denied();
  if (!radarEnabled()) return error("Radar ainda não habilitado neste ambiente.",503);
  if (invalidWriteOrigin(req)) return error("Origem inválida.",403);
  try {
    const batch = req.headers.get("x-radar-batch") ?? "";
    if (!uuid.test(batch)) return error("Lote inválido.",400);
    if (req.nextUrl.searchParams.get("action") === "ticket") {
      const size=Number(req.headers.get("x-radar-size"));
      if (!process.env.VERCEL || !Number.isInteger(size) || size<=limit() || size>MAX_BYTES) return error("Tamanho inválido para envio direto.",400);
      return json(await store.createUploadTicket(),201);
    }
    const incoming=req.nextUrl.searchParams.get("incoming");
    if (incoming !== null) {
      if (!process.env.VERCEL || !uuid.test(incoming)) return error("Envio temporário inválido.",400);
      const staged=await store.readIncoming(incoming);
      if (!staged.size || staged.size>MAX_BYTES) {
        await store.clearIncoming(incoming);
        return error("Foto acima do limite.",413);
      }
      const bytes=Buffer.from(await staged.arrayBuffer());
      try {
        const prepared=await prepareImage(bytes);
        const result=await store.addAsset(createHash("sha256").update(bytes).digest("hex"),batch,prepared.mime,bytes);
        await store.clearIncoming(incoming).catch(()=>{});
        return json(result,201);
      } catch (e) {
        if (e instanceof InvalidImage) await store.clearIncoming(incoming).catch(()=>{});
        throw e;
      }
    }
    const bytes = await boundedBody(req,limit());
    if (!bytes) return error(`Cada foto deve ter até ${limit()/1_000_000} MB neste ambiente.`,413);
    if (!bytes.length) return error("Foto vazia.",400);
    const prepared = await prepareImage(bytes);
    const sha = createHash("sha256").update(bytes).digest("hex");
    return json(await store.addAsset(sha,batch,prepared.mime,bytes),201);
  } catch (e) {
    return e instanceof InvalidImage ? error(e.message,415) : error("Não foi possível guardar a foto. Você pode tentar novamente.",503);
  }
}
export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return denied();
  if (!radarEnabled()) return error("Radar ainda não habilitado neste ambiente.",503);
  if (invalidWriteOrigin(req)) return error("Origem inválida.",403);
  const raw = await boundedBody(req,20_000).catch(() => null);
  if (!raw) return error("Revisão excede o limite.",413);
  let input: {id?: unknown; action?: unknown; version?: unknown; fields?: unknown; confirmed?: unknown};
  try {
    input = JSON.parse(raw.toString("utf8"));
    if (!input || typeof input !== "object" || typeof input.id !== "string" || !uuid.test(input.id)) throw new Error();
  } catch { return error("Solicitação inválida.",400); }
  try {
    const asset = await store.getAsset(input.id as string);
    if (!asset) return error("Foto não encontrada.",404);
    if (input.action === "save") {
      if (input.confirmed !== true) return error("Confirme a conferência da placa.",400);
      if (typeof input.version !== "number" || !Number.isInteger(input.version)) return error("Versão inválida.",400);
      if (asset.status !== "saved" && asset.version !== input.version) return error("A foto mudou. Reabra a revisão.",409);
      let fields;
      try { fields = validateFields(input.fields); }
      catch (e) { return error((e as Error).message,400); }
      return json(await store.review(asset,fields));
    }
    if (input.action === "manual") {
      if (asset.status === "review" || asset.status === "failed") return json(asset);
      if (asset.status !== "pending") return error("A foto mudou. Atualize a lista.",409);
      const manual = await store.transition(asset,{status:"review",error:"Confira os campos diretamente na foto."});
      return manual ? json(manual) : error("A foto mudou. Atualize a lista.",409);
    }
    if (input.action !== "extract") return error("Ação inválida.",400);
    if (asset.status === "saved") return error("Esta foto já está vinculada a uma obra.",409);
    if (process.env.VERCEL && !process.env.RADAR_OCR) {
      if (asset.status === "review") return json(asset);
      if (asset.status === "pending" || asset.status === "processing") return json(asset,202);
      const queued = await store.transition(asset,{status:"pending",error:null,attempts:0});
      return queued ? json(queued,202) : error("A foto mudou. Atualize a lista.",409);
    }
    if (asset.status === "processing" && Date.now()-Date.parse(asset.updated_at)<90_000) return error("A foto já está sendo processada.",409);
    if (asset.attempts >= 5) return error("Limite de tentativas atingido. Revise manualmente.",409);
    const claimed = await store.transition(asset,{status:"processing",attempts:asset.attempts+1,error:null});
    if (!claimed) return error("A foto mudou. Atualize a lista.",409);
    try {
      const result = await extract(await prepareImage(await store.evidence(claimed)));
      const note = result.ambiguous ? "Há valores conflitantes. Confira se existe mais de uma placa na foto." :
        Object.keys(result.observations).length ? null : "Nenhum campo reconhecido. Preencha a revisão manual.";
      const updated = await store.transition(claimed,{status:"review",observations:result.observations,error:note});
      return updated ? json(updated) : error("A foto mudou. Atualize a lista.",409);
    } catch (e) {
      const message = e instanceof Error && /^(?:OCR |Imagem inválida|Evidência indisponível)/.test(e.message) ? e.message : "Falha na leitura. Revise a placa ou tente novamente.";
      const failed = await store.transition(claimed,{status:"failed",error:message});
      return failed ? json(failed) : error("A foto mudou. Atualize a lista.",409);
    }
  } catch (e) {
    const code = (e as Error).message;
    if (code === "RADAR_CONFLICT") return error("Alvará e processo conflitam com obras existentes. Revise os números antes de vincular.",409);
    if (code === "RADAR_STALE") return error("A foto mudou ou ainda não está pronta para revisão.",409);
    return error("Não foi possível concluir a operação do Radar.",503);
  }
}
