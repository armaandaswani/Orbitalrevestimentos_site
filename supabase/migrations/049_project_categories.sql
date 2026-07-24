-- Metadados das categorias de projeto: ordem, hierarquia (subcategorias) e, para
-- showrooms de parceiros, endereço + convite para o cliente visitar.
-- Os projetos continuam guardando os SLUGS em project_photos.categories[]; esta
-- tabela descreve cada slug (rótulo, ordem, pai, showroom/endereço). Retrocompat.
create table if not exists project_categories (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  label         text not null,
  parent_slug   text,                 -- subcategoria → slug do pai (ex.: showroom)
  sort_order    int not null default 0,
  is_showroom   boolean not null default false,
  address       text,                 -- endereço do showroom
  maps_url      text,                 -- link do Google Maps (opcional)
  invite_enabled boolean not null default false, -- convidar o cliente a visitar
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists project_categories_parent_idx on project_categories (parent_slug, sort_order);
