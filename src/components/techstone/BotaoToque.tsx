"use client";

import type { EstadoToque } from "@/lib/movimento/toque";

/**
 * Pausa das seções que tocam sozinhas: pausar, continuar ou, no fim, ver de
 * novo. Canto inferior esquerdo (o direito é do chat). Some com movimento
 * reduzido, quando a seção já fica parada no fim (globals.css › TechStone).
 */
export default function BotaoToque({ estado, alternar, nome }: {
  estado: EstadoToque;
  alternar: () => void;
  /** Nome da seção, para o leitor de tela. */
  nome: string;
}) {
  const acao = estado === "tocando" ? "Pausar" : estado === "fim" ? "Ver de novo" : "Continuar";
  return (
    <button type="button" onClick={alternar} aria-label={`${acao}: ${nome}`} title={acao}
      className="ts-botao-toque absolute z-10 left-[clamp(1rem,3vw,2.5rem)] bottom-[max(1.25rem,3svh)] grid place-items-center size-11 rounded-full border border-white/35 bg-[#141210]/35 text-white backdrop-blur-sm hover:bg-[#141210]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
      <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {estado === "tocando" ? (
          <path d="M5.5 3.5v9M10.5 3.5v9" />
        ) : estado === "fim" ? (
          <path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.5 2.5v2.6h2.6" />
        ) : (
          <path d="M5 3.2v9.6L12.5 8z" />
        )}
      </svg>
    </button>
  );
}
