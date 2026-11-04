"use client";

import { useEffect, useRef } from "react";
import { relogio, tauAtual } from "@/lib/movimento/relogio";
import { aproximar } from "@/lib/movimento/suavizar";

/**
 * Progresso de rolagem de uma seção alta com quadro fixo (sticky): 0 quando o
 * topo da seção encosta no topo da tela, 1 quando o fim dela chega ao fim da
 * tela. O valor vai direto para a variável CSS `--p` do elemento, sem passar
 * pelo React: o CSS faz o resto (opacidade e escala) com calc().
 *
 * Fluidez: a roda do mouse anda aos saltos (100 px por clique), e cada salto
 * virava um pulo na animação. Aqui o --p persegue a posição real com uma
 * aproximação suave no relógio compartilhado do site (src/lib/movimento), que
 * mede o tempo real entre quadros: a chegada dura o mesmo em telas de 60 e de
 * 144 Hz. A rolagem da página continua nativa; só o valor que o CSS lê é
 * suavizado.
 *
 * Enquanto a seção cruza a tela ela recebe `data-ativo`; é a única hora em que
 * o CSS pode usar `will-change` nos filhos. Fora da tela o assinante não mede
 * nada. Com movimento reduzido o valor segue a rolagem sem suavização e o CSS
 * desliga escalas e deslocamentos.
 */
export function useProgresso<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alvo = 0;
    let atual = -1;
    let visivel = true;

    const medir = () => {
      const r = el.getBoundingClientRect();
      const curso = r.height - window.innerHeight;
      alvo = curso > 0 ? Math.min(1, Math.max(0, -r.top / curso)) : r.top <= 0 ? 1 : 0;
    };

    const assinante = {
      tick(dt: number) {
        if (!visivel && atual >= 0) return false;
        medir();
        atual = atual < 0 ? alvo : aproximar(atual, alvo, dt, tauAtual());
        el.style.setProperty("--p", atual.toFixed(4));
        // Décimo do progresso, para o CSS ligar cliques só onde o botão já apareceu.
        const decimo = String(Math.floor(atual * 10));
        if (el.dataset.p10 !== decimo) el.dataset.p10 = decimo;
        return atual !== alvo && visivel;
      },
    };

    const acordar = () => relogio.acordar();

    const io = new IntersectionObserver((entradas) => {
      const e = entradas[entradas.length - 1];
      visivel = e.isIntersecting;
      if (visivel) el.dataset.ativo = "";
      else delete el.dataset.ativo;
      if (visivel) acordar();
    });
    io.observe(el);

    assinante.tick(0);
    const sair = relogio.assinar(assinante);
    window.addEventListener("scroll", acordar, { passive: true });
    window.addEventListener("resize", acordar);
    return () => {
      sair();
      io.disconnect();
      delete el.dataset.ativo;
      window.removeEventListener("scroll", acordar);
      window.removeEventListener("resize", acordar);
    };
  }, []);
  return ref;
}
