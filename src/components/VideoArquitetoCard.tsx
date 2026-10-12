"use client";

import { useState } from "react";
import VideoThumb from "@/components/VideoThumb";

/**
 * Cartão de um vídeo da série A Visão do Arquiteto: toca no próprio site,
 * como o vídeo do instalador (components/VideoShort). O player do YouTube
 * (nocookie) só carrega no toque — até lá, só a miniatura.
 */
export default function VideoArquitetoCard({ id, nome, escritorio }: { id: string; nome: string; escritorio: string | null }) {
  const [tocando, setTocando] = useState(false);
  const titulo = `A Visão do Arquiteto — ${nome}`;

  return (
    <div className="relative overflow-hidden bg-[#0B1F45]" style={{ aspectRatio: "9 / 16" }}>
      {tocando ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
          title={titulo}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      ) : (
        <button type="button" onClick={() => setTocando(true)} className="group absolute inset-0 w-full h-full text-left" aria-label={`Assistir: ${titulo}`}>
          <VideoThumb hd url={`https://www.youtube.com/shorts/${id}`}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/45 border border-white/60 backdrop-blur-sm flex items-center justify-center group-hover:bg-[#36A35C] group-hover:border-[#36A35C] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
          <span className="absolute left-0 right-0 bottom-0 p-3 sm:p-4">
            <span className="block font-serif text-white text-sm sm:text-lg leading-tight">{nome}</span>
            {escritorio && <span className="block text-white/70 text-[10px] sm:text-xs mt-0.5">{escritorio}</span>}
          </span>
        </button>
      )}
    </div>
  );
}
