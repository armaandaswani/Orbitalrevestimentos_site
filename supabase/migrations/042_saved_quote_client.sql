-- Migration 042: store the client's contact on the saved quote.
--
-- A saved_quote had partner + spaces + totals but NOT the client's own
-- name/email/phone (those were only captured on the lead / e-mail sequence at
-- first submit). "Editar este orçamento" now needs them so the edit flow can
-- pre-fill the "Seus dados" step instead of making the client retype — and so
-- editing updates the SAME quote in place instead of creating a new one.

alter table saved_quotes
  add column if not exists client_name  text,
  add column if not exists client_email text,
  add column if not exists client_phone text;
