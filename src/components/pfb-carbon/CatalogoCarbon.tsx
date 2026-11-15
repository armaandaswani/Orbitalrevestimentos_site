"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Lupa from "@/components/movimento/Lupa";
import ListaEsperaSheet from "@/components/ListaEsperaSheet";
import {
  CATALOGO_ESPERA_CARBON, ESPESSURA, MEDIDA, MODELOS_CARBON, PAGINA_CARBON, TEXTOS, textura, texturaDownload,
} from "@/lib/pfb-carbon";

/**
 * Catálogo do PFB Carbon: as cinco madeiras em grade, cada placa em pé na
 * proporção real, com a textura para baixar e o "Tenho interesse", que abre a
 * lista de espera com o modelo marcado. Cada cartão tem o slug como id: a
 * página da linha abre o catálogo direto num modelo (#louro-freijo). A Lupa
 * mostra a textura ampliada ao passar o mouse ou segurar o dedo.
 */
export default function CatalogoCarbon() {
  const [espera, setEspera] = useState<{ aberto: boolean; modelos: string[] }>({ aberto: false, modelos: [] });
  const abrirEspera = useCallback((modelos: string[] = []) => setEspera({ aberto: true, modelos }), []);
  const fecharEspera = useCallback(() => setEspera((e) => ({ ...e, aberto: false })), []);

  return (
    <div className="cbn min-h-[100svh] pt-28 sm:pt-32 pb-20">
      <div className="ds-wrap">
        <Link href={PAGINA_CARBON} className="cbn-link inline-flex items-center min-h-11 text-legenda">
          {TEXTOS.catalogo.voltar}
        </Link>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="cbn-rotulo">{TEXTOS.rotulo}</p>
            <h1 className="mt-3 font-serif font-normal text-t1 text-[#F2EEE6]">{TEXTOS.catalogo.titulo}</h1>
            <p className="mt-4 text-lead text-[#F2EEE6]/75 max-w-[46ch]">{TEXTOS.catalogo.lead}</p>
          </div>
          <button type="button" onClick={() => abrirEspera()} className="ds-botao cbn-botao min-h-12 px-8 whitespace-nowrap self-start lg:self-auto shrink-0">
            {TEXTOS.lista.botao}
          </button>
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-6">
          {MODELOS_CARBON.map((m, i) => (
            <li key={m.slug} id={m.slug} className="min-w-0 scroll-mt-28">
              <Lupa fonte={texturaDownload(m)}>
                <span className="relative block aspect-[3/7] overflow-hidden bg-[#1F1D1B]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={textura(m)} alt={`Textura do PFB Carbon no modelo ${m.nome}`} loading={i < 3 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : undefined} decoding="async"
                    className="absolute inset-0 w-full h-full object-cover" />
                </span>
              </Lupa>
              <h2 className="mt-4 font-serif font-normal text-[1.0625rem] leading-snug text-[#F2EEE6] lg:text-t3">{m.nome}</h2>
              <p className="mt-1 text-legenda text-[#F2EEE6]/60 tabular-nums">{MEDIDA} · {ESPESSURA}</p>
              <div className="mt-1 flex flex-col items-start">
                <a href={texturaDownload(m)} download className="cbn-link min-h-10 inline-flex items-center text-legenda">
                  {TEXTOS.catalogo.baixar}
                </a>
                <button type="button" onClick={() => abrirEspera([m.nome])}
                  className="min-h-10 inline-flex items-center text-legenda font-semibold text-[#D9B98A] hover:text-[#F2EEE6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08D57]">
                  {TEXTOS.catalogo.interesse}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-12 text-sobre text-[#F2EEE6]/45">{TEXTOS.catalogo.aviso}</p>
      </div>

      <ListaEsperaSheet
        aberto={espera.aberto}
        fechar={fecharEspera}
        linha="carbon"
        nomeLinha="PFB Carbon"
        catalogo={CATALOGO_ESPERA_CARBON}
        modelosIniciais={espera.modelos}
      />
    </div>
  );
}
