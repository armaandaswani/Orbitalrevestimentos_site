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

  switch (d.tipo) {
    case "orcamento":
      return [
        `${ola} o orçamento${deCliente} para aprovação!`,
        "Ele cobre apenas o fornecimento do material. Se precisar, passamos o contato de instaladores que já trabalharam com o Painel :)",
        `Com o orçamento aprovado, enviamos o pedido de venda para assinatura, faturamos a nota e agendamos a entrega. ${disponibilidade}`,
        validade ? `Os valores valem até ${validade}.` : "",
      ].filter(Boolean).join("\n\n");

    case "pedido":
      return [
        `${ola} o pedido de venda${deCliente} para assinatura.`,
        paraArquiteto && cliente
          ? `Pode encaminhar para ${primeiroNome(cliente)} conferir os itens e as condições e assinar?`
          : "Confira os itens e as condições. Estando tudo certo, é só assinar e nos enviar.",
        `Com o pedido assinado, faturamos a nota e agendamos a entrega. ${disponibilidade}`,
      ].join("\n\n");

    case "nota":
      return [
        `${ola} a nota de venda${deCliente}.`,
        entregue ? "Muito obrigado pela confiança!"
          : tudoAChegar(d.itens, agora) ? `${disponibilidade} Assim que chegar, combinamos o dia da entrega.`
          : `Agora é só combinar a entrega: qual dia fica melhor${paraArquiteto ? " para receber na obra" : ""}?`,
      ].join("\n\n");

    case "recibo":
      return [
        `${ola} o recibo do pagamento${d.payment_status === "parcial" ? " parcial" : ""}${deCliente}.`,
        "Muito obrigado pela confiança! Qualquer dúvida sobre o material, é só nos chamar.",
      ].join("\n\n");

    case "termo":
      return [
        `${ola} o termo de recebimento do material${deCliente}.`,
        "No dia da entrega, quem receber confere o material, preenche nome, CPF e data e assina.",
        paraArquiteto ? "Pode nos dizer quem vai receber na obra?" : "Se outra pessoa for receber, pode nos passar o nome dela?",
      ].join("\n\n");
  }
}
