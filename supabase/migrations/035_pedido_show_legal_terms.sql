-- Explicit admin control over whether the legal/Condições section (the
-- cláusulas contratuais boilerplate) appears on a pedido's documents, on top
-- of the per-document-type default (Orçamento never auto-shows it; Pedido de
-- Venda / Nota de Venda do, unless turned off here).
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS show_legal_terms BOOLEAN NOT NULL DEFAULT true;
