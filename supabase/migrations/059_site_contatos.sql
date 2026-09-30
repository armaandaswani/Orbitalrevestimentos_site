-- Migration 059: contatos do site ("Solicitar atendimento")
--
-- Cada envio da aba de contato do site vira uma linha aqui (base para a tela
-- "Contatos do site" e a exportação para Excel) e também um lead no CRM,
-- ligado por lead_id.
--
-- RLS ligado e SEM policy: guarda nome e WhatsApp; só a service role, no
-- servidor, lê ou grava. Idempotente.

create table if not exists site_contatos (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text,
  phone         text not null,
  perfil        text not null check (perfil in ('proprietario', 'arquiteto')),
  etapa         text not null check (etapa in ('inicial', 'final', 'ideacao')),
  largura_m     numeric,
  altura_m      numeric,
  areas_detalhe text,
  cidade        text not null,
  produtos      text,          -- "Imbuia (ORB-002) · Linha Elegance; ..."
  pagina        text,          -- de onde veio (/produtos, /visualizador, ...)
  lead_id       uuid references leads(id) on delete set null
);

create index if not exists site_contatos_created_at_idx on site_contatos (created_at desc);

alter table site_contatos enable row level security;

comment on table site_contatos is
  'Envios da aba "Solicitar atendimento" do site. Só a service role acessa.';
