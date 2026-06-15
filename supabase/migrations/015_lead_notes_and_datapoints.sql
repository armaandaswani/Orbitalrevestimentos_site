-- Migration 015: CRM Phase 2 — activity timeline, custom data points, AI summary
--
-- Builds on migration 012 (`leads`). Three additions:
--
--   lead_notes        the freeform activity timeline promised in 012's header.
--                     One row per logged interaction (call, message, meeting,
--                     manual note, or system event). Ordered newest-first in the
--                     admin Lead drawer.
--
--   lead_data_points  arbitrary key/value attributes the team wants to track per
--                     lead beyond the fixed columns (e.g. "Metragem", "Arquiteto",
--                     "Prazo de obra"). Unique per (lead, label) so editing the
--                     same label updates in place.
--
--   leads.ai_summary  cached output of the "AI assist" action so we don't re-call
--                     the LLM on every drawer open. Refreshed on demand.

-- ── Activity timeline ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- what kind of timeline entry this is
  kind TEXT NOT NULL DEFAULT 'note'
    CHECK (kind IN ('note', 'call', 'message', 'meeting', 'email', 'system', 'ai')),

  body TEXT NOT NULL,
  author TEXT,            -- who logged it (admin name / 'sistema' / 'ia')

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes (lead_id, created_at DESC);

-- ── Custom data points ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_data_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  label TEXT NOT NULL,
  value TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (lead_id, label)
);

CREATE INDEX IF NOT EXISTS idx_lead_data_points_lead_id ON lead_data_points (lead_id);

-- ── Cached AI summary on the lead itself ───────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_summary_at TIMESTAMPTZ;
