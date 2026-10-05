"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import ContatoCta from "@/components/ContatoCta";
import {
  buildGalleryItems,
  filterGalleryItems,
  type GalleryFilter,
  type GalleryItem,
  type GalleryMediaRow,
  type MediaCategory,
} from "@/lib/project-gallery";
import { COVER_ASPECT, coverStyle } from "@/lib/cover-crop";
import { videoHost, videoHostLabel, videoIsVertical } from "@/lib/video-link";
import VideoThumb from "@/components/VideoThumb";

/**
 * A qual seção o projeto pertence.
 *
 * primary_category (migração 053) é a resposta certa. O array antigo continua
 * valendo de reserva para qualquer registro que ainda não tenha passado pela
 * migração — assim nenhum projeto some do site durante a virada.
 */
function sectionSlugs(p: Project): string[] {
  const primary = (p.primary_category ?? "").trim();
  if (primary) return [primary];
  return p.categories ?? [];
}

// ─── Types ────────────────────────────────────────────────────────────────────
// Slug da categoria, ou "todos". Deixou de ser uma união fechada porque as
// categorias agora são criadas pelo painel — o código não conhece a lista.
type Category = string;

interface Project {
  id: string;
  slug: string;
  title: string;
  product_code: string;
  categories: string[];
  image_after: string;
  image_before?: string;
  note?: string;
  is_featured?: boolean;
  is_new?: boolean;
  feature_order?: number;
  /** Classificação explícita da capa (migração 051). Ausente → "depois". */
  cover_category?: string | null;
  /** Migração 053 — categoria única + parceiro + recorte da capa. */
  primary_category?: string | null;
  showroom_id?: string | null;
  tags?: string[] | null;
  cover_focus_x?: number | null;
  cover_focus_y?: number | null;
  cover_zoom?: number | null;
}

interface PartnerShowroom {
  id: string; slug: string; name: string;
  /** Migração 063: showroom parceiro (ambiente decorado) ou ponto de revenda. */
  kind?: "showroom" | "revenda";
  created_at?: string | null;
  address: string | null; maps_url: string | null; description: string | null;
  logo_url: string | null; cover_url: string | null;
  ambient_count: number; display_cover: string | null;
  display_focus_x: number; display_focus_y: number; display_zoom: number;
}

interface Render {
  id: string;
  slug: string;
  title: string;
  product_code: string;
  image_path: string;
}

interface ProjCatMeta {
  slug: string;
  label: string;
  /** Subtítulo da seção na galeria (migração 052). Ausente → seção sem subtítulo. */
  description?: string | null;
  parent_slug: string | null;
  sort_order: number;
  is_showroom: boolean;
  address: string | null;
  maps_url: string | null;
  invite_enabled: boolean;
}

// A montagem da galeria (capa + antes legada + mídias, sem duplicatas) vive em
// @/lib/project-gallery — mesma função exercitada pelo script de verificação.
type LightboxItem = GalleryItem;

// ─── Lightbox ─────────────────────────────────────────────────────────────────
type ViewMode = "carousel" | "grid" | "split";
type LightboxFilter = GalleryFilter;

function CategoryPill({ cat }: { cat: MediaCategory }) {
  if (cat === "antes")
    return (
      <span className="text-[8px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30">
        Antes
      </span>
    );
  if (cat === "depois")
    return (
      <span className="text-[8px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] px-2 py-0.5 bg-[#3b6934]/30 text-[#a1d494] border border-[#3b6934]/40">
        Depois
      </span>
    );
  return null;
}

