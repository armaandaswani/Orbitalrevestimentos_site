"use client";

import { useEffect, useState } from "react";

/**
 * Botão fixo no rodapé da tela, só no celular.
 * Aparece depois que o topo sai da tela e some quando o formulário aparece —
 * não faz sentido chamar para a lista com a lista já na frente da pessoa.
 * Fica à esquerda do botão do chat (fixed bottom-6 right-6), na mesma altura.
 */
export default function CtaFixo() {
  const [topoVisivel, setTopoVisivel] = useState(true);
  const [formVisivel, setFormVisivel] = useState(false);

  useEffect(() => {
    const topo = document.getElementById("academia-topo");
    const form = document.getElementById("lista-de-espera");
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.target === topo) setTopoVisivel(e.isIntersecting);
        if (e.target === form) setFormVisivel(e.isIntersecting);
      }
    });
    if (topo) obs.observe(topo);
    if (form) obs.observe(form);
    return () => obs.disconnect();
  }, []);

  const mostrar = !topoVisivel && !formVisivel;

  return (
    <a
      href="#lista-de-espera"
      aria-hidden={!mostrar}
      tabIndex={mostrar ? 0 : -1}
      className={`md:hidden fixed bottom-6 left-4 right-[92px] z-40 h-14 flex items-center justify-center gap-2 bg-[#36A35C] text-[#0D1830] text-sm tracking-[0.14em] uppercase font-extrabold shadow-[0_8px_24px_rgba(0,20,43,0.35)] transition-all duration-300 ${
        mostrar ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
      }`}
    >
      Entrar na lista <span aria-hidden>→</span>
    </a>
  );
}
