-- Migration 064: status de pedido "pendente_entrega"
--
-- Pedido pronto que ainda não foi entregue. O admin escolhe a data
-- (expected_delivery_at) e o sistema cria um lembrete na Agenda (admin_events).
-- As placas continuam reservadas no estoque até "entregue".
-- Idempotente.

ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_status_check
  CHECK (status IN ('em_producao', 'pronto', 'pendente_entrega', 'entregue', 'cancelado'));
