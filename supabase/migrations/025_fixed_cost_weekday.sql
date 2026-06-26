-- Migration 025: weekly fixed costs land on a specific weekday
--
-- A weekly fixed cost is charged in FULL on each occurrence of a chosen weekday
-- within the period (e.g. "toda quarta R$X" → counts every Wednesday in range),
-- not prorated by days. `weekday` uses JS getDay(): 0=domingo … 6=sábado.
ALTER TABLE fixed_costs
  ADD COLUMN IF NOT EXISTS weekday SMALLINT;
