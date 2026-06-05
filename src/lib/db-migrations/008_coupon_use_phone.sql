-- Migration 008: add client_phone + client_email to coupon_uses
-- So standalone coupon use entries always have contact info even if the
-- client_email_sequences insert fails non-fatally.

ALTER TABLE coupon_uses
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS client_email  TEXT;
