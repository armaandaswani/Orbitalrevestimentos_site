/**
 * Verificação do cálculo de materiais de instalação.
 *
 *   node scripts/verify-orcamento-materials.ts
 *
 * Roda TODOS os exemplos numéricos da especificação, mais os casos-limite que
 * ela não cita mas que quebram na prática (ponto flutuante, empate de preço,
 * embalagem sem preço, zero placas).
 */
import {
  DEFAULT_MATERIALS_CONFIG as CFG,
  adhesiveLitersFor,
  checkMaterialStock,
  chooseAdhesivePackages,
  foamTubesFor,
  planMaterials,
  pu40TubesFor,
} from "../src/lib/orcamento-materials.ts";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

// Preços de exemplo: 14 L mais barato por litro que o 2,6 L (o normal).
const PRICES = { "ORB-CC26": 90, "ORB-CC14": 380, "ORB-ESP": 45, "ORB-PU": 30 };
const P26 = CFG.adhesivePackages;

console.log("\n── §2 PU-40: 1,5 tubo por placa (exemplos do spec) ──");
for (const [panels, expected] of [[1, 2], [2, 3], [3, 5], [4, 6], [10, 15]] as [number, number][]) {
  check(`${panels} placa(s) → ${expected} tubos`, pu40TubesFor(panels) === expected, String(pu40TubesFor(panels)));
}

console.log("\n── §6 Espuma expansiva: 0,75 tubo por placa (exemplos do spec) ──");
for (const [panels, expected] of [[1, 1], [2, 2], [3, 3], [4, 3], [5, 4], [8, 6], [10, 8], [20, 15]] as [number, number][]) {
  check(`${panels} placa(s) → ${expected} tubos`, foamTubesFor(panels) === expected, String(foamTubesFor(panels)));
}

console.log("\n── §4 Volume de cola: 0,25 L por placa ──");
for (const [panels, expected] of [[1, 0.25], [10, 2.5], [11, 2.75], [20, 5], [56, 14], [57, 14.25]] as [number, number][]) {
  check(`${panels} placa(s) → ${expected} L`, adhesiveLitersFor(panels) === expected, String(adhesiveLitersFor(panels)));
}

console.log("\n── §5 Escolha das embalagens (exemplos do spec) ──");
{
  const p1 = chooseAdhesivePackages(0.25, P26, PRICES);
  check("1 placa (0,25 L) → 1× 2,6 L",
    p1.packages.length === 1 && p1.packages[0].code === "ORB-CC26" && p1.packages[0].quantity === 1,
    JSON.stringify(p1.packages));

  const p10 = chooseAdhesivePackages(2.5, P26, PRICES);
  check("10 placas (2,5 L) → 1× 2,6 L",
    p10.packages.length === 1 && p10.packages[0].quantity === 1 && p10.packages[0].code === "ORB-CC26",
    JSON.stringify(p10.packages));

  const p11 = chooseAdhesivePackages(2.75, P26, PRICES);
  check("11 placas (2,75 L) → nunca menos que o necessário", p11.suppliedLiters >= 2.75, `${p11.suppliedLiters} L`);
  check("11 placas → 2× 2,6 L (mais barato que o 14 L a este preço)",
    p11.packages.length === 1 && p11.packages[0].code === "ORB-CC26" && p11.packages[0].quantity === 2,
    JSON.stringify(p11.packages));

  const p20 = chooseAdhesivePackages(5, P26, PRICES);
  check("20 placas (5 L) → 2× 2,6 L = 5,2 L", p20.suppliedLiters === 5.2 && p20.packages[0].quantity === 2,
    `${p20.suppliedLiters} L ${JSON.stringify(p20.packages)}`);

  const p56 = chooseAdhesivePackages(14, P26, PRICES);
  check("56 placas (14 L) → 1× 14 L",
    p56.packages.length === 1 && p56.packages[0].code === "ORB-CC14" && p56.packages[0].quantity === 1,
    JSON.stringify(p56.packages));

  const p57 = chooseAdhesivePackages(14.25, P26, PRICES);
  check("57 placas (14,25 L) → cobre o volume", p57.suppliedLiters >= 14.25, `${p57.suppliedLiters} L`);
  check("57 placas → 1× 14 L + 1× 2,6 L = 16,6 L",
    p57.suppliedLiters === 16.6 && p57.packages.length === 2,
    `${p57.suppliedLiters} L ${JSON.stringify(p57.packages)}`);
}

