import test from "node:test";
import assert from "node:assert/strict";
import { criarRelogio, DT_MAX_MS as DT_RELOGIO, TAU_PADRAO_MS as TAU_RELOGIO } from "./relogio.ts";
import { DT_MAX_MS, TAU_PADRAO_MS } from "./suavizar.ts";

/** Dependências falsas: fila manual de quadros, relógio e flag de aba oculta ajustáveis. */
function falsas() {
  const f = { fila: new Map(), prox: 1, t: 0, oculto: false };
  const deps = {
    agendar(cb) { const id = f.prox++; f.fila.set(id, cb); return id; },
    cancelar(id) { f.fila.delete(id); },
    agora: () => f.t,
    oculto: () => f.oculto,
  };
  /** Avança o relógio e dispara os quadros agendados naquele instante. */
  f.quadro = (ms) => {
    f.t += ms;
    const cbs = [...f.fila.values()];
    f.fila.clear();
    for (const cb of cbs) cb(f.t);
  };
  return { f, deps };
}

test("constantes do relógio batem com as de suavizar", () => {
  assert.equal(DT_RELOGIO, DT_MAX_MS);
  assert.equal(TAU_RELOGIO, TAU_PADRAO_MS);
});

test("sem assinantes nada é agendado", () => {
  const { f, deps } = falsas();
  const r = criarRelogio(deps);
  r.acordar();
  assert.equal(f.fila.size, 0);
});

test("para de agendar quando todos devolvem false", () => {
  const { f, deps } = falsas();
  const r = criarRelogio(deps);
  let n = 0;
  r.assinar({ tick: () => ++n < 3 });
  for (let i = 0; i < 6; i++) f.quadro(16);
  assert.equal(n, 3);
  assert.equal(f.fila.size, 0);
});

test("salto de 2000 ms entrega dt 50", () => {
  const { f, deps } = falsas();
  const r = criarRelogio(deps);
  const dts = [];
  r.assinar({ tick: (dt) => { dts.push(dt); return true; } });
  f.quadro(16); // primeiro quadro: base de tempo
  f.quadro(2000);
  assert.equal(dts[dts.length - 1], 50);
});

test("acordar depois de dormir agenda um quadro", () => {
  const { f, deps } = falsas();
  const r = criarRelogio(deps);
  r.assinar({ tick: () => false });
  f.quadro(16);
  assert.equal(f.fila.size, 0);
  r.acordar();
  assert.equal(f.fila.size, 1);
  r.acordar();
  assert.equal(f.fila.size, 1);
});

test("com a aba oculta o tick não roda", () => {
  const { f, deps } = falsas();
  const r = criarRelogio(deps);
  let n = 0;
  r.assinar({ tick: () => { n++; return true; } });
  f.oculto = true;
  f.quadro(16);
  f.quadro(16);
  assert.equal(n, 0);
  f.oculto = false;
  r.acordar();
  f.quadro(16);
  assert.equal(n, 1);
});

test("primeiro quadro depois de voltar da aba oculta tem dt 0", () => {
  const { f, deps } = falsas();
  const r = criarRelogio(deps);
  const dts = [];
  r.assinar({ tick: (dt) => { dts.push(dt); return true; } });
  f.quadro(16);
  f.quadro(16);
  f.oculto = true;
  f.quadro(5000);
  f.oculto = false;
  r.acordar();
  f.quadro(16);
  assert.equal(dts[dts.length - 1], 0);
});

test("cancelar a assinatura remove o assinante", () => {
  const { f, deps } = falsas();
  const r = criarRelogio(deps);
  let n = 0;
  const sair = r.assinar({ tick: () => { n++; return true; } });
  f.quadro(16);
  sair();
  f.quadro(16);
  f.quadro(16);
  assert.equal(n, 1);
  assert.equal(f.fila.size, 0);
});
