"use client";

import { useEffect, useState } from "react";
import { abrirContato } from "@/lib/contato";

/**
 * Botão fixo no rodapé da tela, só no celular: abre o pré-contato (a
 * inscrição na formação passa por ele). Aparece depois que o topo sai da
 * tela e some com o rodapé à vista. Só transform/opacity; fica à esquerda do
 * botão do chat (fixed bottom-6 right-6), na mesma altura.
 */
export default function CtaFixo({ texto }: { texto: string }) {
  const [topoVisivel, setTopoVisivel] = useState(true);
  const [fimVisivel, setFimVisivel] = useState(false);

  useEffect(() => {
    const topo = document.getElementById("academia-topo");
    const fim = document.querySelector("footer");
    if (typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.target === topo) setTopoVisivel(e.isIntersecting);
        if (e.target === fim) setFimVisivel(e.isIntersecting);
      }
    });
    if (topo) obs.observe(topo);
    if (fim) obs.observe(fim);
    return () => obs.disconnect();
  }, []);

  const mostrar = !topoVisivel && !fimVisivel;

  return (
    <button
      type="button"
      onClick={() => abrirContato([], { conhece: "sim" })}
      aria-hidden={!mostrar}
      tabIndex={mostrar ? 0 : -1}
      className={`md:hidden fixed bottom-6 left-4 right-[92px] z-40 h-14 flex items-center justify-center gap-2 bg-[#36A35C] text-[#0D1830] text-sm tracking-[0.14em] uppercase font-extrabold shadow-[0_8px_24px_rgba(0,20,43,0.35)] transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
        mostrar ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
      }`}
    >
      {texto} <span aria-hidden>→</span>
    </button>
  );
}
