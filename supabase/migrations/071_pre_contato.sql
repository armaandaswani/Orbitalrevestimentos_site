-- Migration 071: pré-contato novo (out/2026)
--
-- O formulário não pede mais o WhatsApp do cliente (ele já cai na conversa)
-- nem o estágio da obra. Pergunta agora o que a pessoa mais valoriza num
-- revestimento e quando pretende fazer o projeto. Envios antigos continuam
-- como estão. Segura para rodar mais de uma vez.

alter table site_contatos alter column phone drop not null;
alter table site_contatos alter column etapa drop not null;
alter table site_contatos add column if not exists valoriza text;
alter table site_contatos add column if not exists prazo text;
