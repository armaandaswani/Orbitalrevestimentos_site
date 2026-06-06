-- Migration 009: allow multiple quotes per email address
-- The client_email_sequences table was created with a UNIQUE constraint on
-- client_email, which prevents the same person from requesting a second quote.
-- Drop it so clients (and admin test submissions) can submit more than once.

ALTER TABLE client_email_sequences
  DROP CONSTRAINT IF EXISTS client_email_sequences_client_email_key;
