-- Migration 028: partner ⇄ sales rep links
--
-- The admin portal, rep portal and commission flow use this junction table to
-- link registered partners to one or more representatives. The rep CRM table
-- (`rep_partner_crm`) stores the relationship workflow; this table is the
-- canonical ownership/visibility link used for "Meus Parceiros" and commission
-- attribution.

CREATE TABLE IF NOT EXISTS partner_sales_reps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  sales_rep_id UUID NOT NULL REFERENCES sales_reps(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (partner_id, sales_rep_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_sales_reps_partner ON partner_sales_reps (partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_sales_reps_rep ON partner_sales_reps (sales_rep_id);

ALTER TABLE partner_sales_reps ENABLE ROW LEVEL SECURITY;

-- Backfill the junction table from the legacy single-code column, when present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'partners'
      AND column_name = 'sales_rep_referral_code'
  ) THEN
    INSERT INTO partner_sales_reps (partner_id, sales_rep_id)
    SELECT p.id, sr.id
    FROM partners p
    JOIN sales_reps sr ON sr.referral_code = p.sales_rep_referral_code
    WHERE p.sales_rep_referral_code IS NOT NULL
    ON CONFLICT (partner_id, sales_rep_id) DO NOTHING;
  END IF;
END $$;

-- Keep the representative CRM aware of every existing registered partner link.
INSERT INTO rep_partner_crm (sales_rep_id, partner_id, first_contact_at)
SELECT psr.sales_rep_id, psr.partner_id, COALESCE(psr.created_at, now())
FROM partner_sales_reps psr
ON CONFLICT (sales_rep_id, partner_id) DO NOTHING;
