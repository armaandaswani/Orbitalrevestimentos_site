// Stock ledger core — the single place that mutates inventory.
//
// Every change is recorded as a row in stock_movements (the audit trail) AND
// reflected in the cached counters on products (stock_on_hand / stock_reserved)
// so reads stay fast. Because the ledger is append-only and each row carries the
// order that caused it, any effect can be reversed (the cancel-after-delivery
// "return" is just another movement).
//
// Concurrency: admin-only, very low write volume, so a read-modify-write on the
// counters is acceptable. The ledger row is the source of truth either way.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumn } from "@/lib/db-compat";

export type MovementKind =
  | "manual_in"
  | "manual_out"
  | "adjust"
  | "reserve"
  | "release"
  | "consume"
  | "return";

export type ManualExitType = "sale" | "loss" | "sample" | "internal";

export interface MovementResult {
  ok: boolean;
  error?: string;
  on_hand?: number;
  reserved?: number;
}

// Translate a kind + positive quantity into signed counter deltas. `adjust` is
// special: the caller passes the already-signed delta (target − current).
export function deltasForKind(kind: MovementKind, qty: number): { onHand: number; reserved: number } {
  switch (kind) {
    case "manual_in":
    case "return":
      return { onHand: qty, reserved: 0 };
    case "manual_out":
      return { onHand: -qty, reserved: 0 };
    case "reserve":
      return { onHand: 0, reserved: qty };
    case "release":
      return { onHand: 0, reserved: -qty };
    case "consume":
      return { onHand: -qty, reserved: -qty };
    case "adjust":
      return { onHand: qty, reserved: 0 }; // qty already signed
    default:
      return { onHand: 0, reserved: 0 };
  }
}

/**
 * Apply a stock movement: write the ledger row and update the product counters.
 * Counters are floored at 0 so a bad sequence can never show negative stock.
 */
export async function applyStockMovement(
  db: SupabaseClient,
  params: {
    productId: string;
    kind: MovementKind;
    onHandDelta: number;
    reservedDelta: number;
    pedidoId?: string | null;
    reason?: string | null;
    createdBy?: string | null;
    manualExitType?: ManualExitType | null;
    saleAmount?: number | null;
  }
): Promise<MovementResult> {
  const { productId, kind, onHandDelta, reservedDelta, pedidoId, reason, createdBy, manualExitType, saleAmount } = params;

  const { data: prod, error: readErr } = await db
    .from("products")
    .select("stock_on_hand, stock_reserved")
    .eq("id", productId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!prod) return { ok: false, error: "Produto não encontrado." };

  const nextOnHand = Math.max(0, (prod.stock_on_hand ?? 0) + onHandDelta);
  const nextReserved = Math.max(0, (prod.stock_reserved ?? 0) + reservedDelta);

  const ledgerPayload: Record<string, unknown> = {
    product_id: productId,
    pedido_id: pedidoId ?? null,
    kind,
    on_hand_delta: onHandDelta,
    reserved_delta: reservedDelta,
    reason: reason ?? null,
    created_by: createdBy ?? null,
  };
  if (manualExitType) ledgerPayload.manual_exit_type = manualExitType;
  if (saleAmount != null) ledgerPayload.sale_amount = saleAmount;

  let { error: ledgerErr } = await db.from("stock_movements").insert(ledgerPayload);
  if (ledgerErr && isMissingColumn(ledgerErr)) {
    delete ledgerPayload.manual_exit_type;
    delete ledgerPayload.sale_amount;
    ({ error: ledgerErr } = await db.from("stock_movements").insert(ledgerPayload));
  }
  if (ledgerErr) return { ok: false, error: ledgerErr.message };

  const { error: updErr } = await db
    .from("products")
    .update({ stock_on_hand: nextOnHand, stock_reserved: nextReserved })
    .eq("id", productId);
  if (updErr) return { ok: false, error: updErr.message };

  return { ok: true, on_hand: nextOnHand, reserved: nextReserved };
}

/**
 * REGRA DO ESTOQUE (decisão do dono, out/2026): a saída vem SÓ de pedidos, e um
 * pedido só baixa as placas quando a venda está firmada:
 *   - pagamento "pago", "boleto" ou "parcial" (sinal recebido), ou
 *   - status "entregue" (saiu, mesmo sem pagamento registrado).
 * Pedido cancelado nunca baixa; se já tinha baixado, as placas voltam. Se o
 * pagamento volta para "pendente" num pedido não entregue, também volta.
 * Orçamento não mexe em estoque, e não existe mais reserva: pedido em aberto e
 * sem pagamento não tira placa de ninguém (aparece só como "aguardando
 * pagamento", para informação).
 */
export const PAGAMENTOS_QUE_BAIXAM = ["pago", "boleto", "parcial"] as const;

export function pedidoBaixaEstoque(status: string | null | undefined, paymentStatus: string | null | undefined): boolean {
  if (status === "cancelado") return false;
  if (status === "entregue") return true;
  return (PAGAMENTOS_QUE_BAIXAM as readonly string[]).includes(paymentStatus ?? "");
}

/** "reserved" é legado (antes da regra nova); "released"/"returned" = não baixado. */
function estadoNormalizado(state: string | null | undefined): "none" | "reserved" | "consumed" {
  if (state === "consumed") return "consumed";
  if (state === "reserved") return "reserved";
  return "none";
}

/**
 * Deixa o estoque de UM pedido de acordo com a regra acima, de forma idempotente:
 * baixa o que falta baixar, devolve o que não devia estar baixado e solta
 * reservas antigas. Chamada sempre que o pedido nasce, muda de status ou de
 * pagamento, ou tem os itens trocados. Devolve o stock_state gravado.
 */
