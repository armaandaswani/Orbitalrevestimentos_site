-- Migration 067: projetos com mais de um modelo e autoria
--
-- extra_product_codes  modelos aplicados ALÉM do principal (product_code
--                      continua sendo o primeiro, para filtros e telas que já
--                      usam um código só).
-- projeto_de           autoria do projeto, ex.: "Arq. Fulana de Tal" — aparece
--                      no site como "Projeto de Arq. Fulana de Tal".
--
-- Aditiva e segura para rodar mais de uma vez.

alter table project_photos add column if not exists extra_product_codes text[] not null default '{}';
alter table project_photos add column if not exists projeto_de text;
