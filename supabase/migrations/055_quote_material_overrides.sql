-- Ajustes manuais do administrador sobre os materiais de instalação (§9).
--
-- Guarda { signature, quantities } no próprio orçamento. A assinatura registra
-- placas + tipos de aplicação de quando o ajuste foi feito: mudou qualquer um
-- deles, o cálculo volta a mandar e o painel avisa. Sem isso, um ajuste feito
-- para 10 placas continuaria valendo depois de o projeto virar 60.
--
-- Nulo = nenhum ajuste, o cálculo automático vale integralmente.
--
-- Idempotente.
alter table saved_quotes add column if not exists material_overrides jsonb;

comment on column saved_quotes.material_overrides is
  'Ajuste manual dos materiais de instalação: {"signature":"teto:10","quantities":{"ORB-ESP":6}}. Quantidade 0 remove a linha. Expira quando a assinatura (placas + tipos) muda.';
