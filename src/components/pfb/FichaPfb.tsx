import Revelar from "@/components/projetos/Revelar";
import SolicitarManual from "@/components/SolicitarManual";
import { FICHA, FICHA_COMPLETA } from "@/lib/pfb-textos";

/**
 * Capítulo 4 da página do PFB: ficha técnica (spec 2026-11-07-pfb-experiencia,
 * Tabela, linha 4). Azul-noite. Os cinco números: o primeiro (72,3 MPa) sozinho
 * em cima, em destaque, e os outros quatro em 2 × 2; cada um com a linha
 * `#2347A0` de 2 px à esquerda, o valor em Noto Serif e a frase em legenda
 * embaixo (o `dt` vem primeiro no DOM e `flex-col-reverse` o põe embaixo). Entram
 * subindo, um depois do outro; sem contagem.
 *
 * Depois: a ressalva, o bloco que abre ao tocar (`details` nativo, fechado ao
 * carregar; o "+" gira 45° quando abre, `.pfb-mais`) com os nove pares da ficha
 * completa, e o cartão do manual. No computador, duas colunas: números à
 * esquerda; ressalva, bloco e cartão à direita.
 *
 * Altura no celular (teto de 680 px): o ajuste pré-aprovado do capítulo 4 (P1)
 * está aplicado, porque o `alturas.mjs` acusou 767 px a 390: vão de 16 px entre
 * os blocos (dos números até o cartão) e o cartão do manual numa linha só
 * (com o botão de 16 px de lado no celular, o nome cabe em duas linhas). Medido
 * depois: 669 px a 390.
 */
export default function FichaPfb() {
  return (
    <section
      id="ficha"
      data-capitulo="ficha"
      aria-labelledby="pfb-ficha-titulo"
      className="bg-[#0B1F45] text-white py-12 lg:py-24"
    >
      <div className="ds-wrap">
        <h2 id="pfb-ficha-titulo" className="font-serif pfb-t1 text-white">
          {FICHA.titulo}
        </h2>
        <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-2 lg:gap-x-16 lg:items-start">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:gap-x-8 lg:gap-y-8">
            {FICHA.numeros.map(({ valor, frase }, i) => (
              <Revelar
                key={valor}
                ordem={i}
                className={`flex flex-col-reverse justify-end border-l-2 border-[#2347A0] pl-3 ${i === 0 ? "col-span-2" : ""}`}
              >
                <dt className="pfb-legenda text-[#F6F5F2]/70">{frase}</dt>
                <dd className={`font-serif text-white ${i === 0 ? "pfb-num-destaque" : "pfb-num"}`}>{valor}</dd>
              </Revelar>
            ))}
          </dl>
          <div className="mt-4 flex flex-col gap-4 lg:mt-0 lg:gap-6">
            <p className="pfb-legenda text-[#F6F5F2]/80">{FICHA.ressalva}</p>
            <details data-teste="ficha-completa">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 border-b border-[#F6F5F2]/30 font-serif text-[1.0625rem] leading-[1.375rem] text-white [&::-webkit-details-marker]:hidden">
                {FICHA_COMPLETA.resumo}
                <span aria-hidden="true" className="pfb-mais text-[1.5rem] leading-none">
                  +
                </span>
              </summary>
              <dl className="mt-2 text-[0.875rem] leading-[1.375rem] text-[#F6F5F2]/80">
                {FICHA_COMPLETA.linhas.map(([rotulo, valor]) => (
                  <div key={rotulo} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 py-2">
                    <dt className="font-semibold">{rotulo}</dt>
                    <dd>{valor}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <SolicitarManual variant="card" tom="noite" />
          </div>
        </div>
      </div>
    </section>
  );
}