function ProjectLightbox({
  project,
  items,
  loading,
  idx,
  onClose,
  onDotClick,
}: {
  project: Project;
  items: LightboxItem[];
  loading: boolean;
  idx: number;
  onClose: () => void;
  onDotClick: (i: number) => void;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("carousel");
  const [filter, setFilter] = useState<LightboxFilter>("all");

  const hasAntes  = items.some((i) => i.category === "antes");
  const hasDepois = items.some((i) => i.category === "depois");
  const hasVideos = items.some((i) => i.kind === "video");
  const canSplit  = hasAntes && hasDepois;

  const visibleItems = filterGalleryItems(items, filter);

  // keep carousel idx in bounds when filter changes
  const safeIdx = Math.min(idx, Math.max(visibleItems.length - 1, 0));
  const current = visibleItems[safeIdx];

  // Ao trocar de filtro, tenta manter a MESMA foto aberta; se ela não pertence
  // ao novo filtro, volta para a primeira (nunca fica em índice inválido).
  const changeFilter = (next: LightboxFilter) => {
    const currentUrl = visibleItems[safeIdx]?.url;
    const nextList = filterGalleryItems(items, next);
    const keep = currentUrl ? nextList.findIndex((i) => i.url === currentUrl) : -1;
    setFilter(next);
    setViewMode("carousel");
    onDotClick(keep >= 0 ? keep : 0);
  };

  const filterTabs: LightboxFilter[] = [
    "all",
    ...(hasAntes ? (["antes"] as LightboxFilter[]) : []),
    ...(hasDepois ? (["depois"] as LightboxFilter[]) : []),
    ...(hasVideos ? (["video"] as LightboxFilter[]) : []),
  ];
  const filterLabel = (f: LightboxFilter) =>
    f === "all" ? "Todas" : f === "video" ? "Vídeos" : f === "geral" ? "Geral" : f.charAt(0).toUpperCase() + f.slice(1);

  // Navegação relativa ao FILTRO ativo (antes dava a volta pelo total, saltando
  // para itens que o filtro tinha escondido).
  const total = visibleItems.length;
  const goPrev = () => { if (total) onDotClick((safeIdx - 1 + total) % total); };
  const goNext = () => { if (total) onDotClick((safeIdx + 1) % total); };

  // Teclado — dentro do lightbox para respeitar o filtro ativo.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Split-mode images
  const antesImg  = items.find((i) => i.category === "antes" && i.kind === "image");
  const depoisImg = items.find((i) => i.category === "depois" && i.kind === "image");

  return (
    <div className="fixed inset-0 z-[60] bg-[#0a0f1a] flex flex-col" onClick={onClose}>

      {/* ── Header ── */}
      <div
        className="flex items-start justify-between px-5 pt-4 pb-3 flex-shrink-0 border-b border-white/8"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-[#a1d494] text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)]">
            {project.product_code}
          </p>
          <p className="text-white font-serif text-base mt-0.5">{project.title}</p>
        </div>

        {/* View mode + filter row */}
        <div className="flex items-center gap-3 ml-4">
          {/* Filter tabs */}
          {(hasAntes || hasDepois || hasVideos) && (
            <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 p-0.5">
              {filterTabs.map((f) => (
                <button
                  key={f}
                  onClick={() => changeFilter(f)}
                  className={`text-[9px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 transition-colors ${filter === f ? "bg-white text-[#0a0f1a]" : "text-white/40 hover:text-white/80"}`}
                >
                  {filterLabel(f)}
                </button>
              ))}
            </div>
          )}

          {/* View mode icons */}
          {!loading && items.length > 1 && (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-0.5">
              {/* Carousel */}
              <button
                title="Carrossel"
                onClick={() => setViewMode("carousel")}
                className={`w-7 h-7 flex items-center justify-center transition-colors ${viewMode === "carousel" ? "bg-white text-[#0a0f1a]" : "text-white/40 hover:text-white/80"}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="1"/><path d="M8 12h8M12 8v8"/></svg>
              </button>
              {/* Grid */}
              <button
                title="Galeria"
                onClick={() => setViewMode("grid")}
                className={`w-7 h-7 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-white text-[#0a0f1a]" : "text-white/40 hover:text-white/80"}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              </button>
              {/* Split / antes×depois */}
              {canSplit && (
                <button
                  title="Antes × Depois"
                  onClick={() => setViewMode("split")}
                  className={`w-7 h-7 flex items-center justify-center transition-colors ${viewMode === "split" ? "bg-white text-[#0a0f1a]" : "text-white/40 hover:text-white/80"}`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="9" height="16" rx="1"/><rect x="13" y="4" width="9" height="16" rx="1"/></svg>
                </button>
              )}
            </div>
          )}

          <button onClick={onClose} className="text-white/50 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
        </div>
      </div>

      {/* Mobile filter bar */}
      {(hasAntes || hasDepois || hasVideos) && (
        <div className="flex sm:hidden items-center gap-1 px-5 py-2 border-b border-white/8 flex-shrink-0 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
          {filterTabs.map((f) => (
            <button
              key={f}
              onClick={() => changeFilter(f)}
              className={`flex-shrink-0 text-[9px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-3 py-1.5 border transition-colors ${filter === f ? "bg-white text-[#0a0f1a] border-white" : "border-white/20 text-white/50 hover:text-white/80"}`}
            >
              {filterLabel(f)}
            </button>
          ))}
        </div>
      )}

      {/* ── Content area ── */}
      <div className="flex-1 min-h-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* LOADING */}
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          </div>
        )}

        {/* SPLIT MODE */}
        {!loading && viewMode === "split" && canSplit && (
          <div className="h-full grid grid-cols-2 gap-px bg-white/5">
            {[
              { item: antesImg, label: "Antes" },
              { item: depoisImg, label: "Depois" },
            ].map(({ item, label }) =>
              item ? (
                <div key={label} className="relative flex flex-col h-full overflow-hidden">
                  <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
                    <img
                      src={item.url}
                      alt={label}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-shrink-0 px-4 py-2.5 bg-black/60 border-t border-white/8 flex items-start gap-2.5">
                    <CategoryPill cat={item.category} />
                    {item.description && (
                      <p className="text-white/60 text-[10px] font-[var(--font-inter)] leading-relaxed">{item.description}</p>
                    )}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* GRID MODE */}
        {!loading && viewMode === "grid" && (
          <div className="h-full overflow-y-auto py-4 px-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-w-5xl mx-auto">
              {visibleItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => { onDotClick(i); setViewMode("carousel"); }}
                  className="relative aspect-square group overflow-hidden bg-black/30 focus:outline-none"
                >
                  {item.kind === "image" ? (
                    <Image
                      src={item.url}
                      alt={item.label ?? ""}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    // Vídeo por link: quando dá para derivar a miniatura (YouTube),
                    // mostra a capa real em vez de um quadrado preto.
                    <div className="w-full h-full relative bg-[#0a1628]">
                      <VideoThumb url={item.url} className="absolute inset-0 w-full h-full object-cover opacity-70 transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white" opacity=".85"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-2">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 w-full">
                      {item.category !== "geral" && <CategoryPill cat={item.category} />}
                      {item.description && (
                        <p className="text-white/80 text-[9px] font-[var(--font-inter)] leading-tight line-clamp-2">{item.description}</p>
                      )}
                    </div>
                  </div>
                  {/* Video badge */}
                  {item.kind === "video" && (
                    <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5">
                      <span className="text-white/60 text-[7px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)]">VÍD</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CAROUSEL MODE */}
        {!loading && viewMode === "carousel" && (
          <div className="h-full flex flex-col">
            {/* Main display */}
            <div className="flex-1 relative flex items-center justify-center min-h-0 px-12">
              {current?.kind === "image" ? (
                <img
                  key={current.url}
                  src={current.url}
                  alt={current.label ?? project.title}
                  className="max-h-full max-w-full object-contain select-none"
                  draggable={false}
                />
              ) : current?.kind === "video" && videoHost(current.url) === "arquivo" ? (
                // Vídeo enviado ao próprio site: toca aqui mesmo.
                <video
                  key={current.url}
                  src={current.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-full max-w-full bg-black"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : current?.kind === "video" ? (
                // Link externo (YouTube, Instagram…): a miniatura no formato do
                // próprio vídeo (vertical para Shorts/Reels/TikTok), nítida, com o
                // play no meio; tudo abre o vídeo em nova aba — sem incorporar o player.
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 py-2" onClick={(e) => e.stopPropagation()}>
                  <a
                    key={current.url}
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Assistir ao vídeo"
                    className={`group/video relative block overflow-hidden bg-[#141a26] border border-white/10 ${
                      videoIsVertical(current.url) ? "h-[calc(100%-88px)] max-h-[720px]" : "w-full max-w-3xl"
                    }`}
                    style={{ aspectRatio: videoIsVertical(current.url) ? "9 / 16" : "16 / 9", maxWidth: "100%" }}
                  >
                    <VideoThumb hd url={current.url} className="absolute inset-0 w-full h-full object-cover" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-16 h-16 rounded-full bg-black/55 border border-white/50 backdrop-blur-sm flex items-center justify-center group-hover/video:bg-black/75 group-hover/video:scale-105 transition-all">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                      </span>
                    </span>
                    <span className="absolute left-3 bottom-3 bg-black/60 text-white text-[9px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] px-2 py-1">
                      {videoHostLabel(current.url)}
                    </span>
                  </a>
                  {current.description && (
                    <p className="text-white/70 text-sm font-[var(--font-inter)] max-w-md text-center leading-relaxed">{current.description}</p>
                  )}
                  <a
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 bg-white text-[#0a0f1a] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-6 py-3 hover:bg-white/90 transition-colors"
                  >
                    Assistir ao vídeo
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                  </a>
                </div>
              ) : null}

              {/* Nav arrows */}
              {visibleItems.length > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/70 text-white transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/70 text-white transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                </>
              )}
            </div>

            {/* Info bar — category pill + description */}
            {(current?.category !== "geral" || current?.description) && (
              <div className="flex-shrink-0 px-5 py-2 border-t border-white/8 flex items-center gap-3">
                {current?.category && current.category !== "geral" && <CategoryPill cat={current.category} />}
                {current?.description && (
                  <p className="text-white/55 text-xs font-[var(--font-inter)] leading-relaxed">{current.description}</p>
                )}
              </div>
            )}

            {/* Dots + counter */}
            {visibleItems.length > 1 && (
              <div className="flex-shrink-0 flex items-center justify-center gap-1.5 py-3 px-5">
                {visibleItems.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => onDotClick(i)}
                    className={`transition-all rounded-full ${i === safeIdx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/25 hover:bg-white/55"}`}
                  />
                ))}
                <span className="text-white/35 text-[10px] font-[var(--font-inter)] ml-3">
                  {safeIdx + 1} / {visibleItems.length}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

// Static IA renders — always shown as a base layer (DB renders supplement these)
const STATIC_RENDERS: Render[] = [
  { id: "s1",  slug: "orb001-consultorio-odonto", title: "Consultório Odontológico",  product_code: "ORB-001", image_path: "/images/renders/orb001-consultorio-odonto.png" },
  { id: "s2",  slug: "orb001-sala",               title: "Sala de Estar",              product_code: "ORB-001", image_path: "/images/renders/orb001-sala.png" },
  { id: "s3",  slug: "orb002-mesa-estudos",        title: "Mesa de Estudos",            product_code: "ORB-002", image_path: "/images/renders/orb002-mesa-estudos.jpg" },
  { id: "s4",  slug: "orb002-restaurante",         title: "Restaurante",                product_code: "ORB-002", image_path: "/images/renders/orb002-restaurante.png" },
  { id: "s5",  slug: "orb003-restaurante",         title: "Restaurante",                product_code: "ORB-003", image_path: "/images/renders/orb003-restaurante.png" },
  { id: "s6",  slug: "orb003-sala-conf",           title: "Sala de Conferências",       product_code: "ORB-003", image_path: "/images/renders/orb003-sala-conf.png" },
  { id: "s7",  slug: "orb004-comercio-teto",       title: "Comércio",                   product_code: "ORB-004", image_path: "/images/renders/orb004-comercio-teto.png" },
  { id: "s8",  slug: "orb005-consultorio-oftalmo", title: "Consultório Oftalmológico",  product_code: "ORB-005", image_path: "/images/renders/orb005-consultorio-oftalmo.png" },
  { id: "s9",  slug: "orb006-banheiro",            title: "Banheiro",                   product_code: "ORB-006", image_path: "/images/renders/orb006-banheiro.png" },
  { id: "s10", slug: "orb007-banheiro",            title: "Banheiro",                   product_code: "ORB-007", image_path: "/images/renders/orb007-banheiro.png" },
  { id: "s11", slug: "orb007-pediatria",           title: "Clínica Pediátrica",         product_code: "ORB-007", image_path: "/images/renders/orb007-pediatria.png" },
  { id: "s12", slug: "orb008-sala",                title: "Sala de Estar",              product_code: "ORB-008", image_path: "/images/renders/orb008-sala.png" },
  { id: "s13", slug: "orb009-banheiro",            title: "Banheiro",                   product_code: "ORB-009", image_path: "/images/renders/orb009-banheiro.png" },
  { id: "s14", slug: "orb012-cozinha",             title: "Cozinha",                    product_code: "ORB-012", image_path: "/images/renders/orb012-cozinha.png" },
  { id: "s15", slug: "orb012-sala",                title: "Sala de Estar",              product_code: "ORB-012", image_path: "/images/renders/orb012-sala.png" },
  { id: "s16", slug: "orb013-quarto",              title: "Quarto",                     product_code: "ORB-013", image_path: "/images/renders/orb013-quarto.png" },
  { id: "s17", slug: "orb013-restaurante",         title: "Restaurante",                product_code: "ORB-013", image_path: "/images/renders/orb013-restaurante.png" },
  { id: "s18", slug: "orb014-escritorio",          title: "Escritório",                 product_code: "ORB-014", image_path: "/images/renders/orb014-escritorio.png" },
  { id: "s19", slug: "orb015-banheiro",            title: "Banheiro",                   product_code: "ORB-015", image_path: "/images/renders/orb015-banheiro.png" },
];

// A ordem das seções e dos filtros vem de project_categories.sort_order — é o
// que os botões ↑↓ do painel gravam.
//
// Rótulo e subtítulo das categorias originais, para o site não empobrecer na
// janela entre este deploy e a migração 052 (que grava estes mesmos valores no
// banco). O que estiver preenchido no banco SEMPRE vence: assim que a 052 rodar,
// ou assim que alguém editar o texto no painel, este mapa deixa de ter efeito.
const SEED_CAT_TEXT: Record<string, { label: string; description: string }> = {
  residencial: { label: "Residencial",  description: "Ambientes residenciais revestidos sem obra" },
  comercial:   { label: "Comercial",    description: "Restaurantes, escritórios e espaços de uso coletivo" },
  umido:       { label: "Áreas Úmidas", description: "Lavabos, banheiros e cozinhas — sem inchar, sem mofar" },
  showroom:    { label: "Showroom",     description: "Ambientes em exposição — visite e veja de perto" },
  nautico:     { label: "Náutico",      description: "Revestimento homologado para embarcações" },
};

/** Ordem das categorias do banco; o mapa acima só preenche o que faltar. */
function resolveCats(cats: ProjCatMeta[]): ProjCatMeta[] {
  const rows = cats.length > 0
    ? cats
    : Object.entries(SEED_CAT_TEXT).map(([slug, t], i) => ({
        slug, label: t.label, description: t.description, parent_slug: null,
        sort_order: i, is_showroom: false, address: null, maps_url: null, invite_enabled: false,
      }));
  return rows
    .map((c) => {
      const seed = SEED_CAT_TEXT[c.slug];
      if (!seed) return c;
      // Rótulo do banco vence, exceto quando ainda é o slug cru gerado pelo seed
      // automático (ex.: "Umido" antes da 052) — aí o texto com acento é melhor.
      const label = c.label && c.label.toLowerCase() !== c.slug.toLowerCase() ? c.label : seed.label;
      return { ...c, label, description: c.description || seed.description };
    })
    // Empate em sort_order (dado antigo) não pode deixar a ordem das seções
    // variando entre carregamentos — o slug desempata.
    .sort((a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug));
}

// ─── Project card — portrait aspect ───────────────────────────────────────────
function ProjectCard({ project, onOpen }: { project: Project; onOpen: (p: Project, startUrl?: string) => void }) {
  const [showBefore, setShowBefore] = useState(false);
  // O toggle só existe quando há MESMO duas imagens distintas. image_before
  // igual à capa (dado legado) não vira um falso "antes".
  const hasBA = !!project.image_before && project.image_before !== project.image_after;

  return (
    <div
      className="bg-white flex flex-col cursor-pointer group"
      onClick={() => onOpen(project, showBefore && project.image_before ? project.image_before : project.image_after)}
    >
      {/* Image — 4:5, a mesma proporção do enquadrador do painel. O recorte
          (foco + zoom) vem do projeto, então o card sai igual à prévia. */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: COVER_ASPECT }}>
        {/* next/image: a Vercel redimensiona e serve pela própria CDN. Estes
            cartões carregam em TODA visita — antes eram os arquivos originais. */}
        <Image
          src={project.image_after}
          alt={`${project.title} — depois`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={`transition-opacity duration-500 ${hasBA && showBefore ? "opacity-0" : "opacity-100"}`}
          style={coverStyle(project.cover_focus_x, project.cover_focus_y, project.cover_zoom)}
        />
        {hasBA && project.image_before && (
          <Image
            src={project.image_before}
            alt={`${project.title} — antes`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-opacity duration-500 ${showBefore ? "opacity-100" : "opacity-0"}`}
          />
        )}

        {/* Selo "Novo" — controlado pelo painel */}
        {project.is_new && (
          <span className="absolute top-3 left-3 z-10 bg-[#3b6934] text-white text-[9px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] px-2.5 py-1">Novo</span>
        )}

        {/* Hover overlay — gallery cue */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center gap-1.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span className="text-white text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)]">Ver galeria</span>
          </div>
        </div>

        {/* Antes / Depois toggle — stop propagation so it doesn't open lightbox */}
        {hasBA && (
          <div
            className="absolute top-3 right-3 flex overflow-hidden border border-white/30 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowBefore(true)}
              className={`text-[9px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-3.5 py-2 transition-colors duration-150 ${
                showBefore ? "bg-white text-[#111]" : "text-white/55 hover:text-white"
              }`}
            >
              Antes
            </button>
            <span className="w-px bg-white/25" />
            <button
              onClick={() => setShowBefore(false)}
              className={`text-[9px] tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-3.5 py-2 transition-colors duration-150 ${
                !showBefore ? "bg-white text-[#111]" : "text-white/55 hover:text-white"
              }`}
            >
              Depois
            </button>
          </div>
        )}
      </div>

      {/* Caption below image */}
      <div className="px-3 pt-2.5 pb-3 border-t border-[#efefef]">
        <p className="text-[#3b6934] text-[8px] tracking-[0.18em] uppercase font-semibold font-[var(--font-inter)] mb-1">
          {project.product_code}
        </p>
        <h3 className="font-serif text-[#002045] text-sm font-normal leading-snug">
          {project.title}
        </h3>
        {project.note && (
          <p className="text-[#9e9e9e] text-[9px] font-[var(--font-inter)] tracking-[0.04em] uppercase mt-1">
            {project.note}
          </p>
        )}
        <p className="text-[#74777f] text-[8px] font-[var(--font-inter)] mt-1.5 flex items-center gap-1">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Ver galeria completa
        </p>
      </div>
    </div>
  );
}

// ─── Render card — portrait aspect ────────────────────────────────────────────
function RenderCard({ render }: { render: Render }) {
  return (
    <div className="bg-[#111827] flex flex-col group">
      {/* Image */}
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        <img
          src={render.image_path}
          alt={`${render.title} — ${render.product_code}`}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {/* IA badge — small, unobtrusive */}
        <div className="absolute top-3 left-3 px-2 py-0.5 border border-white/20 bg-black/40 backdrop-blur-sm">
          <span className="text-white/55 text-[7px] tracking-[0.25em] uppercase font-bold font-[var(--font-inter)]">
            IA
          </span>
        </div>
      </div>

      {/* Caption below image */}
      <div className="px-3 pt-2.5 pb-3 border-t border-white/8">
        <p className="text-[#a1d494] text-[8px] tracking-[0.18em] uppercase font-semibold font-[var(--font-inter)] mb-1">
          {render.product_code}
        </p>
        <h3 className="font-serif text-white/85 text-sm font-normal leading-snug">
          {render.title}
        </h3>
      </div>
    </div>
  );
}

// ─── Shared section header ─────────────────────────────────────────────────────
function SectionHeader({ label, desc, light = false }: { label: string; desc: string; light?: boolean }) {
  return (
    <div className={`flex items-baseline gap-4 mb-5 pb-4 border-b ${light ? "border-white/15" : "border-[#e2e2e2]"}`}>
      <h3 className={`font-serif text-xl font-normal ${light ? "text-white" : "text-[#002045]"}`}>
        {label}
      </h3>
      <p className={`text-xs font-[var(--font-inter)] hidden sm:block ${light ? "text-white/40" : "text-[#74777f]"}`}>
        {desc}
      </p>
    </div>
  );
}

/** Slug da categoria que agrupa os showrooms parceiros. */
const SHOWROOM_CAT = "showroom";

/** Rótulo das características (tags) que viram filtro "Tipo de ambiente". */
const TAG_LABELS: Record<string, string> = {
  umido: "Áreas úmidas",
  cozinha: "Cozinha",
  parede: "Parede",
  teto: "Teto",
};
const tagLabel = (slug: string) => TAG_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");

/**
 * Ponto de revenda que aparece enquanto a migração 063 não rodou (sem a coluna
 * "kind" no banco, nenhum lugar vem como revenda). Assim que houver um ponto de
 * revenda ativo no banco, esta lista deixa de ser usada.
 */
const REVENDA_FALLBACK: PartnerShowroom[] = [
  {
    id: "revenda-casa-do-eletricista", slug: "casa-do-eletricista-centro", name: "Casa do Eletricista — Centro", kind: "revenda",
    address: null, maps_url: null, description: "Todos os modelos do Painel Flexível Fibra de Bambu em display, no tamanho real.",
    logo_url: null, cover_url: null, ambient_count: 0, display_cover: null, display_focus_x: 0.5, display_focus_y: 0.5, display_zoom: 1,
  },
];

/** "Novo" nos 120 dias depois do cadastro. */
function isNew(createdAt?: string | null) {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  return Number.isFinite(t) && Date.now() - t < 120 * 24 * 60 * 60 * 1000;
}

/** Link "Como chegar": o do painel, ou uma busca no Google Maps pelo nome + endereço. */
function mapsHref(s: PartnerShowroom) {
  if (s.maps_url) return s.maps_url;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address ?? ""} Manaus AM`.trim())}`;
}

// Cartão de um showroom parceiro. Endereço e contagem vêm do parceiro, não de
// cada ambiente — é ele que leva para a página onde os ambientes estão juntos.
function PartnerCard({ s }: { s: PartnerShowroom }) {
  const novo = isNew(s.created_at);
  return (
    <Link href={`/projetos/showroom/${s.slug}`} className="bg-white border border-[#e2e2e2] flex flex-col group hover:border-[#002045] transition-colors">
      <div className="relative w-full overflow-hidden bg-[#f0f0f0]" style={{ aspectRatio: "16 / 10" }}>
        {s.display_cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.display_cover}
            alt={s.name}
            className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-[1.03]"
            style={coverStyle(s.display_focus_x, s.display_focus_y, s.display_zoom)}
          />
        ) : (
          <div className="absolute inset-0 bg-[#002045] flex flex-col items-center justify-center text-center px-6">
            <p className="font-serif text-white text-2xl">{s.name}</p>
            <p className="text-[#a1d494] text-[10px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] mt-2">Fotos em breve</p>
          </div>
        )}
        {novo && (
          <span className="absolute top-3 left-3 bg-[#a1d494] text-[#0a2a12] text-[9px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] px-2 py-1">
            Novo
          </span>
        )}
      </div>
      <div className="px-5 py-4 flex-1 flex flex-col">
        <p className="font-serif text-[#002045] text-xl">{s.name}</p>
        {s.address && (
          <p className="text-[#74777f] text-[12px] font-[var(--font-inter)] mt-1.5 leading-snug">{s.address}</p>
        )}
        {s.ambient_count > 0 && (
          <p className="text-[#a0a3a8] text-[11px] font-[var(--font-inter)] mt-2">
            {s.ambient_count} {s.ambient_count === 1 ? "ambiente" : "ambientes"}
          </p>
        )}
        <span className="inline-flex items-center gap-1.5 text-[#002045] text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] mt-auto pt-4">
          Conhecer showroom
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </span>
      </div>
    </Link>
  );
}

// Cartão de um ponto de revenda: o que tem lá e como chegar.
function RevendaCard({ s }: { s: PartnerShowroom }) {
  return (
    <div className="bg-white border border-[#e2e2e2] border-l-4 border-l-[#3b6934] flex flex-col sm:flex-row">
      {s.display_cover && (
        <div className="relative sm:w-[42%] flex-shrink-0 overflow-hidden bg-[#f0f0f0]" style={{ minHeight: 180 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.display_cover} alt={s.name} className="absolute inset-0 w-full h-full"
            style={coverStyle(s.display_focus_x, s.display_focus_y, s.display_zoom)} />
        </div>
      )}
      <div className="px-5 sm:px-7 py-5 sm:py-6 flex-1 flex flex-col">
        <p className="text-[#3b6934] text-[10px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)]">Ponto de revenda</p>
        <p className="font-serif text-[#002045] text-2xl mt-1">{s.name}</p>
        {s.description && <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed mt-2">{s.description}</p>}
        {s.address && <p className="text-[#74777f] text-[13px] font-[var(--font-inter)] mt-2 leading-snug">{s.address}</p>}
        <div className="flex flex-wrap gap-2 mt-auto pt-5">
          <a href={mapsHref(s)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#002045] text-white text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-3 hover:bg-[#1a365d] transition-colors">
            Como chegar
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </a>
          {s.ambient_count > 0 ? (
            <Link href={`/projetos/showroom/${s.slug}`}
              className="inline-flex items-center gap-2 border border-[#002045] text-[#002045] text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-3 hover:bg-[#002045] hover:text-white transition-colors">
              Ver projetos ({s.ambient_count})
            </Link>
          ) : (
            <Link href="/produtos"
              className="inline-flex items-center gap-2 border border-[#002045] text-[#002045] text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-3 hover:bg-[#002045] hover:text-white transition-colors">
              Ver os modelos
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// Abertura de cada grande seção da página.
function BigSectionHead({ id, eyebrow, title, desc, light = false }: { id: string; eyebrow: string; title: string; desc: string; light?: boolean }) {
  return (
    <div id={`${id}-titulo`} className="mb-8 lg:mb-10">
      <div className="inline-flex items-center gap-3 mb-3">
        <div className={`w-5 h-px ${light ? "bg-[#a1d494]" : "bg-[#3b6934]"}`} />
        <p className={`text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] ${light ? "text-[#a1d494]" : "text-[#3b6934]"}`}>{eyebrow}</p>
      </div>
      <h2 className={`font-serif text-3xl lg:text-4xl font-normal ${light ? "text-white" : "text-[#002045]"}`}>{title}</h2>
      <p className={`text-sm font-[var(--font-inter)] leading-relaxed max-w-2xl mt-2 ${light ? "text-white/55" : "text-[#74777f]"}`}>{desc}</p>
    </div>
  );
}

const SECOES = [
  { id: "obras", label: "Obras" },
  { id: "showrooms", label: "Showrooms" },
  { id: "revenda", label: "Pontos de revenda" },
  { id: "inspiracoes", label: "Inspirações IA" },
] as const;
type SecaoId = (typeof SECOES)[number]["id"];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProjetosPage() {
  const [activeFilter, setActiveFilter] = useState<Category>("todos");
  const [activeTag, setActiveTag] = useState<string>("todos");
  const [cats, setCats] = useState<ProjCatMeta[]>([]);
  const [partners, setPartners] = useState<PartnerShowroom[]>([]);
  const [partnersLoaded, setPartnersLoaded] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [renders, setRenders] = useState<Render[]>([]);
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoId>("obras");

  // Lightbox
  const [lightboxProject, setLightboxProject] = useState<Project | null>(null);
  const [lightboxItems, setLightboxItems] = useState<LightboxItem[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [lightboxLoading, setLightboxLoading] = useState(false);

  const openLightbox = useCallback(async (project: Project, startUrl?: string) => {
    setLightboxProject(project);
    setLightboxIdx(0);
    setLightboxLoading(true);
    const base = buildGalleryItems(project, []);
    setLightboxItems(base);
    // Abrir por uma foto específica (ex.: card no modo "Antes") começa nela.
    if (startUrl) {
      const at = base.findIndex((i) => i.url === startUrl);
      if (at >= 0) setLightboxIdx(at);
    }
    try {
      const res = await fetch(`/api/projects/media?slug=${encodeURIComponent(project.slug)}`);
      const extra: GalleryMediaRow[] = res.ok ? await res.json() : [];
      const full = buildGalleryItems(project, Array.isArray(extra) ? extra : []);
      setLightboxItems(full);
      if (startUrl) {
        const at = full.findIndex((i) => i.url === startUrl);
        if (at >= 0) setLightboxIdx(at);
      }
    } catch { /* show what we have */ }
    setLightboxLoading(false);
  }, []);

  const closeLightbox = useCallback(() => setLightboxProject(null), []);

  // Prevent body scroll when lightbox open
  useEffect(() => {
    document.body.style.overflow = lightboxProject ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxProject]);

  useEffect(() => {
    fetch("/api/projects/photos")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]));
    fetch("/api/projects/renders")
      .then((r) => r.json())
      .then((data) => setRenders(Array.isArray(data) ? data : []))
      .catch(() => setRenders([]));
    fetch("/api/project-categories")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCats(Array.isArray(data) ? data : []))
      .catch(() => setCats([]));
    fetch("/api/project-showrooms")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPartners(Array.isArray(data) ? data : []))
      .catch(() => setPartners([]))
      .finally(() => setPartnersLoaded(true));
  }, []);

  // Chegando da página de um showroom (?projeto=<id>): abre direto a galeria
  // daquele ambiente, uma vez só.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || projects.length === 0) return;
    const want = new URLSearchParams(window.location.search).get("projeto");
    if (!want) return;
    const target = projects.find((p) => p.id === want || p.slug === want);
    if (!target) return;
    deepLinked.current = true;
    // Fora do ciclo de render do efeito: openLightbox faz várias escritas de
    // estado e o React reclama de cascata se elas partirem daqui direto.
    const t = setTimeout(() => openLightbox(target), 0);
    return () => clearTimeout(t);
  }, [projects, openLightbox]);

  // Menu da página: marca a seção que está na tela.
  useEffect(() => {
    const els = SECOES.map((x) => document.getElementById(x.id)).filter((el): el is HTMLElement => !!el);
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visivel = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visivel) setSecaoAtiva(visivel.target.id as SecaoId);
      },
      { rootMargin: "-140px 0px -55% 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [partnersLoaded]);

  // ── Lugares para ver ao vivo ────────────────────────────────────────────────
  const showrooms = partners.filter((p) => p.kind !== "revenda");
  const revendasDb = partners.filter((p) => p.kind === "revenda");
  const revendas = revendasDb.length > 0 ? revendasDb : partnersLoaded ? REVENDA_FALLBACK : [];

  // ── Obras: categorias (sem a de showroom, que tem seção própria) + tipo ─────
  const orderedCats = resolveCats(cats).filter((c) => c.slug !== SHOWROOM_CAT || showrooms.length === 0);
  // Só os ambientes da categoria Showroom saem das Obras (eles vivem na página do
  // showroom). Um projeto de outra categoria apenas VINCULADO a um showroom ou
  // revenda continua nas Obras e aparece também na página do lugar.
  const temShowroomProprio = (p: Project) => showrooms.length > 0 && sectionSlugs(p).includes(SHOWROOM_CAT);
  const obras = projects.filter((p) => !temShowroomProprio(p));
  const tagsDisponiveis = [...new Set(obras.flatMap((p) => p.tags ?? []))].sort((a, b) => tagLabel(a).localeCompare(tagLabel(b), "pt-BR"));
  const byFeatured = (a: Project, b: Project) =>
    !!a.is_featured !== !!b.is_featured ? (a.is_featured ? -1 : 1) : (a.feature_order ?? 0) - (b.feature_order ?? 0);
  const obrasFiltradas = obras
    .filter((p) => activeFilter === "todos" || sectionSlugs(p).includes(activeFilter))
    .filter((p) => activeTag === "todos" || (p.tags ?? []).includes(activeTag))
    .sort(byFeatured);
  const contaCat = (slug: string) => obras.filter((p) => sectionSlugs(p).includes(slug)).length;

  // Merge DB renders with static fallback — DB rows take priority, deduplicated by slug
  const dbSlugs = new Set(renders.map((r) => r.slug));
  const allRenders = [
    ...renders,
    ...STATIC_RENDERS.filter((r) => !dbSlugs.has(r.slug)),
  ];

  // Capa das portas de entrada do topo.
  const capaShowroom = showrooms.find((s) => s.display_cover)?.display_cover ?? null;
  const nomesShowrooms = showrooms.map((s) => s.name).join(" · ");

  const chip = (on: boolean) =>
    `px-4 py-2 text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] transition-all whitespace-nowrap ${
      on ? "bg-[#002045] text-white" : "bg-white border border-[#e2e2e2] text-[#74777f] hover:border-[#002045] hover:text-[#002045]"
    }`;

  const portas: { id: SecaoId; titulo: string; texto: string; img: string | null }[] = [
    { id: "obras", titulo: "Obras realizadas", texto: `${obras.length || "—"} projetos · residencial, comercial e náutico`, img: "/images/projetos/lavabo1-depois.png" },
    { id: "showrooms", titulo: "Showrooms parceiros", texto: nomesShowrooms || "Ambientes decorados para visitar", img: capaShowroom },
    { id: "revenda", titulo: "Pontos de revenda", texto: "Todos os modelos em display, no tamanho real", img: null },
  ];

  return (
    <div className="pt-20">

      {/* ── Lightbox ─────────────────────────────────────────────────────────── */}
      {lightboxProject && (
        <ProjectLightbox
          project={lightboxProject}
          items={lightboxItems}
          loading={lightboxLoading}
          idx={lightboxIdx}
          onClose={closeLightbox}
          onDotClick={setLightboxIdx}
        />
      )}

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[400px] lg:min-h-[480px] flex items-end">
        <div className="absolute inset-0">
          <Image
            src="/images/projetos/restaurante-depois.jpeg"
            alt="Restaurante — PFB Orbital"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#001223] via-[#001223]/75 to-[#001223]/25" />
        </div>
        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 lg:px-16 pt-16 pb-14 lg:pb-20 text-center md:text-left">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-6 h-px bg-[#a1d494]" />
            <p className="text-[#a1d494] text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-semibold font-[var(--font-inter)]">
              Projetos · Showrooms · Revenda
            </p>
          </div>
          <h1 className="font-serif text-white text-3xl sm:text-5xl lg:text-[4.5rem] font-normal tracking-[-0.025em] leading-[1.04] mb-5 max-w-3xl mx-auto md:mx-0">
            <span className="sr-only">Orbital Revestimentos — projetos em Manaus. </span>
            Veja o PFB de perto.
          </h1>
          <p className="text-white/60 text-base lg:text-lg font-[var(--font-inter)] leading-relaxed max-w-xl mx-auto md:mx-0">
            Obras entregues, ambientes decorados em empresas parceiras e pontos de revenda em Manaus.
            Escolha por onde começar.
          </p>
        </div>
      </section>

      {/* ── Portas de entrada ───────────────────────────────────────────────── */}
      {/* Fundo claro, separado da foto do topo: três escolhas claras, cada uma com a sua imagem. */}
      <section className="bg-[#f5f5f3] py-8 lg:py-12">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <p className="text-[#74777f] text-[10px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] mb-4">Por onde quer começar?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-5">
            {portas.map((p) => (
              <a key={p.id} href={`#${p.id}`}
                className="group bg-white border border-[#e2e2e2] hover:border-[#002045] transition-colors flex sm:flex-col overflow-hidden">
                <div className="relative w-28 sm:w-full flex-shrink-0 sm:aspect-[16/9] overflow-hidden bg-[#eaf3e6]">
                  {p.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.img} alt="" aria-hidden onError={(e) => { e.currentTarget.style.display = "none"; }}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                  ) : (
                    // Ponto de revenda: sem foto da loja ainda — um ícone de loja/vitrine.
                    <div className="absolute inset-0 flex items-center justify-center text-[#3b6934]">
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 9l1.5-5h15L21 9" /><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V9z" /><path d="M5 13v7h14v-7" /><path d="M10 20v-4h4v4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="px-4 sm:px-5 py-4 sm:py-5 flex-1 min-w-0 flex flex-col">
                  <p className="font-serif text-[#002045] text-lg sm:text-2xl leading-tight">{p.titulo}</p>
                  <p className="text-[#74777f] text-[12px] sm:text-[13px] font-[var(--font-inter)] mt-1 leading-snug line-clamp-2">{p.texto}</p>
                  <span className="inline-flex items-center gap-1.5 text-[#3b6934] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mt-auto pt-3">
                    Ver
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Menu da página (fixo ao rolar) ───────────────────────────────────── */}
      <nav aria-label="Seções da página" className="sticky top-20 z-40 bg-white/95 backdrop-blur-sm border-y border-[#e8e8e8]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16 flex gap-1 overflow-x-auto scrollbar-none">
          {SECOES.map((x) => (
            <a key={x.id} href={`#${x.id}`}
              aria-current={secaoAtiva === x.id ? "true" : undefined}
              className={`flex-shrink-0 px-3 sm:px-4 py-3.5 text-[10px] sm:text-[11px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] border-b-2 -mb-px transition-colors ${
                secaoAtiva === x.id ? "border-[#002045] text-[#002045]" : "border-transparent text-[#74777f] hover:text-[#002045]"
              }`}>
              {x.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ── Obras ───────────────────────────────────────────────────────────── */}
      <section id="obras" className="scroll-mt-32 py-12 lg:py-20 bg-[#f5f5f3]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <BigSectionHead id="obras" eyebrow="Obras realizadas" title="Projetos executados"
            desc="Ambientes reais revestidos com o Painel Flexível Fibra de Bambu. Filtre por categoria ou pelo tipo de ambiente." />

          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
              <span className="text-[9px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#a0a3a8] mr-1 flex-shrink-0">Categoria</span>
              <button onClick={() => setActiveFilter("todos")} className={chip(activeFilter === "todos")}>Todas</button>
              {orderedCats.filter((c) => contaCat(c.slug) > 0).map((c) => (
                <button key={c.slug} onClick={() => setActiveFilter(c.slug)} className={chip(activeFilter === c.slug)}>
                  {c.label} <span className="opacity-60">{contaCat(c.slug)}</span>
                </button>
              ))}
            </div>
            {tagsDisponiveis.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
                <span className="text-[9px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] text-[#a0a3a8] mr-1 flex-shrink-0">Tipo</span>
                <button onClick={() => setActiveTag("todos")} className={chip(activeTag === "todos")}>Todos</button>
                {tagsDisponiveis.map((t) => (
                  <button key={t} onClick={() => setActiveTag(t)} className={chip(activeTag === t)}>{tagLabel(t)}</button>
                ))}
              </div>
            )}
          </div>

          {activeFilter === "todos" && activeTag === "todos" ? (() => {
            // Uma seção por categoria, na ordem do painel; cada projeto entra na
            // PRIMEIRA categoria em que se encaixa — nada aparece duas vezes.
            const shown = new Set<string>();
            const blocks = orderedCats.map((cat) => {
              const list = obras.filter((p) => !shown.has(p.id) && sectionSlugs(p).includes(cat.slug)).sort(byFeatured);
              list.forEach((p) => shown.add(p.id));
              return { cat, list };
            });
            // Sem categoria (ou com slug que não existe mais): nunca fica invisível.
            const rest = obras.filter((p) => !shown.has(p.id)).sort(byFeatured);
            return (
              <div className="space-y-14">
                {blocks.filter((b) => b.list.length > 0).map(({ cat, list }) => (
                  <div key={cat.slug}>
                    <SectionHeader label={cat.label} desc={cat.description ?? ""} />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                      {list.map((project) => <ProjectCard key={project.id} project={project} onOpen={openLightbox} />)}
                    </div>
                  </div>
                ))}
                {rest.length > 0 && (
                  <div>
                    <SectionHeader label="Outros projetos" desc="Demais ambientes executados" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                      {rest.map((project) => <ProjectCard key={project.id} project={project} onOpen={openLightbox} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })() : obrasFiltradas.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Nenhum projeto com esses filtros.</p>
              <button onClick={() => { setActiveFilter("todos"); setActiveTag("todos"); }}
                className="mt-3 text-[#002045] text-xs underline underline-offset-2 font-[var(--font-inter)]">Ver todos</button>
            </div>
          ) : (
            <>
              <p className="text-[#74777f] text-xs font-[var(--font-inter)] mb-3">
                {obrasFiltradas.length} {obrasFiltradas.length === 1 ? "projeto" : "projetos"}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                {obrasFiltradas.map((project) => <ProjectCard key={project.id} project={project} onOpen={openLightbox} />)}
              </div>
            </>
          )}

          <p className="text-[#b8b8b8] text-[10px] font-[var(--font-inter)] italic text-center mt-10">
            Imagens reais de projetos executados. Orbital não realiza instalação; somos fornecedores diretos.
          </p>
        </div>
      </section>

      {/* ── Transformação real (antes/depois em destaque) ───────────────────── */}
      <section className="bg-[#090e18] py-14 lg:py-24">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="mb-8 lg:mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-5 h-px bg-[#a1d494]" />
              <p className="text-[#a1d494] text-xs tracking-[0.25em] uppercase font-semibold font-[var(--font-inter)]">Transformação real</p>
            </div>
            <h2 className="font-serif text-white text-3xl lg:text-5xl font-normal leading-tight">A diferença é visível.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image src="/images/projetos/restaurante-antes.png" alt="Restaurante — antes" fill className="object-cover brightness-[0.82] saturate-75" />
              <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-[#090e18]/80 to-transparent">
                <span className="text-white/55 text-[10px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)]">Antes</span>
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image src="/images/projetos/restaurante-depois.jpeg" alt="Restaurante — depois" fill className="object-cover" />
              <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-[#090e18]/80 to-transparent">
                <span className="text-[#a1d494] text-[10px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)]">Depois</span>
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10 pt-5">
            <div>
              <p className="text-[#a1d494] text-[10px] tracking-[0.15em] uppercase font-semibold font-[var(--font-inter)] mb-1">ORB-002 · Imbuia · Elegance</p>
              <p className="text-white/50 text-sm font-[var(--font-inter)]">Restaurante · Comercial · Manaus, AM</p>
            </div>
            <p className="text-white/30 text-xs font-[var(--font-inter)] italic">2 horas de instalação · Sem obra pesada · Sem poeira</p>
          </div>
        </div>
      </section>

      {/* ── Showrooms parceiros ─────────────────────────────────────────────── */}
      <section id="showrooms" className="scroll-mt-32 py-12 lg:py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <BigSectionHead id="showrooms" eyebrow="Visite e veja de perto" title="Showrooms parceiros"
            desc="Ambientes decorados com o Painel Flexível Fibra de Bambu dentro de empresas parceiras. Veja o acabamento, a textura e a luz ao vivo." />
          {!partnersLoaded ? (
            <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Carregando…</p>
          ) : showrooms.length === 0 ? (
            <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Em breve.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {showrooms.map((s) => <PartnerCard key={s.id} s={s} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── Pontos de revenda ───────────────────────────────────────────────── */}
      <section id="revenda" className="scroll-mt-32 py-12 lg:py-20 bg-[#f5f5f3]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <BigSectionHead id="revenda" eyebrow="Compre perto de você" title="Pontos de revenda"
            desc="Lojas parceiras com os nossos modelos em display, no tamanho real da placa, para você escolher com o painel na mão." />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {revendas.map((s) => <RevendaCard key={s.id} s={s} />)}
          </div>
        </div>
      </section>

      {/* ── Inspirações IA ──────────────────────────────────────────────────── */}
      <section id="inspiracoes" className="scroll-mt-32 py-14 lg:py-24 bg-[#0a0f1a]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <BigSectionHead id="inspiracoes" light eyebrow="Possibilidades · Visualizações IA" title="O Orbital no seu espaço."
            desc="Visualizações geradas por inteligência artificial mostrando o potencial do PFB em diferentes ambientes." />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
            {allRenders.map((render) => <RenderCard key={render.id} render={render} />)}
          </div>
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-white/30 text-[10px] font-[var(--font-inter)] italic">
              Imagens geradas por inteligência artificial para fins ilustrativos.
            </p>
            <Link href="/visualizador"
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-5 py-3 hover:bg-white hover:text-[#002045] transition-colors">
              Simular no meu ambiente
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-28 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="w-5 h-px bg-[#3b6934]" />
                <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)]">Próximo projeto</p>
              </div>
              <h2 className="font-serif text-[#002045] text-2xl lg:text-[3.25rem] font-normal leading-[1.08] tracking-[-0.02em] mb-6">
                Transforme o seu ambiente com o PFB!
              </h2>
              <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed mb-4 max-w-md">
                Escolha o acabamento, fale com um consultor e receba o
                orçamento completo do seu projeto. E com a nossa pronta-entrega,
                sua obra pode começar ainda essa semana!
              </p>
              <p className="text-[#3b6934] text-sm font-bold font-[var(--font-inter)] tracking-[0.05em] mb-10">PFB: Prático, Fácil, Bonito.</p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 lg:gap-4">
                <ContatoCta className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#1a365d] transition-colors">
                  Falar com um consultor
                </ContatoCta>
                <Link href="/produtos"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-[#002045] text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#002045] hover:text-white transition-colors">
                  Ver o catálogo
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-3 gap-1">
              <div className="relative aspect-[3/4] overflow-hidden"><Image src="/images/projetos/lavabo1-depois.png" alt="Lavabo — Orbital" fill className="object-cover" /></div>
              <div className="relative aspect-[3/4] overflow-hidden"><Image src="/images/projetos/hall-depois.png" alt="Hall — Orbital" fill className="object-cover" /></div>
              <div className="relative aspect-[3/4] overflow-hidden"><Image src="/images/projetos/escritorio-depois.jpeg" alt="Escritório — Orbital" fill className="object-cover" /></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom note ─────────────────────────────────────────────────────── */}
      <div className="bg-[#f9f9f9] border-t border-[#eeeeee] py-5 text-center">
        <p className="text-[#74777f] text-xs font-[var(--font-inter)] italic">
          Orbital · Manaus, AM · Somos fornecedores diretos — não realizamos instalação.
        </p>
      </div>
    </div>
  );
}
