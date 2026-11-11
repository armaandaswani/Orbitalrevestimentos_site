# Orbital Admin · prioridades e navegação

## Entregue nesta revisão

- **Hoje** traz cadastros aguardando aprovação, retornos do CRM e conversas que a Ste encaminhou para atendimento humano. Cada item abre o registro de origem. A operação e os indicadores continuam abaixo da fila.
- As seções do admin têm busca no menu. Links internos preservam aba e registro no endereço e funcionam com o botão Voltar.
- Leads / CRM abre no Kanban de oportunidades em aberto. A lista e os encerrados permanecem acessíveis. No celular, o seletor troca de etapa sem precisar arrastar ou rolar na horizontal. O card mostra o resumo de IA quando já consta no CRM.
- A representante começa com retornos pendentes, primeiros contatos e contatos para reavaliar. A fila usa somente o CRM da própria sessão, atualiza com o portal aberto e leva ao contato. O cadastro continua disponível quando o acompanhamento é pausado.
- Após 90 dias sem avanço registrado, o contato sai da fila de retornos e dos envios automáticos do CRM de representantes e entra na revisão. Envios de lembrete e alterações genéricas do cadastro não renovam esse prazo. Respostas registradas, reuniões realizadas, recebimento de mostruário, especificações e projetos entram no cálculo. Registrar uma resposta desliga o envio automático do cadastro. Pausar torna o relacionamento inativo e limpa o agendamento.

## Validação e publicação

A revisão foi preparada em branch isolada. A ativação no ambiente online requer aplicar a migração `083_rep_crm_reply.sql` antes de publicar o código, pois os três crons e o registro de resposta usam a nova coluna. Verificar os dados e a autenticação real em homologação, incluindo a separação de carteira entre representantes. Foram verificados o build, a migração em banco descartável, o cron com provedor simulado e a interface em 390, 768 e 1440 px. Os testes usam dados sintéticos e não enviam mensagens. Para repetir a regra de priorização, execute `node --test scripts/admin/rep-priority.test.mjs`.

## Roadmap

1. Homologar com as carteiras reais e medir o tempo de aprovação de parceiro, a abertura de pendências e a redução dos lembretes recorrentes sem avanço.
2. Vincular contatos da Ste e do CRM com identificador confirmado. Revisar coincidências ambíguas antes de copiar histórico, status ou consentimento. Hoje o painel liga às duas fontes preservando os registros próprios.
3. Capturar respostas de canais autorizados para o CRM de representantes, com conciliação de identidade e deduplicação. Enquanto isso, a representante registra a resposta no contato.
4. Unificar a busca entre registros de parceiros, pedidos e leads. A busca desta revisão localiza seções e o CRM mantém sua própria busca de leads.
