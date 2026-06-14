-- Migration 013: SM Click (WhatsApp) integration
--
-- Adds the columns needed to two-way sync the `leads` CRM with SM Click:
--   * smclick_contact_id  — the contact id returned by SM Click after a push,
--                           so we never create duplicate contacts.
--   * smclick_synced_at   — when the lead was last pushed to SM Click.
--   * reminder_sent_at    — set by the WhatsApp reminder cron after it sends,
--                           so a single next_reminder_at fires at most once.
--
-- Also widens the `source` enum with 'whatsapp' for leads that originate from an
-- inbound WhatsApp conversation captured via the SM Click webhook.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS smclick_contact_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS smclick_synced_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Widen the source check constraint to allow inbound WhatsApp leads.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads ADD CONSTRAINT leads_source_check
  CHECK (source IN ('website', 'partner', 'manual', 'whatsapp'));

CREATE INDEX IF NOT EXISTS idx_leads_smclick_contact_id ON leads (smclick_contact_id);
