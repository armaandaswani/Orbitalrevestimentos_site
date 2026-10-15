-- Migration 066: disponibilidade na data da 1ª turma da Academia Orbital
--
-- disponivel_na_data  resposta do formulário "Você tem disponibilidade no
--                     sábado, 31/10, às 7h30?" (true/false). Quem responde
--                     "não" vai para a lista da 2ª turma e não ocupa vaga na
--                     1ª — nem é chamado quando abre vaga por desistência.
--                     null = inscrição anterior à pergunta.
--
-- Aditiva e segura para rodar mais de uma vez.

alter table academy_waitlist add column if not exists disponivel_na_data boolean;
