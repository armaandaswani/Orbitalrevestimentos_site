-- Purchasing & import planning (Compras & Importação tab).
--   • suppliers — who we buy from (lead time drives arrival estimates).
--   • purchase_orders — one shipment/container. FOB is priced per item in USD
--     or CNY (RMB); freight is always USD; Brazilian costs (armazenagem,
--     despachante, transporte, siscomex) and taxes (ICMS, FTI) are BRL. FX
--     snapshots (BRL per 1 unit of each foreign currency) are captured at
--     planning so the landed cost is reproducible even as rates move.
--   • purchase_order_items — product lines; landed_unit_cost is snapshotted in
--     BRL at receive time (grand-total distributed by each line's FOB share).
--   • stock_movements.purchase_order_id — receiving writes manual_in rows to
--     the existing ledger, so purchases are backtraceable like orders are.
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name           text not null,
  country        text,
  contact        text,
  lead_time_days integer,
  notes          text,
  active         boolean not null default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table products
  add column if not exists supplier_id uuid references suppliers(id) on delete set null;
create index if not exists idx_products_supplier on products (supplier_id);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id    uuid references suppliers(id) on delete set null,
  reference      text,
  status         text not null default 'draft'
    check (status in ('draft','ordered','in_transit','received','cancelled')),
  -- FX snapshots: BRL per 1 unit of the foreign currency, captured at planning.
  fx_usd_brl     numeric,
  fx_cny_brl     numeric,
  -- Shipment-level costs. Freight is always USD; the rest are BRL.
  freight_usd    numeric,
  storage_cost   numeric,   -- armazenagem
  broker_cost    numeric,   -- despachante
  transport_cost numeric,   -- transportadora
  other_cost     numeric,   -- siscomex / taxas diversas
  icms_rate      numeric default 0.07,
  fti_rate       numeric default 0.01,
  expected_arrival date,
  ordered_at     timestamptz,
  received_at    timestamptz,
  notes          text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists idx_purchase_orders_supplier on purchase_orders (supplier_id);
create index if not exists idx_purchase_orders_status   on purchase_orders (status);

create table if not exists purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  product_id        uuid references products(id) on delete set null,
  product_name      text,   -- snapshot, survives product edits/deletes
  qty               integer not null default 0,
  unit_price        numeric,   -- in unit_currency
  unit_currency     text not null default 'USD' check (unit_currency in ('USD','CNY','BRL')),
  landed_unit_cost  numeric,   -- BRL, snapshotted at receive time
  created_at        timestamptz default now()
);
create index if not exists idx_po_items_po      on purchase_order_items (purchase_order_id);
create index if not exists idx_po_items_product on purchase_order_items (product_id);

alter table stock_movements
  add column if not exists purchase_order_id uuid references purchase_orders(id) on delete set null;
create index if not exists idx_stock_movements_po on stock_movements (purchase_order_id);
