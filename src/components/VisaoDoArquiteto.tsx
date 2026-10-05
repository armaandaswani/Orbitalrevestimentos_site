import VideoThumb from "@/components/VideoThumb";
import { PLAYLIST_URL, videosVisaoDoArquiteto } from "@/lib/visao-arquiteto";

/**
 * Home: "Validado por arquitetos de Manaus" + a série A Visão do Arquiteto.
 * Cada cartão abre o vídeo no YouTube; o botão abre a playlist completa.
 */
export default async function VisaoDoArquiteto() {
  const videos = (await videosVisaoDoArquiteto()).slice(0, 3);
  return (
    <section className="py-12 lg:py-28 bg-[#f5f5f3] border-t border-[#eeeeee]">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-16 grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-5 h-px bg-[#3b6934]" />
            <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)]">A Visão do Arquiteto</p>
          </div>
          <h2 className="font-serif text-[#002045] text-2xl lg:text-[40px] font-normal leading-[1.2] mb-5">
            Validado por alguns dos melhores arquitetos de Manaus.
          </h2>
          <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed mb-8 max-w-md">
            Na série A Visão do Arquiteto, profissionais de Manaus falam sobre o Painel Flexível Fibra de Bambu nos seus projetos.
          </p>
          <a
            href={PLAYLIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:bg-[#1a365d] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
            </svg>
            Assistir à série completa
          </a>
        </div>

        <div className={`grid gap-3 sm:gap-4 ${videos.length >= 3 ? "grid-cols-3" : "grid-cols-2"} max-w-xl lg:max-w-none mx-auto w-full`}>
          {videos.map((v) => (
            <a
              key={v.id}
              href={`https://www.youtube.com/shorts/${v.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="relative overflow-hidden bg-[#1e212a]" style={{ aspectRatio: "9 / 16" }}>
                <VideoThumb hd url={`https://www.youtube.com/shorts/${v.id}`}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/45 border border-white/60 backdrop-blur-sm flex items-center justify-center group-hover:bg-[#3b6934] group-hover:border-[#3b6934] transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </span>
                <span className="absolute left-0 right-0 bottom-0 p-3 sm:p-4">
                  <span className="block font-serif text-white text-sm sm:text-lg leading-tight">{v.nome}</span>
                  {v.escritorio && <span className="block text-white/70 text-[10px] sm:text-xs font-[var(--font-inter)] mt-0.5">{v.escritorio}</span>}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
