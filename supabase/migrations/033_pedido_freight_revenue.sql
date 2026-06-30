-- Migration 033: per-order "freight is revenue" flag
--
-- Freight is pass-through by default (excluded from profit). When the admin
-- marks a specific order's freight as revenue, the Financeiro adds it to that
-- order's revenue/margin. (Per-order expenses already live in pedidos.other_costs
-- from migration 023.)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS freight_is_revenue BOOLEAN NOT NULL DEFAULT false;
