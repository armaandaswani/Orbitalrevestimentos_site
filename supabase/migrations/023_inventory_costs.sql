-- Migration 023: Inventory ledger, order line items, costs & fixed costs
--
-- Adds the operational backbone for stock control + profit:
--   • products gain cost_price + stock counters (on_hand / reserved / reorder).
--   • stock_movements is an append-only ledger — the source of truth for every
--     stock change; the counters on products are its running sums. Because every
--     change is a row (with which order caused it), cancellations can be fully
--     backtracked.
--   • pedido_items give an order structured line items (model + plate qty) so
--     stock can auto-deduct and per-order profit can be computed. The existing
--     denormalized pedidos.product_name/total stay untouched for back-compat.
--   • pedidos.stock_state records which stock effect has been applied, so order
--     status changes are idempotent (never reserve/consume twice).
--   • fixed_costs holds recurring overhead, prorated into any range by the
--     Financeiro view.
--
-- All additive: existing products / pedidos / orçamento flows keep working.

-- 1) Product cost + stock counters ───────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price     NUMERIC,
  ADD COLUMN IF NOT EXISTS stock_on_hand  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_reserved INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_point  INTEGER NOT NULL DEFAULT 0;

-- 2) Append-only stock ledger ────────────────────────────────────────────────
-- kind semantics (qty stored as signed deltas so the row is self-describing):
--   manual_in  +on_hand            restock / correction up
--   manual_out -on_hand            manual removal / loss
--   adjust     ±on_hand            set-to-count correction
--   reserve    +reserved           order placed (held, not yet shipped)
--   release    -reserved           reservation cancelled before delivery
--   consume    -reserved -on_hand  order delivered (reservation fulfilled)
--   return     +on_hand            delivered order cancelled (stock comes back)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  pedido_id  UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('manual_in','manual_out','adjust','reserve','release','consume','return')),
  on_hand_delta  INTEGER NOT NULL DEFAULT 0,
  reserved_delta INTEGER NOT NULL DEFAULT 0,
  reason     TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_pedido  ON stock_movements (pedido_id);
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- 3) Order line items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedido_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id    UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,             -- snapshot, survives product edits/deletes
  plates       INTEGER NOT NULL DEFAULT 0,
  unit_cost    NUMERIC,          -- cost_price snapshot at order time
  unit_price   NUMERIC,          -- sale price snapshot at order time
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items (pedido_id);
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;

-- 4) Per-order extra costs + applied stock phase ─────────────────────────────
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS other_costs JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS stock_state TEXT NOT NULL DEFAULT 'none'
    CHECK (stock_state IN ('none','reserved','consumed','returned','released'));

-- 5) Recurring fixed costs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fixed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name    TEXT NOT NULL,
  amount  NUMERIC NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('daily','weekly','monthly')),
  active  BOOLEAN NOT NULL DEFAULT true,
  started_at DATE,
  ended_at   DATE,
  notes   TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE fixed_costs ENABLE ROW LEVEL SECURITY;
