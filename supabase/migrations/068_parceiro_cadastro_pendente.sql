-- Migration 068: arquiteto com cadastro pendente, criado direto no pedido
--
-- O admin informa só o nome do arquiteto no pedido; e-mail, aniversário e
-- senha a pessoa completa pelo link de cadastro. Para isso o e-mail do
-- parceiro precisa poder ficar vazio até lá. Segura para rodar mais de uma vez
-- (se a coluna já aceita vazio, não muda nada).

alter table partners alter column email drop not null;
