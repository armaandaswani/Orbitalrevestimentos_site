-- Destaques e organização dos projetos (redesign do cadastro — Fase B).
-- Controláveis pelo painel, sem tocar no código:
--   is_featured  → destacar na página de Projetos (aparece primeiro)
--   show_on_home → exibir na página inicial
--   is_new       → selo "Novo"
--   feature_order→ ordem entre os destaques (menor primeiro)
--   content_type → tipo de conteúdo (antes_depois | concluido | exposicao | showroom | inspiracao)
-- Retrocompatível; defaults preservam o comportamento atual.
alter table project_photos
  add column if not exists is_featured   boolean not null default false,
  add column if not exists show_on_home  boolean not null default false,
  add column if not exists is_new        boolean not null default false,
  add column if not exists feature_order int not null default 0,
  add column if not exists content_type  text;
