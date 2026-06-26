-- Migration 031: monthly fixed costs land on a specific day of month
--
-- Weekly fixed costs already support `weekday`; monthly costs now support a
-- chosen calendar day (1-31). If a month is shorter than the chosen day, the
-- finance engine charges the cost on that month's last day.

ALTER TABLE fixed_costs
  ADD COLUMN IF NOT EXISTS month_day SMALLINT;

UPDATE fixed_costs
SET month_day = 1
WHERE cadence = 'monthly'
  AND month_day IS NULL;

DO $$
BEGIN
  ALTER TABLE fixed_costs
    ADD CONSTRAINT fixed_costs_month_day_check
    CHECK (month_day IS NULL OR (month_day >= 1 AND month_day <= 31));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
