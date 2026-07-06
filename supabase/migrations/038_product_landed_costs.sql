-- Landed-cost breakdown per product (Custos & Margens tab). cost_price stays
-- the single authoritative landed unit cost used everywhere (Financeiro COGS,
-- pedido_items.unit_cost snapshots); these fields break down WHERE it comes
-- from: landed = fob + freight + duty + other. supplier_name is free text for
-- now; migration 039 adds the suppliers table and products.supplier_id.
alter table products
  add column if not exists supplier_name      text,
  add column if not exists fob_cost           numeric,
  add column if not exists freight_cost       numeric,
  add column if not exists duty_cost          numeric,
  add column if not exists other_import_cost  numeric;
