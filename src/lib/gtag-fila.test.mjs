import test from "node:test";
import assert from "node:assert/strict";

const { criarEnvioGtag, FILA_MAX } = await import("./gtag-fila.ts");

// Cenário falso: o gtag pode "aparecer" depois, e o agendar só guarda a função
// para o teste chamá-la na mão.
function montar(opcoes = {}) {
  const chamadas = [];
  const estado = { gtag: undefined, agendadas: [] };
  const envio = criarEnvioGtag({
    lerGtag: () => estado.gtag,
    agendar: (fn, ms) => { estado.agendadas.push({ fn, ms }); return estado.agendadas.length; },
    ...opcoes,
  });
  const instalarGtag = (impl) => { estado.gtag = impl ?? ((...a) => { chamadas.push(a); }); };
  return { envio, estado, chamadas, instalarGtag };
}

test("envia direto quando o gtag existe", () => {
  const { envio, chamadas, instalarGtag } = montar();
  instalarGtag();
  envio.enviar("consultor_clicado", { origem: "x" });
  assert.deepEqual(chamadas, [["event", "consultor_clicado", { origem: "x" }]]);
  assert.equal(envio.pendentes(), 0);
});

test("guarda na fila e esvazia na ordem quando o gtag aparece", () => {
  const { envio, estado, chamadas, instalarGtag } = montar();
  envio.enviar("a", { n: 1 });
  envio.enviar("b", { n: 2 });
  envio.enviar("c");
  assert.equal(chamadas.length, 0);
  assert.equal(envio.pendentes(), 3);
  instalarGtag();
  estado.agendadas[0].fn();
  assert.deepEqual(chamadas, [
    ["event", "a", { n: 1 }],
    ["event", "b", { n: 2 }],
    ["event", "c", undefined],
  ]);
  assert.equal(envio.pendentes(), 0);
});

test("fila limitada a 20, descarta os novos", () => {
  assert.equal(FILA_MAX, 20);
  const { envio, estado, chamadas, instalarGtag } = montar();
  for (let i = 0; i < 25; i++) envio.enviar(`e${i}`);
  assert.equal(envio.pendentes(), 20);
  instalarGtag();
  estado.agendadas[0].fn();
  assert.equal(chamadas.length, 20);
  assert.deepEqual(chamadas.map((c) => c[1]), Array.from({ length: 20 }, (_, i) => `e${i}`));
});

test("erro do gtag não escapa de enviar", () => {
  const { envio, chamadas, instalarGtag } = montar();
  instalarGtag(() => { throw new Error("falhou"); });
  assert.doesNotThrow(() => envio.enviar("a"));
  assert.equal(envio.pendentes(), 0);

  // também não escapa de uma tentativa agendada, e o evento com erro não volta
  const outro = montar();
  outro.envio.enviar("b");
  outro.envio.enviar("c");
  outro.instalarGtag(() => { throw new Error("falhou"); });
  assert.doesNotThrow(() => outro.estado.agendadas[0].fn());
  assert.equal(outro.envio.pendentes(), 0);
  assert.equal(chamadas.length, 0);
});

test("uma tentativa agendada por vez", () => {
  const { envio, estado } = montar();
  envio.enviar("a");
  envio.enviar("b");
  envio.enviar("c");
  assert.equal(estado.agendadas.length, 1);
  assert.equal(estado.agendadas[0].ms, 250);
});

test("para depois de 40 tentativas e o próximo enviar recomeça", () => {
  const { envio, estado, chamadas, instalarGtag } = montar();
  envio.enviar("a");
  for (let i = 0; i < 40; i++) {
    assert.equal(estado.agendadas.length, i + 1);
    estado.agendadas[i].fn();
  }
  // a 40ª falhou e não agendou outra: a fila fica guardada
  assert.equal(estado.agendadas.length, 40);
  assert.equal(envio.pendentes(), 1);
  envio.enviar("b");
  assert.equal(estado.agendadas.length, 41);
  assert.equal(envio.pendentes(), 2);
  instalarGtag();
  estado.agendadas[40].fn();
  assert.deepEqual(chamadas.map((c) => c[1]), ["a", "b"]);
});
