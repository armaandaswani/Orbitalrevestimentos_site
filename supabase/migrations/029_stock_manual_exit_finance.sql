-- Migration 029: structured manual stock exits for Financeiro
--
-- Manual stock exits used to be a free-text note only. Financeiro could not tell
-- if a manual "saida" was an off-order sale, an inventory loss, a sample, or
-- internal use. These fields make that intent explicit.

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS manual_exit_type TEXT;

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS sale_amount NUMERIC;

DO $$
BEGIN
  ALTER TABLE stock_movements
    ADD CONSTRAINT stock_movements_manual_exit_type_check
    CHECK (
      manual_exit_type IS NULL
      OR manual_exit_type IN ('sale', 'loss', 'sample', 'internal')
    );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_stock_movements_manual_exit
  ON stock_movements (manual_exit_type, created_at);
