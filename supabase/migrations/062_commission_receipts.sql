-- Migration 062: "dar baixa" — representante e parceiro confirmam o recebimento
--
-- O "Pago" continua sendo marcado pela Orbital (coupon_uses.*_commission_paid_at).
-- Aqui fica a confirmação de quem RECEBEU, uma linha por beneficiário: a mesma
-- venda pode ter o parceiro e mais de um representante, e cada um confirma só a
-- própria parte. marked_paid = a baixa também marcou o "Pago" (que estava vazio),
-- para que desfazer a baixa desfaça só o que ela mesma marcou.

CREATE TABLE IF NOT EXISTS commission_receipts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_use_id UUID NOT NULL REFERENCES coupon_uses(id) ON DELETE CASCADE,
  party         TEXT NOT NULL CHECK (party IN ('partner', 'rep')),
  party_code    TEXT NOT NULL,          -- cupom do parceiro ou código do representante
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  marked_paid   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (coupon_use_id, party, party_code)
);

CREATE INDEX IF NOT EXISTS idx_commission_receipts_party ON commission_receipts (party, party_code);

ALTER TABLE commission_receipts ENABLE ROW LEVEL SECURITY;
