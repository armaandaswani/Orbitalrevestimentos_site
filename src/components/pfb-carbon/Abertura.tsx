"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import BotaoToque from "@/components/techstone/BotaoToque";
import { useToque } from "@/components/ds/useToque";
import { CATALOGO_CARBON, MODELOS_CARBON, TEXTOS, textura } from "@/lib/pfb-carbon";

/** Duração da abertura, em ms. */
const DURACAO = 8500;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** [início, fim] de cada frase, em fração do --p. Uma por vez, no mesmo lugar. */
const JANELAS: [number, number][] = [[0.2, 0.4], [0.4, 0.58], [0.58, 0.76]];

/** Placas da parede de fundo: 2 no celular, 4 no tablet, 6 no computador. */
const PLACAS = ["", "", "hidden sm:block", "hidden sm:block", "hidden lg:block", "hidden lg:block"];

/**
 * Abertura do PFB Carbon. A primeira tela é só o nome, com o rótulo da linha,
 * sobre o escuro. Sozinha (useToque), uma parede de placas Louro Freijó acende
 * por trás, o nome sobe e três frases passam uma de cada vez. No fim ficam o
 * convite para a lista de espera e o caminho para os modelos. O CSS está em
 * globals.css › PFB Carbon.
 *
 * A parede é a textura real do modelo repetida em placas, espelhadas duas a
 * duas para o veio não se repetir igual. É fundo: aria-hidden.
 */
export default function Abertura({ entrarNaLista }: { entrarNaLista: () => void }) {
  const { ref, estado, alternar } = useToque<HTMLElement>(DURACAO);
  const madeira = textura(MODELOS_CARBON[0]);
  return (
    <section ref={ref} aria-labelledby="cbn-titulo" className="cbn-abertura cbn-toca ts-encaixe-ponto relative h-[100svh] bg-[#131211]">
      <div className="relative h-full overflow-hidden">
        <div aria-hidden className="cbn-ab-parede absolute inset-0 flex gap-px">
          {PLACAS.map((visivel, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={madeira} alt="" decoding="async" fetchPriority={i === 0 ? "high" : undefined}
              className={`h-full min-w-0 flex-1 object-cover ${visivel}`} style={i % 2 ? { transform: "scaleX(-1)" } : undefined} />
          ))}
        </div>
        <div aria-hidden className="cbn-ab-veu absolute inset-0" />
        <div aria-hidden className="cbn-ab-luz absolute inset-y-0 left-0 w-full" />

        <div className="cbn-ab-titulo absolute inset-x-0 top-1/2 text-center">
          <p className="cbn-rotulo">{TEXTOS.rotulo}</p>
          <h1 id="cbn-titulo" className="mt-4 font-serif font-normal text-[#F2EEE6] leading-none tracking-[-0.02em] text-[clamp(3rem,1.5rem+8vw,9rem)]">
            {TEXTOS.nome}
          </h1>
        </div>

        {TEXTOS.abertura.frases.map((texto, i) => (
          <p key={texto} className={`${i === 0 ? "cbn-ab-primeira " : ""}cbn-ab-frase absolute inset-x-0 top-1/2 px-6 text-center font-serif text-[#F2EEE6] text-[clamp(1.5rem,1rem+2.6vw,3.25rem)] leading-tight tracking-[-0.015em] text-balance`}
            style={{ "--a": JANELAS[i][0], "--b": JANELAS[i][1] } as Vars}>
            {texto}
          </p>
        ))}

        <div className="cbn-ab-cta absolute inset-x-0 top-1/2 px-6 flex flex-col items-center text-center">
          <p className="font-serif text-[#F2EEE6] text-[clamp(1.5rem,1rem+2.6vw,3.25rem)] leading-tight tracking-[-0.015em] text-balance">
            {TEXTOS.abertura.convite}
          </p>
          <p className="mt-3 text-[#F2EEE6]/75 text-corpo">{TEXTOS.abertura.apoio}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
            <button type="button" onClick={entrarNaLista} className="ds-botao cbn-botao min-h-12 px-8">
              {TEXTOS.abertura.botao}
            </button>
            <Link href={CATALOGO_CARBON} data-teste="ver-modelos" className="cbn-link inline-flex items-center min-h-11 text-corpo">
              {TEXTOS.abertura.modelos}
            </Link>
          </div>
        </div>

        <BotaoToque estado={estado} alternar={alternar} nome="abertura do PFB Carbon" />
      </div>
    </section>
  );
}
