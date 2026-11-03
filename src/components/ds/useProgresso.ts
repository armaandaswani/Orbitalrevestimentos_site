"use client";

import { useEffect, useRef } from "react";

/**
 * Progresso de rolagem de uma seção alta com quadro fixo (sticky): 0 quando o
 * topo da seção encosta no topo da tela, 1 quando o fim dela chega ao fim da
 * tela. O valor vai direto para a variável CSS `--p` do elemento, sem passar
 * pelo React: o CSS faz o resto (opacidade e escala) com calc().
 *
 * Fluidez: a roda do mouse anda aos saltos (100 px por clique), e cada salto
 * virava um pulo na animação. Aqui o --p persegue a posição real com uma
 * aproximação suave a cada quadro (uma mola sem rebote), então a animação
 * desliza mesmo quando a rolagem vem aos trancos. A rolagem da página
 * continua nativa; só o valor que o CSS lê é suavizado.
 *
 * Fora da tela o laço para. Com movimento reduzido o valor segue a rolagem
 * sem suavização e o CSS desliga escalas e deslocamentos.
 */
export function useProgresso<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let alvo = 0;
    let atual = -1;
    let visivel = true;

    const medir = () => {
      const r = el.getBoundingClientRect();
      const curso = r.height - window.innerHeight;
      alvo = curso > 0 ? Math.min(1, Math.max(0, -r.top / curso)) : r.top <= 0 ? 1 : 0;
    };

    const quadro = () => {
      raf = 0;
      medir();
      if (atual < 0 || reduzido) atual = alvo;
      else atual += (alvo - atual) * 0.16;
      if (Math.abs(alvo - atual) < 0.0004) atual = alvo;
      el.style.setProperty("--p", atual.toFixed(4));
      // Décimo do progresso, para o CSS ligar cliques só onde o botão já apareceu.
      const decimo = String(Math.floor(atual * 10));
      if (el.dataset.p10 !== decimo) el.dataset.p10 = decimo;
      if (atual !== alvo && visivel) raf = requestAnimationFrame(quadro);
    };
    const pedir = () => { if (!raf && visivel) raf = requestAnimationFrame(quadro); };

    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      if (visivel) pedir();
    });
    io.observe(el);

    quadro();
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", pedir);
    };
  }, []);
  return ref;
}
