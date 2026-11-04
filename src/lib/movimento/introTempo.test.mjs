import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as T from "./introTempo.ts";

const css = fs.readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const inicio = css.indexOf("/* ── Intro da órbita");
const bloco = css.slice(inicio, css.indexOf("/* Reforço: se a preferência mudar", inicio));

/** Duração e atraso (ms) da animação `nome` no bloco da intro (a partir do seletor, se dado). */
function tempos(nome, seletor) {
  const trecho = seletor ? bloco.slice(bloco.indexOf(`${seletor} {`)) : bloco;
  const m = new RegExp(`${nome} (\\d+)ms [^;,]*? (\\d+)ms`).exec(trecho);
  assert.ok(m, `animação ${nome} não encontrada no CSS da intro`);
  return { duracao: Number(m[1]), atraso: Number(m[2]) };
}

test("bloco da intro existe no globals.css", () => {
  assert.ok(inicio > 0 && bloco.length > 0);
});

test("cortina, liberação do clique e saída do conteúdo batem com INICIO_CORTINA", () => {
  assert.deepEqual(tempos("intro-cortina"), { duracao: T.DURACAO_CORTINA, atraso: T.INICIO_CORTINA });
  assert.equal(tempos("intro-solta").atraso, T.INICIO_CORTINA);
  assert.deepEqual(tempos("intro-conteudo-sai"), { duracao: T.DURACAO_CORTINA, atraso: T.INICIO_CORTINA });
});

test("trava de segurança bate e sobra pelo menos 0,6 s depois do fim", () => {
  assert.equal(tempos("intro-seguranca").atraso, T.TRAVA_SEGURANCA);
  assert.ok(T.TRAVA_SEGURANCA - T.FIM_INTRO >= 600);
});

test("deslize e logotipo batem; logo inteiro parado 0,4 s antes da cortina", () => {
  assert.deepEqual(tempos("intro-desliza"), { duracao: T.DURACAO_DESLIZE, atraso: T.INICIO_DESLIZE });
  assert.deepEqual(tempos("intro-assina"), { duracao: T.DURACAO_ASSINATURA, atraso: T.INICIO_ASSINATURA });
  assert.deepEqual(tempos("intro-varre", ".intro-orbita__varredura-assinatura"), { duracao: T.DURACAO_ASSINATURA, atraso: T.INICIO_ASSINATURA });
  const logoInteiro = Math.max(T.INICIO_DESLIZE + T.DURACAO_DESLIZE, T.INICIO_ASSINATURA + T.DURACAO_ASSINATURA, 1600);
  assert.ok(T.INICIO_CORTINA - logoInteiro >= 400);
});

test("folga do hero é o fim da intro mais 400 ms", () => {
  assert.equal(T.ESPERA_MAXIMA_HERO, T.FIM_INTRO + 400);
});
