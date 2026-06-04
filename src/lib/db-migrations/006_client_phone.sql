-- Migration 006: add client_phone and dim_label to client_email_sequences
-- Run this in your Supabase SQL editor.

ALTER TABLE client_email_sequences
  ADD COLUMN IF NOT EXISTS client_phone TEXT;

ALTER TABLE client_email_sequences
  ADD COLUMN IF NOT EXISTS dim_label TEXT;
