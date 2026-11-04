"use client";

import { useEffect } from "react";
import { LUZ_ALCANCE_PCT, posicaoNaSuperficie } from "@/lib/movimento/luz";
import { decidirNivel, lerSinais } from "@/lib/movimento/nivel";
import { relogio, tauAtual } from "@/lib/movimento/relogio";
import { aproximar } from "@/lib/movimento/suavizar";

/** A luz acompanha o ponteiro mais devagar que um cursor: dois "tau" padrão. */
const LUZ_TAU_FATOR = 2;
/** Abaixo de 0,05% do deslocamento a luz já assentou (o padrão da suavização é fino demais para %). */
const LUZ_EPSILON_PCT = 0.05;

/** Estado da inclinação da luz de uma superfície (`.mv-brilho`), em % do deslocamento. */
interface Inclinacao {
  atual: number;
  alvo: number;
}

/**
 * Marca o <html> com o nível de movimento do aparelho (`completo` ou `leve`),
 * uma vez, na montagem. O CSS lê `data-mv-nivel` para reduzir distâncias e
 * desligar efeitos caros. Também liga o único `pointermove` do site para a luz
 * sobre o material: com mouse (`pointer: fine`) e nível completo, a faixa de
 * `.mv-brilho` se inclina para o lado do ponteiro, suavizada pelo relógio.
 * Não renderiza nada.
 */
export default function Movimento() {
  useEffect(() => {
    const nivel = decidirNivel(lerSinais());
    document.documentElement.dataset.mvNivel = nivel;

    const fino = window.matchMedia("(pointer: fine)");
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Sem mouse ou no nível leve o brilho nem aparece (o CSS o esconde): não há o que inclinar.
    if (nivel !== "completo" || !fino.matches) return;

    // Uma entrada por superfície tocada; sai quando a luz volta ao repouso.
    const inclinacoes = new Map<HTMLElement, Inclinacao>();
    let foco: HTMLElement | null = null;

    /** Deixa de seguir o ponteiro: a luz de `el` volta ao centro. */
    const soltar = (el: HTMLElement | null) => {
      const s = el && inclinacoes.get(el);
      if (s) s.alvo = 0;
    };

    const aoMover = (e: PointerEvent) => {
      if (e.pointerType === "touch" || reduzido.matches) return;
      const el = e.target instanceof Element ? e.target.closest<HTMLElement>(".mv-brilho") : null;
      if (el !== foco) {
        soltar(foco);
        foco = el;
        relogio.acordar();
      }
      if (!el) return;
      const caixa = el.getBoundingClientRect();
      const s = inclinacoes.get(el) ?? { atual: 0, alvo: 0 };
      s.alvo = posicaoNaSuperficie(e.clientX, caixa.left, caixa.width) * LUZ_ALCANCE_PCT;
      inclinacoes.set(el, s);
      relogio.acordar();
    };

    const aoSair = () => {
      for (const el of inclinacoes.keys()) soltar(el);
      foco = null;
      relogio.acordar();
    };

    const desassinar = relogio.assinar({
      tick(dt) {
        let movendo = false;
        for (const [el, s] of inclinacoes) {
          if (!el.isConnected) {
            inclinacoes.delete(el);
            continue;
          }
          s.atual = aproximar(s.atual, s.alvo, dt, tauAtual() * LUZ_TAU_FATOR, LUZ_EPSILON_PCT);
          if (s.atual === 0 && s.alvo === 0) {
            el.style.removeProperty("--mv-luz-p");
            inclinacoes.delete(el);
            continue;
          }
          el.style.setProperty("--mv-luz-p", `${s.atual.toFixed(2)}%`);
          if (s.atual !== s.alvo) movendo = true;
        }
        return movendo;
      },
    });

    document.addEventListener("pointermove", aoMover, { passive: true });
    document.documentElement.addEventListener("pointerleave", aoSair);
    return () => {
      document.removeEventListener("pointermove", aoMover);
      document.documentElement.removeEventListener("pointerleave", aoSair);
      desassinar();
      for (const el of inclinacoes.keys()) el.style.removeProperty("--mv-luz-p");
    };
  }, []);
  return null;
}
