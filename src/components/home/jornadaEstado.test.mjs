import test from "node:test";
import assert from "node:assert/strict";
import {
  DURACAO_PASSO_MS,
  TOTAL_PASSOS,
  estadoInicial,
  reduzirJornada,
  pausada,
  progresso,
} from "./jornadaEstado.ts";

/**
 * Estado com todas as pausas desligadas: o inicial começa fora da tela
 * (foraDaTela: true) e por isso não andaria com tick nenhum.
 */
function rodando(extra = {}) {
  return {
    ...estadoInicial(),
    pausas: { usuario: false, foco: false, ponteiro: false, foraDaTela: false },
    ...extra,
  };
}

const tick = (dtMs) => ({ tipo: "tick", dtMs });

test("constantes da jornada", () => {
  assert.equal(DURACAO_PASSO_MS, 4000);
  assert.equal(TOTAL_PASSOS, 6);
});

test("o estado inicial começa no passo 0, fora da tela e pausado", () => {
  const e = estadoInicial();
  assert.equal(e.passo, 0);
  assert.equal(e.decorrido, 0);
  assert.equal(e.pausas.foraDaTela, true);
  assert.equal(pausada(e), true);
});

test("um tick de 1000 ms deixa decorrido em 1000", () => {
  const e = reduzirJornada(rodando(), tick(1000));
  assert.equal(e.decorrido, 1000);
  assert.equal(e.passo, 0);
});

test("passar de 4000 ms avança um passo e guarda a sobra", () => {
  const e = reduzirJornada(rodando({ decorrido: 3500 }), tick(800));
  assert.equal(e.passo, 1);
  assert.equal(e.decorrido, 300);
});

test("no passo 5, cruzar 4000 ms volta ao passo 0", () => {
  const e = reduzirJornada(rodando({ passo: 5, decorrido: 3900 }), tick(200));
  assert.equal(e.passo, 0);
  assert.equal(e.decorrido, 100);
});

test("qualquer pausa ativa faz o tick não mudar nada", () => {
  for (const motivo of ["usuario", "foco", "ponteiro", "foraDaTela"]) {
    const antes = reduzirJornada(rodando({ passo: 2, decorrido: 1200 }), { tipo: "pausa", motivo, ativa: true });
    assert.equal(pausada(antes), true, motivo);
    const depois = reduzirJornada(antes, tick(1000));
    assert.equal(depois.passo, 2, motivo);
    assert.equal(depois.decorrido, 1200, motivo);
  }
});

test("pausas de foco e de usuário são independentes", () => {
  let e = rodando();
  e = reduzirJornada(e, { tipo: "pausa", motivo: "foco", ativa: true });
  e = reduzirJornada(e, { tipo: "pausa", motivo: "usuario", ativa: true });
  e = reduzirJornada(e, { tipo: "pausa", motivo: "foco", ativa: false });
  assert.equal(pausada(e), true);
  assert.equal(reduzirJornada(e, tick(1000)).decorrido, 0);
  e = reduzirJornada(e, { tipo: "pausa", motivo: "usuario", ativa: false });
  assert.equal(pausada(e), false);
  assert.equal(reduzirJornada(e, tick(1000)).decorrido, 1000);
});

test("ir define o passo e zera o decorrido", () => {
  const e = reduzirJornada(rodando({ passo: 1, decorrido: 2500 }), { tipo: "ir", passo: 4 });
  assert.equal(e.passo, 4);
  assert.equal(e.decorrido, 0);
});

test("ir prende valores fora da faixa entre 0 e 5", () => {
  assert.equal(reduzirJornada(rodando(), { tipo: "ir", passo: 9 }).passo, 5);
  assert.equal(reduzirJornada(rodando(), { tipo: "ir", passo: -3 }).passo, 0);
  assert.equal(reduzirJornada(rodando(), { tipo: "ir", passo: 2.6 }).passo, 2);
});

test("anterior a partir do 0 vai para o 5; próximo a partir do 5 vai para o 0", () => {
  const a = reduzirJornada(rodando({ decorrido: 1000 }), { tipo: "anterior" });
  assert.equal(a.passo, 5);
  assert.equal(a.decorrido, 0);
  const p = reduzirJornada(rodando({ passo: 5, decorrido: 1000 }), { tipo: "proximo" });
  assert.equal(p.passo, 0);
  assert.equal(p.decorrido, 0);
});

test("progresso em 2000 ms é 0,5", () => {
  assert.equal(progresso(rodando({ decorrido: 2000 })), 0.5);
  assert.equal(progresso(rodando()), 0);
});

test("um tick muito longo nunca pula mais de um passo", () => {
  const e = reduzirJornada(rodando({ passo: 1, decorrido: 3000 }), tick(20000));
  assert.equal(e.passo, 2);
  assert.ok(e.decorrido >= 0 && e.decorrido < DURACAO_PASSO_MS);
});

test("pausar o que já está pausado devolve o mesmo objeto (sem re-render)", () => {
  const e = estadoInicial();
  assert.equal(reduzirJornada(e, { tipo: "pausa", motivo: "foraDaTela", ativa: true }), e);
  assert.equal(reduzirJornada(e, tick(500)), e);
});

