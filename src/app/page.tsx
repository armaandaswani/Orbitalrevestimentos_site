import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedStat from "@/components/AnimatedStat";

export const metadata: Metadata = {
  title: "Orbital Revestimentos — Instalado em horas. Admirado por anos.",
  description:
    "Placas Flexíveis de Bambu (PFB) eco-premium para transformar paredes e tetos em Manaus. Sem obra, sem poeira. 3 linhas, 15 acabamentos, pronta-entrega.",
  alternates: { canonical: "https://orbitalrevestimentos-site.vercel.app" },
  openGraph: {
    title: "Orbital Revestimentos — Instalado em horas. Admirado por anos.",
    description:
      "Placas Flexíveis de Bambu (PFB) eco-premium para paredes e tetos em Manaus. Sem obra, sem poeira. Pronta-entrega.",
    url: "https://orbitalrevestimentos-site.vercel.app",
  },
};

const CATALOGUE_URL =
  "https://drive.google.com/file/d/1zhm5MgKGSDRThqk8FqqwfX-WijI7K-iD/view?usp=drive_link";
const WA = (msg: string) =>
  `https://wa.me/5592988150149?text=${encodeURIComponent(msg)}`;

const stats = [
  { icon: "▪", value: "5mm", label: "Espessura" },
  { icon: "▪", value: "3,48m²", label: "Por placa" },
  { icon: "▪", value: "3 linhas", label: "Coleções" },
  { icon: "▪", value: "15", label: "Acabamentos" },
  { icon: "▪", value: "2–3h", label: "Instalação" },
  { icon: "▪", value: "Eco", label: "Bambu Ecológico" },
];

const featuredLines = [
  {
    name: "Classic",
    subtitle: "Mármore Fosco",
    desc: "Elegância discreta para qualquer ambiente. Acabamento fosco com veios naturais.",
    price: "R$ 559/placa",
    img: "/images/catalogue/classic-branco-calacatta-orb006.jpeg",
    href: "/produtos?linha=classic",
    code: "3 acabamentos · Fosco",
    waMsg: "Olá! Tenho interesse na linha Classic (Mármore Fosco). Gostaria de saber mais e solicitar uma amostra.",
  },
  {
    name: "Brilliance",
    subtitle: "Mármore Polido",
    desc: "Veios dramáticos com acabamento espelhado. Para projetos que exigem impacto visual.",
    price: "R$ 589/placa",
    img: "/images/catalogue/brilliance-gris-pietra-orb009.jpeg",
    href: "/produtos?linha=brilliance",
    code: "8 acabamentos · Polido",
    waMsg: "Olá! Tenho interesse na linha Brilliance (Mármore Polido). Gostaria de saber mais e solicitar uma amostra.",
  },
  {
    name: "Elegance",
    subtitle: "Madeira Texturizada",
    desc: "Calor natural com acabamento texturizado. A alma da madeira sem a fragilidade dela.",
    price: "R$ 649/placa",
    img: "/images/catalogue/elegance-imbuia-orb002.jpeg",
    href: "/produtos?linha=elegance",
    code: "4 acabamentos · Madeira",
    waMsg: "Olá! Tenho interesse na linha Elegance (Madeira Texturizada). Gostaria de saber mais e solicitar uma amostra.",
  },
];

