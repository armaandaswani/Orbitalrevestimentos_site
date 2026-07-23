-- Formalização do orçamento público (Reformulação do fluxo de orçamentos).
-- A `saved_quotes` já guarda a SIMULAÇÃO (spaces, totais, contato). Estas colunas
-- registram a etapa de ORÇAMENTO FORMALIZADO: número formal, endereço de entrega,
-- condição de pagamento escolhida, Cola PU, frete final, desconto, total e o
-- controle de envio (idempotência do WhatsApp). Nada aqui é obrigatório para uma
-- simulação — só é preenchido quando o cliente clica em "Receber orçamento
-- formalizado em PDF". Retrocompatível: todas as colunas são `if not exists`.

alter table saved_quotes
  -- Estágio do registro: 'simulacao' (padrão histórico) → 'formalizado' → 'pedido'.
  add column if not exists stage                text,
  -- Número formal legível (ex.: ORC-2607-AB12). Único quando presente.
  add column if not exists formal_number        text,
  add column if not exists formalized_at        timestamptz,
  -- Endereço de entrega (componentes separados — nunca um campo único).
  add column if not exists client_zip           text,
  add column if not exists client_address       text,
  add column if not exists client_number        text,
  add column if not exists client_complement    text,
  add column if not exists client_neighborhood  text,
  add column if not exists client_city          text,
  add column if not exists client_state         text,
  add column if not exists client_condo         text,
  add column if not exists delivery_notes       text,
  -- Condição comercial escolhida + quebra do investimento (motor central).
  add column if not exists payment_condition    text,   -- 'pix' | 'cartao'
  add column if not exists installments         int,
  add column if not exists cola_tubos           int,
  add column if not exists cola_subtotal        numeric,
  add column if not exists frete_amount         numeric,
  add column if not exists frete_free           boolean,
  add column if not exists discount_amount      numeric,
  add column if not exists total_amount         numeric,
  -- Controle de envio (idempotência): um único WhatsApp de formalização.
  add column if not exists whatsapp_sent_at     timestamptz,
  -- Conversão em pedido (Fase 9): vínculo para não reprocessar/duplicar.
  add column if not exists pedido_id            uuid;

create unique index if not exists saved_quotes_formal_number_key
  on saved_quotes (formal_number) where formal_number is not null;
