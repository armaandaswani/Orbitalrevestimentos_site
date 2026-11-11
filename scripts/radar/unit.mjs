import "./build-test.mjs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {normalize,parseLayout,parseLines,identityKeys,score,csv,validateFields,redact}=require("../../.next/radar-check/domain.js");
assert.equal(normalize("area","1.260,32 m²"),"1260.32");
assert.equal(normalize("area","260,32m'"),"260.32");
assert.equal(normalize("expires","29/02/2026"),"");
assert.equal(normalize("expires","29/02/2028"),"2028-02-29");
assert.equal(redact("CPF: 111.222.333-44"),"CPF: [suprimido]");
assert.equal(redact("AM20260593657"),"AM20260593657");
const at=(text,x,y)=>({text,confidence:.91,box:[x,y,x+.13,y+.012]});
const parsed=parseLayout([
 at("N° DO PROCESSO",.78,.48),at("1234/2026",.76,.51),at("N° DO ALVARÁ",.77,.56),at("4321/2026",.76,.59),
 at("ÁREA DO EMPREENDIMENTO:",.43,.47),at("260,32m'",.53,.50),
 at("AUTORDOPROJETO: Teste Um CAU: A12345-6",.25,.66),
 at("RESPONSÁVEL TÉCNICO: Teste Dois",.25,.71),at("CREAICAU: 99A22222",.26,.73),
 at("VENCIMENTO ALVARÁ",.75,.68),at("01/09/2027",.75,.72),
 at("CPF: 111.222.333-44",.27,.61),
]);
assert.equal(parsed.observations.area.value,"260.32");
assert.equal(parsed.observations.permit.value,"4321/2026");
assert.equal(parsed.observations.expires.value,"2027-09-01");
assert.equal(parsed.observations.author.value,"Teste Um");
assert.equal(parsed.observations.authorRegistry.value,"CAU A12345-6");
assert.equal(parsed.observations.supervisorRegistry.value,"99A22222");
assert.equal(parsed.observations.author.method,"vision");
assert.ok(!JSON.stringify(parsed).includes("111.222"));
const conflict=parseLines([at("Alvará: 123/2025",0,0),at("Alvará: 456/2026",0,0)]);
assert.equal(conflict.ambiguous,true);assert.equal(conflict.observations.permit,undefined);
const fields=validateFields({city:"Manaus",state:"AM",permit:"123/2026",use:"Residencial",expires:"2027-01-01"});
assert.deepEqual(identityKeys(fields),["am:manaus:permit:123/2026"]);
assert.equal(score(fields).points,score({...fields,expires:"2020-01-01"}).points);
assert.throws(()=>validateFields({city:"Manaus",state:"AM",permit:"123/2026",address:"CPF 111.222.333-44"}));
assert.match(csv([{fields:{city:" =1+1"}}],["city"]),/"' =1\+1"/);
console.log("Unidade: datas, valores, geometria, papéis, conflitos, privacidade, pontuação e CSV.");
