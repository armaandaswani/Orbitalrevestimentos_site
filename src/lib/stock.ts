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
 * Status de pedido que SEGURAM placas.
 *
 * "entregue" fica de fora de propósito: a saída física já baixou o estoque, e
 * contar como reserva também descontaria a mesma placa duas vezes. "cancelado"
 * também não segura nada.
 */
export const ACTIVE_ORDER_STATUSES = ["em_producao", "pronto"] as const;

/**
 * Placas reservadas por produto, DERIVADAS dos pedidos ativos.
 *
 * O contador products.stock_reserved é um cache alimentado pelo ledger, e ele
 * deriva: uma reserva sem release correspondente (pedido excluído, item editado
 * depois de reservado) fica presa para sempre e some da disponibilidade sem que
 * ninguém veja. Orçamento nenhum entra aqui — orçamento não reserva.
 *
 * Esta é a definição que vale para "disponível": estoque físico − isto.
 */
export async function reservedByActiveOrders(
  db: SupabaseClient
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    const { data: pedidos } = await db
      .from("pedidos")
      .select("id")
      .in("status", ACTIVE_ORDER_STATUSES as unknown as string[]);
    const ids = (pedidos ?? []).map((p) => (p as { id: string }).id);
    if (ids.length === 0) return out;

    const { data: items } = await db
      .from("pedido_items")
      .select("product_id, plates")
      .in("pedido_id", ids);

    for (const it of (items ?? []) as Array<{ product_id: string | null; plates: number | null }>) {
      if (!it.product_id) continue;
      const qty = Number(it.plates) || 0;
      if (qty <= 0) continue;
      out[it.product_id] = (out[it.product_id] ?? 0) + qty;
    }
  } catch {
    // Tabela ausente / DB indisponível → sem reservas conhecidas. O chamador cai
    // no contador, que é o comportamento anterior.
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
  createdBy?: string | null
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
      pedidoId, reason: `Pedido ${target}`, createdBy,
    });
    if (!r.ok) return { ok: false, error: r.error };
  }

  return { ok: true, newState: target };
}
