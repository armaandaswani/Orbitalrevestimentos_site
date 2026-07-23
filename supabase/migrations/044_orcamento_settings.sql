-- Configuração comercial do fluxo de orçamentos (Fase 8). Torna as regras que
-- hoje vivem em DEFAULT_CONFIG (motor central) editáveis pelo painel sem tocar no
-- código: Cola PU, frete, desconto, parcelamento, validade, instalação e
-- automações. Uma única linha (singleton, id=1) com um JSONB versionável — o
-- motor lê daqui e cai no DEFAULT_CONFIG quando a coluna/linha não existir.
create table if not exists orcamento_settings (
  id          int primary key default 1,
  config      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  constraint orcamento_settings_singleton check (id = 1)
);

insert into orcamento_settings (id, config)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- Zonas de frete configuráveis por CEP/bairro (Fase 8 / §16.4). Enquanto vazio,
-- o motor usa o frete-base. Sem RLS (padrão da casa: acesso via service-role).
create table if not exists frete_zones (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  neighborhoods text,
  cep_start   text,
  cep_end     text,
  cep_list    text,
  value       numeric not null default 0,
  priority    int not null default 0,
  active      boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists frete_zones_active_idx on frete_zones (active, priority);
