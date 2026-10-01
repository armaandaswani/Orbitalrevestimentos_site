-- Migration 061: registro dos avisos de cada reunião de representante
--
-- Os e-mails de reunião (Orbital, representante e convidados) falhavam em
-- silêncio: o SDK do Resend devolve { error } em vez de lançar exceção, e o
-- código ignorava. Agora cada aviso grava aqui o que saiu e o que falhou
-- (com o motivo), e a aba Agenda do admin mostra isso.
--
-- Formato: { at, kind, emails: [{ to, role, ok, error? }], whatsapp_admin }

ALTER TABLE rep_meetings
  ADD COLUMN IF NOT EXISTS notify_log JSONB;
