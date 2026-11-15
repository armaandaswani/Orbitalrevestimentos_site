import test from "node:test";
import assert from "node:assert/strict";
import {
  CAMPOS_CLIENTE,
  agruparClientes,
  buscarClientes,
  clienteCombina,
  normalizarNome,
  normalizarTelefone,
} from "./clientes-pedidos.ts";

/**
 * Cadastro de clientes derivado dos pedidos (pedido do dono, 15/11/2026): cada
 * pedido salvo guarda os dados do cliente, e os pedidos do mesmo cliente se
 * juntam por documento, e-mail ou telefone.
 */

let seq = 0;
function pedido(extra) {
  seq += 1;
  return {
    id: `p${seq}`,
    client_name: "Cliente",
    client_email: null,
    client_phone: null,
    client_document: null,
    client_zip: null,
    client_address: null,
    client_address_complement: null,
    client_city: null,
    client_state: null,
    total: 0,
    discount_amount: 0,
    status: "em_producao",
    created_at: "2026-11-01T12:00:00Z",
    ...extra,
  };
}
const ids = (c) => c.pedidos.map((p) => p.id);

test("normalizações", () => {
  assert.equal(normalizarNome("  João   da  SILVA "), "joao da silva");
  assert.equal(normalizarNome("Ângela Conceição"), "angela conceicao");
  assert.equal(normalizarNome(null), "");
  assert.equal(normalizarTelefone("(92) 99123-4567"), "92991234567");
  assert.equal(normalizarTelefone("+55 92 99123-4567"), "92991234567");
  assert.equal(normalizarTelefone("55 92 3232-1234"), "9232321234");
  // 11 dígitos começando com 55 é um DDD 55 (RS), não o código do país.
  assert.equal(normalizarTelefone("55991234567"), "55991234567");
  assert.equal(normalizarTelefone(""), "");
});

test("junta por documento, e-mail e telefone (em cadeia)", () => {
  const a = pedido({ client_name: "Ana", client_email: "ANA@x.com ", created_at: "2026-10-01T10:00:00Z" });
  const b = pedido({ client_name: "Ana Lima", client_email: "ana@x.com", client_phone: "(92) 99999-0000", created_at: "2026-10-05T10:00:00Z" });
  const c = pedido({ client_name: "Ana L.", client_phone: "+55 92 99999-0000", client_document: "123.456.789-09", created_at: "2026-10-09T10:00:00Z" });
  const d = pedido({ client_name: "Outra", client_document: "12345678909", created_at: "2026-09-01T10:00:00Z" });
  const e = pedido({ client_name: "Bruno", client_phone: "92 98888-1111" });
  const clientes = agruparClientes([a, b, c, d, e]);
  assert.equal(clientes.length, 2);
  const ana = clientes.find((x) => x.pedidos.some((p) => p.id === a.id));
  assert.deepEqual(ids(ana), [c.id, b.id, a.id, d.id], "mais recente primeiro");
  assert.equal(ana.quantidade, 4);
});

test("mesmo nome com documentos diferentes fica separado", () => {
  const a = pedido({ client_name: "Maria Souza", client_document: "111.111.111-11" });
  const b = pedido({ client_name: "maria souza", client_document: "222.222.222-22" });
  assert.equal(agruparClientes([a, b]).length, 2);
});

test("pedido sem contato entra pelo nome só quando há um único cliente com esse nome", () => {
  const comEmail = pedido({ client_name: "José Pereira", client_email: "jose@x.com", created_at: "2026-10-01T10:00:00Z" });
  const semNada = pedido({ client_name: "jose  PEREIRA", created_at: "2026-10-02T10:00:00Z" });
  const [jose] = agruparClientes([comEmail, semNada]);
  assert.deepEqual(ids(jose), [semNada.id, comEmail.id]);
  assert.equal(agruparClientes([comEmail, semNada]).length, 1);

  // Dois clientes diferentes com o mesmo nome: o pedido sem contato não escolhe nenhum.
  const outroJose = pedido({ client_name: "José Pereira", client_phone: "92 98888-0000" });
  const grupos = agruparClientes([comEmail, outroJose, semNada]);
  assert.equal(grupos.length, 3);

  // Sem nenhum cliente identificado com esse nome, os pedidos sem contato com o mesmo nome se juntam.
  const s1 = pedido({ client_name: "Carlos" });
  const s2 = pedido({ client_name: "carlos" });
  assert.equal(agruparClientes([s1, s2]).length, 1);
});

