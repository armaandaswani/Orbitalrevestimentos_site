-- Migration 075: lista de espera das linhas em chegada (nov/2026)
--
-- TechStone e PFB Carbon ainda não chegaram. A página de cada linha tem um
-- formulário de lista de espera: quando o material chega, a Orbital avisa quem
-- se inscreveu que ele está em pronta-entrega em Manaus, em quantidade
-- limitada. O prazo da obra decide quem é avisado primeiro.
--
-- RLS ligado e SEM policy: guarda nome, WhatsApp e e-mail; só a service role,
-- no servidor, lê ou grava. Idempotente.

create table if not exists site_lista_espera (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  linha         text not null check (linha in ('techstone', 'carbon')),
  nome          text not null,
  whatsapp      text not null,          -- só dígitos, com 55
  email         text not null,
  perfil        text not null check (perfil in ('proprietario', 'arquiteto', 'outro')),
  perfil_outro  text,                   -- "quem é você" quando perfil = outro
  prazo         text not null check (prazo in ('em_obra', 'ate_3_meses', '3_a_6_meses', 'mais_6_meses', 'pesquisando')),
  modelos       text[],                 -- modelos de interesse (opcional)
  pagina        text,
  aceite_lgpd   boolean not null default false,
  avisado_em    timestamptz             -- quando recebeu o aviso de chegada
);

create index if not exists site_lista_espera_linha_idx on site_lista_espera (linha, created_at desc);

-- Uma inscrição por WhatsApp em cada linha: reenviar atualiza, não duplica.
create unique index if not exists site_lista_espera_linha_whatsapp_uidx on site_lista_espera (linha, whatsapp);

alter table site_lista_espera enable row level security;

comment on table site_lista_espera is
  'Lista de espera das linhas em chegada (TechStone, PFB Carbon). Só a service role acessa.';
