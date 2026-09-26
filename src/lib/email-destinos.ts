/**
 * Para onde vão os avisos do site para a Orbital.
 *
 * Regra da Orbital: TUDO que o site comunica à empresa — novo parceiro, novo
 * orçamento, uso de cupom, relatórios automáticos, campanhas, reuniões de
 * representante — vai para a caixa da empresa.
 *
 * Antes desta constante o destinatário estava fixo em cada rota, e oito delas
 * mandavam para um Gmail pessoal: a empresa não recebia aviso de parceiro,
 * relatório diário, mensal nem de comissões. Mude aqui, e só aqui.
 */
export const EMAIL_EMPRESA = "orbitalrevestimentos@gmail.com";
