-- Migration 027: Pedido sales document fields
--
-- Adds the commercial document layer used to generate formal PDFs from an
-- admin pedido: client address, discount/freight, payment options/terms,
-- validity, warranty and document notes. Additive and safe for existing orders.

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS client_zip TEXT,
  ADD COLUMN IF NOT EXISTS client_address TEXT,
  ADD COLUMN IF NOT EXISTS client_address_complement TEXT,
  ADD COLUMN IF NOT EXISTS client_city TEXT,
  ADD COLUMN IF NOT EXISTS client_state TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_methods TEXT[] NOT NULL DEFAULT ARRAY['Pix']::TEXT[],
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS quote_valid_until DATE,
  ADD COLUMN IF NOT EXISTS warranty_terms TEXT,
  ADD COLUMN IF NOT EXISTS document_notes TEXT;
