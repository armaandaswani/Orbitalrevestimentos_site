"use client";

import { useCallback, useState } from "react";
import Abertura from "./Abertura";
import Camadas from "./Camadas";
import ClimaCarbon from "./ClimaCarbon";
import Modelos from "./Modelos";
import Encaixe from "@/components/techstone/Encaixe";
import Revelar from "@/components/projetos/Revelar";
import ListaEsperaSheet from "@/components/ListaEsperaSheet";
import { CATALOGO_ESPERA_CARBON, FOTO_MIOLO, TEXTOS } from "@/lib/pfb-carbon";

/**
 * Página do PFB Carbon (Luxury Line, pré-lançamento), montada como
 * apresentação: cada seção encaixa na tela (Encaixe) e as de quadro tocam
 * sozinhas (useToque). Ordem: abertura → o miolo (foto real) → as camadas →
 * o clima da Amazônia → a placa em números → as madeiras → lista de espera →
 * perguntas. Os modelos moram no catálogo (/pfb-carbon/catalogo).
 *
 * Textos e números vêm de lib/pfb-carbon: só o que o dono afirmou. Nenhum
 * número de temperatura, umidade, fogo ou resistência até haver laudo.
 */
export default function PfbCarbon() {
  // Lista de espera: aberta por qualquer botão da página.
  const [aberto, setAberto] = useState(false);
  const abrirEspera = useCallback(() => setAberto(true), []);
  const fecharEspera = useCallback(() => setAberto(false), []);

  return (
    <div className="cbn escala-contida">
      <Encaixe />
      <Abertura entrarNaLista={abrirEspera} />

      {/* Foto real do corte (não gerada): a faixa flutua no escuro, de ponta a ponta no celular. */}
      <section aria-labelledby="cbn-miolo-titulo" className="ts-encaixe-ponto flex min-h-[100svh] flex-col justify-center bg-[#131211] pt-28 pb-16 lg:pt-24">
        <Revelar className="ds-wrap w-full">
          <h2 id="cbn-miolo-titulo" className="font-serif font-normal text-t1 text-[#F2EEE6] max-w-[16ch] text-balance">{TEXTOS.miolo.titulo}</h2>
        </Revelar>
        <Revelar efeito="surge" className="mt-8 lg:mt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FOTO_MIOLO.faixa.src} alt={TEXTOS.miolo.alt} width={FOTO_MIOLO.faixa.largura} height={FOTO_MIOLO.faixa.altura}
            loading="lazy" decoding="async" className="cbn-miolo-faixa mx-auto block object-cover" />
        </Revelar>
        <Revelar ordem={1} className="ds-wrap mt-8 w-full lg:mt-10 lg:flex lg:items-end lg:justify-between lg:gap-12">
          <p className="text-lead text-[#F2EEE6]/80 max-w-[40ch]">{TEXTOS.miolo.texto}</p>
          <p className="mt-4 shrink-0 text-sobre text-[#B08D57] lg:mt-0">{TEXTOS.miolo.legenda}</p>
        </Revelar>
      </section>

      <Camadas />

      <ClimaCarbon />

      <section aria-labelledby="cbn-numeros-titulo" className="ts-encaixe-ponto grid bg-[#131211] pt-28 lg:min-h-[100svh] lg:grid-cols-2 lg:pt-0">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#0C0B0A] lg:aspect-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FOTO_MIOLO.estudio.src} alt={TEXTOS.numeros.alt} loading="lazy" decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[88%_50%]" />
        </div>
        <div className="ds-wrap flex flex-col justify-center py-12 lg:max-w-none lg:px-[clamp(2rem,5vw,6rem)] lg:py-24">
          <h2 id="cbn-numeros-titulo" className="font-serif font-normal text-t1 text-[#F2EEE6]">{TEXTOS.numeros.titulo}</h2>
          <dl className="mt-8 grid grid-cols-2 gap-x-5 sm:gap-x-8">
            {TEXTOS.numeros.itens.map((n, i) => (
              <Revelar key={n.rotulo} ordem={i} className="border-t border-[#B08D57]/40 py-5">
                <dt className="text-legenda text-[#F2EEE6]/60">{n.rotulo}</dt>
                <dd className="mt-2 font-serif text-[#F2EEE6] text-[clamp(1.25rem,0.9rem+1.6vw,2.375rem)] leading-tight tracking-[-0.01em] tabular-nums whitespace-nowrap">
                  {"prefixo" in n && <span className="block font-sans text-legenda tracking-normal text-[#F2EEE6]/60 sm:mr-2 sm:inline">{n.prefixo}</span>}
                  {n.valor}
                </dd>
              </Revelar>
            ))}
          </dl>
          <p className="mt-6 text-lead text-[#F2EEE6]/80 max-w-[36ch]">{TEXTOS.numeros.uso}</p>
          <p className="mt-6 text-sobre text-[#B08D57]">{TEXTOS.numeros.nota}</p>
        </div>
      </section>

      <Modelos />

      <section id="lista" aria-labelledby="cbn-lista-titulo" data-encaixe="solto" className="ts-encaixe-ponto ds-secao scroll-mt-20 border-t border-[#B08D57]/30 bg-[#131211]">
        <div className="ds-wrap flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="cbn-lista-titulo" className="font-serif font-normal text-t1 text-[#F2EEE6] max-w-[16ch] text-balance">{TEXTOS.lista.titulo}</h2>
            <p className="mt-5 text-lead text-[#F2EEE6]/75 max-w-[44ch]">{TEXTOS.lista.texto}</p>
          </div>
          <button type="button" onClick={abrirEspera} className="ds-botao cbn-botao min-h-12 px-8 self-start sm:min-h-14 sm:px-10 shrink-0">
            {TEXTOS.lista.botao}
          </button>
        </div>
      </section>

      <section aria-labelledby="cbn-perguntas" data-encaixe="solto" className="ts-encaixe-ponto mv-adiado bg-[#F2EEE6]">
        <div className="ds-wrap ds-secao">
          <h2 id="cbn-perguntas" className="font-serif font-normal text-t2 text-[#1C1A18]">Perguntas</h2>
          <div className="mt-8 border-t border-[#1C1A18]/15">
            {TEXTOS.perguntas.map((p) => (
              <details key={p.q} className="group border-b border-[#1C1A18]/15">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 font-serif text-t3 text-[#1C1A18]">
                  {p.q}
                  <span aria-hidden className="text-2xl leading-none text-[#8A6A3B] transition-transform motion-reduce:transition-none group-open:rotate-45">+</span>
                </summary>
                <p className="pb-6 text-corpo text-[#4A4540] max-w-[62ch]">{p.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <ListaEsperaSheet
        aberto={aberto}
        fechar={fecharEspera}
        linha="carbon"
        nomeLinha="PFB Carbon"
        catalogo={CATALOGO_ESPERA_CARBON}
        modelosIniciais={[]}
      />
    </div>
  );
}
