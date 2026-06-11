-- Migration 010: allow coupon_uses.partner_id to be NULL
-- Sales reps can now make direct sales (no partner involved). Those rows are
-- attributed to the rep via sales_rep_referral_code + a coupon_use_commissions
-- row, and have no partner_id. Safe to run regardless of current schema state.

ALTER TABLE coupon_uses
  ALTER COLUMN partner_id DROP NOT NULL;
