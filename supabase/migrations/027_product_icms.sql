-- Migration 027: per-product ICMS rate (for the Financeiro tax engine)
--
-- ICMS differs by product: the PFB plates are sold under substituição tributária
-- (ICMS já recolhido na entrada → 0% na venda), while the PU-40 glue carries a
-- 7% ICMS. The federal taxes (PIS/COFINS/IRPJ/CSLL) and operational costs are
-- global rates applied in the API; only ICMS is per-product, so it lives here.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS icms_rate NUMERIC NOT NULL DEFAULT 0;

-- Seed the known PU-40 glue at 7%; everything else stays 0% (substituição).
UPDATE products SET icms_rate = 7 WHERE code = 'ORB-PU' AND icms_rate = 0;
