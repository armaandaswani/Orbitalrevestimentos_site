-- ============================================================================
-- 051 — Classificação explícita de mídia (antes/depois) + capa como mídia
-- ============================================================================
-- Causa-raiz que esta migração corrige:
--   1) A capa (project_photos.image_after) não tinha classificação própria. O
--      site inferia "depois" pela POSIÇÃO e "antes" para image_before — logo,
--      quando image_before ficou igual a image_after (projeto "hall"), a MESMA
--      foto aparecia no filtro "Antes" com a etiqueta ANTES.
--   2) project_media.category não tinha CHECK nem normalização: valores legados
--      ('A', 'D', 'before', 'after', NULL, '') passariam a ser tratados como
--      qualquer coisa pelo frontend.
--   3) Não havia como marcar QUAL mídia é a capa (nem impedir duas capas).
--
-- Princípios: idempotente, não apaga nenhum arquivo/registro, e nunca assume
-- "antes" para valor ausente — o padrão de capa é sempre "depois".
-- ============================================================================

-- ── 1. Classificação explícita da capa ──────────────────────────────────────
alter table project_photos
  add column if not exists cover_category text not null default 'depois';

-- Toda capa existente passa a ser "depois" (regra do produto: uma capa nunca é
-- "antes" só porque o campo estava vazio). O admin pode trocar manualmente.
update project_photos set cover_category = 'depois'
  where cover_category is null or cover_category not in ('antes', 'depois');

-- ── 2. Normalização dos valores legados de project_media.category ───────────
alter table project_media add column if not exists category text;
alter table project_media add column if not exists description text;

update project_media set category = 'antes'
  where lower(coalesce(category, '')) in ('a', 'antes', 'before');
update project_media set category = 'depois'
  where lower(coalesce(category, '')) in ('d', 'depois', 'after');
-- Ausente/desconhecido → 'geral' (neutro). NUNCA 'antes'.
update project_media set category = 'geral'
  where category is null or category not in ('antes', 'depois', 'geral');

alter table project_media alter column category set default 'geral';
alter table project_media alter column category set not null;

do $$ begin
  alter table project_media
    add constraint project_media_category_chk check (category in ('antes', 'depois', 'geral'));
exception when duplicate_object then null; end $$;

-- ── 3. A capa passa a ser uma mídia normal marcada como is_cover ────────────
alter table project_media add column if not exists is_cover boolean not null default false;

-- 3a. A capa atual (image_after) vira uma linha de project_media, quando ainda
--     não existir uma linha com a mesma URL. sort_order -1000 = sempre primeiro.
insert into project_media (project_slug, type, url, category, is_cover, sort_order)
select p.slug, 'image', p.image_after, p.cover_category, true, -1000
from project_photos p
where coalesce(p.image_after, '') <> ''
  and not exists (
    select 1 from project_media m where m.project_slug = p.slug and m.url = p.image_after
  );

-- 3b. Se a capa JÁ existia na galeria, marca aquela linha como capa e alinha a
--     classificação com cover_category (em vez de duplicar o arquivo).
update project_media m
set is_cover = true, category = p.cover_category
from project_photos p
where m.project_slug = p.slug
  and m.url = p.image_after
  and coalesce(p.image_after, '') <> '';

-- 3c. A imagem "antes" legada vira uma mídia classificada como 'antes' — mas só
--     quando for REALMENTE outro arquivo. É aqui que o bug do "hall" morre:
--     image_before = image_after não gera uma segunda linha.
insert into project_media (project_slug, type, url, category, is_cover, sort_order)
select p.slug, 'image', p.image_before, 'antes', false, -999
from project_photos p
where coalesce(p.image_before, '') <> ''
  and p.image_before is distinct from p.image_after
  and not exists (
    select 1 from project_media m where m.project_slug = p.slug and m.url = p.image_before
  );

-- 3d. Correção do dado corrompido: image_before idêntica à capa é redundante.
--     Não apaga arquivo nenhum — a URL continua viva como capa.
update project_photos set image_before = null where image_before = image_after;

-- ── 4. Integridade: no máximo UMA capa por projeto ─────────────────────────
-- (Se algum projeto tiver mais de uma por dado legado, mantém a de menor
--  sort_order/created_at e desmarca as demais antes de criar o índice único.)
update project_media m set is_cover = false
where m.is_cover
  and m.id <> (
    select m2.id from project_media m2
    where m2.project_slug = m.project_slug and m2.is_cover
    order by m2.sort_order asc, m2.created_at asc
    limit 1
  );

create unique index if not exists project_media_one_cover_idx
  on project_media (project_slug) where is_cover;

create index if not exists project_media_slug_order_idx
  on project_media (project_slug, sort_order);
