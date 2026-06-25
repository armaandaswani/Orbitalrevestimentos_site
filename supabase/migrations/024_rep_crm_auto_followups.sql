-- Migration 024: Rep CRM automatic follow-up messages
--
-- Keeps internal reminder/digest scheduling separate from partner-facing
-- WhatsApp automation. A rep must explicitly enable the automatic message
-- and can provide the exact text that will be sent through SM Click.

ALTER TABLE rep_partner_crm
  ADD COLUMN IF NOT EXISTS auto_followup_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_followup_message TEXT,
  ADD COLUMN IF NOT EXISTS auto_followup_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_rep_partner_crm_auto_followup
  ON rep_partner_crm (auto_followup_enabled, next_reminder_at);
