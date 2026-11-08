"use client";

import { useState } from "react";
import Image from "next/image";
import Revelar from "@/components/projetos/Revelar";
import { AGUA } from "@/lib/pfb-textos";

/** Recorte 3:4 centrado no aquário: nas três fotos ele vai de y ≈ 400 a 1620 de 1935. */
const AGUA_FOCO = "50% 52%";

/**
 * Capítulo 5 da página do PFB: teste de água (spec 2026-11-07-pfb-experiencia,
 * Tabela, linha 5). Azul-noite, título e frase, e as fotos de 0h, 24h e 48h
 * (o Painel à esquerda, o MDF à direita).
 *
 * Um só conjunto de três `figure`. Celular: empilhadas na mesma célula da grade,
 * só a da hora escolhida visível (troca por opacidade em 300 ms), e embaixo os
 * três botões "0h · 24h · 48h" com `aria-pressed`; começa em 0h, sem avanço
 * automático. Computador (lg): as três lado a lado em 75% da largura, com o
 * rótulo da hora no canto de cima de cada foto, e os botões somem. Sem
 * JavaScript, a foto de 0h fica visível.
 *
 * Altura no celular (teto de 680 px): com a foto de 300 × 400 o `alturas.mjs`
 * acusou 735 px a 390; 270 × 360 dá 695 (só a foto muda), ainda acima. Fica o
 * último ajuste pré-aprovado do capítulo 5 (P1): foto de 240 × 320 e o aviso na
 * mesma linha dos botões, à direita.
 */
export default function AguaPfb() {
  const [ativa, setAtiva] = useState(0);
  return (
    <section
      id="agua"
      data-capitulo="agua"
      aria-labelledby="pfb-agua-titulo"
      className="bg-[#0B1F45] text-white py-12 lg:py-24"
    >
      <div className="ds-wrap">
        <h2 id="pfb-agua-titulo" className="font-serif pfb-t1 text-white">
          {AGUA.titulo}
        </h2>
        <p className="pfb-corpo text-[#F6F5F2]/85 mt-6 lg:mt-8">{AGUA.frase}</p>
        <Revelar efeito="desvela" className="mt-6 lg:mt-8">
          <div className="grid grid-cols-[minmax(0,240px)] lg:grid-cols-3 lg:w-[75%] lg:gap-x-6">
            {AGUA.horas.map(({ rotulo, legenda, alt }, i) => (
              <figure
                key={rotulo}
                data-teste="agua-foto"
                data-hora={rotulo}
                className={`col-start-1 row-start-1 lg:col-start-auto lg:row-start-auto lg:opacity-100 transition-opacity duration-300 motion-reduce:transition-none ${
                  i === ativa ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden">
                  <Image
                    src={`/images/pfb/pfb-teste-agua-${rotulo}.jpg`}
                    alt={alt}
                    fill
                    sizes="(min-width: 1024px) 288px, 240px"
                    className="object-cover"
                    style={{ objectPosition: AGUA_FOCO }}
                  />
                  <span className="hidden lg:block absolute top-0 left-0 bg-white text-[#0B1F45] pfb-legenda font-semibold px-2 py-1">
                    {rotulo}
                  </span>
                </div>
                <figcaption className="pfb-legenda text-[#F6F5F2]/70 mt-2">{legenda}</figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-4 lg:mt-6">
            <div className="-ml-2 flex items-center lg:hidden">
              {AGUA.horas.map(({ rotulo }, i) => (
                <span key={rotulo} className="flex items-center">
                  {i > 0 && (
                    <span aria-hidden="true" className="px-1 text-[#F6F5F2]/50">
                      ·
                    </span>
                  )}
                  <button
                    type="button"
                    data-teste="agua-hora"
                    aria-pressed={i === ativa}
                    onClick={() => setAtiva(i)}
                    className={`min-h-11 px-2 pfb-corpo tabular-nums ${
                      i === ativa ? "text-white underline decoration-1 underline-offset-4" : "text-[#F6F5F2]/60"
                    }`}
                  >
                    {rotulo}
                  </button>
                </span>
              ))}
            </div>
            <p className="pfb-legenda text-[#F6F5F2]/60">{AGUA.aviso}</p>
          </div>
        </Revelar>
      </div>
    </section>
  );
}
