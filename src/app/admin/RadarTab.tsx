"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FIELDS, MAX_BYTES, fold, score, type Asset, type Field, type Fields, type Project } from "@/lib/radar/domain";
import RadarResearch from "./RadarResearch";
import { supabase } from "@/lib/supabase";
import { inputCls, btnPrimary, btnSecondary } from "./ui";

const api = "/api/admin/radar";
const statusText: Record<Asset["status"], string> = {
  pending:"Aguardando leitura",processing:"Lendo a placa",review:"Revisar",failed:"Leitura incompleta",saved:"Obra cadastrada",
};
const fieldKeys = Object.keys(FIELDS) as Field[];
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2347A0]";
const exportColumns: Field[] = ["city","state","process","permit","expires","type","use","floors","area","neighborhood"];
const date = (iso: string) => iso.slice(0,10).split("-").reverse().join("/");
async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input,{...init,cache:"no-store"});
  const value = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(value.error || "Não foi possível acessar o Radar.");
  return value as T;
}
const patch = <T,>(body: object) => request<T>(api,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
function viewName(p: Project) { return p.fields.use || p.fields.type || "Obra cadastrada"; }

export default function RadarTab() {
  const [directThreshold,setDirectThreshold] = useState(MAX_BYTES);
  const [maxBytes,setMaxBytes] = useState(MAX_BYTES);
  const [assets,setAssets] = useState<Asset[]>([]);
  const [projects,setProjects] = useState<Project[]>([]);
  const [sandbox,setSandbox] = useState(false);
  const [offset,setOffset] = useState(0);
  const [counts,setCounts] = useState<{read:number;review:number;projects:number} | null>(null);
  const [ready,setReady] = useState(false);
  const [notice,setNotice] = useState("");
  const [failure,setFailure] = useState("");
  const [busy,setBusy] = useState(false);
  const [pending,setPending] = useState<File[]>([]);
  const [progress,setProgress] = useState<number | null>(null);
  const [review,setReview] = useState<Asset | null>(null);
  const [fields,setFields] = useState<Fields>({});
  const [confirm,setConfirm] = useState(false);
  const [showPhoto,setShowPhoto] = useState(false);
  const [search,setSearch] = useState("");
  const [stage,setStage] = useState("");
  const [detail,setDetail] = useState<Project | null>(null);
  const [columns,setColumns] = useState<Field[]>(exportColumns);
  const picker = useRef<HTMLInputElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const lock = useRef(false);

  const load = useCallback(async (next: number, signal?: AbortSignal) => {
    const data = await request<{assets:Asset[]; projects:Project[]; sandbox:boolean;maxBytes:number;directThreshold:number;counts:{read:number;review:number;projects:number}}>(`${api}?offset=${next}`,{signal});
    setCounts(data.counts);setMaxBytes(data.maxBytes);setDirectThreshold(data.directThreshold);setAssets(data.assets);setProjects(data.projects);setSandbox(data.sandbox);setOffset(next);setReady(true);
  },[]);
  useEffect(() => {
    const ctrl = new AbortController();
    void Promise.resolve().then(() => load(0,ctrl.signal)).catch(e => { if (!ctrl.signal.aborted) setFailure(e.message); });
    return () => ctrl.abort();
  },[load]);
  useEffect(() => { if (review) reviewHeading.current?.focus(); },[review]);
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current=true;setBusy(true);setFailure("");setNotice("");
    try { await fn(); }
    catch (e) { setFailure((e as Error).message); }
    finally { lock.current=false;setBusy(false);setProgress(null); }
  }
  function choose(files: FileList | File[]) {
    if (busy) return;
    const values = Array.from(files);
    const valid = values.filter(f => f.size > 0 && f.size <= maxBytes);
    setPending(valid);
    setFailure(valid.length !== values.length ? `${values.length - valid.length} arquivo(s) vazio(s) ou acima de ${maxBytes/1_000_000} MB ficaram fora da seleção.` : "");
  }
  async function upload() {
    const batch = crypto.randomUUID();
    const errors: string[] = [];
    const retry: File[] = [];
    let added=0, repeated=0, incomplete=0;
    for (const [i,file] of pending.entries()) {
      setProgress(i+1);setNotice(`Foto ${i+1} de ${pending.length}: envio e leitura.`);
      let stored = false;
      try {
        const headers={"X-Radar-Batch":batch};
        let result: {asset:Asset;duplicate:boolean};
        if (file.size>directThreshold) {
          const ticket=await request<{id:string;path:string;token:string}>(api+"?action=ticket",{method:"POST",headers:{...headers,"X-Radar-Size":String(file.size)}});
          // File name is replaced with an opaque label before creating multipart data.
          const blob=new File([file],"evidencia",{type:file.type || "image/jpeg"});
          const sent=await supabase().storage.from("orbital-radar-evidence").uploadToSignedUrl(ticket.path,ticket.token,blob,{upsert:false});
          if (sent.error) throw new Error("Falha no envio direto da foto.");
          result=await request(api+"?incoming="+ticket.id,{method:"POST",headers});
        } else {
          result=await request(api,{method:"POST",headers,body:file});
        }
        const {asset,duplicate}=result;
        if (duplicate) { repeated++; continue; }
        stored = true;
        added++;
        const read = await patch<Asset>({id:asset.id,action:"extract"});
        if (read.status==="failed") incomplete++;
      } catch (e) {
        if (!stored) retry.push(file);
        errors.push(`Foto ${i+1}: ${(e as Error).message}`);
      }
    }
    setPending(retry);if (picker.current) picker.current.value="";
    await load(0);
    setNotice(`${added} adicionada(s), ${repeated} já cadastrada(s)${incomplete ? `, ${incomplete} com revisão manual` : ""}.`);
    if (errors.length) {
      const summary = errors.length > 3 ? ` Mais ${errors.length - 3} com falha.` : "";
      const next = retry.length ? ` ${retry.length} foto(s) continuam selecionadas para tentar novamente.` : "";
      setFailure(errors.slice(0,3).join(" ") + summary + next);
    }
  }
  function openReview(asset: Asset) {
    setFields(Object.fromEntries(fieldKeys.flatMap(k => asset.observations[k] ? [[k,asset.observations[k].value]] : [])));
    setConfirm(false);setShowPhoto(false);setReview(asset);setDetail(null);
  }
  async function save() {
    if (!review || !confirm) return;
    const result = await patch<{id:string;duplicate:boolean}>({action:"save",id:review.id,version:review.version,fields,confirmed:true});
    setReview(null);await load(0);
    setNotice(result.duplicate ? "Evidência vinculada à obra existente. Os dados revisados foram preservados." : "Obra cadastrada. Prioridade disponível para pesquisa.");
  }
  const shown = projects.filter(p => fold(Object.values(p.fields).join(" ")).includes(fold(search.trim())));
  const shownAssets = assets.filter(a => !stage || a.status===stage);

  return (
    <section aria-labelledby="radar-heading" className="min-w-0 max-w-[1350px] space-y-7 text-[#0D1830]">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e2e2e2] pb-5">
        <div>
          <h1 id="radar-heading" className="font-serif text-2xl text-[#0B1F45]">Orbital Radar</h1>
          <p className="mt-2 text-sm text-[#43474e]">De placas de obra a oportunidades para pesquisar.</p>
        </div>
        <button type="button" className={btnSecondary+" "+focus} disabled={busy} onClick={() => void run(() => load(0))}>Atualizar lista</button>
      </header>

      {sandbox && <p className="border-l-2 border-[#2347A0] pl-3 text-sm">Sandbox local. Use somente fotos sintéticas; os registros são temporários.</p>}
      {failure && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-900">{failure}</p>}
      <p aria-live="polite" className="text-sm text-[#1F7A44] empty:hidden">{notice}</p>

      {counts && <dl className="grid grid-cols-3 gap-3 border-b border-[#e2e2e2] pb-4 text-sm">
        {[["Fotos com leitura",counts.read],["Pendentes de revisão",counts.review],["Obras únicas",counts.projects]].map(([label,n])=><div key={label}>
          <dt className="text-[#43474e]">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{n}</dd>
        </div>)}
      </dl>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="radar-upload" className="border border-[#e2e2e2] bg-white p-4 sm:p-5">
          <h2 id="radar-upload" className="font-serif text-lg">Enviar fotos</h2>
          <p className="mt-1 text-sm text-[#43474e]" id="radar-upload-hint">Selecione todas as fotos do lote. Envio uma a uma, até {maxBytes/1_000_000} MB por foto. JPG, PNG, WebP ou HEIC compatível.</p>
          <div className="mt-4 border border-dashed border-[#a5a9b0] bg-[#F6F5F2] p-4" onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault();choose(e.dataTransfer.files);}}>
            <label htmlFor="radar-files" className="block text-sm font-semibold">Solte as fotos aqui ou selecione os arquivos</label>
            <input id="radar-files" ref={picker} type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif" multiple disabled={busy} aria-describedby="radar-upload-hint"
              className={"mt-3 block w-full text-sm file:mr-2 file:border-0 file:bg-white file:px-2 file:py-2 "+focus} onChange={e => choose(e.target.files ?? [])}/>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className={btnPrimary+" "+focus} disabled={busy || !ready || !pending.length} onClick={() => void run(upload)}>Enviar e ler placas</button>
            <span className="text-sm">{pending.length ? `${pending.length} selecionada(s)` : ""}</span>
            {progress !== null && <progress aria-label="Foto em processamento" className="w-full" value={progress} max={pending.length || progress}/>}
          </div>
        </section>
        <section aria-labelledby="radar-queue" className="min-w-0 border border-[#e2e2e2] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="radar-queue" className="font-serif text-lg">Fila de revisão</h2>
            <label className="text-sm">Status <select className={"ml-1 border border-[#e2e2e2] bg-white p-1 "+focus} value={stage} onChange={e => setStage(e.target.value)}>
              <option value="">Todos</option>{Object.entries(statusText).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select></label>
          </div>
          {!ready && !failure && <p className="mt-4 text-sm">Carregando fotos…</p>}
          {ready && !shownAssets.length && <p className="mt-4 text-sm text-[#43474e]">Nenhuma foto nesta fila.</p>}
          <ul className="mt-3 max-h-60 divide-y divide-[#e2e2e2] overflow-y-auto">
            {shownAssets.map(a => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="min-w-0 text-sm"><p className="font-medium">{statusText[a.status]}</p><p className="text-[#43474e]">{date(a.created_at)} · {a.sha.slice(0,8)}</p></div>
              <div className="flex flex-wrap gap-2">
                {a.status!=="saved" && <button type="button" className={btnSecondary+" "+focus} disabled={busy || a.attempts>=5} onClick={() => void run(async () => {
                  await patch({action:"extract",id:a.id});await load(offset);
                })}>{a.attempts ? "Tentar leitura" : "Ler placa"}</button>}
                {["review","failed","saved"].includes(a.status) && <button type="button" className={btnSecondary+" "+focus} disabled={busy} onClick={() => openReview(a)}>{a.status==="saved" ? "Ver evidência" : "Revisar"}</button>}
              </div>
            </li>)}
          </ul>
        </section>
      </div>

      {review && <section className="border border-[#e2e2e2] bg-white p-4 sm:p-6" aria-labelledby="radar-review">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="radar-review" ref={reviewHeading} tabIndex={-1} className="font-serif text-xl">Revisar placa</h2>
          <button className={btnSecondary+" "+focus} type="button" onClick={() => setReview(null)} disabled={busy}>Fechar revisão</button>
        </div>
        <p className="mt-2 text-sm text-[#43474e]">{review.error || "Confira cada campo com a foto. Deixe em branco o que não puder confirmar."}</p>
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <div>
            <p className="mb-2 text-sm">Evidência privada. A foto original pode conter identificadores pessoais.</p>
            <button type="button" className={btnSecondary+" "+focus} onClick={() => setShowPhoto(v=>!v)} aria-expanded={showPhoto}>{showPhoto ? "Ocultar foto" : "Mostrar foto original"}</button>
            {showPhoto && (
              // eslint-disable-next-line @next/next/no-img-element -- private authenticated bytes; never use the public image optimizer.
              <img src={`${api}?image=${review.id}`} alt="Placa original para conferência" width={640} height={480} className="mt-3 max-h-[540px] w-full border border-[#e2e2e2] object-contain"/>
            )}
          </div>
          <form onSubmit={e => {e.preventDefault();void run(save);}} className="space-y-4">
            <fieldset disabled={busy || review.status==="saved"} className="grid min-w-0 gap-3 sm:grid-cols-2">
              <legend className="mb-3 text-sm font-semibold">Dados da obra</legend>
              {fieldKeys.map(k => {
                const obs=review.observations[k];
                return <label className="min-w-0 text-sm" key={k}>
                  {FIELDS[k]}
                  <input className={inputCls+" mt-1 "+focus} value={fields[k] ?? ""} onChange={e=>setFields({...fields,[k]:e.target.value})} name={k} autoComplete="off" maxLength={300} required={k==="city"||k==="state"}/>
                  {obs && <span className="mt-1 block break-words text-xs text-[#43474e]">{obs.method === "vision" ? "Vision" : "OCR"} {Math.round(obs.confidence*100)}% · {obs.raw}</span>}
                </label>;
              })}
            </fieldset>
            {review.status!=="saved" && <>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" className={"mt-1 "+focus} checked={confirm} onChange={e=>setConfirm(e.target.checked)} required/> Conferi os dados preenchidos na evidência.</label>
              <button type="submit" className={btnPrimary+" "+focus} disabled={busy || !confirm}>Salvar obra revisada</button>
            </>}
          </form>
        </div>
      </section>}

      <section aria-labelledby="radar-projects" className="border border-[#e2e2e2] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="radar-projects" className="font-serif text-lg">Obras cadastradas</h2><p className="mt-1 text-sm text-[#43474e]">A validade na placa não indica o andamento da obra.</p></div>
          <details className="text-sm">
            <summary className={"cursor-pointer "+focus}>Exportar CSV</summary>
            <fieldset className="my-2 grid gap-1"><legend>Colunas permitidas</legend>
              {exportColumns.map(k=><label key={k} className="flex gap-2"><input type="checkbox" checked={columns.includes(k)} onChange={e=>setColumns(e.target.checked?[...columns,k]:columns.filter(x=>x!==k))}/>{FIELDS[k]}</label>)}
            </fieldset>
            {columns.length>0 && <a className={btnSecondary+" inline-block "+focus} href={`${api}?format=csv&columns=${columns.join(",")}`}>Baixar CSV</a>}
          </details>
        </div>
        <label className="mt-4 block max-w-md text-sm">Filtrar nesta página
          <input className={inputCls+" mt-1 "+focus} type="search" placeholder="Município, bairro, alvará…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </label>
        <ul className="mt-4 divide-y divide-[#e2e2e2] border-t border-[#e2e2e2]">
          {!shown.length && <li className="py-4 text-sm text-[#43474e]">Nenhuma obra nesta página.</li>}
          {shown.map(p=><li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0 break-words text-sm"><p className="font-semibold">{viewName(p)}</p><p className="text-[#43474e]">{p.fields.city} · {p.fields.permit || p.fields.process}</p></div>
            <span className="text-sm tabular-nums">{score(p.fields).points}/100</span>
            <button type="button" className={btnSecondary+" "+focus} onClick={() => {setDetail(p);setReview(null);}}>Ver oportunidade</button>
          </li>)}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <button type="button" className={btnSecondary+" "+focus} disabled={busy || offset===0} onClick={()=>void run(()=>load(offset-50))}>Anterior</button>
          <span>Página {offset/50+1}</span>
          <button type="button" className={btnSecondary+" "+focus} disabled={busy || (projects.length<50 && assets.length<50)} onClick={()=>void run(()=>load(offset+50))}>Próxima</button>
        </div>
      </section>
      {detail && <section className="border border-[#e2e2e2] bg-white p-4 sm:p-6" aria-labelledby="radar-detail">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="radar-detail" className="font-serif text-xl">{viewName(detail)}</h2>
          <button className={btnSecondary+" "+focus} type="button" onClick={()=>setDetail(null)}>Fechar oportunidade</button>
        </div>
        <p className="my-3 text-sm"><strong>{score(detail.fields).points}/100</strong> · {score(detail.fields).band}</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          {fieldKeys.filter(k=>detail.fields[k]).map(k=><div key={k} className="min-w-0 text-sm"><dt className="text-[#43474e]">{FIELDS[k]}</dt><dd className="break-words">{k==="expires"?date(detail.fields[k] ?? ""):detail.fields[k]}</dd></div>)}
        </dl>
        <h3 className="mt-5 font-semibold">Como a prioridade foi calculada</h3>
        <ul className="mt-2 space-y-1 text-sm">{score(detail.fields).factors.map(f=><li key={f.label}>{f.label}: {f.points}/{f.max}</li>)}</ul>
        <h3 className="mt-5 font-semibold">Próxima ação</h3>
        <p className="mt-2 text-sm">Confirme o vínculo profissional e o estágio da obra antes de avaliar o Painel Flexível em Fibra de Bambu para paredes e tetos internos. A área construída não estima o volume de revestimento. Nenhum canal foi autorizado para contato.</p>
        <RadarResearch key={detail.id} project={detail}/>
        {assets.filter(a=>a.project_id===detail.id).map(a=><button type="button" key={a.id} className={btnSecondary+" mt-3 "+focus} onClick={()=>openReview(a)}>Ver evidência {a.sha.slice(0,8)}</button>)}
      </section>}
    </section>
  );
}
