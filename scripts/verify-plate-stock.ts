/**
 * Verificação da validação de estoque das placas.
 *
 *   node scripts/verify-plate-stock.ts
 *
 * Cobre o exemplo da especificação, a exclusão dos materiais de instalação e os
 * casos que quebram na prática (mesmo modelo em vários ambientes, estoque
 * desconhecido, quantidades inválidas).
 */
import { findPlateShortages, isSupportSku, shortageMessage } from "../src/lib/plate-stock.ts";
import { SUPPORT_PRODUCT_SKUS } from "../src/lib/orcamento-materials.ts";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

const STOCK = { "ORB-003": 8, "ORB-001": 50, "ORB-010": 0, "ORB-PU": 2, "ORB-ESP": 1, "ORB-CC26": 0 };

console.log("\n── Exemplo da especificação ──");
{
  const s = findPlateShortages([{ code: "ORB-003", name: "Bege Travertino", requested: 12 }], STOCK);
  check("12 pedidas com 8 em estoque → 1 falta apontada", s.length === 1);
  check("identifica o modelo certo", s[0]?.code === "ORB-003");
  check("faltam 4", s[0]?.missing === 4, String(s[0]?.missing));
  check("mensagem traz o disponível real",
    shortageMessage(s[0]) === "A quantidade solicitada é maior do que o estoque disponível no momento. Atualmente temos 8 placas disponíveis deste modelo.",
    shortageMessage(s[0]));
}

console.log("\n── Materiais de instalação ficam de fora ──");
{
  // A lista de SKUs de apoio existe em dois arquivos (plate-stock roda sob Node
  // puro e não resolve o alias "@/"). Este teste impede que elas divirjam.
  for (const c of SUPPORT_PRODUCT_SKUS) {
    check(`lista canônica: ${c} também é reconhecido em plate-stock`, isSupportSku(c));
  }
  for (const c of ["ORB-PU", "ORB-ESP", "ORB-CC26", "ORB-CC14"]) {
    check(`${c} é reconhecido como material de apoio`, isSupportSku(c));
  }
  const s = findPlateShortages([
    { code: "ORB-PU", requested: 30 },   // estoque 2
    { code: "ORB-ESP", requested: 15 },  // estoque 1
    { code: "ORB-CC26", requested: 4 },  // estoque 0
  ], STOCK);
  check("nenhum material gera aviso, mesmo faltando muito", s.length === 0, JSON.stringify(s));
}

console.log("\n── Validação por modelo ──");
{
  const s = findPlateShortages([
    { code: "ORB-003", name: "Bege Travertino", requested: 12 }, // 8 → falta 4
    { code: "ORB-001", name: "Terracota", requested: 10 },       // 50 → ok
    { code: "ORB-010", name: "Carvalho", requested: 2 },         // 0 → falta 2
  ], STOCK);
  check("só os modelos sem estoque aparecem", s.length === 2, JSON.stringify(s.map((x) => x.code)));
  check("o modelo com estoque suficiente não é citado", !s.some((x) => x.code === "ORB-001"));
  check("ordenado pela maior falta primeiro", s[0].missing >= s[1].missing);
  check("estoque zero é tratado", s.find((x) => x.code === "ORB-010")?.available === 0);
}

console.log("\n── Mesmo modelo em vários ambientes ──");
{
  // Sala 6 + Quarto 6 = 12 do mesmo modelo, contra 8 em estoque.
  const s = findPlateShortages([
    { code: "ORB-003", name: "Bege Travertino", requested: 6 },
    { code: "ORB-003", name: "Bege Travertino", requested: 6 },
  ], STOCK);
  check("as quantidades são somadas antes de comparar", s.length === 1 && s[0].requested === 12,
    JSON.stringify(s));
  check("faltam 4, não 0", s[0]?.missing === 4);

  // Dois ambientes que somados ainda cabem.
  const ok = findPlateShortages([
    { code: "ORB-003", requested: 4 },
    { code: "ORB-003", requested: 4 },
  ], STOCK);
  check("8 pedidas com 8 em estoque → sem aviso", ok.length === 0, JSON.stringify(ok));
}

console.log("\n── Casos-limite ──");
{
  check("exatamente o estoque não avisa", findPlateShortages([{ code: "ORB-003", requested: 8 }], STOCK).length === 0);
  check("uma acima do estoque avisa", findPlateShortages([{ code: "ORB-003", requested: 9 }], STOCK).length === 1);
  check("modelo sem disponibilidade conhecida não inventa falta",
    findPlateShortages([{ code: "ORB-999", requested: 99 }], STOCK).length === 0);
  check("quantidade zero é ignorada", findPlateShortages([{ code: "ORB-003", requested: 0 }], STOCK).length === 0);
  check("quantidade negativa é ignorada", findPlateShortages([{ code: "ORB-003", requested: -5 }], STOCK).length === 0);
  check("código vazio é ignorado", findPlateShortages([{ code: "", requested: 5 }], STOCK).length === 0);
  check("lista vazia não quebra", findPlateShortages([], STOCK).length === 0);
  check("código em minúscula é reconhecido",
    findPlateShortages([{ code: "orb-003", requested: 12 }], STOCK).length === 1);
  check("nome cai para o código quando ausente",
    findPlateShortages([{ code: "ORB-003", requested: 12 }], STOCK)[0].name === "ORB-003");
  check("singular na mensagem quando resta 1 placa",
    shortageMessage({ code: "X", name: "X", requested: 5, available: 1, missing: 4 }).includes("1 placa disponível"));
}

console.log(`\n${fail === 0 ? "✅" : "❌"}  ${pass} passaram, ${fail} falharam\n`);
process.exit(fail === 0 ? 0 : 1);
