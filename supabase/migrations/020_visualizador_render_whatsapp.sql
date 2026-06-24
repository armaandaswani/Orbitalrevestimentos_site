-- Migration 020: Visualizador renders — lead contact + WhatsApp delivery
--
-- The save-render endpoint already writes name/phone onto visualizador_renders
-- (added ad-hoc in production); declare them here so the schema is consistent.
-- Adds `summary` (the human description of what the client visualized, used as
-- the WhatsApp caption) and `whatsapp_sent_at` (dedup guard so we send the
-- render to the client exactly once, even if save-render is called again on a
-- "Gerar novamente").

ALTER TABLE visualizador_renders
  ADD COLUMN IF NOT EXISTS name             TEXT,
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS summary          TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;
