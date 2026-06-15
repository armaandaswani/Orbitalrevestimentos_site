-- Migration 017: Operational module — `pedidos` (orders / production tracking)
--
-- Where the CRM ends, production begins. A lead/orçamento that is *won* turns
-- into a real order to manufacture, finish and deliver. The CRM `leads.status`
-- pipeline stops at `ganho`; this table tracks what happens AFTER the sale:
-- the slab is cut, polished, the client is scheduled, the order is delivered.
--
-- One row per order. Linked back to the originating lead (nullable, SET NULL so
-- deleting a lead never deletes its order history) plus denormalized client and
-- product fields so the Pedidos tab lists fast without joins and survives the
-- source lead being edited or removed.
--
-- `status` is the production/fulfillment lifecycle, independent of the CRM
-- pipeline:
--   em_producao = being cut / finished in the workshop (default on creation)
--   pronto      = finished, ready for pickup or delivery
--   entregue    = delivered / installed — the order is closed
--   cancelado   = order cancelled after creation
--
-- `payment_status` tracks money in a coarse way (the dedicated Financeiro module
-- comes later); kept here so the workshop can see paid vs. pending at a glance.

CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- link to the originating CRM lead (nullable)
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- denormalized client snapshot (so the list never needs a join)
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  partner_name TEXT,

  -- what is being produced
  space TEXT,
  product_name TEXT,
  area_m2 NUMERIC,
  total NUMERIC,

  -- production / fulfillment lifecycle
  status TEXT NOT NULL DEFAULT 'em_producao'
    CHECK (status IN ('em_producao', 'pronto', 'entregue', 'cancelado')),

  -- coarse money tracking (the full Financeiro module lands later)
  payment_status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (payment_status IN ('pendente', 'parcial', 'pago')),

  notes TEXT,
  expected_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_lead_id ON pedidos (lead_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos (status);
CREATE INDEX IF NOT EXISTS idx_pedidos_payment_status ON pedidos (payment_status);
CREATE INDEX IF NOT EXISTS idx_pedidos_expected_delivery_at ON pedidos (expected_delivery_at);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos (created_at DESC);
