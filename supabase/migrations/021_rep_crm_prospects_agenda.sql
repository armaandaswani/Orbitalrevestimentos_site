-- Migration 021: Rep CRM v2 — inline prospects + agenda integration
--
-- 1) Prospects: a rep can now track someone who is NOT yet a registered
--    partner (no account / coupon). partner_id becomes nullable and the row
--    carries free-text prospect_* fields instead. When the prospect later
--    signs up as a real partner, set partner_id and the prospect_* fields are
--    ignored. The UNIQUE(sales_rep_id, partner_id) still holds — Postgres
--    treats NULL partner_id as distinct, so multiple prospects per rep are ok.
--
-- 2) Agenda integration: a meeting can be tied to a CRM relationship (partner
--    OR prospect) via crm_id, and we stamp invitees_notified_at once the
--    email / WhatsApp invites have gone out (dedup guard).

ALTER TABLE rep_partner_crm
  ALTER COLUMN partner_id DROP NOT NULL;

ALTER TABLE rep_partner_crm
  ADD COLUMN IF NOT EXISTS prospect_name       TEXT,
  ADD COLUMN IF NOT EXISTS prospect_phone      TEXT,
  ADD COLUMN IF NOT EXISTS prospect_email      TEXT,
  ADD COLUMN IF NOT EXISTS prospect_profession TEXT;

ALTER TABLE rep_meetings
  ADD COLUMN IF NOT EXISTS crm_id               UUID REFERENCES rep_partner_crm(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invitees_notified_at TIMESTAMPTZ;
