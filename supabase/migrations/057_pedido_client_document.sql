-- Migration 057: CNPJ/CPF do cliente no pedido
--
-- Guarda o documento (CNPJ ou CPF) do cliente para aparecer no orçamento,
-- pedido, nota e recibo. O admin busca o CNPJ na BrasilAPI e preenche
-- nome e endereço automaticamente. Aditiva e segura para pedidos existentes.

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS client_document TEXT;
