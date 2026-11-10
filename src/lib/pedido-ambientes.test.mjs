import test from "node:test";
import assert from "node:assert/strict";
import { cleanItemSpace, groupPedidoItems } from "./pedido-ambientes.ts";

test("quantitativo preserva produtos repetidos em ambientes e subtotal por ambiente", () => {
  const rows = [
    { product_id: "pfb", space: "Sala", plates: 4, unit_price: 649 },
    { product_id: "cola", space: "Sala", plates: 8, unit_price: 40 },
    { product_id: "pfb", space: "Quarto", plates: 2, unit_price: 649 },
    { product_id: "perfil", space: " sala ", plates: 3, unit_price: 25 },
  ];
  const groups = groupPedidoItems(rows);
  assert.deepEqual(groups.map(({space, subtotal}) => ({space, subtotal})), [
    { space: "Sala", subtotal: 2991 }, { space: "Quarto", subtotal: 1298 },
  ]);
  assert.equal(groups.flatMap((g) => g.items).length, rows.length);
  assert.equal(groups.reduce((sum, g) => sum + g.subtotal, 0), rows.reduce((sum, row) => sum + row.plates * row.unit_price, 0));
});

test("pedido antigo mantém ambiente global e valores", () => {
  const rows = [{ plates: 4, unit_price: 649 }, { plates: 8, unit_price: 40 }];
  const [group] = groupPedidoItems(rows, "Lavabo");
  assert.equal(group.space, "Lavabo");
  assert.equal(group.subtotal, 2916);
  assert.deepEqual(group.items, rows);
});

test("itens gerais não recebem o resumo global quando o pedido já discrimina ambientes", () => {
  const groups = groupPedidoItems([{ space: "Sala", plates: 1, unit_price: 649 }, { plates: 2, unit_price: 40 }], "Sala, Quarto");
  assert.deepEqual(groups.map((g) => g.space), ["Sala", null]);
});

test("ambiente vazio e nomes longos são normalizados", () => {
  assert.equal(cleanItemSpace(" \n  "), null);
  assert.equal(cleanItemSpace(" Sala   de jantar "), "Sala de jantar");
  assert.equal(cleanItemSpace("a".repeat(130)).length, 120);
  assert.equal(cleanItemSpace({ space: "Sala" }), null);
});
