"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
type Category = "todos" | "residencial" | "comercial" | "umido" | "nautico";

interface Project {
  id: string;
  slug: string;
  title: string;
  product_code: string;
  categories: string[];
  image_after: string;
  image_before?: string;
  note?: string;
}

interface Render {
  id: string;
  slug: string;
  title: string;
  product_code: string;
  image_path: string;
}

interface ProjectMedia {
  id: string;
  project_slug: string;
  type: "image" | "video";
  url: string;
  caption: string | null;
  sort_order: number;
}

type LightboxItem =
  | { kind: "image"; url: string; label?: string }
  | { kind: "video"; url: string; label?: string };

function buildLightboxItems(project: Project, extra: ProjectMedia[]): LightboxItem[] {
  const items: LightboxItem[] = [
    { kind: "image", url: project.image_after, label: "Depois" },
  ];
  if (project.image_before) items.push({ kind: "image", url: project.image_before, label: "Antes" });
  for (const m of extra) {
    items.push({ kind: m.type, url: m.url, label: m.caption ?? undefined });
  }
  return items;
}

function getVideoEmbed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`;
  return null;
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function ProjectLightbox({
  project,
  items,
  loading,
  idx,
  onClose,
  onPrev,
  onNext,
  onDotClick,
}: {
  project: Project;
  items: LightboxItem[];
  loading: boolean;
  idx: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDotClick: (i: number) => void;
}) {
  const current = items[idx];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/92 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-[#a1d494] text-[9px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)]">
            {project.product_code}
          </p>
          <p className="text-white font-[var(--font-noto-serif)] text-base">{project.title}</p>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white text-2xl leading-none ml-4">×</button>
      </div>

      {/* Main image area */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        ) : current?.kind === "image" ? (
          <img
            key={current.url}
            src={current.url}
            alt={current.label ?? project.title}
            className="max-h-full max-w-full object-contain select-none"
            draggable={false}
          />
        ) : current?.kind === "video" ? (
          (() => {
            const embed = getVideoEmbed(current.url);
            return embed ? (
              <iframe
                key={current.url}
                src={embed}
                className="w-full max-w-3xl aspect-video"
                allowFullScreen
                allow="autoplay; fullscreen"
              />
            ) : isDirectVideo(current.url) ? (
              <video key={current.url} src={current.url} controls autoPlay className="max-h-full max-w-full" />
            ) : null;
          })()
        ) : null}

        {/* Label pill */}
        {current?.label && (
          <span className="absolute top-4 left-4 text-[9px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] px-2.5 py-1 bg-black/50 text-white/70 backdrop-blur-sm">
            {current.label}
          </span>
        )}

        {/* Nav arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={onPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/70 text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button
              onClick={onNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/70 text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </>
        )}
      </div>

      {/* Dots + counter */}
      {items.length > 1 && (
        <div
          className="flex items-center justify-center gap-2 py-4 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => onDotClick(i)}
              className={`transition-all rounded-full ${i === idx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"}`}
            />
          ))}
          <span className="text-white/40 text-[10px] font-[var(--font-inter)] ml-3">
            {idx + 1} / {items.length}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const WA =
  "https://wa.me/5592988150149?text=" +
  encodeURIComponent(
    "Olá! Vi os projetos no site da Orbital e gostaria de fazer um orçamento."
  );

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

// Gallery sections — storytelling order (slug-based)
const GALLERY_SECTIONS = [
  {
    key: "comercial",
    label: "Comercial",
    desc: "Restaurantes, escritórios e espaços de uso coletivo",
    slugs: ["restaurante", "hall", "escritorio"],
  },
  {
    key: "residencial",
    label: "Residencial · Áreas Úmidas",
    desc: "Lavabos, banheiros e cozinhas transformados sem obra",
    slugs: ["lavabo1", "lavabo2", "lavabo3", "lavabo4", "cozinha"],
  },
  {
    key: "nautico",
    label: "Náutico",
    desc: "Revestimento homologado para embarcações",
    slugs: ["nautico1", "nautico2", "nautico3", "nautico4"],
  },
];

