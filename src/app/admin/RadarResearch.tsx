"use client";
import { useEffect,useState } from "react";
import { CHECK_KINDS,CHECK_RESULTS,ROLES,researchBrief,type Intel,type Project } from "@/lib/radar/domain";
import { btnPrimary,btnSecondary,inputCls } from "./ui";

const endpoint="/api/admin/radar/research";
const focus="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2347A0]";
async function read(response:Response):Promise<Intel> {
  const data=await response.json();
  if(!response.ok) throw new Error(data.error || "Pesquisa indisponível.");
  return data;
}
export default function RadarResearch({project}:{project:Project}) {
  const [intel,setIntel]=useState<Intel|null>(null);
  const [draft,setDraft]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [form,setForm]=useState({kind:"affiliation",result:"possible",role:project.fields.author?"author":project.fields.supervisor?"supervisor":"company",url:"",corroboration:"",note:""});
  useEffect(()=>{
    const abort=new AbortController();
    void fetch(endpoint+"?project="+project.id,{signal:abort.signal,cache:"no-store"}).then(read).then(data=>{
      setIntel(data);setDraft(data.draft ?? "");
    }).catch(e=>{if(!abort.signal.aborted)setError(e.message);});
    return ()=>abort.abort();
  },[project.id]);
  async function action(type:string,extra:object={}) {
    if(!intel || busy) return;
    setBusy(true);setError("");setNotice("");
    try {
      const next=await read(await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:type,id:project.id,version:intel.version,...extra})}));
      setIntel(next);setDraft(next.draft ?? "");setNotice(type==="approve"?"Texto aprovado internamente. Nenhum envio agendado.":"Pesquisa atualizada.");
      if(type==="check") setForm(f=>({...f,url:"",corroboration:"",note:""}));
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  const brief=intel ? researchBrief(project,intel) : null;
  const roles=(Object.keys(ROLES) as Array<keyof typeof ROLES>).filter(r=>project.fields[r]);
  return <section className="mt-6 border-t border-[#e2e2e2] pt-5" aria-labelledby="radar-research-title">
    <h3 id="radar-research-title" className="font-serif text-lg">Pesquisa e preparação comercial</h3>
    <p className="mt-2 text-sm">Registre somente fontes profissionais públicas. Um canal publicado não é autorização de contato.</p>
    <p className="mt-2 flex flex-wrap gap-3 text-sm">
      <a href="https://transparencia.caubr.gov.br/cartadeservicos1-1/" target="_blank" rel="noreferrer" className={"underline "+focus}>Consultar CAU/BR</a>
      <a href="https://crea-am.sitac.com.br/app/view/sight/externo?form=PesquisarProfissionalEmpresa" target="_blank" rel="noreferrer" className={"underline "+focus}>Consultar CREA-AM</a>
    </p>
    {error && <p role="alert" className="mt-3 text-sm text-red-900">{error}</p>}
    <p aria-live="polite" className="mt-2 text-sm text-[#1F7A44] empty:hidden">{notice}</p>
    {!intel && !error && <p className="mt-2 text-sm">Carregando pesquisa…</p>}
    {intel && brief && <>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">Prioridade com evidências</dt><dd className="tabular-nums">{brief.points}/100</dd></div>
        <div><dt className="font-semibold">Papel mais relevante</dt><dd>{brief.bestRole?ROLES[brief.bestRole]:"Vínculo a confirmar"}</dd></div>
        <div><dt className="font-semibold">Estágio</dt><dd>{brief.timingVerified?"Documentado por revisão humana":"Não confirmado"}</dd></div>
        <div><dt className="font-semibold">Contato</dt><dd>{intel.suppressed?"Suprimido":"Envio indisponível. Permissão a verificar."}</dd></div>
      </dl>
      <details className="mt-3 text-sm"><summary className={"cursor-pointer "+focus}>Ver fatores da prioridade</summary><ul className="mt-2">{brief.factors.map(f=><li key={f.label}>{f.label}: {f.points}/{f.max}</li>)}</ul></details>
      <p className="mt-3 text-sm"><strong>Próxima ação:</strong> {brief.next}</p>
      {roles.length>0 && <details className="mt-4 text-sm">
        <summary className={"cursor-pointer "+focus}>Registrar verificação</summary>
        <form onSubmit={e=>{e.preventDefault();void action("check",{check:form});}} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label>O que foi pesquisado<select className={inputCls+" mt-1 "+focus} value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}>{Object.entries(CHECK_KINDS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
            <label>Papel<select className={inputCls+" mt-1 "+focus} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{roles.map(r=><option key={r} value={r}>{ROLES[r]}</option>)}</select></label>
            <label>Resultado<select className={inputCls+" mt-1 "+focus} value={form.result} onChange={e=>setForm({...form,result:e.target.value})}>{Object.entries(CHECK_RESULTS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          </div>
          <label className="block">URL da fonte pública<input className={inputCls+" mt-1 "+focus} type="url" spellCheck={false} autoComplete="off" maxLength={600} required value={form.url} onChange={e=>setForm({...form,url:e.target.value})}/></label>
          <label className="block">Segunda fonte (necessária para verificar registro ou vínculo)<input className={inputCls+" mt-1 "+focus} type="url" spellCheck={false} autoComplete="off" maxLength={600} required={form.result==="verified"&&["registry","affiliation"].includes(form.kind)} value={form.corroboration} onChange={e=>setForm({...form,corroboration:e.target.value})}/></label>
          <label className="block">O que a fonte confirma?<textarea className={inputCls+" mt-1 "+focus} maxLength={350} rows={2} value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label>
          <button type="submit" className={btnPrimary+" "+focus} disabled={busy}>Salvar verificação</button>
        </form>
      </details>}
      {intel.checks.length>0 && <ul className="mt-4 divide-y divide-[#e2e2e2] border-t border-[#e2e2e2] text-sm">
        {[...intel.checks].reverse().map(c=><li key={c.id} className="py-2">
          <p>{CHECK_KINDS[c.kind]} · {ROLES[c.role]} · {CHECK_RESULTS[c.result]} · {new Date(c.verifiedAt).toLocaleDateString("pt-BR",{timeZone:"America/Manaus"})}</p>
          {c.note && <p className="mt-1 break-words">{c.note}</p>}
          <a href={c.url} className={"underline "+focus} target="_blank" rel="noreferrer">Fonte</a>
          {c.corroboration && <a href={c.corroboration} className={"ml-3 underline "+focus} target="_blank" rel="noreferrer">Segunda fonte</a>}
        </li>)}
      </ul>}
      <div className="mt-5 space-y-3">
        <h4 className="text-sm font-semibold">Rascunho interno</h4>
        {!draft && <button type="button" className={btnSecondary+" "+focus} disabled={busy||!brief.canDraft} onClick={()=>void action("draft")}>Preparar rascunho</button>}
        {draft && <>
          <label className="block text-sm">Texto para revisão<textarea rows={5} maxLength={1500} className={inputCls+" mt-1 "+focus} value={draft} disabled={intel.suppressed} onChange={e=>setDraft(e.target.value)}/></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary+" "+focus} disabled={busy||!brief.canDraft||draft===intel.draft} onClick={()=>void action("draft",{draft})}>Salvar edição</button>
            <button type="button" className={btnSecondary+" "+focus} disabled={busy||!brief.canDraft||!brief.publishedChannel||draft!==intel.draft||!!intel.approved_at} onClick={()=>void action("approve")}>Aprovar texto</button>
          </div>
        </>}
        <p className="text-sm">{intel.approved_at?"Aprovado para uso interno. ":""}O Radar não agenda nem envia mensagens.</p>
        {!intel.suppressed && <details className="text-sm">
          <summary className={"cursor-pointer "+focus}>Registrar recusa de contato</summary>
          <p className="my-2">Isso bloqueia a preparação de novos textos para esta obra e cancela a aprovação atual.</p>
          <button type="button" className={btnSecondary+" "+focus} disabled={busy} onClick={()=>void action("suppress")}>Confirmar supressão nesta obra</button>
        </details>}
      </div>
    </>}
  </section>;
}
