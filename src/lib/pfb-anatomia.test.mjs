import test from "node:test";
import assert from "node:assert/strict";
import { LAMINAS, clipPath, ancoraDosNomes } from "./pfb-anatomia.ts";

test("seis lâminas na ordem da pilha", () => {
  assert.deepEqual(
    LAMINAS.map((l) => l.chave),
    ["pelicula", "pvc-impressao", "adesivo", "pvc-1", "pvc-2", "substrato"],
  );
  assert.deepEqual(
    LAMINAS.map((l) => l.nome),
    [0, 1, 2, 3, 3, 4],
  );
});

test("polígonos dentro da imagem", () => {
  for (const l of LAMINAS) {
    assert.ok(l.poligono.length >= 3, `${l.chave} tem menos de 3 vértices`);
    for (const [x, y] of l.poligono) {
      assert.ok(x >= 0 && x <= 100, `${l.chave}: x ${x} fora de [0, 100]`);
      assert.ok(y >= 0 && y <= 100, `${l.chave}: y ${y} fora de [0, 100]`);
    }
  }
});

test("fechadoY do JSON", () => {
  assert.deepEqual(
    LAMINAS.map((l) => l.fechadoY),
    [0, 11.42, 15.25, 13.4, 14.61, 15.67],
  );
});

test("clipPath em porcentagem", () => {
  assert.equal(
    clipPath(LAMINAS[0]),
    "polygon(0% 0%, 100% 0%, 100% 14.07%, 71.78% 13.94%, 71.45% 13.65%, 12.96% 13.38%, 6.71% 4.43%, 0% 4.29%)",
  );
});

test("âncoras dos nomes", () => {
  const a = ancoraDosNomes();
  const esperado = [6.72, 24.75, 41.08, 59.13, 86.06];
  assert.equal(a.length, 5);
  for (let i = 1; i < a.length; i++) {
    assert.ok(a[i] > a[i - 1], "âncoras crescentes");
    assert.ok(a[i] - a[i - 1] >= 10, `folga mínima de 10 entre ${i - 1} e ${i}`);
  }
  a.forEach((v, i) => {
    assert.ok(Math.abs(v - esperado[i]) <= 0.2, `âncora ${i}: ${v} longe de ${esperado[i]}`);
  });
});
