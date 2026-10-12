/**
 * Links de vídeo hospedados fora (YouTube, Vimeo, Drive).
 *
 * Vídeo longo não sobe para o storage do site: entra como link. O painel usa
 * isto para validar o que foi colado e a galeria para mostrar uma miniatura em
 * vez de um quadrado preto.
 *
 * A galeria toca o vídeo no próprio site (videoEmbedUrl); só abre numa aba
 * nova o link de um serviço sem player incorporável.
 */

// Instagram lidera o uso real neste site (Reels), então entra na lista — sem
// rótulo próprio ele apareceria como um "Link" genérico.
export type VideoHost = "youtube" | "instagram" | "tiktok" | "vimeo" | "drive" | "arquivo" | "outro";

const YT = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/i,
  /(?:youtu\.be\/)([\w-]{11})/i,
  /(?:youtube\.com\/(?:embed|shorts|live)\/)([\w-]{11})/i,
];

/** Id do vídeo no YouTube, ou null se o link não for do YouTube. */
export function youtubeId(url: string): string | null {
  for (const re of YT) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function videoHost(url: string): VideoHost {
  const u = (url ?? "").trim();
  if (!u) return "outro";
  if (youtubeId(u)) return "youtube";
  if (/instagram\.com\//i.test(u)) return "instagram";
  if (/tiktok\.com\//i.test(u)) return "tiktok";
  if (/vimeo\.com\//i.test(u)) return "vimeo";
  if (/drive\.google\.com|docs\.google\.com/i.test(u)) return "drive";
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) return "arquivo";
  return "outro";
}

export function videoHostLabel(url: string): string {
  return {
    youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok",
    vimeo: "Vimeo", drive: "Google Drive", arquivo: "Arquivo", outro: "Link",
  }[videoHost(url)];
}

/** Miniatura do vídeo quando dá para derivar. Só o YouTube expõe uma URL estável. */
export function videoThumbnail(url: string): string | null {
  const id = youtubeId(url ?? "");
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** True quando o texto colado é um endereço http(s) utilizável. */
export function isUsableVideoUrl(url: string): boolean {
  const u = (url ?? "").trim();
  if (!/^https?:\/\//i.test(u)) return false;
  try { new URL(u); return true; } catch { return false; }
}

/** Formato do vídeo: vertical (Shorts, Reels, TikTok) ou horizontal. */
export function videoIsVertical(url: string): boolean {
  const u = url ?? "";
  return /youtube\.com\/shorts\//i.test(u) || /instagram\.com\/(reel|reels)\//i.test(u) || /tiktok\.com\//i.test(u);
}

/** Miniatura do YouTube em alta (1280×720), com a de 480×360 como reserva. */
export function youtubeThumbs(url: string): string[] {
  const id = youtubeId(url ?? "");
  return id ? [`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`] : [];
}

/**
 * Endereço do player incorporável — o vídeo toca no próprio site, sem abrir
 * outra página (decisão do dono, out/2026). null = serviço sem player
 * incorporável conhecido: aí o link continua abrindo numa aba nova.
 *   YouTube   → youtube-nocookie (sem cookie de rastreamento antes do play)
 *   Instagram → /p|reel|tv/<código>/embed (o play é tocado dentro do quadro)
 *   TikTok, Vimeo, Google Drive → players oficiais
 */
export function videoEmbedUrl(url: string): string | null {
  const u = (url ?? "").trim();
  const yt = youtubeId(u);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;
  const ig = u.match(/instagram\.com\/(?:[\w.]+\/)?(p|reels?|tv)\/([\w-]+)/i);
  if (ig) return `https://www.instagram.com/${ig[1].toLowerCase() === "tv" ? "tv" : ig[1].toLowerCase().startsWith("reel") ? "reel" : "p"}/${ig[2]}/embed/`;
  const tt = u.match(/tiktok\.com\/.*\/video\/(\d+)/i);
  if (tt) return `https://www.tiktok.com/embed/v2/${tt[1]}`;
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`;
  const dr = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/i);
  if (dr) return `https://drive.google.com/file/d/${dr[1]}/preview`;
  return null;
}
