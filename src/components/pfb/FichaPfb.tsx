import SolicitarManual from "@/components/SolicitarManual";
import PlacaEmEscala from "@/components/pfb/PlacaEmEscala";
import { FICHA } from "@/lib/pfb-textos";

/**
 * Seção 3 da página do PFB: a ficha técnica (spec, item 25 e "Seção 3").
 *
 * Computador (lg): 12 colunas; a placa em escala nas 4 da esquerda, ao longo
 * das duas linhas da grade, e nas 8 da direita o título, os selos e os
 * números (linha 1) e depois ART | Durabilidade, Garantia e o cartão do
 * manual (linha 2). Celular: título, lead, selos, números, figura e o resto,
 * que é a ordem do DOM. Separação entre blocos só por espaço e tom, sem linha
 * fina. Números parados (sem AnimatedStat): em cada par, o dt (frase) vem
 * antes do dd (valor) no DOM e o flex-col-reverse põe o valor em cima.
 */
export default function FichaPfb() {
  return (
    <section id="ficha" aria-labelledby="pfb-ficha-titulo" className="ds-secao bg-white scroll-mt-20">
      <div className="ds-wrap grid lg:grid-cols-12 gap-x-12">
        <div className="lg:col-span-8 lg:col-start-5 lg:row-start-1">
          <h2 id="pfb-ficha-titulo" className="font-serif text-t2 text-[#0B1F45]">{FICHA.titulo}</h2>
          <p className="text-lead text-[#43474e] mt-4">{FICHA.lead}</p>

          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-6 mt-10">
            {FICHA.selos.map((selo) => (
              <li key={selo.texto}>
                <p className="font-serif text-t3 text-[#0B1F45]">{selo.texto}</p>
                {selo.ressalva && <p className="text-legenda text-[#43474e] mt-2">{selo.ressalva}</p>}
              </li>
            ))}
          </ul>

          <dl className="grid grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6 mt-10">
            {FICHA.numeros.map((n, i) => (
              <div key={n.valor} className={`flex flex-col-reverse${i === 0 ? " col-span-2 sm:col-span-1" : ""}`}>
                <dt className="text-legenda text-[#43474e] mt-1">{n.frase}</dt>
                <dd className="font-serif text-t2 text-[#0B1F45] tabular-nums">{n.valor}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-10 lg:mt-0 lg:col-span-4 lg:col-start-1 lg:row-start-1 lg:row-span-2">
          <PlacaEmEscala />
        </div>

        <div className="mt-10 lg:col-span-8 lg:col-start-5 lg:row-start-2">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-10">
            <div>
              <h3 className="font-serif text-t3 text-[#0B1F45]">{FICHA.art.titulo}</h3>
              <p className="text-corpo text-[#43474e] mt-2">{FICHA.art.texto}</p>
            </div>
            <div>
              <h3 className="font-serif text-t3 text-[#0B1F45]">{FICHA.durabilidade.titulo}</h3>
              <p className="text-corpo text-[#43474e] mt-2">{FICHA.durabilidade.texto}</p>
            </div>
          </div>
          <div className="mt-10">
            <h3 className="font-serif text-t3 text-[#0B1F45]">{FICHA.garantia.titulo}</h3>
            <p className="text-corpo text-[#43474e] mt-2">{FICHA.garantia.texto}</p>
          </div>
          <SolicitarManual tom="claro" />
        </div>
      </div>
    </section>
  );
}
