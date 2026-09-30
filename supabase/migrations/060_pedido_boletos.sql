-- Migration 060: pagamento em boleto no pedido
--
-- payment_status ganha 'boleto', e a coluna boletos guarda as parcelas:
--   [{ "vencimento": "2026-10-15", "valor": 855.33, "pago": false }, ...]
-- O admin gera as parcelas a partir da quantidade e do 1º vencimento (um mês a
-- mais em cada) e pode editar data, valor e pago de cada uma.
-- Aditiva e segura para rodar mais de uma vez.

ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_payment_status_check;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_payment_status_check
  CHECK (payment_status IN ('pendente', 'parcial', 'pago', 'boleto'));

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS boletos JSONB;
