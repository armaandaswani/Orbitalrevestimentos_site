import test from "node:test";
import assert from "node:assert/strict";
import { PEDIDO_DRAFT_KEY, readEditorDrafts, writeEditorDraft, deleteEditorDraft, isEditorContent } from "./pedido-draft-storage.ts";
function memory() { const rows = new Map(); return { getItem:k=>rows.get(k)??null, setItem:(k,v)=>rows.set(k,v), removeItem:k=>rows.delete(k) }; }
const snapshot = (id, minutes=0) => ({ id, device_id:"device", content:{draft:{_isNew:true,client_name:"",client_address:"Rua de teste",client_phone:"(92) 99999-0000"},items:[],step:1,ui:{freteManual:true}}, revision:0, updated_at:new Date(Date.now()+minutes*60000).toISOString(),open:true });
test("nome ainda vazio, endereço e contato sobrevivem à reabertura cinco minutos depois",()=>{
 const storage=memory(),row=snapshot("partial");writeEditorDraft(storage,row);
 const recovered=readEditorDrafts(storage,Date.now()+5*60_000);
 assert.deepEqual(recovered[0].content,row.content);assert.equal(recovered[0].open,true);
});
test("guardar outro pedido e descartar uma cópia não apaga os demais rascunhos",()=>{
 const storage=memory();writeEditorDraft(storage,snapshot("first"));writeEditorDraft(storage,snapshot("second",1));
 assert.equal(readEditorDrafts(storage)[0].id,"second");deleteEditorDraft(storage,"first");assert.deepEqual(readEditorDrafts(storage).map(r=>r.id),["second"]);
});
test("dados inválidos ou antigos não reabrem um formulário quebrado",()=>{
 const storage=memory();storage.setItem(PEDIDO_DRAFT_KEY,"{broken");assert.deepEqual(readEditorDrafts(storage),[]);
 storage.setItem(PEDIDO_DRAFT_KEY,JSON.stringify([{...snapshot("old"),updated_at:"2020-01-01T00:00:00Z"},{...snapshot("bad"),content:{draft:null,items:[]}}]));assert.deepEqual(readEditorDrafts(storage),[]);
 assert.equal(isEditorContent({...snapshot("valid").content,step:5}),false);
});
test("falha de quota é comunicada ao chamador para não anunciar salvamento inexistente",()=>{
 const storage=memory();storage.setItem=()=>{throw Error("quota");};assert.throws(()=>writeEditorDraft(storage,snapshot("full")),/quota/);
});
