"use client";

import { useEffect, useState } from "react";
import { videoHost, videoThumbnail } from "@/lib/video-link";

/**
 * Miniatura de um vídeo da galeria.
 *   YouTube → imagem fixa do próprio YouTube
 *   Vimeo, TikTok, Instagram, Drive → /api/video-thumb (oEmbed / og:image)
 *   Arquivo enviado ao site (.mp4…) → o primeiro quadro do próprio vídeo
 * Sem miniatura possível, não renderiza nada (fica o fundo com o play).
 */
const cache = new Map<string, string | null>();

export default function VideoThumb({ url, className = "", style }: { url: string; className?: string; style?: React.CSSProperties }) {
  const host = videoHost(url);
  const direto = videoThumbnail(url);
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
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} style={style} onError={() => setFalhou(true)} referrerPolicy="no-referrer" />;
}
