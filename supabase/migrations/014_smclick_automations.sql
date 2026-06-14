-- Migration 014: SM Click automations
--
-- Adds the plumbing for four new WhatsApp automations:
--   * leads.last_contacted_at — last outbound/inbound WhatsApp touch, surfaced
--     in the CRM as "Último contato" (Feature 7: conversation context).
--   * simulador_sessions     — partial simulador captures (phone entered but
--     not yet submitted) so an hourly cron can nudge people who abandoned the
--     flow (Feature 6: abandoned-simulador recovery).
--
-- Features 1 (instant orçamento WhatsApp), 4 (owner high-value alert) and 5
-- (status-change automations) need no schema — they reuse existing columns.

-- ── Feature 7: last contact timestamp ────────────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_leads_last_contacted_at ON leads (last_contacted_at DESC);

-- ── Feature 6: abandoned simulador sessions ──────────────────────────────────
-- `id` is generated client-side (crypto.randomUUID) so the same browser session
-- upserts the same row as the user fills more fields. `completed` flips to true
-- the moment the full orçamento is submitted, excluding the row from the nudge.
CREATE TABLE IF NOT EXISTS simulador_sessions (
  id UUID PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  space TEXT,
  product_name TEXT,
  estimated_total NUMERIC,
  completed BOOLEAN NOT NULL DEFAULT false,
  nudged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- The recovery cron scans for incomplete, un-nudged, recent sessions.
CREATE INDEX IF NOT EXISTS idx_simulador_sessions_recovery
  ON simulador_sessions (completed, nudged_at, created_at);
CREATE INDEX IF NOT EXISTS idx_simulador_sessions_phone ON simulador_sessions (phone);
