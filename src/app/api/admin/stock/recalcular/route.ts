import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { applyStockMovement, pedidoBaixaEstoque, syncOrderStock } from "@/lib/stock";

/**
 * Recalcular o estoque pelos pedidos (regra nova, out/2026 — lib/stock).
 *
 * GET  → prévia: o que mudaria em cada pedido (baixar, estornar, soltar
 *        reserva antiga) e os contadores de reserva antigos que vão zerar.
 * POST → aplica. Idempotente: rodar de novo não muda nada.
 *
 * Cada mudança vira uma linha no histórico de movimentações (stock_movements),
 * então nada se perde e tudo pode ser conferido produto a produto.
 */

interface PedidoRow {
  id: string; client_name: string | null; status: string | null; payment_status: string | null;
  stock_state: string | null; created_at: string | null;
}

async function plano(db: ReturnType<typeof supabaseAdmin>) {
  const { data: pedidos, error } = await db
    .from("pedidos")
    .select("id, client_name, status, payment_status, stock_state, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const ids = (pedidos ?? []).map((p) => (p as PedidoRow).id);
  const { data: itens } = ids.length
    ? await db.from("pedido_items").select("pedido_id, product_id, product_name, plates").in("pedido_id", ids)
    : { data: [] };
  const itensPor = new Map<string, Array<{ product_name: string | null; plates: number }>>();
  for (const it of (itens ?? []) as Array<{ pedido_id: string; product_id: string | null; product_name: string | null; plates: number | null }>) {
    if (!it.product_id || !(Number(it.plates) > 0)) continue;
    const l = itensPor.get(it.pedido_id) ?? [];
    l.push({ product_name: it.product_name, plates: Number(it.plates) });
    itensPor.set(it.pedido_id, l);
  }

  const mudancas = [];
  for (const p of (pedidos ?? []) as PedidoRow[]) {
    const atual = p.stock_state === "consumed" ? "consumed" : p.stock_state === "reserved" ? "reserved" : "none";
    const alvo = pedidoBaixaEstoque(p.status, p.payment_status) ? "consumed" : "none";
    if (atual === alvo) continue;
    const acao = atual === "reserved" && alvo === "none" ? "soltar_reserva"
      : alvo === "consumed" ? "baixar" : "estornar";
    mudancas.push({
      pedido_id: p.id, cliente: p.client_name, status: p.status, pagamento: p.payment_status,
      acao, itens: itensPor.get(p.id) ?? [],
    });
  }

  // Contadores de reserva antigos (products.stock_reserved) sem pedido por trás.
  const { data: prods } = await db.from("products").select("id, code, name, stock_reserved").gt("stock_reserved", 0);
  const contadores = ((prods ?? []) as Array<{ id: string; code: string; name: string; stock_reserved: number }>)
    .map((p) => ({ product_id: p.id, code: p.code, name: p.name, reservado: Number(p.stock_reserved) || 0 }));

  return { mudancas, contadores };
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await plano(supabaseAdmin()));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao calcular." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  try {
    const { mudancas } = await plano(db);
    const erros: string[] = [];
    for (const m of mudancas) {
      const r = await syncOrderStock(db, m.pedido_id, "admin:recalculo");
      if (!r.ok) erros.push(`${m.cliente ?? m.pedido_id}: ${r.error}`);
    }
    // Sobrou reserva no contador sem pedido por trás (pedido excluído antes do
    // conserto, item editado…): zera com movimento de liberação registrado.
    const { contadores } = await plano(db);
    for (const c of contadores) {
      const r = await applyStockMovement(db, {
        productId: c.product_id, kind: "release", onHandDelta: 0, reservedDelta: -c.reservado,
        reason: "Reserva antiga zerada (estoque só baixa com pedido pago)", createdBy: "admin:recalculo",
      });
      if (!r.ok) erros.push(`${c.code}: ${r.error}`);
    }
    return NextResponse.json({ ok: erros.length === 0, pedidos: mudancas.length, contadores: contadores.length, erros });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao recalcular." }, { status: 500 });
  }
}
