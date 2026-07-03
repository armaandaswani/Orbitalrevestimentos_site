-- Lets a pedido be tagged retail (varejo) or wholesale (atacado). When atacado,
-- each line item's unit price is the product's linha's special_price from the
-- Preços tab (line_pricing) instead of the product's own stored price.
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS price_tier text NOT NULL DEFAULT 'varejo'
    CHECK (price_tier IN ('varejo', 'atacado'));
