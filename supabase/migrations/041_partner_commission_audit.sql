-- Audit trail for the partner commission split (pool → own commission vs client
-- discount). Set whenever discount_value/commission_value changes, so the admin
-- panel can show who last changed the distribution and when.
alter table partners
  add column if not exists commission_updated_at timestamptz,
  add column if not exists commission_updated_by text;
