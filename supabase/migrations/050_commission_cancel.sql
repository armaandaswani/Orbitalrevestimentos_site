-- Cancelamento de comissão "A pagar" (marcada por engano ou venda não efetivada).
-- Afeta SOMENTE a comissão gerada — nunca o orçamento/pedido/cliente/projeto.
-- Comissões já PAGAS não são canceladas por aqui (exigiriam estorno à parte).
-- Registra data, motivo e responsável; o lançamento fica no histórico como
-- "Cancelada" e sai dos totais "A pagar". Retrocompatível.
alter table coupon_uses
  add column if not exists partner_commission_cancelled_at timestamptz,
  add column if not exists partner_commission_cancel_reason text,
  add column if not exists rep_commission_cancelled_at     timestamptz,
  add column if not exists rep_commission_cancel_reason     text;

alter table pedidos
  add column if not exists partner_commission_cancelled_at   timestamptz,
  add column if not exists partner_commission_cancel_reason   text,
  add column if not exists sales_rep_commission_cancelled_at timestamptz,
  add column if not exists sales_rep_commission_cancel_reason text;
