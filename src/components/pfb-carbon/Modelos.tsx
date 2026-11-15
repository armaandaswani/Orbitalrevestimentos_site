"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import BotaoToque from "@/components/techstone/BotaoToque";
import { useToque } from "@/components/ds/useToque";
import { CATALOGO_CARBON, MODELOS_CARBON, TEXTOS, textura } from "@/lib/pfb-carbon";

/** Duração da seção, em ms: uns 2 s por madeira. */
const DURACAO = 10000;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * Fração do --p que cada madeira ocupa. As frações fixas de --i em
 * globals.css (PFB Carbon: modelos) saem daqui: se mudar, mude lá também.
 */
const PASSO = 0.18;

/**
 * "Cinco madeiras": as placas em pé, lado a lado, na proporção real
 * (1,20 × 2,80 m). Toca sozinha (useToque): uma madeira acende por vez, com o
 * nome; no fim as cinco ficam acesas. No computador as cinco cabem na tela; em
 * tela estreita a fila desliza (transform) para trazer a da vez ao centro. As
 * marcas embaixo levam a uma madeira e pausam ali. Cada placa abre o catálogo
 * naquele modelo.
 *
 * Com movimento reduzido, sem JavaScript ou em tela baixa, a fila vira uma
 * faixa que rola de lado com o dedo (globals.css).
 */
export default function Modelos() {
  const { ref, estado, alternar, ir } = useToque<HTMLElement>(DURACAO);
  return (
    <section ref={ref} aria-labelledby="cbn-modelos-titulo" className="cbn-modelos cbn-toca ts-encaixe-ponto relative min-h-[100svh] bg-[#131211]">
      <div className="flex min-h-[100svh] flex-col justify-center pt-20 pb-20 lg:pt-24">
        <div className="ds-wrap flex w-full items-end justify-between gap-6">
          <h2 id="cbn-modelos-titulo" className="font-serif font-normal text-t1 text-[#F2EEE6]">{TEXTOS.modelos.titulo}</h2>
          <Link href={CATALOGO_CARBON} className="cbn-link inline-flex items-center min-h-11 shrink-0 text-corpo">
            {TEXTOS.modelos.link}
          </Link>
        </div>

        <div className="cbn-mod-trilho mt-8 lg:mt-10">
          <ul className="cbn-mod-fila">
            {MODELOS_CARBON.map((m, k) => (
              <li key={m.slug} className="cbn-mod-placa" style={{ "--a": k === 0 ? -1 : k * PASSO, "--b": (k + 1) * PASSO } as Vars}>
                <Link href={`${CATALOGO_CARBON}#${m.slug}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B08D57]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={textura(m)} alt={`Placa do PFB Carbon no modelo ${m.nome}`} width={600} height={1400} loading="lazy" decoding="async" className="cbn-mod-img block w-full object-cover" />
                  <span className="cbn-mod-nome mt-4 block font-serif text-[1.0625rem] leading-snug text-[#F2EEE6] lg:text-t3">{m.nome}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <ol className="ds-wrap mt-3 flex w-full justify-center lg:mt-5">
          {MODELOS_CARBON.map((m, k) => (
            <li key={m.slug}>
              <button type="button" onClick={() => ir(k * PASSO + 0.05)} aria-label={`Ver a madeira ${m.nome}`}
                className="grid h-11 w-11 place-items-center focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#B08D57]">
                <span aria-hidden className="cbn-mod-marca block h-px w-7 bg-[#F2EEE6]" style={{ "--a": k === 0 ? -1 : k * PASSO, "--b": (k + 1) * PASSO } as Vars} />
              </button>
            </li>
          ))}
        </ol>
      </div>
      <BotaoToque estado={estado} alternar={alternar} nome="as madeiras do PFB Carbon" />
    </section>
  );
}
