import Revelar from "@/components/projetos/Revelar";
import { O_QUE_E, SELOS } from "@/lib/pfb-textos";

/**
 * Capítulo 2 da página do PFB: o que é (spec 2026-11-07-pfb-experiencia,
 * Tabela, linha 2). Creme, uma frase e os seis selos: grade 3 × 2 no celular,
 * os seis em linha no computador. Cada selo é o ícone solto (32 px, 40 no
 * computador) e o nome 8 px abaixo (Inter 15/20 peso 500, 16/22 no computador;
 * até duas linhas no celular: as colunas vão sem vão entre si, porque os nomes
 * são centrados e "Fibra de bambu" pede 112 px), sem caixa e sem borda; entram subindo, um
 * depois do outro. Embaixo, as medidas da placa em legenda.
 *
 * O respiro de baixo é maior que o de cima: é o silêncio antes do pico (o
 * capítulo 3, a placa por dentro).
 */
export default function OQueEPfb() {
  return (
    <section
      id="o-que-e"
      data-capitulo="o-que-e"
      aria-labelledby="pfb-o-que-e-titulo"
      className="bg-[#F6F5F2] pt-12 pb-16 lg:pt-24 lg:pb-32"
    >
      <div className="ds-wrap text-center">
        <h2 id="pfb-o-que-e-titulo" className="font-serif pfb-t2 text-[#0B1F45] mx-auto max-w-[22rem] lg:max-w-[34rem]">
          {O_QUE_E.frase}
        </h2>
        <ul className="grid grid-cols-3 gap-x-0 gap-y-8 mt-6 lg:grid-cols-6 lg:gap-x-8 lg:mt-8">
          {SELOS.map(({ icone, nome }, i) => (
            <Revelar key={icone} como="li" ordem={i} className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/images/selos/pfb-icone-${icone}.svg`}
                alt=""
                width={32}
                height={32}
                loading="lazy"
                className="size-8 object-contain lg:size-10"
              />
              <span className="mt-2 block text-[0.9375rem] leading-5 font-medium text-[#0B1F45] text-balance lg:text-base lg:leading-[1.375rem]">{nome}</span>
            </Revelar>
          ))}
        </ul>
        <p className="pfb-legenda text-[#43474e] mt-8 lg:mt-12 tabular-nums">{O_QUE_E.medidas}</p>
      </div>
    </section>
  );
}
