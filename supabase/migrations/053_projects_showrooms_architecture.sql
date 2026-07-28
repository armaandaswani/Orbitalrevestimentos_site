-- Fundação da reformulação do módulo de Projetos e Showrooms.
--
-- O modelo antigo resolvia tudo com UM array de texto (project_photos.categories),
-- onde conviviam três coisas diferentes: a categoria principal ("residencial"),
-- uma característica do ambiente ("umido") e a marcação de showroom ("showroom",
-- "ornare"). Daí vinham os campos duplicados do formulário e a dúvida sobre onde
-- o projeto ia parar no site.
--
-- Aqui cada uma dessas três vira uma coisa própria:
--   categoria principal  → project_photos.primary_category  (uma só, obrigatória)
--   showroom parceiro    → project_photos.showroom_id       (só quando a categoria é "showroom")
--   característica       → project_photos.tags[]            (livre, não compete com a navegação)
--
-- NADA é apagado: categories[] continua preenchido (o site público ainda lê ele
-- até a fase 3), e as linhas de project_categories que viraram outra coisa são
-- apenas desativadas. Onde a origem for ambígua, o projeto é marcado com
-- needs_review em vez de ser publicado num lugar adivinhado.
--
-- Idempotente: pode rodar mais de uma vez.

-- ─── 1. Showrooms parceiros ──────────────────────────────────────────────────
-- Endereço mora aqui, não em cada ambiente: "Ornare" tem um endereço, e a Sala
-- Principal e o Lavabo dentro dela herdam.
create table if not exists partner_showrooms (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  address     text,
  maps_url    text,
  description text,
  logo_url    text,
  cover_url   text,
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists partner_showrooms_order_idx on partner_showrooms (sort_order, name);

-- ─── 2. Características (tags) ───────────────────────────────────────────────
-- "área úmida", "cozinha", "parede", "teto": descrevem o ambiente sem disputar
-- espaço com a navegação principal do site.
create table if not exists project_tags (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  label      text not null,
  sort_order int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── 3. Novas colunas do projeto ─────────────────────────────────────────────
alter table project_photos add column if not exists primary_category text;
alter table project_photos add column if not exists showroom_id      uuid references partner_showrooms(id) on delete set null;
alter table project_photos add column if not exists tags             text[] not null default '{}';
alter table project_photos add column if not exists needs_review     boolean not null default false;
alter table project_photos add column if not exists review_reason    text;

-- Recorte da capa: a foto original NUNCA é alterada; guardamos só como
-- enquadrá-la no card vertical 4:5 do site.
alter table project_photos add column if not exists cover_focus_x numeric(4,3) not null default 0.5;
alter table project_photos add column if not exists cover_focus_y numeric(4,3) not null default 0.5;
alter table project_photos add column if not exists cover_zoom    numeric(4,2) not null default 1.0;

create index if not exists project_photos_primary_cat_idx on project_photos (primary_category);
create index if not exists project_photos_showroom_idx    on project_photos (showroom_id);

-- ─── 4. Categorias que viraram showroom parceiro ─────────────────────────────
-- Toda linha de project_categories marcada is_showroom descreve, na verdade, um
-- parceiro — leva junto endereço e mapa que já estavam preenchidos.
insert into partner_showrooms (slug, name, address, maps_url, description, sort_order)
select c.slug, c.label, c.address, c.maps_url, c.description, c.sort_order
  from project_categories c
 where c.is_showroom
   and not exists (select 1 from partner_showrooms s where s.slug = c.slug);

-- ─── 5. Categorias que viraram característica ────────────────────────────────
-- "umido" descreve o ambiente, não define onde o projeto aparece.
insert into project_tags (slug, label, sort_order)
select c.slug, c.label, c.sort_order
  from project_categories c
 where c.slug in ('umido', 'cozinha', 'lavabo', 'parede', 'teto')
   and not exists (select 1 from project_tags t where t.slug = c.slug);

-- ─── 6. Derivar categoria principal, showroom e tags de cada projeto ─────────
-- Precedência: showroom > nautico > comercial > residencial. Só as categorias
-- que sobreviveram como principais entram nessa disputa.
with cats as (
  select slug from project_categories
   where active and not is_showroom
     and slug not in (select slug from project_tags)
),
resolved as (
  select
    p.id,
    -- categorias principais que o projeto carrega hoje
    (select array_agg(c.slug order by
       case c.slug when 'showroom' then 0 when 'nautico' then 1
                   when 'comercial' then 2 when 'residencial' then 3 else 4 end)
       from cats c where p.categories @> array[c.slug]) as mains,
    -- parceiro identificado pela marcação antiga (ex.: categoria "ornare")
    (select s.id from partner_showrooms s where p.categories @> array[s.slug] limit 1) as sid,
    -- características encontradas
    coalesce((select array_agg(t.slug) from project_tags t where p.categories @> array[t.slug]), '{}') as tg
  from project_photos p
)
update project_photos p
   set primary_category = r.mains[1],
       showroom_id      = coalesce(p.showroom_id, r.sid),
       tags             = case when p.tags = '{}' then r.tg else p.tags end,
       -- Ambíguo quando: diz ser showroom mas não sabemos de qual parceiro, ou
       -- carrega mais de uma categoria principal. Nesses casos quem decide é
       -- uma pessoa, não esta migração.
       needs_review     = (r.mains[1] = 'showroom' and r.sid is null)
                          or coalesce(array_length(r.mains, 1), 0) > 1
                          or r.mains is null,
       review_reason    = case
         when r.mains is null then 'Projeto sem categoria principal.'
         when r.mains[1] = 'showroom' and r.sid is null then 'Marcado como showroom, mas sem parceiro identificado.'
         when coalesce(array_length(r.mains, 1), 0) > 1 then 'Mais de uma categoria principal: ' || array_to_string(r.mains, ', ') || '.'
         else null end
  from resolved r
 where r.id = p.id
   -- Só a primeira passada. Sem isto, rodar a migração de novo desfaria o
   -- trabalho de quem já revisou um projeto e tirou o "Revisão necessária".
   and p.primary_category is null;

-- ─── 7. Desativar as linhas que deixaram de ser categoria ────────────────────
-- Desativadas, não apagadas: o vínculo antigo em categories[] continua legível.
update project_categories
   set active = false
 where is_showroom or slug in (select slug from project_tags);
