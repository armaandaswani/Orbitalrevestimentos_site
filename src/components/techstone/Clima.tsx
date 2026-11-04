"use client";

import type { CSSProperties } from "react";
import { useProgresso } from "@/components/ds/useProgresso";

/**
 * "Desenvolvida para a Amazônia": o clima daqui passa pela pedra.
 *
 * Seção alta (seis telas) com um quadro preso na tela. Sobre a textura real da
 * TechStone Travertino Romano Clássico, escurecida, entra uma preocupação por
 * vez, cada uma com a sua luz: o sol a pino (luz de cima, sombra que encurta),
 * a névoa da umidade, o âmbar do calor e o vaivém frio e quente dos ciclos
 * térmicos. No fim ficam as quatro juntas. O useProgresso passa a rolagem,
 * já suavizada, para o CSS (globals.css › TechStone: clima pela pedra); aqui
 * só há marcação.
 *
 * Acessibilidade: os quadros de cada preocupação são só a encenação e ficam
 * aria-hidden. A lista do resumo é a versão acessível, com um h3 e um p por
 * preocupação, e é ela que aparece sozinha quando o movimento é reduzido.
 */

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** Trecho da rolagem (fração de --p) de cada preocupação: 0,18 para cada uma. */
const INICIO = 0.14;
const PASSO = 0.18;

export default function Clima({ preocupacoes }: { preocupacoes: { titulo: string; texto: string }[] }) {
  const ref = useProgresso<HTMLElement>();
  return (
    <section ref={ref} aria-labelledby="ts-amazonia" className="ts-clima relative h-[600svh] bg-[#141210] text-white">
      <div className="ts-clima-quadro sticky top-0 h-[100svh] overflow-hidden">
        {/* 1. A pedra: textura real, escurecida. Retrato no celular, deitada no computador. */}
        <div className="ts-clima-fundo absolute inset-0">
          <picture>
            <source media="(max-width: 767px)" srcSet="/images/techstone/clima/pedra-retrato-v1.webp" />
            <img
              src="/images/techstone/clima/pedra-paisagem-v1.webp"
              alt="Textura da TechStone Travertino Romano Clássico"
              loading="lazy"
              decoding="async"
              className="ts-clima-pedra absolute inset-0 w-full h-full object-cover"
            />
          </picture>
          <div aria-hidden className="absolute inset-0 bg-[#141210]/55" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#141210]/45 via-[#141210]/10 via-45% to-transparent" />
        </div>

        {/* 2. Sol: luz de cima e a faixa de sombra que encurta conforme ele sobe. */}
        <div aria-hidden className="ts-clima-camada ts-clima-sol absolute inset-0">
          <div className="ts-clima-sol-luz absolute inset-0" />
          <div className="ts-clima-sol-sombra absolute inset-x-0 bottom-0 h-[70%]" />
        </div>

        {/* 3. Névoa: três véus macios que derivam em velocidades diferentes. */}
        <div aria-hidden className="ts-clima-camada ts-clima-nevoa absolute inset-0">
          <div className="ts-clima-veu ts-clima-veu-1 absolute inset-y-0 -left-[20%] w-[140%]" />
          <div className="ts-clima-veu ts-clima-veu-2 absolute inset-y-0 -left-[20%] w-[140%]" />
          <div className="ts-clima-veu ts-clima-veu-3 absolute inset-y-0 -left-[20%] w-[140%]" />
        </div>

        {/* 4. Calor: âmbar em luz suave e um brilho quente. Sem invólucro, para a mescla agir na pedra. */}
        <div aria-hidden className="ts-clima-camada ts-clima-calor ts-clima-ambar absolute inset-0" />
        <div aria-hidden className="ts-clima-camada ts-clima-calor ts-clima-brilho absolute inset-0" />

        {/* 5. Ciclos: frio e quente se alternam duas vezes; a onda se desenha embaixo do texto.
            Sem vector-effect="non-scaling-stroke": no Chrome ele mede o tracejado na tela e o
            pathLength deixa de valer (sobra um pedaço da onda na ponta direita). O traço de 1,8
            no viewBox achatado dá cerca de 1 px. */}
        <div aria-hidden className="ts-clima-camada ts-clima-ciclo ts-clima-frio absolute inset-0" />
        <div aria-hidden className="ts-clima-camada ts-clima-ciclo ts-clima-quente ts-clima-ambar absolute inset-0" />
        <svg aria-hidden viewBox="0 0 1000 100" preserveAspectRatio="none" overflow="visible"
          className="ts-clima-camada ts-clima-onda absolute inset-x-0 bottom-[3svh] h-[6svh] w-full">
          <path d="M0 50 Q125 -10 250 50 T500 50 T750 50 T1000 50" pathLength={1} fill="none"
            stroke="white" strokeOpacity={0.6} strokeWidth={1.8} className="ts-clima-onda-traco" />
        </svg>

        {/* Abertura da seção. */}
        <div className="ts-clima-texto ts-clima-intro absolute inset-x-0 bottom-0 ds-wrap pb-[12svh]" style={{ "--a": -1, "--b": INICIO } as Vars}>
          <h2 id="ts-amazonia" className="font-serif text-t1 max-w-[20ch] text-balance">Desenvolvida para a Amazônia.</h2>
          <p className="mt-5 text-lead text-white/90 max-w-[50ch]">
            Somos de Manaus e sabemos o que o clima daqui faz com um revestimento. Estas foram as nossas preocupações ao trazer a TechStone.
          </p>
        </div>

        {/* Uma preocupação por vez (encenação; a versão lida é o resumo abaixo). */}
        {preocupacoes.map((c, i) => (
          <div key={c.titulo} aria-hidden className="ts-clima-texto ts-clima-passo absolute inset-x-0 bottom-0 ds-wrap pb-[12svh]"
            style={{ "--a": INICIO + i * PASSO, "--b": INICIO + (i + 1) * PASSO } as Vars}>
            <p className="font-serif text-display max-w-[18ch] text-balance">{c.titulo}</p>
            <p className="mt-4 text-lead text-white/90 max-w-[38ch]">{c.texto}</p>
          </div>
        ))}

        {/* As quatro juntas: a lista acessível da seção. */}
        <ul className="ts-clima-resumo absolute inset-x-0 bottom-0 ds-wrap pb-[12svh] grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-8 lg:grid-cols-4">
          {preocupacoes.map((c, i) => (
            <li key={c.titulo} className="ts-clima-item border-t border-white/25 pt-5" style={{ "--i": i } as Vars}>
              <h3 className="font-serif text-t3">{c.titulo}</h3>
              <p className="mt-3 text-corpo text-white/85 max-w-[36ch]">{c.texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
