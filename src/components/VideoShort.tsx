"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

/**
 * Vídeo vertical do YouTube (Shorts) com capa local: o player do YouTube só
 * carrega quando a pessoa toca — a página não paga o peso do iframe à toa.
 * youtube-nocookie: sem cookie de rastreamento antes do play.
 *
 * estilo "padrao": o de sempre (Academia). "limpo": sem sombra no quadro nem no
 * círculo do play, e o rótulo "Assistir: {titulo}" sem caixa alta e sem o ▶;
 * o véu atrás do texto continua.
 *
 * recorte "9:16" (padrão): o pôster no quadro vertical e o player no lugar dele.
 * "4:5": o pôster recortado em 4:5 e o toque abre um painel de tela cheia
 * (portal no body, fundo azul-noite) com o player 9:16 no centro e o botão
 * fechar; Escape fecha, o foco vai ao fechar ao abrir e volta ao pôster ao
 * fechar, como no diálogo do `SolicitarManual`.
 *
 * capa "veu" (padrão): o véu em gradiente, o círculo verde do play e o rótulo.
 * "faixa": sem gradiente, sem círculo e sem sombra; uma faixa sólida
 * azul-noite de 40 px na base do pôster com "Assistir".
 *
 * posicao: o `object-position` do pôster (o padrão do navegador é "50% 50%";
 * sem a prop, o pôster sai sem `style`, como sempre saiu).
 */
export default function VideoShort({
  id, poster, titulo, className = "", estilo = "padrao", recorte = "9:16", capa = "veu", posicao,
}: {
  id: string;
  poster: string;
  titulo: string;
  className?: string;
  estilo?: "padrao" | "limpo";
  recorte?: "9:16" | "4:5";
  capa?: "veu" | "faixa";
  posicao?: string;
}) {
  const [tocando, setTocando] = useState(false);
  const limpo = estilo === "limpo";
  const faixa = capa === "faixa";
  const painel = recorte === "4:5";
  const semSombra = limpo || faixa;

  const posterRef = useRef<HTMLButtonElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  // Só devolve o foco ao pôster depois de o painel ter aberto uma vez.
  const abriuRef = useRef(false);

  useEffect(() => {
    if (!painel) return;
    if (!tocando) {
      if (abriuRef.current) posterRef.current?.focus();
      abriuRef.current = false;
      return;
    }
    abriuRef.current = true;
    fecharRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setTocando(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [painel, tocando]);

  const player = (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
      title={titulo}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      className="absolute inset-0 w-full h-full border-0"
    />
  );

  return (
    <div className={`relative ${painel ? "aspect-[4/5]" : "aspect-[9/16]"} w-full overflow-hidden bg-[#0B1F45]${semSombra ? "" : " shadow-[0_20px_50px_rgba(11,31,69,0.25)]"} ${className}`}>
      {tocando && !painel ? (
        player
      ) : (
        <button
          ref={posterRef}
          type="button"
          onClick={() => setTocando(true)}
          className="group absolute inset-0 w-full h-full"
          aria-label={`Assistir: ${titulo}`}
          aria-haspopup={painel ? "dialog" : undefined}
        >
          <Image
            src={poster}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, 80vw"
            className="object-cover"
            style={posicao ? { objectPosition: posicao } : undefined}
          />
          {faixa ? (
            <span className="absolute inset-x-0 bottom-0 flex h-10 items-center px-4 bg-[#0B1F45] text-left text-white text-[0.875rem] leading-5 font-semibold transition-colors group-hover:bg-[#2347A0]">
              Assistir
            </span>
          ) : (
            <>
              <span className="absolute inset-0 bg-gradient-to-t from-[#0B1F45]/70 via-transparent to-transparent" />
              {/* Abaixo do centro: no centro ficaria em cima do rosto de quem fala. */}
              <span className={`absolute left-1/2 top-[68%] -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-[#36A35C] flex items-center justify-center${limpo ? "" : " shadow-lg"} transition-transform duration-300 group-hover:scale-110`}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#0B1F45" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              </span>
              {limpo ? (
                <span className="absolute left-4 right-4 bottom-4 text-left text-white text-legenda font-semibold">
                  Assistir: {titulo}
                </span>
              ) : (
                <span className="absolute left-4 right-4 bottom-4 text-left text-white text-xs tracking-[0.14em] uppercase font-bold">
                  ▶ Assistir · {titulo}
                </span>
              )}
            </>
          )}
        </button>
      )}

      {painel && tocando && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-[#0B1F45] px-4 py-14"
          onClick={() => setTocando(false)}
        >
          <button
            ref={fecharRef}
            type="button"
            onClick={() => setTocando(false)}
            aria-label="Fechar"
            className="absolute right-2 top-2 flex size-11 items-center justify-center text-[1.75rem] leading-none text-white hover:text-[#F6F5F2]/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            ×
          </button>
          {/* O maior 9:16 que cabe: a largura da tela ou a altura menos o respiro. */}
          <div
            className="relative aspect-[9/16] w-[min(100%,calc((100svh-7rem)*9/16))]"
            onClick={(e) => e.stopPropagation()}
          >
            {player}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
