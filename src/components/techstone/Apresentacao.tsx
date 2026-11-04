"use client";

import type { CSSProperties } from "react";
import Cena from "./Cena";
import { useProgresso } from "@/components/ds/useProgresso";
import { ESPESSURA_MM, MODELOS_TECHSTONE } from "@/lib/techstone";

/**
 * As duas seções de quadro fixo da TechStone: abertura e sequência de usos.
 * Cada uma é alta (várias telas) com um quadro sticky dentro; o useProgresso
 * passa a posição da rolagem, já suavizada, para o CSS (globals.css › TechStone).
 */

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** As frases da abertura, uma por vez. [início, fim] em fração da rolagem. */
const FRASES: { texto: string; a: number; b: number }[] = [
  { texto: `Pedra flexível de ${ESPESSURA_MM} mm.`, a: 0.2, b: 0.4 },
  { texto: "Em dois tamanhos.", a: 0.4, b: 0.58 },
  { texto: "Desenvolvida para a Amazônia.", a: 0.58, b: 0.76 },
];

/**
 * Abertura: a primeira tela é só a palavra "TechStone" sobre o escuro. Ao
 * rolar, a foto acende por trás, o nome sobe e encolhe, e três frases passam
 * uma de cada vez, sempre no mesmo lugar (nunca duas juntas). No fim fica o
 * convite para a lista de espera.
 */
export function Abertura({ entrarNaLista }: { entrarNaLista: () => void }) {
  const ref = useProgresso<HTMLElement>();
  return (
    <section ref={ref} aria-labelledby="ts-titulo" className="ts-abertura relative h-[560svh] bg-[#141210]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="ts-ab-foto absolute inset-0">
          <Cena nome="curva" prioridade alt="Parede curva em travertino gerada por IA a partir da textura TechStone Travertino Navona Clássico, com uma linha de luz no topo" />
          <div aria-hidden className="absolute inset-0 bg-[#141210]/45" />
        </div>

        <h1 id="ts-titulo" className="ts-ab-titulo absolute inset-x-0 top-1/2 text-center font-serif text-white leading-none tracking-[-0.025em] text-[clamp(3.25rem,1.5rem+9vw,10rem)]">
          TechStone
        </h1>

        {FRASES.map((f) => (
          <p key={f.texto} className="ts-ab-frase absolute inset-x-0 top-1/2 px-6 text-center font-serif text-white text-[clamp(1.5rem,1rem+2.6vw,3.25rem)] leading-tight tracking-[-0.015em]"
            style={{ "--a": f.a, "--b": f.b } as Vars}>
            {f.texto}
          </p>
        ))}

        <div className="ts-ab-cta absolute inset-x-0 top-1/2 px-6 flex flex-col items-center text-center">
          <p className="font-serif text-white text-[clamp(1.5rem,1rem+2.6vw,3.25rem)] leading-tight tracking-[-0.015em] max-w-[18ch]">
            Chega em breve a Manaus.
          </p>
          <p className="mt-3 text-white/75 text-corpo">Primeira remessa em quantidade limitada.</p>
          <button type="button" onClick={entrarNaLista} className="mt-7 ds-botao ds-botao-claro min-h-12">
            Entrar na lista de espera
          </button>
        </div>

        <span aria-hidden className="ts-ab-convite absolute left-1/2 bottom-8 h-12 w-px -translate-x-1/2 overflow-hidden bg-white/15">
          <span className="ts-ab-convite-luz absolute inset-x-0 top-0 h-1/2 bg-white/80" />
        </span>
      </div>
    </section>
  );
}

const QUADROS = [
  {
    cena: "coluna",
    alt: "Coluna redonda em travertino claro, gerada por IA a partir da textura TechStone Travertino Bianco Trevi, sob luz zenital",
    titulo: "Faz curva.",
    texto: "Dobra com facilidade e acompanha colunas e paredes curvas.",
  },
  {
    cena: "fachada",
    alt: "Fachada de edifício em travertino bege, gerada por IA a partir da textura TechStone Travertino Romano Clássico, sob sol a pino com jardim tropical",
    titulo: "Vai para a fachada.",
    texto: "A placa foi adaptada para o uso em fachada, sob o sol e o calor da Amazônia.",
  },
  {
    cena: "interior",
    alt: "Sala com parede de canto curvo gerada por IA a partir da textura TechStone Taj Mahal, com luz quente de abajur",
    titulo: "E para o interior.",
    texto: "Quartos, salas, halls e lojas.",
  },
  {
    cena: "madeira",
    alt: "Recepção com parede curva em madeira gerada por IA a partir da textura TechStone Nogueira Americana",
    titulo: "Pedra e madeira.",
    texto: `${MODELOS_TECHSTONE.filter((m) => m.aparencia === "pedra").length} pedras e ${MODELOS_TECHSTONE.filter((m) => m.aparencia === "madeira").length} madeiras.`,
  },
];

export function Sequencia() {
  const ref = useProgresso<HTMLElement>();
  const n = QUADROS.length;
  return (
    <section ref={ref} aria-label="Onde a TechStone vai" className="relative bg-[#141210]" style={{ height: `${n * 160 + 40}svh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {QUADROS.map((q, i) => {
          const vars: Vars = {
            "--a": i === 0 ? -1 : i / n,
            "--b": i === n - 1 ? 2 : (i + 1) / n,
            "--ia": i / n,
          };
          return (
            <div key={q.cena} className="ts-quadro absolute inset-0" style={vars}>
              {/* Carrega já: quadros invisíveis (opacidade 0) atrasariam no lazy. */}
              <Cena nome={q.cena} alt={q.alt} carregar="eager" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
              <div className="ts-quadro-texto absolute inset-x-0 bottom-0 ds-wrap pb-[max(3.5rem,10svh)]">
                <h2 className="font-serif text-white text-display max-w-[14ch]">{q.titulo}</h2>
                <p className="mt-4 text-white/85 text-lead max-w-[38ch]">{q.texto}</p>              </div>
            </div>
          );
        })}

        {/* Onde o visitante está na sequência: uma marca por quadro. */}
        <ol aria-hidden className="absolute right-[clamp(1rem,3vw,2.5rem)] top-1/2 -translate-y-1/2 flex flex-col gap-3">
          {QUADROS.map((q, i) => (
            <li key={q.cena} className="ts-trilho-marca block w-px h-10 bg-white"
              style={{ "--a": i / n, "--b": (i + 1) / n } as Vars} />
          ))}
        </ol>
      </div>
    </section>
  );
}
