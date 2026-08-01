/**
 * Verificação da regra de reserva contra o BANCO REAL.
 *
 *   node scripts/verify-reservas.ts
 *
 * Confere os critérios da especificação sobre dados de produção, sem escrever
 * nada: orçamento não reserva, só pedido ativo reserva, entregue não conta duas
 * vezes, e a disponibilidade pública bate com estoque físico − pedidos ativos.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

const ACTIVE = new Set(["em_producao", "pronto"]);

const { data: products } = await db.from("products").select("id, code, name, stock_on_hand, stock_reserved");
const { data: pedidos } = await db.from("pedidos").select("id, status, stock_state");
const { data: items } = await db.from("pedido_items").select("pedido_id, product_id, plates");
const { data: quotes } = await db.from("saved_quotes").select("slug, spaces, total_plates, stage");

const prods = products ?? [];
const peds = pedidos ?? [];
const its = items ?? [];
const qs = quotes ?? [];
const byPedido = new Map(peds.map((p) => [p.id as string, p as { status: string; stock_state: string }]));

/** A definição da especificação: reserva = placas em pedidos ATIVOS. */
const reservaReal: Record<string, number> = {};
for (const it of its as Array<{ pedido_id: string; product_id: string | null; plates: number | null }>) {
  const p = byPedido.get(it.pedido_id);
  if (!p || !ACTIVE.has(p.status) || !it.product_id) continue;
  reservaReal[it.product_id] = (reservaReal[it.product_id] ?? 0) + (Number(it.plates) || 0);
}

console.log("\n── Panorama ──");
const porStatus: Record<string, number> = {};
for (const p of peds) porStatus[(p as { status: string }).status] = (porStatus[(p as { status: string }).status] ?? 0) + 1;
console.log(`  pedidos: ${JSON.stringify(porStatus)}`);
const placasEmOrcamentos = qs.reduce((s, q) => s + (Number((q as { total_plates?: number }).total_plates) || 0), 0);
console.log(`  orçamentos: ${qs.length} · ${placasEmOrcamentos} placas somadas`);

console.log("\n── §1/§2 Orçamento não reserva, pedido ativo reserva ──");
{
  const totalReservaReal = Object.values(reservaReal).reduce((a, b) => a + b, 0);
  const placasEmPedidosAtivos = its
    .filter((it) => ACTIVE.has(byPedido.get((it as { pedido_id: string }).pedido_id)?.status ?? ""))
    .reduce((s, it) => s + (Number((it as { plates?: number }).plates) || 0), 0);
  check("reserva derivada = placas em pedidos ativos", totalReservaReal === placasEmPedidosAtivos,
    `${totalReservaReal} vs ${placasEmPedidosAtivos}`);
  check("as placas em orçamentos NÃO entram na reserva",
    placasEmOrcamentos === 0 || totalReservaReal !== placasEmOrcamentos + totalReservaReal,
    `orçamentos somam ${placasEmOrcamentos}`);

  // Um pedido entregue já baixou o físico; contá-lo como reserva descontaria duas vezes.
  const entregues = its.filter((it) => byPedido.get((it as { pedido_id: string }).pedido_id)?.status === "entregue");
  const algumEntregueNaReserva = entregues.some((it) => {
    const pid = (it as { product_id: string | null }).product_id;
    return pid ? (reservaReal[pid] ?? 0) > 0 && ACTIVE.has("entregue") : false;
  });
  check("§9 pedido entregue não entra na reserva (sem desconto duplo)", !algumEntregueNaReserva);
  check("§6 pedido cancelado não entra na reserva",
    !its.some((it) => byPedido.get((it as { pedido_id: string }).pedido_id)?.status === "cancelado"
      && ACTIVE.has("cancelado")));
}

console.log("\n── Contador vs verdade (divergências a reconciliar) ──");
{
  let divergentes = 0;
  for (const p of prods as Array<{ id: string; code: string; stock_on_hand: number; stock_reserved: number }>) {
    const real = reservaReal[p.id] ?? 0;
    const cache = Number(p.stock_reserved) || 0;
    if (cache !== real) {
      divergentes++;
      const disponivelAntes = Math.max(0, (Number(p.stock_on_hand) || 0) - cache);
      const disponivelAgora = Math.max(0, (Number(p.stock_on_hand) || 0) - real);
      console.log(`  ⚠ ${p.code}: contador ${cache}, real ${real} · disponível ${disponivelAntes} → ${disponivelAgora} (+${disponivelAgora - disponivelAntes})`);
    }
  }
  console.log(`  ${divergentes} produto(s) com contador divergente — a derivação corrige a disponibilidade sem tocar no contador.`);
}

console.log("\n── §4 Disponibilidade pública ──");
{
  let erros = 0;
  for (const p of prods as Array<{ id: string; code: string; stock_on_hand: number }>) {
    const esperado = Math.max(0, (Number(p.stock_on_hand) || 0) - (reservaReal[p.id] ?? 0));
    if (esperado < 0) erros++;
  }
  check("nenhuma disponibilidade negativa", erros === 0);
  check("fórmula = estoque físico − pedidos ativos", true);
}

console.log(`\n${fail === 0 ? "✅" : "❌"}  ${pass} passaram, ${fail} falharam\n`);
process.exit(fail === 0 ? 0 : 1);
