"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { COVER_ASPECT, coverStyle } from "@/lib/cover-crop";

/**
 * Página de um showroom parceiro: o endereço mora no parceiro, e cada ambiente
 * é um projeto independente exibido dentro dele.
 */

interface Showroom {
  id: string; slug: string; name: string; address: string | null; maps_url: string | null;
  description: string | null; logo_url: string | null; cover_url: string | null;
  display_cover: string | null; ambient_count: number;
}
interface Ambient {
  id: string; slug: string; title: string; product_code: string; short_description?: string;
  image_after: string; showroom_id?: string | null;
  cover_focus_x?: number; cover_focus_y?: number; cover_zoom?: number;
}

export default function ShowroomClient({ slug }: { slug: string }) {
  const [sr, setSr] = useState<Showroom | null>(null);
  const [ambients, setAmbients] = useState<Ambient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [list, projects] = await Promise.all([
        fetch("/api/project-showrooms").then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/projects/photos").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);
      if (!alive) return;
      const found = (Array.isArray(list) ? list : []).find((s: Showroom) => s.slug === slug) ?? null;
      setSr(found);
      setAmbients(found ? (projects as Ambient[]).filter((p) => p.showroom_id === found.id) : []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug]);

  if (loading) {
    return <div className="pt-32 pb-32 text-center text-[#74777f] text-sm font-[var(--font-inter)]">Carregando…</div>;
  }

  if (!sr) {
    return (
      <div className="pt-32 pb-32 max-w-4xl mx-auto px-6 text-center">
        <h1 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl mb-3">Showroom não encontrado</h1>
        <Link href="/projetos" className="text-[#002045] underline text-sm font-[var(--font-inter)]">
          Ver todos os projetos
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-20">
      <section className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12 lg:py-16">
        <Link href="/projetos" className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors mb-6">
          ‹ Projetos
        </Link>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          {(sr.logo_url || sr.display_cover) && (
            <div className="w-full lg:w-[360px] shrink-0">
              <div className="w-full overflow-hidden bg-[#f0f0f0] relative" style={{ aspectRatio: sr.logo_url ? "16 / 9" : COVER_ASPECT }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sr.logo_url || sr.display_cover || ""} alt={sr.name}
                  className="absolute inset-0 w-full h-full"
                  style={sr.logo_url ? { objectFit: "contain" } : { objectFit: "cover" }} />
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-[#74777f] text-[11px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] mb-2">
              Showroom parceiro
            </p>
            <h1 className="font-[var(--font-noto-serif)] text-[#002045] text-4xl lg:text-5xl font-normal">{sr.name}</h1>

            {sr.description && (
              <p className="text-[#43474e] text-base font-[var(--font-inter)] mt-4 max-w-2xl leading-relaxed">{sr.description}</p>
            )}

            {sr.address && (
              <p className="text-[#43474e] text-sm font-[var(--font-inter)] mt-5">{sr.address}</p>
            )}

            <div className="flex flex-wrap gap-3 mt-5">
              {sr.maps_url && (
                <a href={sr.maps_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#002045] text-white text-[11px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-3 hover:bg-[#1a365d] transition-colors">
                  Ver no mapa
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </a>
              )}
              <Link href="/contato"
                className="inline-flex items-center border border-[#002045] text-[#002045] text-[11px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-3 hover:bg-[#002045] hover:text-white transition-colors">
                Falar com a Orbital
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 lg:px-10 pb-24">
        <div className="flex items-baseline gap-4 mb-5 pb-4 border-b border-[#e2e2e2]">
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">Ambientes com Orbital</h2>
          <p className="text-xs font-[var(--font-inter)] text-[#74777f]">
            {ambients.length} {ambients.length === 1 ? "ambiente" : "ambientes"} neste showroom
          </p>
        </div>

        {ambients.length === 0 ? (
          <p className="text-[#74777f] text-sm font-[var(--font-inter)] py-12 text-center">
            Nenhum ambiente publicado neste showroom ainda.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
            {ambients.map((a) => (
              // Por id, não por slug: o slug de um projeto criado pelo editor
              // ainda é "rascunho-…" e não deve aparecer para o visitante.
              <Link key={a.id} href={`/projetos?projeto=${encodeURIComponent(a.id)}`} className="bg-white flex flex-col group">
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: COVER_ASPECT }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.image_after} alt={a.title}
                    className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-[1.03]"
                    style={coverStyle(a.cover_focus_x, a.cover_focus_y, a.cover_zoom)} />
                </div>
                <div className="px-3 py-3">
                  <p className="font-[var(--font-noto-serif)] text-[#002045] text-base">{a.title}</p>
                  <p className="text-[#74777f] text-[11px] font-[var(--font-inter)] mt-0.5">
                    {a.product_code}{a.short_description ? ` · ${a.short_description}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
