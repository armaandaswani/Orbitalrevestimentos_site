import SolicitarManual from "@/components/SolicitarManual";
import { SERVE } from "@/lib/pfb-textos";
import FolhaPfb from "./FolhaPfb";
import TrilhoPfb from "./TrilhoPfb";

/**
 * Capítulo 9 da página do PFB: serve para o meu projeto? (v2, 08/11/2026).
 * Creme. Mostrar, não escrever: "Onde usar" e "Onde não usar" como listas
 * curtas de ambientes, lado a lado, e "Como instalar" em três passos (é uma
 * sequência de verdade, por isso numerada) que deslizam um por vez no celular
 * (`TrilhoPfb`) e ficam lado a lado no computador. Os textos inteiros (os
 * parágrafos de onde usar, onde não usar e da instalação, com o link do
 * manual) moram na folha "Detalhes de uso e instalação" (`FolhaPfb`).
 *
 * No computador: o título à esquerda; à direita, as duas listas em cima e os
 * três passos embaixo.
 */
export default function ServePfb() {
  const listas = [SERVE.ondeUsar, SERVE.ondeNaoUsar] as const;
  return (
    <section
      id="onde-usar"
      data-capitulo="onde-usar"
      aria-labelledby="pfb-serve-titulo"
      className="bg-[#F6F5F2] py-12 lg:py-24"
    >
      <div className="ds-wrap lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-x-16 lg:items-start">
        <h2 id="pfb-serve-titulo" className="font-serif pfb-t1 text-[#0B1F45]">
          {SERVE.titulo}
        </h2>
        <div className="mt-6 lg:mt-0">
          <div className="grid grid-cols-2 gap-x-6 lg:gap-x-12">
            {listas.map((l) => (
              <div key={l.titulo}>
                <h3 className="font-serif pfb-t3 text-[#0B1F45]">{l.titulo}</h3>
                <ul className="mt-3 border-t border-[#74777f]/30">
                  {l.ambientes.map((a) => (
                    <li key={a} className="border-b border-[#74777f]/20 py-1 text-[0.875rem] leading-5 text-[#0B1F45] lg:py-2 lg:text-[0.9375rem]">
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <h3 className="mt-8 font-serif pfb-t3 text-[#0B1F45] lg:mt-14">{SERVE.comoInstalar.titulo}</h3>
          <TrilhoPfb como="ol" rotulo={SERVE.rotuloPassos} className="mt-3 lg:grid lg:grid-cols-3 lg:gap-x-8">
            {SERVE.comoInstalar.passos.map((p, i) => (
              <li key={p.titulo} className="flex gap-4 border-t border-[#0B1F45]/80 pt-4">
                <span aria-hidden="true" className="font-serif text-[2.25rem] leading-none text-[#2347A0] tabular-nums">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-serif pfb-t3 text-[#0B1F45]">{p.titulo}</span>
                  <span className="mt-1 block pfb-legenda text-[#43474e]">{p.texto}</span>
                </span>
              </li>
            ))}
          </TrilhoPfb>
          <div className="mt-6 border-t border-[#74777f]/30 lg:mt-10 lg:max-w-[24rem]">
            <FolhaPfb id="folha-serve" rotulo={SERVE.rotuloFolha} titulo={SERVE.titulo}>
              {[SERVE.ondeUsar, SERVE.ondeNaoUsar, SERVE.comoInstalar].map((b, i) => (
                <div key={b.titulo} className={i > 0 ? "mt-8" : ""}>
                  <h3 className="font-serif pfb-t3">{b.titulo}</h3>
                  {b.paragrafos.map((p) => (
                    <p key={p} className="mt-2">
                      {p}
                    </p>
                  ))}
                  {b === SERVE.comoInstalar && (
                    <p className="mt-2">
                      {SERVE.comoInstalar.antesDoManual}
                      <SolicitarManual variant="link" tom="claro" />
                      {SERVE.comoInstalar.depoisDoManual}
                    </p>
                  )}
                </div>
              ))}
            </FolhaPfb>
          </div>
        </div>
      </div>
    </section>
  );
}
