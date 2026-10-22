-- Migration 070: passkeys (Face ID / Touch ID / digital) para entrar no admin
-- e nos portais do parceiro e do representante.
--
-- Cada linha é uma passkey de um aparelho. user_type diz de qual login ela é;
-- user_id é o id do parceiro / representante, ou 'admin' para o admin.
-- Só a service role acessa. Segura para rodar mais de uma vez.

create table if not exists passkeys (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  last_used_at   timestamptz,
  user_type      text not null check (user_type in ('admin', 'partner', 'rep')),
  user_id        text not null,
  credential_id  text not null unique,   -- base64url
  public_key     text not null,          -- chave pública COSE, base64url
  counter        bigint not null default 0,
  transports     text[],
  device_name    text
);

create index if not exists passkeys_user_idx on passkeys (user_type, user_id);

alter table passkeys enable row level security;

comment on table passkeys is
  'Passkeys (WebAuthn) do admin e dos portais. Só a service role acessa.';
