-- Order commissions had amounts (partner_commission_amount, sales_rep_commission_amount)
-- but no way to track whether they'd been paid, unlike coupon_uses which already has
-- partner_commission_paid_at / rep_commission_paid_at. This closes that gap so both
-- commission sources can be tracked and paid out from one unified view.
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS partner_commission_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS sales_rep_commission_paid_at timestamptz;
