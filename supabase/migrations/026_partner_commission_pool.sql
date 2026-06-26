-- Migration 026: partner commission pool
--
-- The admin makes a total % of the sale available to a partner
-- (commission_pool_pct, e.g. 7). The partner then splits that pool between a
-- client discount (discount_value) and their own commission (commission_value),
-- with the constraint discount + commission <= pool. Both existing value columns
-- keep driving the math (discount → client price, commission → partner payout);
-- the pool is the editable cap.
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS commission_pool_pct NUMERIC;
