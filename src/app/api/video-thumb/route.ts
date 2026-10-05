import { NextRequest, NextResponse } from "next/server";
import { videoHost } from "@/lib/video-link";

/**
 * GET /api/video-thumb?url=<link do vídeo> → { thumbnail: string | null }
 *
 * Miniatura de vídeos que não expõem uma URL fixa como o YouTube:
 *   Vimeo e TikTok → oEmbed público (thumbnail_url)
 *   Instagram, Google Drive → og:image da página, quando ela entrega
 * Só consulta esses domínios (nada de buscar URL arbitrária). Resposta em cache
 * por um dia na borda; sem miniatura → null, e a galeria mostra o ícone de play.
 */

export const runtime = "nodejs";

const UA = "Mozilla/5.0 (compatible; OrbitalBot/1.0; +https://orbitalrevestimentos.com.br)";
const ok = (thumbnail: string | null) =>
  NextResponse.json({ thumbnail }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) }).catch(() => null);
  if (!res || !res.ok) return null;
  return (await res.json().catch(() => null)) as Record<string, unknown> | null;
}

async function ogImage(url: string): Promise<string | null> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(6000), redirect: "follow" }).catch(() => null);
  if (!res || !res.ok) return null;
  const html = (await res.text().catch(() => "")).slice(0, 300_000);
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const img = m?.[1]?.replace(/&amp;/g, "&") ?? null;
  return img && /^https:\/\//i.test(img) ? img : null;
}

/** Drive: link de arquivo → miniatura oficial do Drive (arquivo público). */
function driveThumb(url: string): string | null {
  const id = url.match(/\/file\/d\/([\w-]{10,})/)?.[1] || url.match(/[?&]id=([\w-]{10,})/)?.[1];
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1280` : null;
}

export async function GET(req: NextRequest) {
  const raw = new URL(req.url).searchParams.get("url") ?? "";
  let u: URL;
  try { u = new URL(raw); } catch { return ok(null); }
  if (u.protocol !== "https:") return ok(null);
  const url = u.toString();

  switch (videoHost(url)) {
    case "vimeo": {
      const j = await getJson(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}&width=1280`);
      return ok(typeof j?.thumbnail_url === "string" ? j.thumbnail_url : null);
    }
    case "tiktok": {
      const j = await getJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      return ok(typeof j?.thumbnail_url === "string" ? j.thumbnail_url : null);
    }
    case "instagram":
      return ok(await ogImage(url));
    case "drive":
      return ok(driveThumb(url));
    default:
      return ok(null);
  }
}
