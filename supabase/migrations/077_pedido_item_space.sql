-- Preserve the room for every material line; null keeps legacy order-level space.
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS space TEXT;
COMMENT ON COLUMN pedido_items.space IS 'Ambiente de aplicação desta linha do pedido; legado usa pedidos.space.';
