"use client";

import { useEffect, useRef } from "react";

/**
 * Progresso de rolagem de uma seção alta com quadro fixo (sticky): 0 quando o
 * topo da seção encosta no topo da tela, 1 quando o fim dela chega ao fim da
 * tela. O valor vai direto para a variável CSS `--p` do elemento, sem passar
 * pelo React: o CSS faz o resto (opacidade, escala, recorte) com calc().
 *
 * O movimento responde só à rolagem do visitante; com movimento reduzido o
 * CSS desliga escalas e deslocamentos e deixa apenas as trocas de imagem.
 */
export function useProgresso<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let ultimo = -1;
    const medir = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const curso = r.height - window.innerHeight;
      const p = curso > 0 ? Math.min(1, Math.max(0, -r.top / curso)) : r.top <= 0 ? 1 : 0;
      const arred = Math.round(p * 1000) / 1000;
      if (arred !== ultimo) { el.style.setProperty("--p", String(arred)); ultimo = arred; }
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(medir); };
    medir();
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", pedir);
    };
  }, []);
  return ref;
}
