import Image from "next/image";
import Link from "next/link";
import ContatoCta from "@/components/ContatoCta";
import { CATALOGO_PATH } from "@/lib/product-link";
import { ABERTURA } from "@/lib/pfb-textos";

/**
 * Seção 1 da página do PFB: a abertura (spec, item 22 e "Seção 1").
 *
 * Computador (lg): duas colunas numa tela; texto à esquerda, centrado na
 * vertical, e a foto ocupando a célula da direita até a borda, com a legenda
 * no canto inferior esquerdo sobre um bloco azul. A camada da foto é 20% mais
 * alta para cobrir a faixa que o parallax (mv-parallax-topo) abre; abaixo do
 * lg a regra .pfb-abertura-foto deixa a foto parada.
 * Celular: texto, foto de borda a borda em 4:5 e a legenda abaixo, com o
 * recuo lateral do texto. Uma legenda só no DOM.
 *
 * O texto não usa Revelar: é o primeiro conteúdo e não pode nascer invisível.
 * A foto usa `preload` (o `priority` está descontinuado no Next 16).
 */
export default function AberturaPfb() {
  return (
    <section aria-labelledby="pfb-titulo" className="bg-[#F6F5F2] grid lg:grid-cols-2 lg:min-h-[calc(100svh-5rem)]">
      <div className="ds-wrap pt-10 pb-8 lg:py-16 flex flex-col justify-center">
        <div className="max-w-[34rem]">
          <h1 id="pfb-titulo" className="font-serif text-display text-[#0B1F45]">{ABERTURA.titulo}</h1>
          <p className="text-lead text-[#43474e] mt-5">{ABERTURA.lead}</p>
          <p className="text-corpo text-[#43474e] mt-3">{ABERTURA.estoque}</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link href={CATALOGO_PATH} data-teste="ver-modelos" className="ds-botao ds-botao-cheio min-h-12">
              {ABERTURA.botaoModelos}
            </Link>
            <ContatoCta origem="pfb-abertura" className="ds-botao ds-botao-vazado min-h-12">
              {ABERTURA.botaoConsultor}
            </ContatoCta>
          </div>
        </div>
      </div>
      <figure className="relative">
        <div className="relative aspect-[4/5] overflow-clip lg:aspect-auto lg:absolute lg:inset-0">
          <div className="absolute inset-0 lg:-top-[20%] pfb-abertura-foto mv-parallax-topo">
            <Image
              src="/images/projetos/escada-madeira-pfb-2026-10.jpg"
              alt={ABERTURA.alt}
              fill
              preload
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
        <figcaption className="ds-wrap mt-3 pb-10 text-legenda text-[#43474e] lg:absolute lg:bottom-0 lg:left-0 lg:w-auto lg:max-w-none lg:m-0 lg:p-0 lg:px-3 lg:py-2 lg:bg-[#0B1F45] lg:text-white">
          {ABERTURA.legenda}
        </figcaption>
      </figure>
    </section>
  );
}
