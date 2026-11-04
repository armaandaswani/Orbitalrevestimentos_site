"use client";

import type { CSSProperties } from "react";
import { useProgresso } from "@/components/ds/useProgresso";

/**
 * "Desenvolvida para a Amazônia": o clima daqui passa pela pedra.
 *
 * Seção alta (seis telas) com um quadro preso na tela, sobre a textura real da
 * TechStone Travertino Romano Clássico, escurecida. Uma linha fina, a espinha
 * da seção, já está desenhada embaixo do título quando ele aparece. Com a
 * rolagem, título e linha sobem juntos e ficam presos no alto; a linha então
 * corre até um nó por preocupação, e cada preocupação sobe embaixo do seu nó,
 * com a sua luz na pedra: o sol a pino (luz de cima, sombra que encurta), a
 * névoa da umidade, o âmbar do calor e o vaivém frio e quente dos ciclos
 * térmicos. As anteriores ficam mais suaves; no fim as quatro ficam lado a
 * lado, inteiras. No celular a linha é vertical, à esquerda, e os parágrafos
 * se revezam num espaço só, embaixo dos títulos. O useProgresso passa a
 * rolagem, já suavizada, para o CSS (globals.css › TechStone: clima pela
 * pedra); aqui só há marcação.
 *
 * Acessibilidade: a lista das preocupações é o texto de verdade (um h3 e um p
 * por item), mostrado uma vez só; a linha, os nós e as luzes são aria-hidden.
 * No celular o parágrafo continua dentro do seu <li>: só a posição muda.
 */

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * Ritmo da rolagem, em fração de --p. A seção tem 600svh, então a rolagem
 * presa anda 500svh e uma tela vale 0,20. Abertura parada até 0,02, subida do
 * título de 0,02 a 0,10 (meia tela), uma preocupação a cada PASSO (uma tela)
 * a partir de INICIO, e as quatro juntas de 0,90 a 1 (meia tela). As frações
 * fixas do bloco do clima em globals.css saem destas duas constantes; se
 * mudarem, mude lá também.
 */
const INICIO = 0.1;
const PASSO = 0.2;

/**
 * Layout estático para quem não roda JavaScript: com ele a rolagem nunca anda
 * o --p e as preocupações ficariam em opacidade 0. Mesmas regras do bloco
 * `@media (scripting: none)` em globals.css (TechStone: clima pela pedra); o
 * <noscript> cobre os motores que ainda não conhecem `scripting`. O padrão
 * continua sendo o quadro preso, então quem tem JS não vê o layout trocar na
 * hidratação. Os dois blocos precisam ficar iguais.
 */
const CSS_SEM_JS = `
.ts-clima{height:auto}
.ts-clima .ts-clima-quadro{position:static;height:auto}
.ts-clima .ts-clima-pedra{transform:none}
.ts-clima .ts-clima-camada{display:none}
.ts-clima .ts-clima-palco{position:relative;padding-block:clamp(3.5rem,2rem + 4.5vw,7rem)}
.ts-clima .ts-clima-cabeca,.ts-clima .ts-clima-lead,.ts-clima .ts-clima-item,.ts-clima .ts-clima-item>p{opacity:1;transform:none}
.ts-clima .ts-clima-traco{stroke-dashoffset:0}
.ts-clima .ts-clima-no{transform:translate3d(-50%,-50%,0)}
.ts-clima .ts-clima-lista{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:2rem;row-gap:2.5rem;text-align:left}
.ts-clima .ts-clima-item{padding-inline:0}
@media (min-width:1024px){.ts-clima .ts-clima-lista{grid-template-columns:repeat(4,minmax(0,1fr));column-gap:0;text-align:center}.ts-clima .ts-clima-item{padding-inline:var(--vao)}}
@media (min-width:768px) and (max-width:1023.98px){.ts-clima .ts-clima-no{display:none}}
@media (max-width:767.98px){.ts-clima .ts-clima-cabeca{padding-bottom:0}.ts-clima .ts-clima-linha{display:none}.ts-clima .ts-clima-lista{margin-top:2rem;padding-left:1.25rem;border-left:1px solid rgb(255 255 255/.6)}.ts-clima .ts-clima-item{height:auto;display:block}.ts-clima .ts-clima-item>p{position:static;margin-top:.75rem;padding-right:0}}
@media (max-width:639.98px){.ts-clima .ts-clima-lista{grid-template-columns:minmax(0,1fr)}}
`;

