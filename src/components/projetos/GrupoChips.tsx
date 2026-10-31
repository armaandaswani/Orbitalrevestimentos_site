"use client";

/**
 * Linha de filtros em "chips". Alvo de toque de 44 px; no celular a linha rola
 * de lado, no computador quebra em várias linhas.
 */
export interface OpcaoChip {
  valor: string;
  rotulo: string;
  conta?: number;
}

export default function GrupoChips({
  rotulo, opcoes, ativo, onMudar,
}: {
  rotulo: string;
  opcoes: OpcaoChip[];
  ativo: string;
  onMudar: (valor: string) => void;
}) {
  return (
    <div role="group" aria-label={rotulo}
      className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
      <span className="text-xs tracking-[0.14em] uppercase font-bold text-on-surface-variant mr-1 flex-shrink-0">{rotulo}</span>
      {opcoes.map((o) => {
        const on = o.valor === ativo;
        return (
          <button key={o.valor} type="button" aria-pressed={on} onClick={() => onMudar(o.valor)}
            className={`flex-shrink-0 min-h-11 px-4 text-xs tracking-[0.1em] uppercase font-bold transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2347A0] ${
              on ? "bg-primary text-white" : "bg-white border border-surface-variant text-on-surface-variant hover:border-primary hover:text-primary"
            }`}>
            {o.rotulo}{o.conta != null && <span className="font-normal ml-1.5">{o.conta}</span>}
          </button>
        );
      })}
    </div>
  );
}
