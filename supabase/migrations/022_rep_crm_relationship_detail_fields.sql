-- Migration 022: Rep CRM relationship detail fields
--
-- Adds manual relationship-tracking fields that cannot be inferred reliably
-- from coupon_uses alone: how many times the partner specified Orbital,
-- whether/how many times they added Orbital to projects, and whether they
-- received the physical mostruario.

ALTER TABLE rep_partner_crm
  ADD COLUMN IF NOT EXISTS mostruario_received      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mostruario_received_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS specified_count          INT NOT NULL DEFAULT 0 CHECK (specified_count >= 0),
  ADD COLUMN IF NOT EXISTS project_added            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS project_added_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS project_added_count      INT NOT NULL DEFAULT 0 CHECK (project_added_count >= 0);
