/**
 * Mensagem pronta para copiar e colar no WhatsApp junto do documento do pedido
 * (página /admin/pedidos/[id]/documento). Adapta ao tipo de documento, a quem
 * recebe (arquiteto ligado ao pedido ou o próprio cliente), à disponibilidade
 * do material e ao estado do pedido.
 *
 * A Orbital é fornecedora: a mensagem nunca diz que ela instala ou mede
 * (skill orbital-marca). Sem imports com "@/" para rodar no node --test.
 */

export type TipoDocumento = "orcamento" | "pedido" | "nota" | "recibo" | "termo";

export type DadosMensagem = {
  tipo: TipoDocumento;
  clienteNome: string;
  /** Arquiteto / parceiro ligado ao pedido (pedidos.partner_name). */
  arquitetoNome?: string | null;
  itens: ReadonlyArray<{ product_name?: string | null; expected_delivery_month?: string | null }>;
  /** "DD/MM/AAAA", a mesma validade impressa no orçamento. */
  validade?: string | null;
  status?: string | null;
  payment_status?: string | null;
};

const TZ = "America/Manaus";

function primeiroNome(nome: string | null | undefined): string {
  return String(nome ?? "").trim().split(/\s+/)[0] ?? "";
}

function mesAtual(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).format(agora).slice(0, 7);
}

/** "fevereiro" no ano corrente, "fevereiro de 2027" fora dele. */
function nomeDoMes(mes: string, agora: Date): string {
  const nome = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(new Date(`${mes}-15T12:00:00Z`));
  return mes.slice(0, 4) === mesAtual(agora).slice(0, 4) ? nome : `${nome} de ${mes.slice(0, 4)}`;
}

function juntar(lista: string[]): string {
  return lista.length <= 1 ? (lista[0] ?? "") : `${lista.slice(0, -1).join(", ")} e ${lista[lista.length - 1]}`;
}

/** Itens com chegada prevista (mês de hoje em diante), agrupados por mês. */
function chegadas(itens: DadosMensagem["itens"], agora: Date) {
  const hoje = mesAtual(agora);
  const porMes = new Map<string, Set<string>>();
  let emEstoque = 0;
  for (const it of itens) {
    const mes = typeof it.expected_delivery_month === "string" && /^20\d{2}-(0[1-9]|1[0-2])$/.test(it.expected_delivery_month.trim())
      ? it.expected_delivery_month.trim() : null;
    if (!mes || mes < hoje) { emEstoque++; continue; }
    const nomes = porMes.get(mes) ?? new Set<string>();
    if (it.product_name?.trim()) nomes.add(it.product_name.trim());
    porMes.set(mes, nomes);
  }
  return { porMes: [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)), emEstoque };
}

/** Frase de disponibilidade: pronta-entrega, chegada prevista ou as duas coisas. */
export function fraseDisponibilidade(itens: DadosMensagem["itens"], agora: Date = new Date()): string {
  const { porMes, emEstoque } = chegadas(itens, agora);
  if (porMes.length === 0) return "O material já está à pronta-entrega em Manaus.";
  const partes = porMes.map(([mes, nomes]) => {
    const quais = juntar([...nomes]);
    return `${quais || "o material"} ${nomes.size > 1 ? "chegam" : "chega"} em ${nomeDoMes(mes, agora)}`;
  });
  const frase = juntar(partes);
  const inicio = frase.charAt(0).toUpperCase() + frase.slice(1);
  return emEstoque > 0 ? `${inicio}; o restante já está à pronta-entrega em Manaus.` : `${inicio}.`;
}

function tudoAChegar(itens: DadosMensagem["itens"], agora: Date): boolean {
  const { porMes, emEstoque } = chegadas(itens, agora);
  return porMes.length > 0 && emEstoque === 0;
}

/** Parágrafos separados por uma linha em branco, como o dono escreve no WhatsApp. */
function paragrafos(...p: string[]): string {
  return p.filter(Boolean).join("\n\n");
}

export function mensagemDocumento(d: DadosMensagem, agora: Date = new Date()): string {
  const arquiteto = primeiroNome(d.arquitetoNome);
  const cliente = String(d.clienteNome ?? "").trim();
  const paraArquiteto = !!arquiteto;
  const destinatario = paraArquiteto ? arquiteto : primeiroNome(cliente);
  const ola = destinatario ? `${destinatario}, segue` : "Segue";
  const deCliente = paraArquiteto && cliente ? ` de ${cliente}` : "";
  const disponibilidade = fraseDisponibilidade(d.itens, agora);
  const entregue = d.status === "entregue";
  const validade = d.validade?.slice(0, 5);

  // Modelo do dono (13/11/2026), mensagem do orçamento da Adriane: uma ideia por
  // parágrafo, na voz dele; os outros documentos seguem a mesma estrutura.
  switch (d.tipo) {
    case "orcamento":
      return paragrafos(
        `${ola} o orçamento${deCliente} para aprovação!`,
        "Conforme delineado, ele cobre apenas o fornecimento do material. Caso precisar, podemos passar o contato de instaladores que já trabalharam com o Painel :)",
        "Os próximos passos, após aprovação do orçamento seriam o envio do pedido de venda para assinatura, o faturamento da nota e o agendamento da entrega.",
        [disponibilidade, validade ? `Os valores valem até ${validade}.` : ""].filter(Boolean).join(" "),
      );

    case "pedido":
      return paragrafos(
        `${ola} o pedido de venda${deCliente} para assinatura!`,
        paraArquiteto && cliente
          ? `Pode encaminhar para ${primeiroNome(cliente)} conferir os itens e as condições e assinar? :)`
          : "É só conferir os itens e as condições e, estando tudo certo, assinar e nos enviar :)",
        "Os próximos passos, após a assinatura, seriam o faturamento da nota e o agendamento da entrega.",
        disponibilidade,
      );

    case "nota":
      return paragrafos(
        `${ola} a nota de venda${deCliente}!`,
        entregue ? "Muito obrigado pela confiança :)"
          : tudoAChegar(d.itens, agora) ? `O próximo passo seria o agendamento da entrega. ${disponibilidade} Assim que chegar, combinamos o dia :)`
          : `O próximo passo seria o agendamento da entrega. Qual dia fica melhor${paraArquiteto ? " para receber na obra" : ""}?`,
      );

    case "recibo":
      return paragrafos(
        `${ola} o recibo do pagamento${d.payment_status === "parcial" ? " parcial" : ""}${deCliente}!`,
        "Muito obrigado pela confiança :)",
        "Qualquer dúvida sobre o material, é só nos chamar.",
      );

    case "termo":
      return paragrafos(
        `${ola} o termo de recebimento do material${deCliente}!`,
        "No dia da entrega, quem receber confere o material, preenche nome, CPF e data e assina.",
        paraArquiteto ? "Pode nos dizer quem vai receber na obra?" : "Se outra pessoa for receber, pode nos passar o nome dela?",
      );
  }
}