const benefits = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9z" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
    title: "Instalado em horas",
    desc: "2 a 3 horas por cômodo, sem obra pesada, sem poeira, sem barulho.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      </svg>
    ),
    title: "Bambu Ecológico",
    desc: "Matéria-prima renovável, sem formol, inodoro e certificado.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 14.66V20a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h5.34" />
        <polygon points="18 2 22 6 12 16 8 16 8 12 18 2" />
      </svg>
    ),
    title: "Resistência provada",
    desc: "Impermeável, anti-mofo, anti-cupim e não propaga chamas. Aprovado em laboratório.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      </svg>
    ),
    title: "Grande formato",
    desc: "1,2m × 2,9m por placa (3,48m²). Menos emendas, acabamento superior.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative h-screen min-h-[620px] max-h-[900px] flex items-end">
        <div className="absolute inset-0">
          <Image
            src="/images/catalogue/hero-cover.png"
            alt="Revestimento Orbital instalado em interior premium"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#001530]/85 via-[#001530]/50 to-transparent" />
        </div>
        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-8 lg:px-16 pb-20 lg:pb-28">
          <p className="text-[#86a0cd] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
            Placas Flexíveis de Bambu · PFB 5mm
          </p>
          <h1 className="font-[var(--font-noto-serif)] text-white text-5xl lg:text-7xl font-normal leading-[1.1] tracking-[-0.02em] mb-6 max-w-3xl">
            Instalado em horas.<br />
            <em>Admirado por anos.</em>
          </h1>
          <p className="text-white/80 text-lg font-[var(--font-inter)] font-normal leading-relaxed mb-10 max-w-xl">
            Revestimentos eco-premium que transformam paredes e tetos com
            acabamento arquitetônico — sem obra, sem espera.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/produtos"
              className="bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#f3f3f3] transition-colors"
            >
              Ver Acabamentos
            </Link>
            <a
              href={CATALOGUE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/60 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-white/10 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Baixar Catálogo
            </a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-[#002045] border-b border-[#1a365d]">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16 py-6">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {stats.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center text-center py-2">
                <AnimatedStat
                  value={value}
                  className="text-white font-[var(--font-noto-serif)] text-lg font-normal mb-0.5"
                />
                <span className="text-[#86a0cd] text-[10px] tracking-[0.15em] uppercase font-semibold font-[var(--font-inter)]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Story */}
      <section className="overflow-hidden bg-white">
        <div className="flex flex-col lg:flex-row">
          {/* Left — dark text panel */}
          <div className="lg:w-[54%] bg-[#002045] px-8 lg:px-20 py-24 lg:py-32 flex items-center">
            <div className="max-w-[520px]">
              <p className="text-[#86a0cd] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
                Sobre a Orbital
              </p>
              <h2 className="font-[var(--font-noto-serif)] text-white text-4xl lg:text-[42px] font-normal leading-[1.25] mb-6">
                A fundação da excelência sustentável.
              </h2>
              <p className="text-white/70 text-base font-[var(--font-inter)] leading-relaxed mb-5">
                A Orbital é uma importadora especializada em revestimentos eco-premium,
                selecionando materiais que combinam desempenho técnico inigualável
                com estética arquitetônica apurada. Com sede em Manaus, levamos
                acabamentos de nível internacional a cada projeto.
              </p>
              <p className="text-white/70 text-base font-[var(--font-inter)] leading-relaxed mb-10">
                Nossa tecnologia PFB (Placas Flexíveis de Bambu) é homologada
                por Eng. Civil com ART e aprovada para ambientes úmidos,
                tetos e projetos navais.
              </p>
              <Link
                href="/tecnologia"
                className="inline-flex items-center gap-2 text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] border-b border-white/40 pb-0.5 hover:border-white transition-colors"
              >
                Ver tecnologia PFB
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Right — anatomy diagram with vignette */}
          <div className="lg:w-[46%] bg-white relative min-h-[440px] flex items-center justify-center overflow-hidden py-12 px-8">
            {/* Radial vignette fades edges into white */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{ background: "radial-gradient(ellipse 72% 78% at 50% 50%, transparent 42%, white 100%)" }}
            />
            <Image
              src="/images/catalogue/product-anatomy.png"
              alt="Anatomia da Placa PFB Orbital — seção transversal 5 camadas"
              width={732}
              height={1638}
              className="max-h-[580px] w-auto relative z-[5]"
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-[#ffffff] border-y border-[#eeeeee]">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map(({ icon, title, desc }, i) => (
              <ScrollReveal key={title} delay={i * 100} direction="up">
                <div className="flex flex-col gap-4 group">
                  <div className="text-[#1a365d] w-10 h-10 flex items-center justify-center border border-[#e2e2e2] group-hover:bg-[#002045] group-hover:text-white group-hover:border-[#002045] transition-colors duration-300">
                    {icon}
                  </div>
                  <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-lg font-medium leading-snug">
                    {title}
                  </h3>
                  <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed">
                    {desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Lines */}
      <section className="py-24 lg:py-32 bg-[#f9f9f9]">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="flex items-end justify-between mb-14 pb-4 border-b border-[#e2e2e2]">
            <div>
              <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-2">
                Coleções
              </p>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal">
                Linhas em Destaque
              </h2>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a
                href={CATALOGUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Catálogo PDF
              </a>
              <Link
                href="/produtos"
                className="text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors"
              >
                Ver todos →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredLines.map(({ name, subtitle, desc, price, img, href, code, waMsg }, i) => (
              <ScrollReveal key={name} delay={i * 120} direction="up">
                <div className="group">
                  <Link href={href} className="block cursor-pointer">
                    <div className="relative aspect-[3/4] overflow-hidden bg-[#eeeeee] mb-5">
                      <Image
                        src={img}
                        alt={`${name} — ${subtitle}`}
                        fill
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-4 left-4">
                        <span className="bg-[#002045] text-white text-[10px] tracking-[0.15em] uppercase font-semibold font-[var(--font-inter)] px-3 py-1.5">
                          {name}
                        </span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 h-1 bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                    </div>
                    <div className="space-y-1.5 mb-4">
                      <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-semibold font-[var(--font-inter)]">
                        {code}
                      </p>
                      <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-medium group-hover:text-[#1a365d] transition-colors">
                        {name} — {subtitle}
                      </h3>
                      <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed">
                        {desc}
                      </p>
                      <p className="text-[#1a365d] text-sm font-semibold font-[var(--font-inter)] pt-1">
                        {price}
                      </p>
                    </div>
                  </Link>
                  <a
                    href={WA(waMsg)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] border border-[#002045] text-[#002045] px-5 py-2 hover:bg-[#002045] hover:text-white transition-colors"
                  >
                    Tirar dúvidas →
                  </a>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 md:hidden">
            <Link
              href="/produtos"
              className="inline-block text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#002045] border border-[#002045] px-8 py-3 hover:bg-[#002045] hover:text-white transition-colors"
            >
              Ver catálogo completo
            </Link>
            <a
              href={CATALOGUE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Baixar Catálogo PDF
            </a>
          </div>
        </div>
      </section>

      {/* Projects Teaser */}
      <section className="py-24 lg:py-32 bg-[#1e212a] text-white">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-14">
            <ScrollReveal className="lg:col-span-5" direction="left">
              <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
                Projetos Concluídos
              </p>
              <h2 className="font-[var(--font-noto-serif)] text-white text-2xl lg:text-[36px] font-normal leading-[1.25] mb-6 whitespace-nowrap">
                Obras que falam por si.
              </h2>
              <p className="text-[#9c9faa] text-base font-[var(--font-inter)] leading-relaxed mb-8">
                Restaurantes, escritórios, residências, ambientes náuticos —
                veja como o PFB Orbital transforma cada espaço em poucas horas.
              </p>
              <Link
                href="/projetos"
                className="inline-flex items-center gap-2 text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] border-b border-white pb-0.5 hover:opacity-70 transition-opacity"
              >
                Ver todos os projetos
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </ScrollReveal>
            <div className="lg:col-span-7">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { src: "/images/catalogue/lavabo-real.jpeg", label: "Lavabo" },
                  { src: "/images/catalogue/projeto-escritorio-depois.jpeg", label: "Comercial" },
                  { src: "/images/catalogue/projeto-varanda.jpeg", label: "Banheiro" },
                  { src: "/images/catalogue/page13_img5_924x1629.jpeg", label: "Escritório" },
                ].map(({ src, label }, i) => (
                  <ScrollReveal key={label} delay={i * 80} direction="up">
                    <div className="relative aspect-[4/5] overflow-hidden group">
                      <Image
                        src={src}
                        alt={`Projeto Orbital — ${label}`}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent group-hover:from-black/40 transition-all duration-500" />
                      <div className="absolute inset-x-0 bottom-0 p-3 translate-y-1 group-hover:translate-y-0 transition-transform duration-400">
                        <p className="text-white text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)]">
                          {label}
                        </p>
                        <div className="h-px bg-white/50 mt-1.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Parceiros Teaser */}
      <section className="py-24 lg:py-32 bg-white border-t border-[#eeeeee]">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="flex items-end justify-between mb-14 pb-4 border-b border-[#e2e2e2]">
            <div>
              <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-2">
                Para Profissionais
              </p>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal">
                Feito para quem entrega resultados.
              </h2>
            </div>
            <Link
              href="/parcerias"
              className="hidden md:inline text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f] hover:text-[#002045] transition-colors"
            >
              Ver programa de parceiros →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: "Arquitetos & Urbanistas",
                tagline: "Especifique com dados. Amostras grátis para moodboard.",
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                ),
                waMsg: "Olá! Sou arquiteto e gostaria de conhecer as condições para especificação de projetos com o PFB Orbital.",
                href: "/parcerias",
              },
              {
                label: "Marceneiros",
                tagline: "Instale em 2–3h. Ganhe mais por m² sem equipamentos caros.",
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                  </svg>
                ),
                waMsg: "Olá! Sou marceneiro e gostaria de saber sobre parceria e instalação do PFB Orbital.",
                href: "/parcerias",
              },
              {
                label: "Engenheiros",
                tagline: "ART · CREA · Laudos laboratoriais. Aprovado para projetos navais.",
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                ),
                waMsg: "Olá! Sou engenheiro e gostaria de acessar a documentação técnica do PFB Orbital.",
                href: "/parcerias",
              },
              {
                label: "Revendedores",
                tagline: "Tabela exclusiva. Estoque local. Produto sem concorrência direta.",
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 01-8 0" />
                  </svg>
                ),
                waMsg: "Olá! Tenho interesse em revender os produtos Orbital. Gostaria de saber as condições.",
                href: "/parcerias",
              },
            ].map(({ label, tagline, icon, waMsg, href }, i) => (
              <ScrollReveal key={label} delay={i * 80} direction="up">
                <div className="border border-[#e2e2e2] p-7 hover:border-[#002045] transition-colors group h-full flex flex-col">
                  <div className="text-[#1a365d] w-10 h-10 flex items-center justify-center border border-[#e2e2e2] group-hover:bg-[#002045] group-hover:text-white group-hover:border-[#002045] transition-colors duration-300 mb-5">
                    {icon}
                  </div>
                  <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-lg font-medium mb-2">
                    {label}
                  </h3>
                  <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed mb-6 flex-1">
                    {tagline}
                  </p>
                  <div className="flex flex-col gap-2">
                    <a
                      href={WA(waMsg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] bg-[#002045] text-white px-4 py-2.5 text-center hover:bg-[#1a365d] transition-colors"
                    >
                      Falar no WhatsApp
                    </a>
                    <Link
                      href={href}
                      className="inline-block text-[10px] tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] border border-[#e2e2e2] text-[#74777f] px-4 py-2.5 text-center hover:border-[#002045] hover:text-[#002045] transition-colors"
                    >
                      Ver benefícios
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA WhatsApp */}
      <section className="py-20 bg-[#002045]">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16 text-center">
          <ScrollReveal direction="none">
          <p className="text-[#86a0cd] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
            Pronto para transformar seu espaço?
          </p>
          <h2 className="font-[var(--font-noto-serif)] text-white text-3xl lg:text-5xl font-normal mb-6">
            Fale com a Orbital.
          </h2>
          <p className="text-white/70 text-base font-[var(--font-inter)] mb-10 max-w-lg mx-auto">
            3 linhas exclusivas, 15 acabamentos e entrega imediata em Manaus.
            Baixe o catálogo ou entre em contato diretamente.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={WA("Olá! Vim pela homepage e gostaria de saber mais sobre os revestimentos PFB Orbital.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#3b6934] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#2d5228] transition-colors cta-pulse-green"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Falar no WhatsApp
            </a>
            <a
              href={CATALOGUE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/40 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-white/10 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Baixar Catálogo PDF
            </a>
            <Link
              href="/produtos"
              className="border border-white/40 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-white/10 transition-colors"
            >
              Ver Catálogo Online
            </Link>
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="bg-[#f9f9f9] border-t border-[#eeeeee] py-5 text-center">
        <p className="text-[#74777f] text-xs font-[var(--font-inter)] italic">
          Imagens ilustrativas — cores podem variar. Recomendamos uma visita ao nosso showroom.
        </p>
      </div>
    </>
  );
}
