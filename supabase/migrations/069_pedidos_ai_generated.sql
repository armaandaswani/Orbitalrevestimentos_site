-- Orçamentos rascunhados pela IA (Ste) no modo treino: aparecem só no filtro "Gerados pela IA"
-- da aba Pedidos, nunca nos totais dos pedidos feitos à mão, e a IA apaga os que perderam interesse.
alter table pedidos add column if not exists ai_generated boolean not null default false;
alter table pedidos add column if not exists ai_contact text;   -- conversa do WhatsApp que gerou o rascunho
alter table pedidos add column if not exists ai_status text;    -- aguardando_aprovacao | aprovado | descartado
create index if not exists idx_pedidos_ai_generated on pedidos (ai_generated) where ai_generated;