const FILTERS: { key: Category; label: string }[] = [
  { key: "todos",       label: "Todos"        },
  { key: "residencial", label: "Residencial"  },
  { key: "comercial",   label: "Comercial"    },
  { key: "umido",       label: "Áreas Úmidas" },
  { key: "nautico",     label: "Náutico"      },
];

// ─── Project card — portrait aspect ───────────────────────────────────────────
function ProjectCard({ project, onOpen }: { project: Project; onOpen: (p: Project) => void }) {
  const [showBefore, setShowBefore] = useState(false);
  const hasBA = !!project.image_before;

  return (
    <div
      className="bg-white flex flex-col cursor-pointer group"
      onClick={() => onOpen(project)}
    >
      {/* Image */}
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        <img
          src={project.image_after}
          alt={`${project.title} — depois`}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03] ${hasBA && showBefore ? "opacity-0" : "opacity-100"}`}
        />
        {hasBA && project.image_before && (
          <img
            src={project.image_before}
            alt={`${project.title} — antes`}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03] ${showBefore ? "opacity-100" : "opacity-0"}`}
          />
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
        <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-sm font-normal leading-snug">
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
        <h3 className="font-[var(--font-noto-serif)] text-white/85 text-sm font-normal leading-snug">
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
      <h3 className={`font-[var(--font-noto-serif)] text-xl font-normal ${light ? "text-white" : "text-[#002045]"}`}>
        {label}
      </h3>
      <p className={`text-xs font-[var(--font-inter)] hidden sm:block ${light ? "text-white/40" : "text-[#74777f]"}`}>
        {desc}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProjetosPage() {
  const [activeFilter, setActiveFilter] = useState<Category>("todos");
  const [projects, setProjects] = useState<Project[]>([]);
  const [renders, setRenders] = useState<Render[]>([]);

  // Lightbox
  const [lightboxProject, setLightboxProject] = useState<Project | null>(null);
  const [lightboxItems, setLightboxItems] = useState<LightboxItem[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [lightboxLoading, setLightboxLoading] = useState(false);

  const openLightbox = useCallback(async (project: Project) => {
    setLightboxProject(project);
    setLightboxIdx(0);
    setLightboxLoading(true);
    setLightboxItems(buildLightboxItems(project, []));
    try {
      const res = await fetch(`/api/projects/media?slug=${project.slug}`);
      const extra: ProjectMedia[] = res.ok ? await res.json() : [];
      setLightboxItems(buildLightboxItems(project, extra));
    } catch { /* show what we have */ }
    setLightboxLoading(false);
  }, []);

  const closeLightbox = useCallback(() => setLightboxProject(null), []);

  const lightboxPrev = useCallback(() =>
    setLightboxIdx((i) => (i - 1 + lightboxItems.length) % lightboxItems.length),
  [lightboxItems.length]);

  const lightboxNext = useCallback(() =>
    setLightboxIdx((i) => (i + 1) % lightboxItems.length),
  [lightboxItems.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxProject) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxProject, closeLightbox, lightboxPrev, lightboxNext]);

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
  }, []);

  const filtered =
    activeFilter === "todos"
      ? projects
      : projects.filter((p) => p.categories.includes(activeFilter));

  // Merge DB renders with static fallback — DB rows take priority, deduplicated by slug
  const dbSlugs = new Set(renders.map((r) => r.slug));
  const allRenders = [
    ...renders,
    ...STATIC_RENDERS.filter((r) => !dbSlugs.has(r.slug)),
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
          onPrev={lightboxPrev}
          onNext={lightboxNext}
          onDotClick={setLightboxIdx}
        />
      )}

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[640px] max-h-[960px] flex items-center lg:items-end">
        <div className="absolute inset-0">
          <Image
            src="/images/projetos/restaurante-depois.jpeg"
            alt="Restaurante — PFB Orbital"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Strong gradient — ensures eyebrow text is always readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#001223] via-[#001223]/70 to-[#001223]/20" />
        </div>

        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 lg:px-16 py-16 lg:pb-36 lg:pt-0 text-center md:text-left">
          {/* Eyebrow — separated with more breathing room */}
          <div className="inline-flex items-center gap-3 mb-6 lg:mb-8">
            <div className="w-6 h-px bg-[#a1d494]" />
            <p className="text-[#a1d494] text-xs tracking-[0.3em] uppercase font-semibold font-[var(--font-inter)]">
              Portfólio · Projetos Executados
            </p>
          </div>
          <h1 className="font-[var(--font-noto-serif)] text-white text-3xl sm:text-5xl lg:text-[5.5rem] font-normal tracking-[-0.025em] leading-[1.02] mb-6 max-w-3xl mx-auto md:mx-0">
            Espaços que viram referência.
          </h1>
          <p className="text-white/55 text-base lg:text-lg font-[var(--font-inter)] leading-relaxed max-w-xl mb-10 mx-auto md:mx-0">
            Residencial, comercial, náutico. O PFB Orbital transforma
            qualquer ambiente — sem obra pesada, sem poeira.
          </p>
          <Link
            href="/simulador"
            className="inline-flex items-center gap-2 bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:bg-[#f3f3f3] transition-colors"
          >
            Abrir simulador de custo
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 z-10 pointer-events-none hidden md:flex">
          <span className="text-white/25 text-[9px] tracking-[0.25em] uppercase font-[var(--font-inter)]">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/25 to-transparent" />
        </div>
      </section>

      {/* ── Featured antes/depois (restaurante — landscape kept intentionally) ── */}
      <section className="bg-[#090e18] py-16 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="mb-10 lg:mb-14">
            <div className="inline-flex items-center gap-3 mb-5">
              <div className="w-5 h-px bg-[#a1d494]" />
              <p className="text-[#a1d494] text-xs tracking-[0.25em] uppercase font-semibold font-[var(--font-inter)]">
                Transformação real
              </p>
            </div>
            <h2 className="font-[var(--font-noto-serif)] text-white text-3xl lg:text-5xl font-normal leading-tight">
              A diferença é visível.
            </h2>
          </div>

          {/* Stack on mobile, side-by-side on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src="/images/projetos/restaurante-antes.png"
                alt="Restaurante — antes"
                fill
                className="object-cover brightness-[0.82] saturate-75"
              />
              <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-[#090e18]/80 to-transparent">
                <span className="text-white/55 text-[10px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)]">
                  Antes
                </span>
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src="/images/projetos/restaurante-depois.jpeg"
                alt="Restaurante — depois"
                fill
                className="object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-[#090e18]/80 to-transparent">
                <span className="text-[#a1d494] text-[10px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)]">
                  Depois
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10 pt-5">
            <div>
              <p className="text-[#a1d494] text-[10px] tracking-[0.15em] uppercase font-semibold font-[var(--font-inter)] mb-1">
                ORB-002 · Imbuia · Elegance
              </p>
              <p className="text-white/50 text-sm font-[var(--font-inter)]">
                Restaurante · Comercial · Manaus, AM
              </p>
            </div>
            <p className="text-white/30 text-xs font-[var(--font-inter)] italic">
              2 horas de instalação · Sem obra pesada · Sem poeira
            </p>
          </div>
        </div>
      </section>

      {/* ── Gallery ─────────────────────────────────────────────────────────── */}
      <section className="py-14 lg:py-28 bg-[#f5f5f3]" id="galeria">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-3 mb-3">
                <div className="w-5 h-px bg-[#74777f]" />
                <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)]">
                  Galeria completa
                </p>
              </div>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal">
                Projetos executados
                {activeFilter !== "todos" && (
                  <span className="text-[#74777f] text-2xl">
                    {" "}—{" "}
                    {FILTERS.find((f) => f.key === activeFilter)?.label}
                  </span>
                )}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`px-4 py-2 text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] transition-all ${
                    activeFilter === key
                      ? "bg-[#002045] text-white"
                      : "bg-white border border-[#e2e2e2] text-[#74777f] hover:border-[#002045] hover:text-[#002045]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Todos: sections with storytelling order */}
          {activeFilter === "todos" ? (
            <div className="space-y-16">
              {GALLERY_SECTIONS.map((section) => {
                const sectionProjects = section.slugs
                  .map((slug) => projects.find((p) => p.slug === slug))
                  .filter(Boolean) as Project[];
                const displayProjects = sectionProjects.length > 0 ? sectionProjects : projects.filter((p) => p.categories.includes(section.key));
                return (
                  <div key={section.key}>
                    <SectionHeader label={section.label} desc={section.desc} />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                      {displayProjects.map((project) => (
                        <ProjectCard key={project.id} project={project} onOpen={openLightbox} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Filtered: flat grid */
            <>
              {filtered.length === 0 ? (
                <p className="text-center text-[#74777f] text-sm font-[var(--font-inter)] py-20">
                  Nenhum projeto nesta categoria.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                  {filtered.map((project) => (
                    <ProjectCard key={project.id} project={project} onOpen={openLightbox} />
                  ))}
                </div>
              )}
            </>
          )}

          <p className="text-[#b8b8b8] text-[10px] font-[var(--font-inter)] italic text-center mt-10">
            Imagens reais de projetos executados. Orbital não realiza instalação; somos fornecedores diretos.
          </p>
        </div>
      </section>

      {/* ── Aplicações IA ───────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-32 bg-[#0a0f1a]" id="aplicacoes">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">

          {/* Section intro */}
          <div className="mb-16">
            <div className="inline-flex items-center gap-3 mb-5">
              <div className="w-5 h-px bg-[#a1d494]" />
              <p className="text-[#a1d494] text-xs tracking-[0.3em] uppercase font-semibold font-[var(--font-inter)]">
                Possibilidades · Visualizações IA
              </p>
            </div>
            <h2 className="font-[var(--font-noto-serif)] text-white text-3xl lg:text-5xl font-normal leading-tight mb-4 max-w-2xl">
              O Orbital no seu espaço.
            </h2>
            <p className="text-white/45 text-sm font-[var(--font-inter)] leading-relaxed max-w-xl">
              Visualizações geradas por inteligência artificial mostrando o potencial do PFB Orbital em diferentes ambientes e contextos de aplicação.
            </p>
          </div>

          {/* All renders in a single grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
            {allRenders.map((render) => (
              <RenderCard key={render.id} render={render} />
            ))}
          </div>

          <p className="text-white/18 text-[10px] font-[var(--font-inter)] italic text-center mt-10">
            Imagens geradas por inteligência artificial para fins ilustrativos.
          </p>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-32 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div>
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="w-5 h-px bg-[#3b6934]" />
                <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)]">
                  Próximo projeto
                </p>
              </div>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl lg:text-[3.25rem] font-normal leading-[1.08] tracking-[-0.02em] mb-6">
                Transforme o seu ambiente com o PFB!
              </h2>
              <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed mb-4 max-w-md">
                Meça o seu espaço, escolha o acabamento no simulador e receba
                um orçamento em minutos. E com a nossa pronta-entrega, sua
                obra pode começar ainda essa semana!
              </p>
              <p className="text-[#3b6934] text-sm font-bold font-[var(--font-inter)] tracking-[0.05em] mb-10">
                PFB: Prático, Fácil, Bonito.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 lg:gap-4">
                <a
                  href={WA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#1a365d] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Consultar via WhatsApp
                </a>
                <Link
                  href="/simulador"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-[#002045] text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#002045] hover:text-white transition-colors"
                >
                  Abrir simulador
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* 3 portrait images — hidden on mobile, shown on lg+ */}
            <div className="hidden lg:grid grid-cols-3 gap-1">
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image src="/images/projetos/lavabo1-depois.png" alt="Lavabo — Orbital" fill className="object-cover" />
              </div>
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image src="/images/projetos/hall-depois.png" alt="Hall — Orbital" fill className="object-cover" />
              </div>
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image src="/images/projetos/escritorio-depois.jpeg" alt="Escritório — Orbital" fill className="object-cover" />
              </div>
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
