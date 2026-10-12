import VideoArquitetoCard from "@/components/VideoArquitetoCard";
import { PLAYLIST_URL, videosVisaoDoArquiteto } from "@/lib/visao-arquiteto";

/**
 * Home: "Validado por arquitetos de Manaus" + a série A Visão do Arquiteto.
 * Cada cartão toca o vídeo no próprio site; o botão abre a playlist completa no YouTube.
 */
export default async function VisaoDoArquiteto() {
  const videos = (await videosVisaoDoArquiteto()).slice(0, 3);
  return (
    <section className="py-12 lg:py-28 bg-[#F6F5F2] border-t border-[#eeeeee]">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-16 grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-5 h-px bg-[#36A35C]" />
            <p className="text-[#2347A0] text-xs tracking-[0.2em] uppercase font-semibold">A Visão do Arquiteto</p>
          </div>
          <h2 className="font-serif text-[#0B1F45] text-2xl lg:text-[40px] font-normal leading-[1.2] mb-5">
            Validado por alguns dos melhores arquitetos de Manaus.
          </h2>
          <p className="text-[#43474e] text-base leading-relaxed mb-8 max-w-md">
            Na série A Visão do Arquiteto, profissionais de Manaus falam sobre o Painel Flexível Fibra de Bambu nos seus projetos.
          </p>
          <a
            href={PLAYLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-[#0B1F45] text-white text-xs tracking-[0.12em] uppercase font-bold px-7 py-4 hover:bg-[#2347A0] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
            </svg>
            Assistir à série completa
          </a>
        </div>

        <div className={`grid gap-3 sm:gap-4 ${videos.length >= 3 ? "grid-cols-3" : "grid-cols-2"} max-w-xl lg:max-w-none mx-auto w-full`}>
          {videos.map((v) => (
            <VideoArquitetoCard key={v.id} id={v.id} nome={v.nome} escritorio={v.escritorio} />
          ))}
        </div>
      </div>
    </section>
  );
}
