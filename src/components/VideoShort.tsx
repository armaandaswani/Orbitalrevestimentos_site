"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Vídeo vertical do YouTube (Shorts) com capa local: o player do YouTube só
 * carrega quando a pessoa toca — a página não paga o peso do iframe à toa.
 * youtube-nocookie: sem cookie de rastreamento antes do play.
 */
export default function VideoShort({
  id, poster, titulo, className = "",
}: { id: string; poster: string; titulo: string; className?: string }) {
  const [tocando, setTocando] = useState(false);

  return (
    <div className={`relative aspect-[9/16] w-full overflow-hidden bg-[#0B1F45] shadow-[0_20px_50px_rgba(11,31,69,0.25)] ${className}`}>
      {tocando ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
          title={titulo}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      ) : (
        <button type="button" onClick={() => setTocando(true)} className="group absolute inset-0 w-full h-full" aria-label={`Assistir: ${titulo}`}>
          <Image src={poster} alt="" fill sizes="(min-width: 1024px) 360px, 80vw" className="object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-[#0B1F45]/70 via-transparent to-transparent" />
          {/* Abaixo do centro: no centro ficaria em cima do rosto de quem fala. */}
          <span className="absolute left-1/2 top-[68%] -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-[#36A35C] flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#0B1F45" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          </span>
          <span className="absolute left-4 right-4 bottom-4 text-left text-white text-xs tracking-[0.14em] uppercase font-bold">
            ▶ Assistir · {titulo}
          </span>
        </button>
      )}
    </div>
  );
}
