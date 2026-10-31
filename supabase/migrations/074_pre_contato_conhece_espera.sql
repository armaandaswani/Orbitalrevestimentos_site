-- Migration 074: pré-contato, perguntas novas (out/2026)
--
-- O pré-contato agora pergunta se a pessoa já conhece o Painel Flexível Fibra
-- de Bambu e o que ela espera dele (até 3 opções, com um detalhe opcional do
-- problema que quer resolver). "O que valoriza" trocou de opções; a coluna
-- continua em texto, então os envios antigos seguem legíveis.
--
-- Até rodar, o site continua gravando: as respostas novas vão no campo de
-- áreas. Segura para rodar mais de uma vez.

alter table site_contatos add column if not exists conhece_pfb boolean;
alter table site_contatos add column if not exists espera text[];
alter table site_contatos add column if not exists espera_detalhe text;

comment on column site_contatos.conhece_pfb is 'Já conhecia o Painel Flexível Fibra de Bambu (null nos envios antes de out/2026).';
comment on column site_contatos.espera is 'O que espera do painel, em texto (até 3 opções).';
comment on column site_contatos.espera_detalhe is 'Problema que quer resolver (opcional, até 200 caracteres).';