export default function Clima({ preocupacoes }: { preocupacoes: { titulo: string; texto: string }[] }) {
  const ref = useProgresso<HTMLElement>();
  // Começo do trecho de cada preocupação e da seguinte (2 = nunca: a última não esmaece).
  const trecho = (i: number): Vars => ({
    "--i": i,
    "--a": INICIO + i * PASSO,
    "--s": i < preocupacoes.length - 1 ? INICIO + (i + 1) * PASSO : 2,
  });
  return (
    <section ref={ref} aria-labelledby="ts-amazonia" className="ts-clima relative h-[600svh] bg-[#141210] text-white">
      {/* Sem JavaScript: só em motor sem `scripting: none` (veja o CSS_SEM_JS). Inerte com JS. */}
      <noscript><style dangerouslySetInnerHTML={{ __html: CSS_SEM_JS }} /></noscript>
      <div className="ts-clima-quadro sticky top-0 h-[100svh] overflow-hidden">
        {/* 1. A pedra: textura real, escurecida. Retrato no celular, deitada no computador. */}
        <div className="ts-clima-fundo absolute inset-0">
          <picture>
            <source media="(max-width: 767px)" srcSet="/images/techstone/clima/pedra-retrato-v1.webp" />
            <img
              src="/images/techstone/clima/pedra-paisagem-v1.webp"
              alt=""
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

        {/* 5. Ciclos: frio e quente se alternam duas vezes. */}
        <div aria-hidden className="ts-clima-camada ts-clima-ciclo ts-clima-frio absolute inset-0" />
        <div aria-hidden className="ts-clima-camada ts-clima-ciclo ts-clima-quente ts-clima-ambar absolute inset-0" />

        {/* 6. Sombra macia no alto, atrás do texto preso: chega com a subida e segura o
            contraste do texto de apoio mesmo com o sol batendo. */}
        <div aria-hidden className="ts-clima-veu-texto absolute inset-0" />

        {/* O texto: título e linha sobem juntos; a lista fica onde termina a subida. */}
        <div className="ts-clima-palco ds-wrap absolute inset-x-0 top-0">
          <div className="ts-clima-cabeca">
            <h2 id="ts-amazonia" className="font-serif text-t1 max-w-[20ch] text-balance">Desenvolvida para a Amazônia.</h2>
            <p className="ts-clima-lead mt-5 text-lead text-white max-w-[50ch]">
              Somos de Manaus e sabemos o que o clima daqui faz com um revestimento. Estas foram as nossas preocupações ao trazer a TechStone.
            </p>

            {/* A linha: deitada do computador ao tablet, em pé no celular. Ondas iguais, então
                cada nó cai numa fração exata do comprimento (veja --f0 e --n1…--n4 no CSS).
                Sem vector-effect="non-scaling-stroke": no Chrome ele mede o tracejado na tela e
                o pathLength deixa de valer (sobra um pedaço na ponta). O traço é dado no
                viewBox para dar cerca de 1 px na tela. */}
            <div aria-hidden className="ts-clima-linha">
              <svg viewBox="0 0 1000 100" preserveAspectRatio="none" overflow="visible" className="ts-clima-onda ts-clima-onda-h">
                <path d="M0 50 Q62.5 0 125 50 T250 50 T375 50 T500 50 T625 50 T750 50 T875 50 T1000 50" pathLength={1}
                  fill="none" stroke="white" strokeOpacity={0.6} strokeWidth={2.5} className="ts-clima-traco" />
              </svg>
              <svg viewBox="0 0 100 1000" preserveAspectRatio="none" overflow="visible" className="ts-clima-onda ts-clima-onda-v">
                <path d="M50 0 Q80 50 50 100 T50 200 T50 300 T50 400 T50 500 T50 600 T50 700 T50 800 T50 900 T50 1000" pathLength={1}
                  fill="none" stroke="white" strokeOpacity={0.6} strokeWidth={4.2} className="ts-clima-traco" />
              </svg>
              {preocupacoes.map((c, i) => (
                <span key={c.titulo} className="ts-clima-no" style={trecho(i)} />
              ))}
            </div>
          </div>

          <ul className="ts-clima-lista">
            {preocupacoes.map((c, i) => (
              <li key={c.titulo} className="ts-clima-item" style={trecho(i)}>
                <h3 className="font-serif text-t3">{c.titulo}</h3>
                <p className="text-corpo text-white/85">{c.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
