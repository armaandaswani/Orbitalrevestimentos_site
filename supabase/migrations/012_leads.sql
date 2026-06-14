-- Migration 012: CRM — unified `leads` table
--
-- One row per prospect/client across every channel. Inbound website orçamentos
-- (client_email_sequences) and partner coupon uses (coupon_uses) auto-ingest into
-- this table via src/lib/leads.ts (non-fatal upsert, deduped by lowercased email);
-- leads can also be created by hand from the admin Leads/CRM tab.
--
-- `source` answers "who is coming from outside vs. through a partner":
--   website = inbound public simulador (no coupon)
--   partner = referred via a partner coupon / recorded in a partner portal
--   manual  = added by hand in the admin
--
-- `status` is the CRM pipeline stage (independent of the orçamento sale_status).
-- Reminder fields (next_reminder_at / reminder_note) power the in-app + email
-- reminder system; the freeform notes timeline lives in `lead_notes` (later migration).

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- contact
  name TEXT NOT NULL,
  email TEXT,            -- stored lowercased for dedup
  phone TEXT,

  -- segmentation
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('website', 'partner', 'manual')),
  status TEXT NOT NULL DEFAULT 'novo'
    CHECK (status IN ('novo', 'contatado', 'em_negociacao', 'orcamento', 'ganho', 'perdido')),

  -- partner attribution (when source = 'partner')
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  partner_name TEXT,

  -- links to the originating records (nullable; SET NULL so deleting a source
  -- record never deletes the lead)
  coupon_use_id UUID REFERENCES coupon_uses(id) ON DELETE SET NULL,
  client_email_sequence_id UUID REFERENCES client_email_sequences(id) ON DELETE SET NULL,

  -- opportunity snapshot (denormalized for quick listing)
  space TEXT,
  product_name TEXT,
  estimated_value NUMERIC,

  -- CRM workflow
  next_reminder_at TIMESTAMPTZ,
  reminder_note TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (lower(email));
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads (source);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_next_reminder_at ON leads (next_reminder_at);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