test("identificadores curtos ou inválidos não juntam pedidos", () => {
  const a = pedido({ client_name: "A", client_phone: "0", client_document: "1", client_email: "sem-arroba" });
  const b = pedido({ client_name: "B", client_phone: "0", client_document: "1", client_email: "sem-arroba" });
  assert.equal(agruparClientes([a, b]).length, 2);
});

test("dados do pedido mais recente, completando campo a campo com os anteriores", () => {
  const velho = pedido({
    client_name: "Fulano Antigo", client_email: "f@x.com", client_phone: "92 91111-2222",
    client_zip: "69000-000", client_address: "Rua A, 1", client_city: "Manaus", client_state: "AM",
    created_at: "2026-01-01T10:00:00Z",
  });
  const novo = pedido({
    client_name: "Fulano de Tal", client_email: "f@x.com", client_phone: "", client_address: "Av. B, 2",
    client_address_complement: "Sala 3", created_at: "2026-06-01T10:00:00Z",
  });
  const [c] = agruparClientes([velho, novo]);
  assert.equal(c.nome, "Fulano de Tal");
  assert.deepEqual(c.dados, {
    client_name: "Fulano de Tal",
    client_email: "f@x.com",
    client_phone: "92 91111-2222",
    client_document: null,
    client_zip: "69000-000",
    client_address: "Av. B, 2",
    client_address_complement: "Sala 3",
    client_city: "Manaus",
    client_state: "AM",
  });
  assert.deepEqual(Object.keys(c.dados), [...CAMPOS_CLIENTE]);
  assert.equal(c.ultimoPedidoEm, "2026-06-01T10:00:00Z");
});

test("total gasto ignora cancelados e desconta o desconto (mínimo 0)", () => {
  const base = { client_email: "t@x.com" };
  const clientes = agruparClientes([
    pedido({ ...base, total: 1000, discount_amount: 100 }),
    pedido({ ...base, total: 500, discount_amount: null }),
    pedido({ ...base, total: 50, discount_amount: 80 }),
    pedido({ ...base, total: 9999, status: "cancelado" }),
    pedido({ ...base, total: null }),
  ]);
  assert.equal(clientes.length, 1);
  assert.equal(clientes[0].totalGasto, 1400);
  assert.equal(clientes[0].quantidade, 5);
});

test("lista ordenada pelo último pedido, mais recente primeiro", () => {
  const clientes = agruparClientes([
    pedido({ client_name: "Velho", client_email: "v@x.com", created_at: "2026-01-01T10:00:00Z" }),
    pedido({ client_name: "Novo", client_email: "n@x.com", created_at: "2026-11-01T10:00:00Z" }),
    pedido({ client_name: "Meio", client_email: "m@x.com", created_at: "2026-05-01T10:00:00Z" }),
  ]);
  assert.deepEqual(clientes.map((c) => c.nome), ["Novo", "Meio", "Velho"]);
});

test("busca sem acento e sem caixa por nome, e-mail, telefone e documento", () => {
  const clientes = agruparClientes([
    pedido({ client_name: "Ângela Conceição", client_email: "Angela@Estudio.com", client_phone: "(92) 99123-4567", client_document: "12.345.678/0001-90", created_at: "2026-10-01T10:00:00Z" }),
    pedido({ client_name: "Bruno Alves", client_email: "bruno@x.com", created_at: "2026-09-01T10:00:00Z" }),
  ]);
  const [angela] = clientes;
  assert.ok(clienteCombina(angela, "angela"));
  assert.ok(clienteCombina(angela, "CONCEIÇÃO"));
  assert.ok(clienteCombina(angela, "estudio.com"));
  assert.ok(clienteCombina(angela, "99123-45"));
  assert.ok(clienteCombina(angela, "12345678"));
  assert.ok(clienteCombina(angela, "  "), "busca vazia combina com todos");
  assert.ok(!clienteCombina(angela, "bruno"));
  assert.deepEqual(buscarClientes(clientes, "").map((c) => c.nome), ["Ângela Conceição", "Bruno Alves"]);
  assert.deepEqual(buscarClientes(clientes, "alves").map((c) => c.nome), ["Bruno Alves"]);
  assert.deepEqual(buscarClientes(clientes, "a", 1).map((c) => c.nome), ["Ângela Conceição"], "limite");
});

test("busca põe primeiro quem tem o nome começando pelo texto", () => {
  const clientes = agruparClientes([
    pedido({ client_name: "Ana Maria", client_email: "1@x.com", created_at: "2026-11-01T10:00:00Z" }),
    pedido({ client_name: "Mariana", client_email: "2@x.com", created_at: "2026-01-01T10:00:00Z" }),
  ]);
  assert.deepEqual(buscarClientes(clientes, "mari").map((c) => c.nome), ["Mariana", "Ana Maria"]);
});
