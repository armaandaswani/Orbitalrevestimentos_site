-- Régua de acompanhamento do ORÇAMENTO FORMALIZADO (§33), separada do drip do
-- lead. Controla a idempotência (cada follow-up envia uma vez) e o opt-out.
-- Interromper quando: convertido em pedido (pedido_id), opt-out, ou os dois
-- follow-ups já enviados. Retrocompatível.
alter table saved_quotes
  add column if not exists followup1_sent_at   timestamptz,
  add column if not exists followup2_sent_at   timestamptz,
  add column if not exists followups_opted_out boolean not null default false;
