-- Visibilidade no catálogo público, separada de is_active.
-- Um produto de SUPORTE (ex.: Cola PU / ORB-PU) precisa ficar ATIVO para ser
-- calculado no orçamento, mas NÃO deve aparecer no catálogo público nem como
-- "modelo" no simulador. is_active controla o cálculo; show_in_catalog controla
-- a vitrine. Default true = comportamento atual preservado.
alter table products
  add column if not exists show_in_catalog boolean not null default true;

-- Cola PU nasce oculta do catálogo (segue ativa para o orçamento).
update products set show_in_catalog = false where code = 'ORB-PU';
