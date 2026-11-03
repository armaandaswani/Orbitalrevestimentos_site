import VideoArquitetoCard from "@/components/VideoArquitetoCard";
import Capitulo from "@/components/ds/Capitulo";
import Revelar from "@/components/projetos/Revelar";
import { PLAYLIST_URL, videosVisaoDoArquiteto } from "@/lib/visao-arquiteto";

/**
 * Capítulo "Arquitetos" da home: "Validado por arquitetos de Manaus" + a série
 * A Visão do Arquiteto. Cada cartão toca o vídeo no próprio site; o botão abre
 * a playlist completa no YouTube.
 */
export default async function VisaoDoArquiteto() {
  const videos = (await videosVisaoDoArquiteto()).slice(0, 3);
  return (
    <Capitulo id="arquitetos" numero="" rotulo="Arquitetos" rotuladoPor="arquitetos-titulo" className="ds-secao bg-[#F6F5F2]">
      <div className="ds-wrap grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-16 items-center">
        <Revelar>
          <h2 id="arquitetos-titulo" className="font-serif text-[#0B1F45] text-t1 font-normal tracking-[-0.02em] mb-5 text-balance max-w-[22ch]">
            Validado por alguns dos melhores arquitetos de Manaus.
          </h2>
          <p className="text-[#43474e] text-lead mb-8 max-w-md text-pretty">
            Na série A Visão do Arquiteto, profissionais de Manaus falam sobre o Painel Flexível em Fibra de Bambu nos seus projetos.
          </p>
          <a
            href={PLAYLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ds-botao ds-botao-cheio min-h-12"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
            </svg>
            Assistir à série completa
          </a>
        </Revelar>

        <div className={`grid gap-3 sm:gap-4 ${videos.length >= 3 ? "grid-cols-3" : "grid-cols-2"} max-w-xl lg:max-w-none mx-auto w-full`}>
          {videos.map((v, i) => (
            <Revelar key={v.id} ordem={i}>
              <VideoArquitetoCard id={v.id} nome={v.nome} escritorio={v.escritorio} />
            </Revelar>
          ))}
        </div>
      </div>
    </Capitulo>
  );
}
