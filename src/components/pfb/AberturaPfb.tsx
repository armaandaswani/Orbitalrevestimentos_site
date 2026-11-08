import Image from "next/image";
import Link from "next/link";
import ContatoCta from "@/components/ContatoCta";
import { CATALOGO_PATH } from "@/lib/product-link";
import { ABERTURA } from "@/lib/pfb-textos";

/**
 * Capítulo 1 da página do PFB: a abertura (spec 2026-11-07-pfb-experiencia,
 * Tabela, linha 1). Um quadro de `100svh - 5rem` (a tela menos o cabeçalho).
 *
 * Celular: a foto em cima fica com a altura que sobra do painel creme de
 * baixo (o painel tem a altura do texto e no mínimo 44% do quadro, ajuste P1).
 * Computador (lg): a foto em tela cheia e o texto num painel sólido azul-noite
 * de 40% da largura, à esquerda, centrado na vertical.
 *
 * A camada da foto passa 12 px da caixa em cima e embaixo para o parallax
 * (`.pfb-parallax`, globals.css › PFB: capítulos), que só anda no nível
 * completo. Os dois controles ficam no último grupo, dentro de `pr-[88px]` no
 * celular, fora do canto do botão do chat; cada um tem a largura do texto.
 *
 * O texto não usa Revelar: é o primeiro conteúdo e não pode nascer invisível.
 * A foto usa `preload` (o `priority` está descontinuado no Next 16).
 */
export default function AberturaPfb() {
  return (
    <section
      id="abertura"
      data-capitulo="abertura"
      aria-labelledby="pfb-titulo"
      className="relative flex flex-col h-[calc(100svh-5rem)] overflow-clip bg-[#F6F5F2] lg:block"
    >
      <div className="relative flex-1 min-h-0 overflow-clip lg:absolute lg:inset-0">
        <div className="absolute inset-x-0 -inset-y-3 pfb-parallax">
          <Image
            src="/images/projetos/escada-madeira-pfb-2026-10.jpg"
            alt={ABERTURA.alt}
            fill
            preload
            sizes="100vw"
            className="object-cover object-[62%_50%] lg:object-[50%_45%]"
          />
        </div>
      </div>
      <div className="relative shrink-0 min-h-[44%] ds-wrap pt-6 pb-6 flex flex-col items-start lg:absolute lg:inset-y-0 lg:left-0 lg:w-[40%] lg:max-w-none lg:justify-center lg:py-24 lg:bg-[#0B1F45]">
        <h1 id="pfb-titulo" className="font-serif pfb-h1 text-[#0B1F45] lg:text-white">
          {ABERTURA.titulo}
        </h1>
        <p className="pfb-corpo text-[#43474e] mt-6 lg:mt-8 lg:text-[#F6F5F2]/85">{ABERTURA.lead}</p>
        <p className="pfb-legenda text-[#43474e] mt-2 lg:mt-3 lg:text-[#F6F5F2]/70">{ABERTURA.estoque}</p>
        <div className="pr-[88px] lg:pr-0 mt-5 lg:mt-10 flex flex-col items-start gap-1 lg:gap-3">
          <Link
            href={CATALOGO_PATH}
            data-teste="ver-modelos"
            className="ds-botao bg-[#0B1F45] text-white hover:bg-[#2347A0] lg:bg-[#36A35C] lg:text-[#0B1F45] lg:hover:bg-[#1F7A44] lg:hover:text-white lg:min-h-12"
          >
            {ABERTURA.botaoModelos}
          </Link>
          <ContatoCta
            origem="pfb-abertura"
            className="inline-flex items-center min-h-11 pfb-legenda text-[#0B1F45] underline decoration-1 underline-offset-4 hover:decoration-2 lg:text-white"
          >
            {ABERTURA.botaoConsultor}
          </ContatoCta>
        </div>
      </div>
    </section>
  );
}
