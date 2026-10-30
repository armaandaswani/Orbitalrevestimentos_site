-- Migration 072: aniversários dos profissionais (arquitetos, designers,
-- engenheiros) — a base da planilha "Aniversários Profissionais – Arquitetos"
-- dentro do sistema. Alimenta o e-mail diário de aniversariantes e a aba
-- Aniversários do admin. Parceiros e representantes continuam com o
-- aniversário no próprio cadastro; o e-mail junta tudo.
--
-- `ref` é o ID da planilha (P001…): reimportar a planilha atualiza a mesma
-- pessoa em vez de duplicar. Segura para rodar mais de uma vez.

create table if not exists aniversarios (
  id                   uuid primary key default gen_random_uuid(),
  ref                  text unique,
  nome                 text not null,
  profissao            text,
  escritorio           text,
  instagram            text,
  instagram_confirmado boolean not null default false,
  whatsapp             text,
  email                text,
  dia                  smallint not null check (dia between 1 and 31),
  mes                  smallint not null check (mes between 1 and 12),
  ano                  smallint,
  fonte                text,
  observacoes          text,
  ativo                boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists aniversarios_mes_dia_idx on aniversarios (mes, dia);

alter table aniversarios enable row level security;

comment on table aniversarios is
  'Aniversários de profissionais (planilha importada pelo admin). Só a service role acessa.';
