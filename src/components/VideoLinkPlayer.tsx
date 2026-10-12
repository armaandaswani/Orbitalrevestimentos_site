"use client";

import { useState } from "react";
import VideoThumb from "@/components/VideoThumb";
import { videoEmbedUrl, videoHost, videoHostLabel, videoIsVertical } from "@/lib/video-link";

/**
 * Vídeo por link (YouTube, Instagram, TikTok, Vimeo, Drive) na galeria de
 * projetos: miniatura com play e, no toque, o player do próprio serviço ali
 * mesmo — sem abrir outra página. O player só carrega no toque.
 *
 * Instagram não tem player "puro": o quadro deles traz o cabeçalho e o rodapé
 * do post, então ganha uma caixa mais alta (e rola por dentro se não couber).
 * Link de um serviço sem player incorporável continua abrindo em nova aba.
 */
export default function VideoLinkPlayer({ url, description }: { url: string; description?: string | null }) {
  const [tocando, setTocando] = useState(false);
  const embed = videoEmbedUrl(url);
  const vertical = videoIsVertical(url);
  const instagram = videoHost(url) === "instagram";

  const caixa = vertical ? "h-[calc(100%-56px)] max-h-[720px]" : "w-full max-w-3xl";
  const proporcao = vertical ? "9 / 16" : "16 / 9";

  const capa = (
    <>
      <VideoThumb hd url={url} className="absolute inset-0 w-full h-full object-cover" />
      <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-16 h-16 rounded-full bg-black/55 border border-white/50 backdrop-blur-sm flex items-center justify-center group-hover/video:bg-[#36A35C] group-hover/video:border-[#36A35C] group-hover/video:scale-105 transition-all">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white" aria-hidden><path d="M8 5v14l11-7z" /></svg>
        </span>
      </span>
      <span className="absolute left-3 bottom-3 bg-black/60 text-white text-[9px] tracking-[0.15em] uppercase font-bold px-2 py-1">
        {videoHostLabel(url)}
      </span>
    </>
  );

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 py-2" onClick={(e) => e.stopPropagation()}>
      {tocando && embed ? (
        instagram ? (
          <div className="w-[min(380px,100%)] h-full max-h-[860px] bg-white">
            <iframe src={embed} title="Vídeo do Instagram" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="w-full h-full border-0" />
          </div>
        ) : (
          <div className={`relative overflow-hidden bg-black ${caixa}`} style={{ aspectRatio: proporcao, maxWidth: "100%" }}>
            <iframe src={embed} title={`Vídeo do ${videoHostLabel(url)}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 w-full h-full border-0" />
          </div>
        )
      ) : embed ? (
        <button
          type="button"
          onClick={() => setTocando(true)}
          aria-label="Assistir ao vídeo"
          className={`group/video relative block overflow-hidden bg-[#141a26] border border-white/10 ${caixa}`}
          style={{ aspectRatio: proporcao, maxWidth: "100%" }}
        >
          {capa}
        </button>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Assistir ao vídeo"
          className={`group/video relative block overflow-hidden bg-[#141a26] border border-white/10 ${caixa}`}
          style={{ aspectRatio: proporcao, maxWidth: "100%" }}
        >
          {capa}
        </a>
      )}
      {description && !tocando && (
        <p className="text-white/70 text-sm max-w-md text-center leading-relaxed">{description}</p>
      )}
    </div>
  );
}
