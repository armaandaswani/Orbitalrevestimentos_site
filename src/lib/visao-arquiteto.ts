/**
 * Série "A Visão do Arquiteto" (playlist do canal Orbital no YouTube).
 *
 * A home lê a playlist sozinha (cache de 1 dia): vídeo novo publicado lá entra
 * no site sem mexer no código. Se o YouTube não responder ou mudar o formato da
 * página, ficam os vídeos conhecidos abaixo — a seção nunca some.
 */

export const PLAYLIST_ID = "PLMSH_mfSSWHs";
export const PLAYLIST_URL = `https://www.youtube.com/playlist?list=${PLAYLIST_ID}`;

export interface VideoArquiteto {
  id: string;
  /** "Sérgio Monteiro de Paula" */
  nome: string;
  /** "Bowers Arquitetura" (quando o título traz o escritório) */
  escritorio: string | null;
}

const CONHECIDOS: VideoArquiteto[] = [
  { id: "qS1wODmwwu8", nome: "Sérgio Monteiro de Paula", escritorio: null },
  { id: "VA-23F3-QK0", nome: "Marco Rezende", escritorio: "Bowers Arquitetura" },
];

/** "A Visão do Arquiteto | Marco Rezende – Bowers Arquitetura" → nome + escritório. */
function partesDoTitulo(titulo: string): { nome: string; escritorio: string | null } {
  const depois = titulo.includes("|") ? titulo.split("|").slice(1).join("|").trim() : titulo.trim();
  const [nome, ...resto] = depois.split(/\s+[–—-]\s+/);
  return { nome: nome.trim(), escritorio: resto.join(" – ").trim() || null };
}

export async function videosVisaoDoArquiteto(): Promise<VideoArquiteto[]> {
  try {
    const res = await fetch(PLAYLIST_URL, {
      headers: { "Accept-Language": "pt-BR,pt;q=0.9", "User-Agent": "Mozilla/5.0 (compatible; OrbitalSite/1.0)" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return CONHECIDOS;
    const html = await res.text();
    const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
    if (!m) return CONHECIDOS;
    const data = JSON.parse(m[1]);
    const achados: VideoArquiteto[] = [];
    const visto = new Set<string>();
    const walk = (o: unknown) => {
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (!o || typeof o !== "object") return;
      const r = o as Record<string, unknown>;
      // Shorts (formato atual da playlist) e vídeos comuns.
      const shorts = r.shortsLockupViewModel as Record<string, unknown> | undefined;
      const comum = r.playlistVideoRenderer as Record<string, unknown> | undefined;
      let id: string | null = null;
      let titulo = "";
      if (shorts) {
        id = JSON.stringify(shorts).match(/"videoId":"([\w-]{11})"/)?.[1] ?? null;
        const meta = shorts.overlayMetadata as { primaryText?: { content?: string } } | undefined;
        titulo = meta?.primaryText?.content ?? String(shorts.accessibilityText ?? "");
      } else if (comum) {
        id = typeof comum.videoId === "string" ? comum.videoId : null;
        const t = comum.title as { runs?: { text?: string }[]; simpleText?: string } | undefined;
        titulo = t?.simpleText ?? (t?.runs ?? []).map((x) => x.text ?? "").join("");
      }
      if (id && titulo && !visto.has(id)) {
        visto.add(id);
        achados.push({ id, ...partesDoTitulo(titulo) });
      }
      Object.values(r).forEach(walk);
    };
    walk(data);
    return achados.length > 0 ? achados : CONHECIDOS;
  } catch {
    return CONHECIDOS;
  }
}
