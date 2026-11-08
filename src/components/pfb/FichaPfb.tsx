import SolicitarManual from "@/components/SolicitarManual";
import { ART, FICHA, FICHA_DETALHADA } from "@/lib/pfb-textos";
import FolhaPfb from "./FolhaPfb";
import TrilhoPfb from "./TrilhoPfb";

/** Pares rótulo / valor de uma folha, em linhas finas. */
function Tabela({ linhas }: { linhas: ReadonlyArray<readonly [string, string]> }) {
  return (
    <dl className="pfb-tabela">
      {linhas.map(([rotulo, valor]) => (
        <div key={rotulo}>
          <dt>{rotulo}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Capítulo 4 da página do PFB: ficha técnica (v2, 08/11/2026). Azul-noite.
 *
 * Os cinco números são a imagem do capítulo: no celular, um por vez em largura
 * cheia, num trilho que desliza com encaixe e marcador de posição (`TrilhoPfb`),
 * o número grande sozinho e um rótulo curto; no computador, os cinco lado a
 * lado, cada um com uma linha fina em cima. No DOM, o `dt` vem primeiro e
 * `flex-col-reverse` o põe embaixo do número.
 *
 * Embaixo, a ressalva do banheiro numa linha e três linhas finas: a ART e a
 * ficha técnica detalhada (o conteúdo completo da antiga Tecnologia, cada uma
 * numa folha que sobe, `FolhaPfb`) e o Manual Técnico de Instalação
 * (`SolicitarManual`, o mesmo diálogo e o mesmo evento `manual_solicitado`).
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
        <TrilhoPfb
          como="dl"
          rotulo={FICHA.rotuloTrilho}
          tom="noite"
          className="mt-8 lg:mt-14 lg:grid lg:grid-cols-5 lg:gap-x-8"
        >
          {FICHA.numeros.map(({ valor, rotulo }) => (
            <div key={valor} className="pfb-numero flex flex-col-reverse justify-end lg:border-t lg:border-[#F6F5F2]/25 lg:pt-6">
              <dt className="mt-3 pfb-legenda text-[#F6F5F2]/70">{rotulo}</dt>
              <dd className="font-serif pfb-num-grande text-white">{valor}</dd>
            </div>
          ))}
        </TrilhoPfb>
        <p className="mt-6 pfb-legenda text-[#F6F5F2]/70 lg:mt-10">{FICHA.ressalva}</p>
        <div className="mt-6 border-t border-[#F6F5F2]/25 lg:mt-10 lg:grid lg:grid-cols-3 lg:gap-x-8">
          <FolhaPfb id="folha-art" rotulo={ART.rotulo} titulo={ART.titulo} tom="noite">
            <h3 className="font-serif pfb-t3">{ART.oQueE.titulo}</h3>
            <p className="mt-2">{ART.oQueE.texto}</p>
            <Tabela linhas={ART.linhas} />
            <h3 className="mt-8 font-serif pfb-t3">{ART.porQue.titulo}</h3>
            <p className="mt-2">{ART.porQue.texto}</p>
          </FolhaPfb>
          <FolhaPfb id="folha-ficha" rotulo={FICHA_DETALHADA.rotulo} titulo={FICHA_DETALHADA.titulo} tom="noite" largura="larga">
            <div className="grid gap-y-8 lg:grid-cols-2 lg:gap-x-12">
              {FICHA_DETALHADA.grupos.map((g) => (
                <div key={g.titulo}>
                  <h3 className="font-serif pfb-t3">{g.titulo}</h3>
                  <Tabela linhas={g.linhas} />
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 border-t border-[#0B1F45]/15 pt-6 text-[0.8125rem] leading-5 text-[#43474e]">
              {FICHA_DETALHADA.notas.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </div>
            <h3 className="mt-8 font-serif pfb-t3">{FICHA_DETALHADA.garantia[0]}</h3>
            <p className="mt-2">{FICHA_DETALHADA.garantia[1]}</p>
          </FolhaPfb>
          <SolicitarManual variant="card" tom="noite" />
        </div>
      </div>
    </section>
  );
}
