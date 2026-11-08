import VideoShort from "@/components/VideoShort";
import { INSTALADOR } from "@/lib/pfb-textos";

/**
 * Capítulo 8 da página do PFB: o vídeo do instalador (spec
 * 2026-11-07-pfb-experiencia, Tabela, linha 8). Azul-noite, o título e a
 * frase, e o pôster do vídeo recortado em 4:5 (300 px de largura, 360 no
 * computador) com a faixa "Assistir" na base. O toque abre o vídeo 9:16 num
 * painel de tela cheia (`VideoShort recorte="4:5"`). No computador, o texto à
 * esquerda e o vídeo à direita.
 */
export default function InstaladorPfb() {
  return (
    <section
      id="instalador"
      data-capitulo="instalador"
      aria-labelledby="pfb-instalador-titulo"
      className="bg-[#0B1F45] text-white py-12 lg:py-24"
    >
      <div className="ds-wrap lg:grid lg:grid-cols-[minmax(0,34rem)_360px] lg:justify-center lg:items-center lg:gap-24">
        <div>
          <h2 id="pfb-instalador-titulo" className="font-serif pfb-t1 text-white">
            {INSTALADOR.titulo}
          </h2>
          <p className="pfb-corpo text-[#F6F5F2]/80 mt-4 lg:mt-6">{INSTALADOR.frase}</p>
        </div>
        <div className="mt-6 w-[300px] max-w-full lg:mt-0 lg:w-[360px]">
          <VideoShort
            id="hpgoCY8L2PI"
            poster="/images/videos/opiniao-instalador-adam-werk.jpg"
            titulo={INSTALADOR.titulo}
            recorte="4:5"
            capa="faixa"
            posicao="50% 30%"
          />
        </div>
      </div>
    </section>
  );
}
