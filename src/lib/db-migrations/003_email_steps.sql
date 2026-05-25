-- Migration 003: email_campaign_steps table
-- Run this in your Supabase SQL editor before using the drip campaign editor.

CREATE TABLE IF NOT EXISTS email_campaign_steps (
  step_number  INTEGER PRIMARY KEY,
  delay_days   INTEGER,           -- NULL for conclusion steps 98/99
  subject      TEXT NOT NULL,
  body_html    TEXT NOT NULL,     -- body content with {{var}} placeholders
  description  TEXT NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now()
);
