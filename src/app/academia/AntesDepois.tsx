"use client";

import { useState } from "react";
import Image from "next/image";

type Par = { antes: string; depois: string; altAntes: string; altDepois: string };

/**
 * Antes/depois de uma obra real.
 *
 * No celular: uma foto grande com o botão ANTES | DEPOIS (e toque na foto para
 * trocar). No desktop: as duas lado a lado. Não é um slider de arrastar de
 * propósito — as fotos foram tiradas de posições diferentes e, sobrepostas,
 * ficariam desencontradas.
 */
export default function AntesDepois({ par, rotulo }: { par: Par; rotulo: string }) {
  const [ver, setVer] = useState<"antes" | "depois">("antes");
  const fotos = [
    { k: "antes" as const, src: par.antes, alt: par.altAntes },
    { k: "depois" as const, src: par.depois, alt: par.altDepois },
  ];

  return (
    <div>
      <div
        className="relative aspect-[3/4] md:aspect-auto md:grid md:grid-cols-2 md:gap-3 cursor-pointer md:cursor-default"
        onClick={() => setVer((v) => (v === "antes" ? "depois" : "antes"))}
      >
        {fotos.map(({ k, src, alt }) => (
          <div
            key={k}
            className={`absolute inset-0 md:relative md:inset-auto md:aspect-[3/4] overflow-hidden transition-opacity duration-500 ${
              ver === k ? "opacity-100" : "opacity-0 md:opacity-100"
            }`}
          >
            <Image src={src} alt={alt} fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
            <span
              className={`absolute top-3 left-3 text-[11px] tracking-[0.18em] uppercase font-extrabold px-3 py-1.5 ${
                k === "depois" ? "bg-[#36A35C] text-[#0D1830]" : "bg-black/70 text-white"
              }`}
            >
              {k}
            </span>
          </div>
        ))}
      </div>

      {/* Só no celular: a troca entre antes e depois. */}
      <div className="md:hidden grid grid-cols-2 mt-2 border-2 border-[#0D1830]" role="group" aria-label={`Ver ${rotulo}: antes ou depois`}>
        {fotos.map(({ k }) => (
          <button
            key={k}
            type="button"
            onClick={() => setVer(k)}
            aria-pressed={ver === k}
            className={`py-4 text-xs tracking-[0.18em] uppercase font-extrabold transition-colors ${
              ver === k ? "bg-[#0B1F45] text-white" : "bg-white text-[#0D1830]"
            }`}
          >
            {k === "depois" && ver === "antes" ? "Ver o depois →" : k}
          </button>
        ))}
      </div>
    </div>
  );
}
