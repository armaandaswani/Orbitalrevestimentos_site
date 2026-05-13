"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
type Category = "todos" | "residencial" | "comercial" | "umido" | "nautico";

interface Project {
  id: string;
  title: string;
  code: string;
  categories: Category[];
  after: string;
  before?: string;
  note?: string;
}

interface Render {
  id: string;
  title: string;
  code: string;
  img: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const WA =
  "https://wa.me/5592988150149?text=" +
  encodeURIComponent(
    "Olá! Vi os projetos no site da Orbital e gostaria de fazer um orçamento."
  );

const projects: Project[] = [
  {
    id: "restaurante",
    title: "Restaurante",
    code: "ORB-002 · Imbuia",
    categories: ["comercial"],
    after: "/images/projetos/restaurante-depois.jpeg",
    before: "/images/projetos/restaurante-antes.png",
    note: "Ambiente comercial",
  },
  {
    id: "hall",
    title: "Hall de Entrada",
    code: "ORB-002 · Imbuia",
    categories: ["residencial", "comercial"],
    after: "/images/projetos/hall-depois.png",
    before: "/images/projetos/hall-antes.png",
    note: "Residencial · Comercial",
  },
  {
    id: "escritorio",
    title: "Escritório",
    code: "ORB-004 · Louro Freijó",
    categories: ["comercial"],
    after: "/images/projetos/escritorio-depois.jpeg",
    before: "/images/projetos/escritorio-antes.png",
    note: "Ambiente comercial",
  },
  {
    id: "lavabo1",
    title: "Lavabo",
    code: "ORB-004 · Louro Freijó",
    categories: ["residencial", "umido"],
    after: "/images/projetos/lavabo1-depois.png",
    before: "/images/projetos/lavabo1-antes.jpeg",
    note: "Área úmida · impermeável",
  },
  {
    id: "lavabo2",
    title: "Lavabo II",
    code: "ORB-011 · Carvalho Branco",
    categories: ["residencial", "umido"],
    after: "/images/projetos/lavabo2-depois.png",
    before: "/images/projetos/lavabo2-antes.jpg",
    note: "Área úmida",
  },
  {
    id: "lavabo3",
    title: "Lavabo III",
    code: "ORB-012 · Arabescato Orobico Bianco",
    categories: ["residencial", "umido"],
    after: "/images/projetos/lavabo3-depois.jpg",
    before: "/images/projetos/lavabo3-antes.png",
    note: "Área úmida",
  },
  {
    id: "lavabo4",
    title: "Lavabo IV",
    code: "ORB-009 + ORB-004",
    categories: ["residencial", "umido"],
    after: "/images/projetos/lavabo4-depois.jpeg",
    before: "/images/projetos/lavabo4-antes.jpeg",
    note: "Parede ORB-009 · Teto ORB-004",
  },
  {
    id: "cozinha",
    title: "Cozinha",
    code: "ORB-014 · Calacatta Michelangelo",
    categories: ["residencial", "umido"],
    after: "/images/projetos/cozinha-depois.png",
    before: "/images/projetos/cozinha-antes.png",
    note: "Área úmida",
  },
  {
    id: "nautico1",
    title: "Embarcação Náutica",
    code: "ORB-004 · Louro Freijó",
    categories: ["nautico"],
    after: "/images/projetos/nautico1-depois.png",
    before: "/images/projetos/nautico1-antes.png",
    note: "Náutico · homologado",
  },
  {
    id: "nautico2",
    title: "Embarcação Náutica II",
    code: "ORB-004 · Louro Freijó",
    categories: ["nautico"],
    after: "/images/projetos/nautico2-depois.png",
    before: "/images/projetos/nautico2-antes.png",
    note: "Náutico",
  },
  {
    id: "nautico3",
    title: "Embarcação Náutica III",
    code: "ORB-004 · Louro Freijó",
    categories: ["nautico"],
    after: "/images/projetos/nautico3-depois.png",
    before: "/images/projetos/nautico3-antes.png",
    note: "Náutico",
  },
  {
    id: "nautico4",
    title: "Embarcação Náutica IV",
    code: "ORB-004 · Louro Freijó",
    categories: ["nautico"],
    after: "/images/projetos/nautico4-depois.png",
    before: "/images/projetos/nautico4-antes.png",
    note: "Náutico",
  },
];

// Gallery sections — storytelling order
const GALLERY_SECTIONS = [
  {
    key: "comercial",
    label: "Comercial",
    desc: "Restaurantes, escritórios e espaços de uso coletivo",
    ids: ["restaurante", "hall", "escritorio"],
  },
  {
    key: "residencial",
    label: "Residencial · Áreas Úmidas",
    desc: "Lavabos, banheiros e cozinhas transformados sem obra",
    ids: ["lavabo1", "lavabo2", "lavabo3", "lavabo4", "cozinha"],
  },
  {
    key: "nautico",
    label: "Náutico",
    desc: "Revestimento homologado para embarcações",
    ids: ["nautico1", "nautico2", "nautico3", "nautico4"],
  },
];

// AI render data — grouped by room context
const RENDERS_RESIDENCIAL: Render[] = [
  { id: "orb001-sala",    title: "Sala de Estar",         code: "ORB-001", img: "/images/renders/orb001-sala.png"        },
  { id: "orb008-sala",    title: "Sala de Estar",         code: "ORB-008", img: "/images/renders/orb008-sala.png"        },
  { id: "orb012-sala",    title: "Sala de Estar",         code: "ORB-012", img: "/images/renders/orb012-sala.png"        },
  { id: "orb013-quarto",  title: "Quarto",                code: "ORB-013", img: "/images/renders/orb013-quarto.png"      },
  { id: "orb006-banheiro",title: "Banheiro",              code: "ORB-006", img: "/images/renders/orb006-banheiro.png"    },
  { id: "orb007-banheiro",title: "Banheiro",              code: "ORB-007", img: "/images/renders/orb007-banheiro.png"    },
  { id: "orb009-banheiro",title: "Banheiro",              code: "ORB-009", img: "/images/renders/orb009-banheiro.png"    },
  { id: "orb015-banheiro",title: "Banheiro",              code: "ORB-015", img: "/images/renders/orb015-banheiro.png"    },
  { id: "orb012-cozinha", title: "Roda-banca de Cozinha", code: "ORB-012", img: "/images/renders/orb012-cozinha.png"     },
  { id: "orb002-mesa",    title: "Mesa de Estudos",       code: "ORB-002", img: "/images/renders/orb002-mesa-estudos.jpg"},
];

const RENDERS_COMERCIAL: Render[] = [
  { id: "orb002-restaurante", title: "Restaurante",               code: "ORB-002", img: "/images/renders/orb002-restaurante.png"         },
  { id: "orb003-restaurante", title: "Restaurante",               code: "ORB-003", img: "/images/renders/orb003-restaurante.png"         },
  { id: "orb013-restaurante", title: "Restaurante",               code: "ORB-013", img: "/images/renders/orb013-restaurante.png"         },
  { id: "orb014-escritorio",  title: "Escritório",                code: "ORB-014", img: "/images/renders/orb014-escritorio.png"          },
  { id: "orb003-conf",        title: "Sala de Conferências",      code: "ORB-003", img: "/images/renders/orb003-sala-conf.png"           },
  { id: "orb004-comercio",    title: "Comércio — Teto",           code: "ORB-004", img: "/images/renders/orb004-comercio-teto.png"       },
  { id: "orb001-odonto",      title: "Consultório Odontológico",  code: "ORB-001", img: "/images/renders/orb001-consultorio-odonto.png"  },
  { id: "orb005-oftalmo",     title: "Consultório Oftalmológico", code: "ORB-005", img: "/images/renders/orb005-consultorio-oftalmo.png" },
  { id: "orb007-pediatria",   title: "Consultório de Pediatria",  code: "ORB-007", img: "/images/renders/orb007-pediatria.png"           },
];

const FILTERS: { key: Category; label: string }[] = [
  { key: "todos",       label: "Todos"        },
  { key: "residencial", label: "Residencial"  },
  { key: "comercial",   label: "Comercial"    },
  { key: "umido",       label: "Áreas Úmidas" },
  { key: "nautico",     label: "Náutico"      },
];

// ─── Project card — portrait aspect ───────────────────────────────────────────
function ProjectCard({ project }: { project: Project }) {
  const [showBefore, setShowBefore] = useState(false);
  const hasBA = !!project.before;

  return (
    <div className="relative overflow-hidden bg-[#111]">
      {/* Portrait format — preserves the natural vertical orientation of the photos */}
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        <Image
          src={project.after}
          alt={`${project.title} — depois`}
          fill
          className={`object-cover transition-opacity duration-500 ${hasBA && showBefore ? "opacity-0" : "opacity-100"}`}
        />
        {hasBA && project.before && (
          <Image
            src={project.before}
            alt={`${project.title} — antes`}
            fill
            className={`object-cover transition-opacity duration-500 ${showBefore ? "opacity-100" : "opacity-0"}`}
          />
        )}

        {/* Subtle bottom gradient — text legibility only */}
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        {/* Antes / Depois toggle */}
        {hasBA && (
          <div className="absolute top-3 right-3 flex overflow-hidden border border-white/30 bg-black/40 backdrop-blur-sm">
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

        <div className="absolute bottom-0 inset-x-0 p-4 pointer-events-none">
          <p className="text-[#a1d494] text-[9px] tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-1.5">
            {project.code}
          </p>
          <h3 className="font-[var(--font-noto-serif)] text-white text-lg font-normal leading-tight">
            {project.title}
          </h3>
          {project.note && (
            <p className="text-white/50 text-[10px] font-[var(--font-inter)] tracking-[0.06em] uppercase mt-1">
              {project.note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Render card — portrait aspect ────────────────────────────────────────────
function RenderCard({ render }: { render: Render }) {
  return (
    <div className="relative overflow-hidden bg-[#0a0f1a] group">
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        <Image
          src={render.img}
          alt={`${render.title} — ${render.code}`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/72 to-transparent pointer-events-none" />

        {/* IA badge — small, unobtrusive */}
        <div className="absolute top-3 left-3 px-2 py-0.5 border border-white/20 bg-black/40 backdrop-blur-sm">
          <span className="text-white/55 text-[7px] tracking-[0.25em] uppercase font-bold font-[var(--font-inter)]">
            IA
          </span>
        </div>

        <div className="absolute bottom-0 inset-x-0 p-4 pointer-events-none">
          <p className="text-[#a1d494] text-[9px] tracking-[0.18em] uppercase font-semibold font-[var(--font-inter)] mb-1">
            {render.code}
          </p>
          <h3 className="font-[var(--font-noto-serif)] text-white text-base font-normal leading-tight">
            {render.title}
          </h3>
        </div>
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

  const filtered =
    activeFilter === "todos"
      ? projects
      : projects.filter((p) => p.categories.includes(activeFilter));

  return (
    <div className="pt-20">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative h-screen min-h-[640px] max-h-[960px] flex items-end">
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

        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-8 lg:px-16 pb-24 lg:pb-36">
          {/* Eyebrow — separated with more breathing room */}
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-6 h-px bg-[#a1d494]" />
            <p className="text-[#a1d494] text-xs tracking-[0.3em] uppercase font-semibold font-[var(--font-inter)]">
              Portfólio · Projetos Executados
            </p>
          </div>
          <h1 className="font-[var(--font-noto-serif)] text-white text-5xl sm:text-6xl lg:text-[5.5rem] font-normal tracking-[-0.025em] leading-[1.02] mb-6 max-w-3xl">
            Espaços que viram referência.
          </h1>
          <p className="text-white/55 text-base lg:text-lg font-[var(--font-inter)] leading-relaxed max-w-xl mb-10">
            Residencial, comercial, náutico. O PFB Orbital transforma
            qualquer ambiente — sem obra pesada, sem poeira.
          </p>
          <Link
            href="/contato"
            className="inline-flex items-center gap-2 bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:bg-[#f3f3f3] transition-colors"
          >
            Abrir simulador de custo
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 pointer-events-none">
          <span className="text-white/25 text-[9px] tracking-[0.25em] uppercase font-[var(--font-inter)]">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/25 to-transparent" />
        </div>
      </section>

      {/* ── Featured antes/depois (restaurante — landscape kept intentionally) ── */}
      <section className="bg-[#090e18] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
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

          {/* Landscape kept for restaurante — these images are naturally wide */}
          <div className="grid grid-cols-2 gap-1">
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
      <section className="py-20 lg:py-28 bg-[#f5f5f3]" id="galeria">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">

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
                const sectionProjects = section.ids
                  .map((id) => projects.find((p) => p.id === id))
                  .filter(Boolean) as Project[];
                return (
                  <div key={section.key}>
                    <SectionHeader label={section.label} desc={section.desc} />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                      {sectionProjects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
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
                    <ProjectCard key={project.id} project={project} />
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
      <section className="py-24 lg:py-32 bg-[#0a0f1a]" id="aplicacoes">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">

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

          {/* Residencial */}
          <div className="mb-16">
            <SectionHeader
              label="Residencial"
              desc="Salas, quartos, banheiros e espaços de vida"
              light
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
              {RENDERS_RESIDENCIAL.map((render) => (
                <RenderCard key={render.id} render={render} />
              ))}
            </div>
          </div>

          {/* Comercial */}
          <div>
            <SectionHeader
              label="Comercial"
              desc="Restaurantes, consultórios, escritórios e espaços de serviço"
              light
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-1">
              {RENDERS_COMERCIAL.map((render) => (
                <RenderCard key={render.id} render={render} />
              ))}
            </div>
          </div>

          <p className="text-white/18 text-[10px] font-[var(--font-inter)] italic text-center mt-10">
            Imagens geradas por inteligência artificial para fins ilustrativos.
          </p>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div>
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="w-5 h-px bg-[#3b6934]" />
                <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)]">
                  Próximo projeto
                </p>
              </div>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-4xl lg:text-[3.25rem] font-normal leading-[1.08] tracking-[-0.02em] mb-6">
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
              <div className="flex flex-wrap gap-4">
                <a
                  href={WA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 bg-[#002045] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#1a365d] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Consultar via WhatsApp
                </a>
                <Link
                  href="/contato"
                  className="inline-flex items-center gap-2 border border-[#002045] text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#002045] hover:text-white transition-colors"
                >
                  Abrir simulador
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* 3 portrait images — equal grid, natural vertical orientation */}
            <div className="grid grid-cols-3 gap-1">
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
