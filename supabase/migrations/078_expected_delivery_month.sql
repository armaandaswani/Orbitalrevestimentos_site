-- Month-level forecast for future catalog products, snapshotted on commercial items.
-- Additive: old products and orders keep NULL and remain readable.
ALTER TABLE products ADD COLUMN IF NOT EXISTS expected_delivery_month TEXT
  CHECK (expected_delivery_month IS NULL OR expected_delivery_month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$');
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS expected_delivery_month TEXT
  CHECK (expected_delivery_month IS NULL OR expected_delivery_month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$');
COMMENT ON COLUMN products.expected_delivery_month IS 'Previsão de entrega por mês (YYYY-MM), sem promessa de dia exato.';
COMMENT ON COLUMN pedido_items.expected_delivery_month IS 'Snapshot da previsão mensal do produto ao gerar o documento comercial.';

-- Other authorized order origins (including the assistant) also insert item
-- rows directly. Keep their commercial documents consistent with admin orders.
CREATE OR REPLACE FUNCTION public.snapshot_pedido_item_delivery_month()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expected_delivery_month IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT p.expected_delivery_month INTO NEW.expected_delivery_month
    FROM public.products AS p WHERE p.id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS pedido_item_delivery_month_snapshot ON public.pedido_items;
CREATE TRIGGER pedido_item_delivery_month_snapshot
BEFORE INSERT ON public.pedido_items
FOR EACH ROW EXECUTE FUNCTION public.snapshot_pedido_item_delivery_month();
