"use client";

import { useEffect, useState } from "react";
import { videoHost, videoThumbnail, youtubeThumbs } from "@/lib/video-link";

/**
 * Miniatura de um vídeo da galeria.
 *   YouTube → imagem fixa do próprio YouTube
 *   Vimeo, TikTok, Instagram, Drive → /api/video-thumb (oEmbed / og:image)
 *   Arquivo enviado ao site (.mp4…) → o primeiro quadro do próprio vídeo
 * Sem miniatura possível, não renderiza nada (fica o fundo com o play).
 */
const cache = new Map<string, string | null>();

export default function VideoThumb({ url, className = "", style, hd = false }: { url: string; className?: string; style?: React.CSSProperties; hd?: boolean }) {
  const host = videoHost(url);
  // hd: miniatura grande do YouTube (1280×720); se não existir, cai na de 480×360.
  const ytLista = hd ? youtubeThumbs(url) : [];
  const [ytIdx, setYtIdx] = useState(0);
  const direto = ytLista[ytIdx] ?? videoThumbnail(url);
  const precisaBuscar = !direto && host !== "arquivo" && host !== "outro";
  const [buscada, setBuscada] = useState<string | null>(() => (precisaBuscar ? cache.get(url) ?? null : null));
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (!precisaBuscar || cache.has(url)) return;
    let vivo = true;
    fetch(`/api/video-thumb?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { thumbnail?: string | null } | null) => {
        const t = j?.thumbnail ?? null;
        cache.set(url, t);
        if (vivo) setBuscada(t);
      })
      .catch(() => cache.set(url, null));
    return () => { vivo = false; };
  }, [url, precisaBuscar]);

  if (falhou) return null;
  if (host === "arquivo") {
    // #t=0.5 faz o navegador mostrar um quadro do vídeo em vez de preto.
    return <video src={`${url}#t=0.5`} muted playsInline preload="metadata" className={className} style={style} aria-hidden />;
  }
  const src = direto ?? buscada;
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={className} style={style} referrerPolicy="no-referrer"
      onError={() => (ytIdx < ytLista.length - 1 ? setYtIdx((i) => i + 1) : setFalhou(true))} />
  );
}
