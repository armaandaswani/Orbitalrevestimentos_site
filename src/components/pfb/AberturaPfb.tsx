import Image from "next/image";
import Link from "next/link";
import ContatoCta from "@/components/ContatoCta";
import { CATALOGO_PATH } from "@/lib/product-link";
import { ABERTURA } from "@/lib/pfb-textos";

/**
 * Capítulo 1 da página do PFB: a abertura (v2, 08/11/2026). Um quadro de
 * `100svh - 5rem` (a tela menos o cabeçalho).
 *
 * A foto é a abertura: no celular ela fica com tudo o que o painel de baixo não
 * usa (o painel azul-noite tem a altura do texto, sem mínimo), e no computador
 * ocupa a tela inteira com o texto num painel azul-noite de 36% da largura, à
 * esquerda. Ao abrir, a foto se acomoda de 1,04 a 1 (`.pfb-assenta`, só no
 * nível completo, sem movimento reduzido); a camada de fora faz o parallax
 * (`.pfb-parallax`), e as duas ficam em elementos diferentes para não brigarem.
 *
 * Texto: o nome, uma frase curta e a pronta-entrega em legenda. Os dois
 * controles ficam no último grupo, dentro de `pr-[88px]` no celular, fora do
 * canto do botão do chat; cada um tem a largura do texto. Sobre o azul-noite o
 * primário é verde (P7). O texto não usa Revelar: é o primeiro conteúdo e não
 * pode nascer invisível. A foto usa `preload`.
 */
export default function AberturaPfb() {
  return (
    <section
      id="abertura"
      data-capitulo="abertura"
      aria-labelledby="pfb-titulo"
      className="relative flex flex-col h-[calc(100svh-5rem)] overflow-clip bg-[#0B1F45] lg:block"
    >
      <div className="relative flex-1 min-h-0 overflow-clip lg:absolute lg:inset-0">
        <div className="absolute inset-x-0 -inset-y-3 pfb-parallax">
          <div className="absolute inset-0 pfb-assenta">
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
      </div>
      <div className="relative shrink-0 ds-wrap pt-6 pb-5 flex flex-col items-start bg-[#0B1F45] lg:absolute lg:inset-y-0 lg:left-0 lg:w-[36%] lg:max-w-none lg:justify-center lg:py-24 lg:px-14">
        <h1 id="pfb-titulo" className="font-serif pfb-h1 text-white">
          {ABERTURA.titulo}
        </h1>
        <p className="pfb-corpo text-[#F6F5F2]/85 mt-3 lg:mt-6">{ABERTURA.lead}</p>
        <p className="pfb-legenda text-[#F6F5F2]/60 mt-1 lg:mt-2">{ABERTURA.estoque}</p>
        <div className="pr-[88px] lg:pr-0 mt-5 lg:mt-10 flex flex-wrap items-center gap-x-6 gap-y-1">
          <Link
            href={CATALOGO_PATH}
            data-teste="ver-modelos"
            className="ds-botao bg-[#36A35C] text-[#0B1F45] hover:bg-[#1F7A44] hover:text-white lg:min-h-12"
          >
            {ABERTURA.botaoModelos}
          </Link>
          <ContatoCta
            origem="pfb-abertura"
            className="inline-flex items-center min-h-11 pfb-legenda text-white underline decoration-1 underline-offset-4 hover:decoration-2"
          >
            {ABERTURA.botaoConsultor}
          </ContatoCta>
        </div>
      </div>
    </section>
  );
}
