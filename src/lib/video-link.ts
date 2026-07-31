/**
 * Links de vídeo hospedados fora (YouTube, Vimeo, Drive).
 *
 * Vídeo longo não sobe para o storage do site: entra como link. O painel usa
 * isto para validar o que foi colado e a galeria para mostrar uma miniatura em
 * vez de um quadrado preto.
 *
 * A galeria continua ABRINDO o link numa aba nova, sem incorporar o player —
 * decisão que já existia e não mudou.
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
