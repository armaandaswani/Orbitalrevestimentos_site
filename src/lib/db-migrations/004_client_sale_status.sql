-- Migration 004: add sale_status to client_email_sequences
-- Run this in your Supabase SQL editor.

ALTER TABLE client_email_sequences
  ADD COLUMN IF NOT EXISTS sale_status TEXT DEFAULT 'em_orcamento';
