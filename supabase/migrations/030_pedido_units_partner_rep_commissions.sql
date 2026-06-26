-- Migration 030: order units + partner/rep attribution on pedidos
--
-- Products are not always sold as "placas" (ex: Cola PU is sold by unit/tube).
-- Pedidos also need explicit partner/representative attribution so their
-- portals and commissions reflect admin-created orders, not only simulator
-- coupon uses.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sale_unit TEXT NOT NULL DEFAULT 'placa';

ALTER TABLE pedido_items
  ADD COLUMN IF NOT EXISTS unit_label TEXT NOT NULL DEFAULT 'placa';

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sales_rep_id UUID REFERENCES sales_reps(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_commission_pct NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partner_commission_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_rep_commission_pct NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_rep_commission_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_use_id UUID REFERENCES coupon_uses(id) ON DELETE SET NULL;

ALTER TABLE coupon_uses
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_uses_source_pedido
  ON coupon_uses (source_pedido_id)
  WHERE source_pedido_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_partner_id ON pedidos (partner_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_sales_rep_id ON pedidos (sales_rep_id);

CREATE TABLE IF NOT EXISTS coupon_use_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_use_id UUID NOT NULL REFERENCES coupon_uses(id) ON DELETE CASCADE,
  sales_rep_id UUID REFERENCES sales_reps(id) ON DELETE SET NULL,
  sales_rep_referral_code TEXT,
  commission_owed NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_use_commissions_use_rep
  ON coupon_use_commissions (coupon_use_id, sales_rep_id)
  WHERE sales_rep_id IS NOT NULL;
