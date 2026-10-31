-- 073 — Runtime da organização de IA: fila de tarefas, aprovações, auditoria,
-- custos e permissões de contato do relacionamento.
--
-- Os modelos e preços (ai_modelos) e as instruções dos agentes (ai_agents) são
-- preenchidos pelo dono no SQL Editor, não ficam neste repositório.

-- Modelo por nível ("executor", "leve"...) e preço por 1 milhão de tokens (US$).
create table if not exists ai_modelos (
  nivel text primary key,
  modelo text not null,
  preco_entrada numeric not null default 0,
  preco_saida numeric not null default 0,
  preco_cache_leitura numeric not null default 0,
  preco_cache_escrita numeric not null default 0,
  atualizado_em timestamptz not null default now()
);

-- Registro dos agentes do runtime (instruções sincronizadas do repositório privado).
create table if not exists ai_agents (
  id text primary key,
  empresa text not null default 'orbital',
  departamento text not null,
  papel text not null,
  nivel text not null default 'executor',
  autonomia int not null default 2 check (autonomia between 1 and 4),
  instrucoes text,
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);

-- Fila: cada linha é uma unidade de trabalho com orçamento, tentativas e telemetria real.
create table if not exists ai_tasks (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  empresa text not null default 'orbital',
  departamento text not null,
  agente text,
  pai_id uuid references ai_tasks(id) on delete set null,
  chave_dedupe text unique,
  status text not null default 'fila'
    check (status in ('fila','executando','aguardando_aprovacao','aprovada','recusada','concluida','falhou')),
  autonomia int not null default 2,
  entrada jsonb not null default '{}'::jsonb,
  saida jsonb,
  tentativas int not null default 0,
  max_tentativas int not null default 3,
  orcamento_tokens int not null default 4000,
  modelo text,
  tokens_entrada int not null default 0,
  tokens_saida int not null default 0,
  tokens_cache_leitura int not null default 0,
  tokens_cache_escrita int not null default 0,
  custo_usd numeric not null default 0,
  latencia_ms int not null default 0,
  erro text,
  decidido_por text,
  decidido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  iniciado_em timestamptz,
  concluido_em timestamptz
);
create index if not exists ai_tasks_status_idx on ai_tasks (status, criado_em);
create index if not exists ai_tasks_depto_idx on ai_tasks (departamento, criado_em desc);

-- Quem fez o quê: decisões humanas, envios, falhas.
create table if not exists ai_audit_log (
  id bigserial primary key,
  em timestamptz not null default now(),
  ator text not null,
  acao text not null,
  task_id uuid references ai_tasks(id) on delete set null,
  detalhe jsonb not null default '{}'::jsonb
);
create index if not exists ai_audit_log_em_idx on ai_audit_log (em desc);

-- Permissão de contato por pessoa ("profissional:<id>", "parceiro:<id>", "representante:<id>").
-- Tudo começa negado. Contato privado NÃO autoriza Story pública.
create table if not exists relacionamento_permissoes (
  pessoa_ref text primary key,
  pode_whatsapp boolean not null default false,
  pode_email boolean not null default false,
  pode_story_publica boolean not null default false,
  origem text,
  atualizado_em timestamptz not null default now()
);

-- Um contato por pessoa, ano e canal (o índice único é a trava contra envio repetido).
create table if not exists relacionamento_envios (
  id bigserial primary key,
  pessoa_ref text not null,
  ano int not null,
  canal text not null check (canal in ('whatsapp','email','story','manual')),
  status text not null default 'enviando' check (status in ('enviando','enviado','falhou','manual')),
  task_id uuid references ai_tasks(id) on delete set null,
  detalhe text,
  em timestamptz not null default now(),
  unique (pessoa_ref, ano, canal)
);

alter table ai_modelos enable row level security;
alter table ai_agents enable row level security;
alter table ai_tasks enable row level security;
alter table ai_audit_log enable row level security;
alter table relacionamento_permissoes enable row level security;
alter table relacionamento_envios enable row level security;
