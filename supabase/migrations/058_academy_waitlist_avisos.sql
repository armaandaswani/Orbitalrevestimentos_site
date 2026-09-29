-- Migration 058: avisos da lista de espera da Academia Orbital
--
-- Registra o que já foi enviado para cada inscrito:
--   confirmation_*  confirmação da inscrição (WhatsApp / e-mail)
--   launch_*        aviso de lançamento do curso, disparado pelo admin
-- launch_notified_at marca a tentativa, para o disparo não repetir a mesma
-- pessoa; launch_whatsapp_at / launch_email_at só são preenchidos quando o
-- canal aceitou a mensagem. Aditiva e segura para rodar mais de uma vez.

alter table academy_waitlist add column if not exists confirmation_whatsapp_at timestamptz;
alter table academy_waitlist add column if not exists confirmation_email_at    timestamptz;
alter table academy_waitlist add column if not exists launch_notified_at       timestamptz;
alter table academy_waitlist add column if not exists launch_whatsapp_at       timestamptz;
alter table academy_waitlist add column if not exists launch_email_at          timestamptz;
