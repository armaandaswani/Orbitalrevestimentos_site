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
 *
 * `margem` (opcional, no formato do rootMargin): a seção conta como "na tela"
 * já essa distância antes de entrar, então o `data-ativo` (e as camadas do
 * will-change) chega fora da vista. E, ao voltar a essa faixa, o --p salta
 * para a posição real em vez de deslizar de onde parou: depois de um salto de
 * rolagem (âncora, volta ao topo) ele ficaria parado no valor antigo e a seção
 * desfiaria todas as etapas ao contrário bem na entrada. O salto acontece
 * ainda fora da vista. Sem `margem`, o comportamento é o de sempre.
 *
 * `ligado` (opcional, padrão `true`): com `false` o hook não observa nem
 * escreve nada (sem observador, sem assinante do relógio, sem ouvintes). Ao
 * passar de `true` para `false` roda a limpeza de sempre; `--p` e `data-p10`
 * ficam com o último valor. De `false` para `true` recomeça do zero e o --p
 * salta para a posição real.
 */
export function useProgresso<T extends HTMLElement>(opcoes?: { margem?: string; ligado?: boolean }) {
  const ref = useRef<T>(null);
  const margem = opcoes?.margem;
  const ligado = opcoes?.ligado ?? true;
  useEffect(() => {
    if (!ligado) return;
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
      // Com margem: voltou à faixa depois de ter saído, recomeça da posição real.
      if (margem !== undefined && e.isIntersecting && !visivel) atual = -1;
      visivel = e.isIntersecting;
      if (visivel) el.dataset.ativo = "";
      else delete el.dataset.ativo;
      if (visivel) acordar();
    }, margem !== undefined ? { rootMargin: margem } : undefined);
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
  }, [margem, ligado]);
  return ref;
}
