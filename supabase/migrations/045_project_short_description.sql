-- Descrição curta do projeto (redesign do cadastro de Projetos — Fase A).
-- Campo opcional exibido no card/gestão; não obrigatório. Retrocompatível.
alter table project_photos
  add column if not exists short_description text;
