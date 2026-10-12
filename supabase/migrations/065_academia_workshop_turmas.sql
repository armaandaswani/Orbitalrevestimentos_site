-- Migration 065: Academia Orbital vira workshop com turmas
--
-- turma                   1 = 1ª turma (gratuita, vagas limitadas); 2 = lista
--                         de espera da 2ª turma. Quem já estava na lista de
--                         espera fica na 1ª turma (decisão do dono).
-- presenca                resposta ao pedido de confirmação de presença
--                         ('sim' / 'nao'); null = ainda não respondeu.
--                         'nao' libera a vaga na 1ª turma.
-- presenca_pedida_at      quando o pedido de confirmação foi disparado (marca a
--                         tentativa, para o disparo em lotes não repetir).
-- presenca_respondida_at  quando a pessoa (ou o admin) registrou a resposta.
--
-- Aditiva e segura para rodar mais de uma vez.

alter table academy_waitlist add column if not exists turma smallint not null default 1;
alter table academy_waitlist add column if not exists presenca text;
alter table academy_waitlist add column if not exists presenca_pedida_at timestamptz;
alter table academy_waitlist add column if not exists presenca_respondida_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'academy_waitlist_turma_check') then
    alter table academy_waitlist add constraint academy_waitlist_turma_check check (turma in (1, 2));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'academy_waitlist_presenca_check') then
    alter table academy_waitlist add constraint academy_waitlist_presenca_check check (presenca in ('sim', 'nao'));
  end if;
end $$;

create index if not exists academy_waitlist_turma_idx on academy_waitlist (turma, created_at);
