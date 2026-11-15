"use client";

import type { CSSProperties } from "react";
import BotaoToque from "@/components/techstone/BotaoToque";
import { useToque } from "@/components/ds/useToque";
import { MODELOS_CARBON, TEXTOS, textura } from "@/lib/pfb-carbon";

/** Duração da seção, em ms. */
const DURACAO = 11000;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** [início, fim] das duas frases que passam, em fração do --p. */
const JANELAS: [number, number][] = [[0.22, 0.42], [0.42, 0.58]];
/** A frase da composição entra aqui e fica; o fecho entra depois e fica. */
const COMPOSICAO = 0.58;
const FECHO = 0.8;

/**
 * "Aqui o clima é outro": a mensagem que o dono quer martelar. A Orbital muda
 * a composição dos materiais por causa da umidade e da temperatura da região.
 *
 * Toca sozinha (useToque). O título abre grande e sobe; a umidade e o calor
 * passam uma frase por vez, cada uma com a sua luz no fundo (uma bruma fria,
 * depois um âmbar quente); a frase da composição fica, e o fecho liga isso ao
 * PFB Carbon, com a madeira aparecendo ao fundo. O CSS está em globals.css ›
 * PFB Carbon: clima.
 *
 * Com movimento reduzido, sem JavaScript ou em tela baixa, as frases ficam
 * empilhadas, todas visíveis (mesmo bloco do CSS). As luzes são aria-hidden.
 */
export default function ClimaCarbon() {
  const { ref, estado, alternar } = useToque<HTMLElement>(DURACAO);
  const madeira = textura(MODELOS_CARBON[0]);
  return (
    <section ref={ref} aria-labelledby="cbn-clima-titulo" className="cbn-clima cbn-toca ts-encaixe-ponto relative h-[100svh] bg-[#131211]">
      <div className="cbn-cl-quadro relative h-full overflow-hidden">
        <div aria-hidden className="cbn-cl-madeira absolute inset-0 flex gap-px">
          {[0, 1, 2, 3].map((i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={madeira} alt="" loading="lazy" decoding="async"
              className={`h-full min-w-0 flex-1 object-cover ${i > 1 ? "hidden sm:block" : ""}`} style={i % 2 ? { transform: "scaleX(-1)" } : undefined} />
          ))}
        </div>
        <div aria-hidden className="cbn-cl-bruma absolute inset-0" />
        <div aria-hidden className="cbn-cl-calor absolute inset-0" />

        <div className="cbn-cl-palco absolute inset-0 px-6">
          <h2 id="cbn-clima-titulo" className="cbn-cl-titulo absolute inset-x-0 top-1/2 px-6 text-center font-serif font-normal text-[#F2EEE6] leading-[1.05] tracking-[-0.02em] text-[clamp(2.25rem,1.2rem+5.4vw,6.5rem)] text-balance">
            {TEXTOS.clima.titulo}
          </h2>

          {TEXTOS.clima.frases.slice(0, 2).map((texto, i) => (
            <p key={texto} className="cbn-cl-frase absolute inset-x-0 top-1/2 px-6 text-center font-serif text-[#F2EEE6] text-[clamp(1.5rem,1rem+2.6vw,3.25rem)] leading-tight tracking-[-0.015em] text-balance"
              style={{ "--a": JANELAS[i][0], "--b": JANELAS[i][1] } as Vars}>
              {texto}
            </p>
          ))}

          <div className="cbn-cl-final absolute inset-x-0 top-1/2 px-6 text-center">
            <p className="cbn-cl-frase mx-auto max-w-[26ch] font-serif text-[#F2EEE6] text-[clamp(1.375rem,1rem+1.7vw,2.5rem)] leading-[1.22] tracking-[-0.01em] text-balance"
              style={{ "--a": COMPOSICAO, "--b": 2 } as Vars}>
              {TEXTOS.clima.frases[2]}
            </p>
            <p className="cbn-cl-frase mx-auto mt-6 max-w-[34ch] text-lead text-[#D9B98A] text-balance lg:mt-8"
              style={{ "--a": FECHO, "--b": 2 } as Vars}>
              {TEXTOS.clima.fecho}
            </p>
          </div>
        </div>

        <BotaoToque estado={estado} alternar={alternar} nome="o clima da Amazônia" />
      </div>
    </section>
  );
}
