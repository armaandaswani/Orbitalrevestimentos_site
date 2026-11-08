"use client";

import { useState } from "react";
import Image from "next/image";
import { AGUA } from "@/lib/pfb-textos";

/** Recorte centrado no aquário: nas três fotos ele vai de y ≈ 400 a 1620 de 1935. */
const AGUA_FOCO = "50% 52%";
/** Passos do controle entre duas horas (0h = 0, 24h = 100, 48h = 200). */
const PASSO = 100;

/**
 * Capítulo 5 da página do PFB: teste de água (v2, 08/11/2026). Azul-noite.
 *
 * A foto ocupa a largura da tela no celular (quadrada) e a coluna da direita no
 * computador (3:4). As três fotos (0h, 24h, 48h; o Painel à esquerda, o MDF à
 * direita) ficam empilhadas e o controle de arrastar troca uma pela outra
 * enquanto anda: a opacidade de cada foto é 1 − |posição − hora|, então entre
 * duas horas as duas se misturam e numa hora só ela aparece. Ao soltar, o
 * controle encaixa na hora mais perto. Os três rótulos embaixo do controle são
 * botões (`aria-pressed`) que levam a foto à sua hora, com 300 ms de troca.
 *
 * Sem JavaScript, a foto de 0h fica visível. Sem "Imagens ilustrativas." (pedido
 * do dono, 08/11/2026); o `alt` de cada foto continua dizendo que é gerada por IA.
 */
export default function AguaPfb() {
  const [pos, setPos] = useState(0);
  const [suave, setSuave] = useState(false);
  const fim = (AGUA.horas.length - 1) * PASSO;
  const hora = Math.round(pos / PASSO);
  const irPara = (p: number, comTroca: boolean) => {
    setSuave(comTroca);
    setPos(Math.min(fim, Math.max(0, p)));
  };

  return (
    <section
      id="agua"
      data-capitulo="agua"
      aria-labelledby="pfb-agua-titulo"
      className="bg-[#0B1F45] text-white pt-12 pb-10 lg:py-24"
    >
      <div className="lg:ds-wrap lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-center lg:gap-x-24">
        <div className="ds-wrap lg:w-auto lg:max-w-none lg:px-0 lg:row-start-1 lg:col-start-1">
          <h2 id="pfb-agua-titulo" className="font-serif pfb-t1 text-white">
            {AGUA.titulo}
          </h2>
          <p className="pfb-corpo text-[#F6F5F2]/80 mt-3 lg:mt-6">{AGUA.frase}</p>
        </div>
        <div className="relative mt-6 aspect-square w-full overflow-hidden lg:mt-0 lg:row-span-2 lg:col-start-2 lg:aspect-[3/4]">
          {AGUA.horas.map(({ rotulo, alt }, i) => {
            const op = Math.max(0, 1 - Math.abs(pos / PASSO - i));
            return (
              <figure
                key={rotulo}
                data-teste="agua-foto"
                data-hora={rotulo}
                className={`absolute inset-0 m-0 ${suave ? "pfb-agua-troca" : ""}`}
                style={{ opacity: op }}
              >
                <Image
                  src={`/images/pfb/pfb-teste-agua-${rotulo}.jpg`}
                  alt={alt}
                  fill
                  sizes="(min-width: 1024px) 480px, 100vw"
                  className="object-cover"
                  style={{ objectPosition: AGUA_FOCO }}
                />
              </figure>
            );
          })}
        </div>
        <div className="ds-wrap mt-4 lg:w-full lg:max-w-[26rem] lg:px-0 lg:mt-10 lg:row-start-2 lg:col-start-1 lg:self-start">
          <input
            type="range"
            min={0}
            max={fim}
            step={1}
            value={pos}
            aria-label={AGUA.controle}
            aria-valuetext={AGUA.horas[hora].rotulo}
            onChange={(e) => irPara(Number(e.target.value), false)}
            onPointerUp={() => irPara(hora * PASSO, true)}
            onKeyUp={() => irPara(hora * PASSO, true)}
            onTouchEnd={() => irPara(hora * PASSO, true)}
            className="pfb-agua-controle"
          />
          <div className="mt-1 flex justify-between">
            {AGUA.horas.map(({ rotulo }, i) => (
              <button
                key={rotulo}
                type="button"
                data-teste="agua-hora"
                aria-pressed={pos === i * PASSO}
                onClick={() => irPara(i * PASSO, true)}
                className={`min-h-11 min-w-11 pfb-legenda tabular-nums ${i === 0 ? "text-left" : i === AGUA.horas.length - 1 ? "text-right" : "text-center"} ${
                  hora === i ? "text-white" : "text-[#F6F5F2]/55"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