test("a rota anda no começo do passo e descansa na parada", async () => {
  const { rotaDesenhada, FRACAO_VIAGEM } = await import("./jornadaEstado.ts");
  assert.equal(rotaDesenhada(rodando({ passo: 2 })), 2 / 6);
  // Metade da viagem: a curva simétrica passa exatamente pelo meio.
  const meio = rotaDesenhada(rodando({ passo: 2, decorrido: (FRACAO_VIAGEM * DURACAO_PASSO_MS) / 2 }));
  assert.ok(Math.abs(meio - 2.5 / 6) < 1e-9);
  // Depois da viagem, parada até o fim do passo.
  assert.equal(rotaDesenhada(rodando({ passo: 2, decorrido: FRACAO_VIAGEM * DURACAO_PASSO_MS })), 3 / 6);
  assert.equal(rotaDesenhada(rodando({ passo: 5, decorrido: 3999 })), 1);
});

test("o traço some no fim do último passo e volta no primeiro", async () => {
  const { brilhoDaRota } = await import("./jornadaEstado.ts");
  assert.equal(brilhoDaRota(rodando({ passo: 3, decorrido: 3900 })), 1);
  assert.equal(brilhoDaRota(rodando({ passo: 5, decorrido: 1000 })), 1);
  assert.equal(brilhoDaRota(rodando({ passo: 5, decorrido: 3000 })), 1);
  // Já apagado antes do fim: a suavização do componente chega a zero antes da virada.
  assert.equal(brilhoDaRota(rodando({ passo: 5, decorrido: 3700 })), 0);
  assert.equal(brilhoDaRota(rodando({ passo: 5, decorrido: 4000 })), 0);
  assert.equal(brilhoDaRota(rodando({ passo: 0, decorrido: 0 })), 0);
  assert.equal(brilhoDaRota(rodando({ passo: 0, decorrido: 2000 })), 1);
});

// ── Chegada: salto do visitante e pausa mostram a etapa já alcançada ─────────

test("o estado inicial não está em chegada", () => {
  assert.equal(estadoInicial().chegou, false);
});

test("ir, próximo e anterior marcam chegada", () => {
  assert.equal(reduzirJornada(rodando(), { tipo: "ir", passo: 3 }).chegou, true);
  assert.equal(reduzirJornada(rodando(), { tipo: "proximo" }).chegou, true);
  assert.equal(reduzirJornada(rodando(), { tipo: "anterior" }).chegou, true);
});

test("depois de um salto a rota vai até a parada da etapa, acesa", async () => {
  const { rotaDesenhada, brilhoDaRota } = await import("./jornadaEstado.ts");
  const e = reduzirJornada(rodando({ passo: 1, decorrido: 2500 }), { tipo: "ir", passo: 3 });
  assert.equal(rotaDesenhada(e), 4 / 6);
  assert.equal(brilhoDaRota(e), 1);
  // Mesmo com o mouse em cima (pausa ativa).
  const p = reduzirJornada(e, { tipo: "pausa", motivo: "ponteiro", ativa: true });
  assert.equal(rotaDesenhada(p), 4 / 6);
});

test("saltar para a etapa 1 mostra a rota até a primeira parada, sem apagar", async () => {
  const { rotaDesenhada, brilhoDaRota } = await import("./jornadaEstado.ts");
  const e = reduzirJornada(rodando({ passo: 4, decorrido: 1000 }), { tipo: "ir", passo: 0 });
  assert.equal(rotaDesenhada(e), 1 / 6);
  assert.equal(brilhoDaRota(e), 1);
});

test("o tick que vira a etapa limpa a chegada; dentro da etapa ela fica", () => {
  let e = reduzirJornada(rodando(), { tipo: "ir", passo: 2 });
  e = reduzirJornada(e, tick(1000));
  assert.equal(e.chegou, true);
  e = reduzirJornada(e, tick(3100));
  assert.equal(e.passo, 3);
  assert.equal(e.chegou, false);
});

test("pausa de usuário, foco ou ponteiro marca chegada; sair da tela não", () => {
  for (const motivo of ["usuario", "foco", "ponteiro"]) {
    assert.equal(reduzirJornada(rodando(), { tipo: "pausa", motivo, ativa: true }).chegou, true, motivo);
  }
  assert.equal(reduzirJornada(rodando(), { tipo: "pausa", motivo: "foraDaTela", ativa: true }).chegou, false);
});

test("pausado no fim do último passo o traço não apaga; rodando, apaga", async () => {
  const { brilhoDaRota, rotaDesenhada } = await import("./jornadaEstado.ts");
  const fim = rodando({ passo: 5, decorrido: 3700 });
  assert.equal(brilhoDaRota(fim), 0);
  const parado = reduzirJornada(fim, { tipo: "pausa", motivo: "ponteiro", ativa: true });
  assert.equal(brilhoDaRota(parado), 1);
  assert.equal(rotaDesenhada(parado), 1);
  // Chegada por salto no último passo, sem pausa: o tempo corre e o traço apaga antes da virada.
  const salto = reduzirJornada(rodando(), { tipo: "ir", passo: 5 });
  assert.equal(brilhoDaRota(reduzirJornada(salto, tick(3800))), 0);
});

test("fora da tela o desenho congela onde estava (sem chegada)", async () => {
  const { rotaDesenhada } = await import("./jornadaEstado.ts");
  const meio = rodando({ passo: 2, decorrido: 1400 });
  const fora = reduzirJornada(meio, { tipo: "pausa", motivo: "foraDaTela", ativa: true });
  assert.equal(rotaDesenhada(fora), rotaDesenhada(meio));
});

test("percurso é a curva de --mv-percurso: 0, meio e 1 exatos, simétrica", async () => {
  const { percurso } = await import("./jornadaEstado.ts");
  assert.equal(percurso(0), 0);
  assert.equal(percurso(0.5), 0.5);
  assert.equal(percurso(1), 1);
  assert.ok(Math.abs(percurso(0.25) + percurso(0.75) - 1) < 1e-12);
  assert.ok(percurso(0.1) < 0.1);
});