export async function syncOrderStock(
  db: SupabaseClient,
  pedidoId: string,
  createdBy: string | null = "admin",
): Promise<{ ok: boolean; error?: string; state?: "none" | "consumed"; changed?: boolean }> {
  const { data: ped, error } = await db
    .from("pedidos")
    .select("id, status, payment_status, stock_state")
    .eq("id", pedidoId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!ped) return { ok: false, error: "Pedido não encontrado." };
  const p = ped as { status?: string; payment_status?: string; stock_state?: string };

  let atual = estadoNormalizado(p.stock_state);
  const alvo: "none" | "consumed" = pedidoBaixaEstoque(p.status, p.payment_status) ? "consumed" : "none";
  let changed = false;

  // Reserva antiga: solta antes de qualquer coisa (a regra nova não reserva).
  if (atual === "reserved") {
    const r = await transitionOrderStock(db, pedidoId, "reserved", "released", createdBy, "Reserva antiga liberada (estoque só baixa com pedido pago)");
    if (!r.ok) return { ok: false, error: r.error };
    atual = "none";
    changed = true;
  }
  if (atual !== alvo) {
    const r = alvo === "consumed"
      ? await transitionOrderStock(db, pedidoId, "none", "consumed", createdBy, motivoBaixa(p.status, p.payment_status))
      : await transitionOrderStock(db, pedidoId, "consumed", "returned", createdBy,
          p.status === "cancelado" ? "Estorno: pedido cancelado" : "Estorno: pedido sem pagamento confirmado");
    if (!r.ok) return { ok: false, error: r.error };
    changed = true;
  }
  if (changed || (p.stock_state ?? "none") !== alvo) {
    await db.from("pedidos").update({ stock_state: alvo }).eq("id", pedidoId);
  }
  return { ok: true, state: alvo, changed };
}

function motivoBaixa(status?: string, pagamento?: string): string {
  if (pagamento === "pago") return "Baixa: pedido pago";
  if (pagamento === "boleto") return "Baixa: pedido no boleto";
  if (pagamento === "parcial") return "Baixa: pedido com pagamento parcial";
  if (status === "entregue") return "Baixa: pedido entregue";
  return "Baixa: pedido";
}

/**
 * Placas por produto em pedidos AINDA SEM baixa (abertos, sem pagamento
 * confirmado). Só informação para o painel — não sai do disponível.
 */
export async function aguardandoPagamentoPorProduto(
  db: SupabaseClient
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    const { data: pedidos } = await db
      .from("pedidos")
      .select("id, status, payment_status")
      .not("status", "in", "(cancelado,entregue)");
    const ids = ((pedidos ?? []) as Array<{ id: string; status: string; payment_status: string }>)
      .filter((p) => !pedidoBaixaEstoque(p.status, p.payment_status))
      .map((p) => p.id);
    if (ids.length === 0) return out;
    const { data: items } = await db.from("pedido_items").select("product_id, plates").in("pedido_id", ids);
    for (const it of (items ?? []) as Array<{ product_id: string | null; plates: number | null }>) {
      if (!it.product_id) continue;
      const qty = Number(it.plates) || 0;
      if (qty > 0) out[it.product_id] = (out[it.product_id] ?? 0) + qty;
    }
  } catch {
    // Tabela ausente / DB indisponível → nada aguardando.
  }
  return out;
}

/**
 * Move an order's reserved/consumed stock from one phase to another, idempotently,
 * based on the order's current stock_state and its line items. Returns the new
 * stock_state to persist on the pedido (or null when nothing changed).
 *
 *   target "reserved"  → reserve plates for each item (from 'none')
 *   target "consumed"  → fulfil the reservation (physical leaves)
 *   target "released"  → cancel a reservation that was never delivered
 *   target "returned"  → put a delivered order's plates back on the shelf
 */
export async function transitionOrderStock(
  db: SupabaseClient,
  pedidoId: string,
  currentState: string,
  target: "reserved" | "consumed" | "released" | "returned",
  createdBy?: string | null,
  reason?: string
): Promise<{ ok: boolean; error?: string; newState?: string }> {
  // No-ops / illegal repeats.
  if (currentState === target) return { ok: true, newState: currentState };

  const { data: items, error: itemsErr } = await db
    .from("pedido_items")
    .select("product_id, plates")
    .eq("pedido_id", pedidoId);
  if (itemsErr) return { ok: false, error: itemsErr.message };
  const lines = (items ?? []).filter((i) => i.product_id && (i.plates ?? 0) > 0) as Array<{ product_id: string; plates: number }>;

  for (const line of lines) {
    let kind: MovementKind | null = null;
    let onHand = 0;
    let reserved = 0;
    if (target === "reserved" && currentState === "none") {
      kind = "reserve"; reserved = line.plates;
    } else if (target === "consumed" && currentState === "reserved") {
      kind = "consume"; onHand = -line.plates; reserved = -line.plates;
    } else if (target === "consumed" && currentState === "none") {
      // delivered without a prior reservation — just take it off the shelf
      kind = "consume"; onHand = -line.plates; reserved = 0;
    } else if (target === "released" && currentState === "reserved") {
      kind = "release"; reserved = -line.plates;
    } else if (target === "returned" && currentState === "consumed") {
      kind = "return"; onHand = line.plates;
    }
    if (!kind) continue;
    const r = await applyStockMovement(db, {
      productId: line.product_id, kind, onHandDelta: onHand, reservedDelta: reserved,
      pedidoId, reason: reason ?? `Pedido ${target}`, createdBy,
    });
    if (!r.ok) return { ok: false, error: r.error };
  }

  return { ok: true, newState: target };
}
