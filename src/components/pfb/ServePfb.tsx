import Revelar from "@/components/projetos/Revelar";
import SolicitarManual from "@/components/SolicitarManual";
import VideoShort from "@/components/VideoShort";
import { SERVE } from "@/lib/pfb-textos";

/**
 * Seção 5 da página do PFB: serve para o meu projeto? (spec, item 27 e
 * "Seção 5"). Computador: texto à esquerda (até 40rem) e o vídeo do instalador
 * numa coluna de 20rem à direita. Celular: texto, depois o vídeo centralizado
 * até 18rem. Os dois blocos entram só com opacidade (Revelar "surge").
 *
 * O link do manual fica dentro do último parágrafo; o diálogo dele vai para o
 * body por portal (SolicitarManual), então não há div nem p dentro do p.
 */
export default function ServePfb() {
  const blocos = [SERVE.ondeUsar, SERVE.ondeNaoUsar] as const;
  return (
    <section id="onde-usar" aria-labelledby="pfb-serve-titulo" className="ds-secao bg-white scroll-mt-20">
      <div className="ds-wrap grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-16 items-start">
        <Revelar efeito="surge" ordem={0} className="max-w-[40rem]">
          <h2 id="pfb-serve-titulo" className="font-serif text-t2 text-[#0B1F45]">{SERVE.titulo}</h2>
          {blocos.map((bloco, i) => (
            <div key={bloco.titulo}>
              <h3 className={`font-serif text-t3 text-[#0B1F45] ${i === 0 ? "mt-8" : "mt-10"}`}>{bloco.titulo}</h3>
              {bloco.paragrafos.map((p) => (
                <p key={p} className="text-corpo text-[#43474e] mt-3">{p}</p>
              ))}
            </div>
          ))}
          <h3 className="font-serif text-t3 text-[#0B1F45] mt-10">{SERVE.comoAplicar.titulo}</h3>
          {SERVE.comoAplicar.paragrafos.map((p) => (
            <p key={p} className="text-corpo text-[#43474e] mt-3">{p}</p>
          ))}
          <p className="text-corpo text-[#43474e] mt-3">
            {SERVE.comoAplicar.antesDoManual}
            <SolicitarManual variant="link" tom="claro" />
            {SERVE.comoAplicar.depoisDoManual}
          </p>
        </Revelar>
        <Revelar efeito="surge" ordem={1} className="w-full max-w-[18rem] mx-auto lg:max-w-none">
          <VideoShort id="hpgoCY8L2PI" poster="/images/videos/opiniao-instalador-adam-werk.jpg" estilo="limpo" titulo={SERVE.video.titulo} />
        </Revelar>
      </div>
    </section>
  );
}