console.log("\n── §5 Prioridades da escolha ──");
{
  // Nunca menos que o necessário, em toda a faixa.
  let short = 0;
  for (let n = 1; n <= 400; n++) {
    const need = adhesiveLitersFor(n);
    const plan = chooseAdhesivePackages(need, P26, PRICES);
    if (plan.suppliedLiters + 1e-9 < need) short++;
  }
  check("1…400 placas: nunca entrega cola a menos", short === 0, `${short} casos`);

  // Preço manda: se o 2,6 L ficar caríssimo, 14 L vence mesmo com sobra enorme.
  const caro = chooseAdhesivePackages(2.75, P26, { "ORB-CC26": 500, "ORB-CC14": 380 });
  check("2,6 L caro → escolhe 1× 14 L (menor preço vence a sobra)",
    caro.packages.length === 1 && caro.packages[0].code === "ORB-CC14",
    JSON.stringify(caro.packages));

  // Sem preço → decide pela menor sobra.
  const semPreco = chooseAdhesivePackages(2.75, P26, {});
  check("sem preço → menor sobra (2× 2,6 L = 5,2 L, não 14 L)",
    semPreco.packages[0].code === "ORB-CC26" && semPreco.packages[0].quantity === 2,
    JSON.stringify(semPreco.packages));
  check("sem preço → sinaliza pricesKnown=false", semPreco.pricesKnown === false);

  // Preço parcial não pode decidir.
  const parcial = chooseAdhesivePackages(2.75, P26, { "ORB-CC26": 90 });
  check("preço parcial → não usa preço para decidir", parcial.pricesKnown === false);

  // Empate de preço → menor sobra.
  const empate = chooseAdhesivePackages(5, P26, { "ORB-CC26": 100, "ORB-CC14": 200 });
  check("empate de preço (2×100 = 1×200) → menor sobra vence",
    empate.packages[0].code === "ORB-CC26" && empate.packages[0].quantity === 2,
    `${empate.suppliedLiters} L ${JSON.stringify(empate.packages)}`);
}

console.log("\n── §7 Regras por tipo de aplicação ──");
{
  const parede = planMaterials("parede", 10, PRICES);
  const codes = (p: typeof parede) => p.lines.map((l) => l.code).sort();
  check("parede → só PU-40", JSON.stringify(codes(parede)) === JSON.stringify(["ORB-PU"]), JSON.stringify(codes(parede)));
  check("parede → 15 tubos de PU-40", parede.lines[0].quantity === 15);
  check("parede → não calcula cola de contato", parede.adhesiveLiters === 0);

  for (const tipo of ["teto", "forro"] as const) {
    const p = planMaterials(tipo, 10, PRICES);
    check(`${tipo} → não inclui PU-40`, !p.lines.some((l) => l.code === "ORB-PU"), JSON.stringify(codes(p)));
    check(`${tipo} → inclui cola de contato`, p.lines.some((l) => l.code.startsWith("ORB-CC")));
    check(`${tipo} → inclui espuma`, p.lines.some((l) => l.code === "ORB-ESP"));
    check(`${tipo} → 2,5 L técnicos`, p.adhesiveLiters === 2.5, String(p.adhesiveLiters));
    check(`${tipo} → 8 tubos de espuma`, p.lines.find((l) => l.code === "ORB-ESP")?.quantity === 8);
  }
}

console.log("\n── §8 Troca de tipo não deixa resto do anterior ──");
{
  const antes = planMaterials("parede", 12, PRICES);
  const depois = planMaterials("teto", 12, PRICES);
  check("parede→teto: plano novo não tem PU-40", !depois.lines.some((l) => l.code === "ORB-PU"));
  check("teto→parede: plano novo não tem cola nem espuma",
    !antes.lines.some((l) => l.code.startsWith("ORB-CC") || l.code === "ORB-ESP"));
  check("cada linha diz qual aplicação a gerou", depois.lines.every((l) => l.reason === "teto"));
}

console.log("\n── §12 Estoque avisa sem alterar o cálculo ──");
{
  const p = planMaterials("teto", 10, PRICES);
  const foam = p.lines.find((l) => l.code === "ORB-ESP")!;
  const st = checkMaterialStock(p.lines, { "ORB-ESP": 5 });
  const row = st.find((s) => s.code === "ORB-ESP")!;
  check("exigido continua 8", row.required === 8 && foam.quantity === 8);
  check("disponível 5, faltam 3", row.available === 5 && row.missing === 3);
  check("marcado como insuficiente", row.sufficient === false);
}

console.log("\n── Casos-limite ──");
{
  check("0 placas → nenhum material", planMaterials("teto", 0, PRICES).lines.length === 0);
  check("placas negativas → nenhum material", planMaterials("parede", -5, PRICES).lines.length === 0);
  check("volume 0 → nenhuma embalagem", chooseAdhesivePackages(0, P26, PRICES).packages.length === 0);
  check("sem embalagem cadastrada → aviso, não quebra",
    planMaterials("teto", 10, PRICES, { ...CFG, adhesivePackages: [] }).warnings.length > 0);
  // Ponto flutuante: 0,25×3 e 2,6×3 não são exatos em float.
  check("3 placas (0,75 L) cobertas por 1× 2,6 L",
    chooseAdhesivePackages(adhesiveLitersFor(3), P26, PRICES).suppliedLiters === 2.6);
  check("104 placas (26 L) → cobre sem faltar",
    chooseAdhesivePackages(adhesiveLitersFor(104), P26, PRICES).suppliedLiters >= 26);
}

console.log(`\n${fail === 0 ? "✅" : "❌"}  ${pass} passaram, ${fail} falharam\n`);
process.exit(fail === 0 ? 0 : 1);
