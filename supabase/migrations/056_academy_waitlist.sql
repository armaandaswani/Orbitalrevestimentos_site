-- Lista de espera da Academia Orbital.
--
-- Tabela própria, e não a `leads`, de propósito: `leads` é o funil de VENDA
-- (novo → contatado → em_negociacao → orcamento → ganho) e mede conversão.
-- Quem entra aqui é um aplicador interessado num treinamento que ainda não
-- existe — misturar os dois distorceria os números do funil.
--
-- Prioridade de contato definida pela Orbital: WhatsApp e nome obrigatórios,
-- e-mail opcional. Por isso a chave de duplicidade é o WhatsApp (só os
-- dígitos), e não o e-mail.
--
-- RLS ligado e SEM nenhuma policy: a chave anon é pública (vai no bundle do
-- navegador), e a tabela guarda nome, telefone e e-mail. Só a service role,
-- usada no servidor, consegue ler ou gravar.
--
-- Os valores dos CHECK espelham src/lib/academia-waitlist.ts — mudou lá, muda
-- aqui.
--
-- Idempotente e compatível com a primeira versão desta migration (em que o
-- e-mail era obrigatório e não havia foco nem tempo de profissão): pode rodar
-- em banco novo, em banco que já rodou a versão anterior, e mais de uma vez.

create table if not exists academy_waitlist (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  email       text,
  city        text,
  role        text not null
    check (role in ('aplicador', 'instalador', 'marceneiro', 'construcao_civil', 'outro')),
  role_other  text,
  -- de onde a pessoa veio (utm_source / referrer), para saber qual canal enche a lista
  source      text,
  created_at  timestamptz not null default now()
);

-- Versão anterior tinha e-mail e cidade obrigatórios.
alter table academy_waitlist alter column email drop not null;
alter table academy_waitlist alter column city  drop not null;

-- O que a pessoa mais instala ou aplica hoje. Anulável no banco para o ALTER
-- funcionar em tabela já existente; a obrigatoriedade é garantida pela API.
alter table academy_waitlist add column if not exists main_focus text
  check (main_focus in ('drywall_gesso', 'forro', 'ceramica_porcelanato', 'marcenaria_mdf',
                        'paineis_revestimentos', 'papel_de_parede', 'pintura', 'outro'));
alter table academy_waitlist add column if not exists main_focus_other text;

alter table academy_waitlist add column if not exists years_experience text
  check (years_experience in ('ate_1', '1_3', '3_5', '5_10', '10_mais'));

-- Duplicidade pelo WhatsApp: a mesma pessoa se cadastrando de novo não
-- duplica a lista, venha o número com a máscara que vier.
create unique index if not exists academy_waitlist_phone_uidx
  on academy_waitlist (regexp_replace(phone, '\D', '', 'g'));

-- E-mail continua único quando informado (NULLs não colidem entre si).
create unique index if not exists academy_waitlist_email_uidx
  on academy_waitlist (lower(email));

create index if not exists academy_waitlist_created_at_idx
  on academy_waitlist (created_at desc);

alter table academy_waitlist enable row level security;

comment on table academy_waitlist is
  'Lista de espera da Academia Orbital (curso de instalação de PFB ainda em desenvolvimento). Só a service role acessa.';
