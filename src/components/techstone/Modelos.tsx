"use client";

import { useState } from "react";
import {
  FORMATOS, MODELOS_TECHSTONE, texturaDownload, texturaMiniatura, type FormatoTechStone,
} from "@/lib/techstone";

/**
 * Os modelos que estão chegando, por formato. Cada um tem a textura para
 * baixar (render e apresentação) e "Tenho interesse", que abre a lista de
 * espera com o modelo já marcado.
 */
export default function Modelos({ interesse }: {
  /** Abre a lista de espera com este modelo já marcado. */
  interesse: (nome: string) => void;
}) {
  const [formato, setFormato] = useState<FormatoTechStone>("1200x600");
  const lista = MODELOS_TECHSTONE.filter((m) => m.formato === formato);
  const info = FORMATOS.find((f) => f.value === formato)!;

  return (
    <section id="modelos" aria-labelledby="ts-modelos" className="bg-[#EFEBE4] ds-secao">
      <div className="ds-wrap">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="ts-modelos" className="font-serif text-t1 text-[#22201C]">Os modelos que estão chegando.</h2>
            <p className="mt-3 text-corpo text-[#4A4540] max-w-[46ch]">
              Baixe a textura para o seu render ou a sua apresentação. A cor real pode variar um pouco em relação à tela.
            </p>
          </div>
          <div role="tablist" aria-label="Formato da placa" className="inline-flex self-start border border-[#22201C]/25">
            {FORMATOS.map((f) => (
              <button key={f.value} type="button" role="tab" aria-selected={formato === f.value}
                onClick={() => setFormato(f.value)}
                className={`min-h-11 px-5 text-legenda font-semibold transition-colors ${formato === f.value ? "bg-[#22201C] text-white" : "text-[#22201C] hover:bg-[#22201C]/5"}`}>
                {f.rotulo}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-6 text-legenda text-[#8C7B63]">{info.rotulo} · {info.medida} · {lista.length} modelos</p>

        <ul role="tabpanel" className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {lista.map((m) => {
            return (
              <li key={m.slug}>
                <div className="relative aspect-[1/2] overflow-hidden bg-[#D9D1C4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={texturaMiniatura(m)} alt={`Textura TechStone ${m.nome}`} loading="lazy" decoding="async"
                    className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <h3 className="mt-3 font-serif text-[1.0625rem] leading-snug text-[#22201C]">{m.nome}</h3>
                <div className="mt-2 flex flex-col items-start">
                  <a href={texturaDownload(m)} download className="min-h-10 inline-flex items-center text-legenda text-[#22201C] underline underline-offset-4 decoration-[#22201C]/30 hover:decoration-[#22201C]">
                    Baixar textura
                  </a>
                  <button type="button" onClick={() => interesse(m.nome)}
                    className="min-h-10 inline-flex items-center text-legenda font-semibold text-[#1F7A44] hover:text-[#22201C]">
                    Tenho interesse
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
