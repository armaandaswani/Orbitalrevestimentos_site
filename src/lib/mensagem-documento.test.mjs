import test from "node:test";
import assert from "node:assert/strict";
import { mensagemDocumento, fraseDisponibilidade } from "./mensagem-documento.ts";

const agora = new Date("2026-11-13T15:00:00Z");
const estoque = [{ product_name: "Freijó", expected_delivery_month: null }];

test("orçamento para o arquiteto cita o cliente, o fornecimento e a validade", () => {
  const m = mensagemDocumento({
    tipo: "orcamento", clienteNome: "Rafaella Santa'ana", arquitetoNome: "Lívia Lima",
    itens: estoque, validade: "22/11/2026",
  }, agora);
  assert.match(m, /^Lívia, segue o orçamento de Rafaella Santa'ana para aprovação!/);
  assert.match(m, /apenas o fornecimento do material/);
  assert.match(m, /pronta-entrega em Manaus/);
  assert.match(m, /valem até 22\/11\.$/);
});

test("orçamento do cliente avulso fala com o cliente pelo primeiro nome", () => {
  const m = mensagemDocumento({ tipo: "orcamento", clienteNome: "Camila Carvalho", itens: estoque }, agora);
  assert.match(m, /^Camila, segue o orçamento para aprovação!/);
  assert.doesNotMatch(m, /de Camila/);
});

test("pedido de venda: arquiteto encaminha, cliente assina", () => {
  const arq = mensagemDocumento({ tipo: "pedido", clienteNome: "Otaniel Gomes", arquitetoNome: "Achilles", itens: estoque }, agora);
  assert.match(arq, /encaminhar para Otaniel conferir/);
  const cli = mensagemDocumento({ tipo: "pedido", clienteNome: "Otaniel Gomes", itens: estoque }, agora);
  assert.match(cli, /assinar e nos enviar/);
});

test("orçamento sai igual ao modelo do dono (Adriane, 13/11/2026), em parágrafos", () => {
  const m = mensagemDocumento({ tipo: "orcamento", clienteNome: "Adriane Souza", itens: estoque, validade: "23/11/2026" }, agora);
  assert.equal(m, [
    "Adriane, segue o orçamento para aprovação!",
    "Conforme delineado, ele cobre apenas o fornecimento do material. Caso precisar, podemos passar o contato de instaladores que já trabalharam com o Painel :)",
    "Os próximos passos, após aprovação do orçamento seriam o envio do pedido de venda para assinatura, o faturamento da nota e o agendamento da entrega.",
    "O material já está à pronta-entrega em Manaus. Os valores valem até 23/11.",
  ].join("\n\n"));
});

test("toda mensagem tem parágrafos curtos separados por linha em branco", () => {
  for (const tipo of ["orcamento", "pedido", "nota", "recibo", "termo"]) {
    const m = mensagemDocumento({ tipo, clienteNome: "Rafaella", itens: estoque, validade: "22/11/2026" }, agora);
    const p = m.split("\n\n");
    assert.ok(p.length >= 2, `${tipo}: ${p.length} parágrafo(s)`);
    assert.ok(p.every((x) => x.length <= 200 && !x.includes("\n")), `${tipo}: parágrafo longo ou quebrado`);
  }
});

test("disponibilidade separa o que chega do que está em estoque", () => {
  assert.equal(
    fraseDisponibilidade([{ product_name: "Carvalho", expected_delivery_month: "2027-02" }, ...estoque], agora),
    "Carvalho chega em fevereiro de 2027; o restante já está à pronta-entrega em Manaus.",
  );
  assert.equal(
    fraseDisponibilidade([{ product_name: "Carvalho", expected_delivery_month: "2026-12" }], agora),
    "Carvalho chega em dezembro.",
  );
  // previsão vencida conta como estoque
  assert.match(fraseDisponibilidade([{ product_name: "X", expected_delivery_month: "2026-01" }], agora), /^O material já está/);
});

test("nota: entregue agradece; a chegar avisa; em estoque pergunta o dia", () => {
  assert.match(mensagemDocumento({ tipo: "nota", clienteNome: "Ana", status: "entregue", itens: estoque }, agora), /obrigado/);
  assert.match(mensagemDocumento({ tipo: "nota", clienteNome: "Ana", itens: [{ product_name: "Ipê", expected_delivery_month: "2026-12" }] }, agora), /Assim que chegar/);
  assert.match(mensagemDocumento({ tipo: "nota", clienteNome: "Ana", arquitetoNome: "Bia", itens: estoque }, agora), /receber na obra\?$/);
});

test("nenhuma mensagem diz que a Orbital instala, mede ou acompanha obra", () => {
  for (const tipo of ["orcamento", "pedido", "nota", "recibo", "termo"]) {
    for (const arquitetoNome of [null, "Lívia"]) {
      const m = mensagemDocumento({ tipo, clienteNome: "Rafaella", arquitetoNome, itens: estoque, validade: "22/11/2026" }, agora);
      assert.doesNotMatch(m, /\b(instalamos|medimos|acompanhamos|Estamos ansiosos|Ficamos à disposição)\b/i, `${tipo}`);
      assert.ok(m.length > 20);
    }
  }
});
