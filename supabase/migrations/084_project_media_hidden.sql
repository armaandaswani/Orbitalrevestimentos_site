-- ============================================================================
-- 084 — Foto oculta: fica no painel, não aparece no site
-- ============================================================================
-- Idempotente e só acrescenta: nenhuma foto muda de estado (padrão false).
-- A capa nunca fica oculta (regra em /api/projects/media/[id]).
-- ============================================================================
alter table project_media add column if not exists is_hidden boolean not null default false;

create index if not exists project_media_hidden_idx
  on project_media (project_slug) where is_hidden;
