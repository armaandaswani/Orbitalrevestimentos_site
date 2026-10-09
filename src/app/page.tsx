import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedStat from "@/components/AnimatedStat";
import HomeProjectsGrid from "@/components/HomeProjectsGrid";
import ContatoCta from "@/components/ContatoCta";
import VisaoDoArquiteto from "@/components/VisaoDoArquiteto";
import ConhecaPfb from "@/components/ConhecaPfb";

export const metadata: Metadata = {
  title: "Orbital Revestimentos — Instalado em horas. Admirado por anos.",
  description:
    "Painéis Flexíveis Fibra de Bambu (PFB) eco-premium para transformar paredes e tetos em Manaus. Melhor que MDF e papel de parede — sem obra, sem poeira. 3 linhas, 15 acabamentos, pronta-entrega.",
  alternates: { canonical: "https://orbitalrevestimentos.com.br" },
  keywords: [
    "Orbital Revestimentos",
    "revestimento parede Manaus",
    "revestimento de forro Manaus",
    "melhor que MDF",
    "alternativa papel de parede",
    "PFB painel flexível fibra de bambu",
    "revestimento sem obra Manaus",
    "decoração interiores Manaus",
  ],
  openGraph: {
    title: "Orbital Revestimentos — Instalado em horas. Admirado por anos.",
    description:
      "Painéis Flexíveis Fibra de Bambu (PFB) eco-premium para paredes e tetos em Manaus. Melhor que MDF e papel de parede. Sem obra, sem poeira. Pronta-entrega.",
    url: "https://orbitalrevestimentos.com.br",
  },
};

const faqs = [
  {
    q: "O que é o PFB Orbital?",
    a: "PFB significa Painel Flexível Fibra de Bambu — um revestimento eco-premium com substrato de fibra de bambu e acabamento fotorrealista de pedra ou madeira. Instalado diretamente sobre a parede ou forro existente, sem demolição ou obra pesada. Desenvolvido especialmente para o clima úmido do Amazonas.",
  },
  {
    q: "Quais são os diferenciais técnicos do PFB Orbital?",
    a: "O PFB é construído em 5 camadas — do núcleo de fibra de bambu até a film protetora UV — certificadas em laboratório com ART de Engenheiro Civil. Absorve apenas 0,2% de umidade em 48h de imersão total, pesa 3,2 kg/m², não propaga chamas e é anti-mofo e anti-cupim por natureza. Um cômodo fica instalado em 2 a 3 horas, sem obra e sem poeira.",
  },
  {
    q: "O PFB é uma solução permanente ou temporária?",
    a: "Permanente. O PFB é uma placa rígida de 5mm com acabamento fotorrealista premium — texturas que remetem a pedra e madeira real, impermeável e lavável. Aprovado para áreas úmidas, dura 10+ anos no clima amazônico e é instalado sem obra ou demolição. Uma transformação definitiva do ambiente.",
  },
  {
    q: "O PFB serve para revestimento de forro (teto)?",
    a: "Sim. O PFB é leve (3,2 kg/m²) e aprovado para aplicação em teto com ART de Engenheiro Civil. Já foi instalado como forro em residências, restaurantes, escritórios e embarcações náuticas em Manaus — com acabamento arquitetônico que transforma qualquer ambiente.",
  },
  {
    q: "Onde comprar o revestimento PFB em Manaus?",
    a: "A Orbital Revestimentos é o fornecedor exclusivo do PFB em Manaus. Temos pronta-entrega, showroom e atendimento pelo WhatsApp. Sem intermediários — você compra direto do importador e recebe ainda essa semana.",
  },
  {
    q: "Arquitetos e designers em Manaus podem especificar o PFB?",
    a: "Sim. A Orbital tem um programa de parcerias para arquitetos, designers de interiores e engenheiros em Manaus. Fornecemos amostras grátis, fichas técnicas completas com ART/CREA, laudos laboratoriais e suporte técnico para especificação em projetos residenciais e comerciais.",
  },
  {
    q: "O PFB resiste à umidade e ao mofo?",
    a: "Sim — e os dados comprovam. Com apenas 0,2% de absorção de água em 48 horas de imersão total, o PFB é praticamente impermeável. O substrato de fibra de bambu não é habitat para fungos, então o PFB não mofará mesmo em banheiros sem ventilação. Testado em laboratório e homologado com ART de Engenheiro Civil.",
  },
  {
    q: "Qual o melhor revestimento de parede para o clima úmido de Manaus?",
    a: "O PFB (Painel Flexível Fibra de Bambu) é o revestimento indicado para o clima amazônico. Desenvolvido para ambientes com umidade relativa acima de 80%, absorve apenas 0,2% de umidade, não empena, não descola e mantém a integridade visual e estrutural por mais de 10 anos. Aprovado em laboratório com ART de Engenheiro Civil — disponível em pronta-entrega em Manaus.",
  },
  {
    q: "O PFB é impermeável? Pode ser instalado em banheiro ou lavabo?",
    a: "Sim. O PFB é resistente à água — apenas 0,2% de absorção em 48 horas de imersão. É aprovado para áreas úmidas: banheiros, lavabos, cozinhas, fachadas internas e projetos náuticos. Anti-mofo por natureza, sem necessidade de tratamento adicional.",
  },
  {
    q: "Como é feita a instalação? Precisa de obra?",
    a: "Não precisa de obra pesada. O PFB é colado diretamente sobre a parede ou teto existente com cola PU 40 ou cola de contato — sem demolição, sem poeira, sem barulho de obra. Um cômodo padrão fica pronto em 2 a 3 horas. Pode ser instalado com o ambiente em vivência/uso e sem interromper as atividades do espaço.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

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
    price: "559/placa",
    img: "/images/catalogue/classic-branco-calacatta-orb006.jpeg",
    href: "/produtos?linha=classic",
    code: "3 acabamentos · Fosco",
    waMsg: "Olá! Tenho interesse na linha Classic (Mármore Fosco). Gostaria de saber mais e solicitar uma amostra.",
  },
  {
    name: "Brilliance",
    subtitle: "Mármore Polido",
    desc: "Veios dramáticos com acabamento espelhado. Para projetos que exigem impacto visual.",
    price: "589/placa",
    img: "/images/catalogue/brilliance-gris-pietra-orb009.jpeg",
    href: "/produtos?linha=brilliance",
    code: "8 acabamentos · Polido",
    waMsg: "Olá! Tenho interesse na linha Brilliance (Mármore Polido). Gostaria de saber mais e solicitar uma amostra.",
  },
  {
    name: "Elegance",
    subtitle: "Madeira Texturizada",
    desc: "Calor natural com acabamento texturizado. A alma da madeira sem a fragilidade dela.",
    price: "649/placa",
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
      <section className="relative h-screen min-h-[620px] max-h-[900px] flex items-center">
        <div className="absolute inset-0">
          <Image
            src="/images/catalogue/hero-cover.png"
            alt="Revestimento de parede PFB Orbital — acabamento arquitetônico instalado em Manaus"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F45]/90 via-[#0B1F45]/60 to-[#0B1F45]/20 lg:bg-gradient-to-r lg:from-[#0B1F45]/85 lg:via-[#0B1F45]/50 lg:to-transparent" />
        </div>
        {/* pt-20 = altura da navbar fixa: o bloco fica no meio da parte visível. */}
        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 lg:px-16 pt-20">
          <p className="text-[#B4BBC8] text-xs tracking-[0.2em] uppercase font-semibold mb-5">
            Orbital Revestimentos · Manaus, AM
          </p>
          <h1 className="font-serif text-white text-3xl lg:text-7xl font-normal leading-[1.1] tracking-[-0.02em] mb-6 max-w-3xl">
            <span className="sr-only">Orbital Revestimentos — revestimento de parede e teto em Manaus. </span>
            Instalado em horas.<br />
            <em>Admirado por anos.</em>
          </h1>
          <p className="text-white/80 text-base lg:text-lg font-normal leading-relaxed mb-8 lg:mb-10 max-w-xl">
            Revestimentos eco-premium da Orbital que transformam paredes e tetos
            em Manaus com acabamento arquitetônico — sem obra, sem espera.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 lg:gap-4">
            <Link
              href="/produtos"
              className="w-full sm:w-auto text-center bg-white text-[#0B1F45] text-xs tracking-[0.12em] uppercase font-bold px-8 py-4 hover:bg-[#f3f3f3] transition-colors"
            >
              Ver o catálogo
            </Link>
            <Link
              href="/tecnologia"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/60 text-white text-xs tracking-[0.12em] uppercase font-bold px-8 py-4 hover:bg-white/10 transition-colors"
            >
              Conhecer mais
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-[#0B1F45] border-b border-[#2347A0]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16 py-6">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {stats.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center text-center py-2">
                <AnimatedStat
                  value={value}
                  className="text-white text-lg font-normal mb-0.5"
                />
                <span className="text-[#B4BBC8] text-[10px] tracking-[0.15em] uppercase font-semibold">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ConhecaPfb />

      {/* A Visão do Arquiteto — logo depois de apresentar o PFB: quem já especifica (playlist do YouTube) */}
      <VisaoDoArquiteto />

      {/* Visualizador Teaser — same reasoning as above, dedicated section. */}
      <section className="py-12 lg:py-28 bg-[#0B1F45]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            <ScrollReveal className="lg:col-span-5 lg:order-1" direction="left">
              {/* Single polished AI render in a soft frame — shows the actual
                  output quality instead of a raw construction antes/depois pair. */}
              <Link href="/visualizador" className="group relative block max-w-[360px] mx-auto">
                <div className="relative aspect-[4/5] overflow-hidden shadow-2xl">
                  <Image
                    src="/images/renders/orb014-escritorio.png"
                    alt="Visualização gerada por inteligência artificial"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 bg-black/55 text-white text-[9px] tracking-[0.15em] uppercase font-bold px-3 py-1.5">
                    Gerado por IA
                  </span>
                </div>
                <div className="absolute -top-4 -right-4 sm:-top-5 sm:-right-5 bg-white text-[#0B1F45] w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-xl">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z" />
                    <path d="M19.5 14l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" opacity="0.65" />
                  </svg>
                </div>
              </Link>
            </ScrollReveal>
            <ScrollReveal className="lg:col-span-7 lg:order-2" direction="right" delay={100}>
              <p className="text-[#36A35C] text-xs tracking-[0.2em] uppercase font-semibold mb-5">
                Visualizador com IA
              </p>
              <h2 className="font-serif text-white text-2xl lg:text-[40px] font-normal leading-[1.2] mb-6">
                Veja como fica no seu ambiente.
              </h2>
              <p className="text-white/65 text-base leading-relaxed mb-8 max-w-md">
                Envie uma foto do seu espaço e a inteligência artificial aplica
                o acabamento escolhido na hora — antes de você decidir.
              </p>
              <Link
                href="/visualizador"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#0B1F45] text-xs tracking-[0.12em] uppercase font-bold px-8 py-4 hover:bg-[#f3f3f3] transition-colors"
              >
                Ver no meu ambiente
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Brand Story */}
      <section className="overflow-hidden bg-white">
        <div className="flex flex-col lg:flex-row">
          {/* Left — dark text panel */}
          <div className="lg:w-[54%] bg-[#0B1F45] px-4 lg:px-20 py-10 lg:py-32 flex items-center">
            <div className="max-w-[520px]">
              <p className="text-[#B4BBC8] text-xs tracking-[0.2em] uppercase font-semibold mb-5">
                Sobre a Orbital
              </p>
              <h2 className="font-serif text-white text-4xl lg:text-[42px] font-normal leading-[1.25] mb-6">
                A fundação da excelência sustentável.
              </h2>
              <p className="text-white/70 text-base leading-relaxed mb-5">
                A Orbital é uma importadora especializada em revestimentos eco-premium,
                selecionando materiais que combinam desempenho técnico inigualável
                com estética arquitetônica apurada. Com sede em Manaus, levamos
                acabamentos de nível internacional a cada projeto.
              </p>
              <p className="text-white/70 text-base leading-relaxed mb-10">
                Nossa tecnologia PFB (Painéis Flexíveis Fibra de Bambu) é homologada
                por Eng. Civil com ART e aprovada para ambientes úmidos,
                tetos e projetos navais.
              </p>
              <Link
                href="/tecnologia"
                className="inline-flex items-center gap-2 text-white text-xs tracking-[0.1em] uppercase font-bold border-b border-white/40 pb-0.5 hover:border-white transition-colors"
              >
                Ver tecnologia PFB
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Right — anatomy diagram with vignette */}
          <div className="lg:w-[46%] bg-white relative min-h-[280px] lg:min-h-[440px] flex items-center justify-center overflow-hidden py-8 lg:py-12 px-8">
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
              className="max-h-[280px] lg:max-h-[580px] w-auto relative z-[5]"
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-10 lg:py-20 bg-[#ffffff] border-y border-[#eeeeee]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {benefits.map(({ icon, title, desc }, i) => (
              <ScrollReveal key={title} delay={i * 100} direction="up">
                <div className="flex flex-col gap-4 group">
                  <div className="text-[#2347A0] w-10 h-10 flex items-center justify-center border border-[#e2e2e2] group-hover:bg-[#0B1F45] group-hover:text-white group-hover:border-[#0B1F45] transition-colors duration-300">
                    {icon}
                  </div>
                  <h3 className="font-serif text-[#0B1F45] text-lg font-medium leading-snug">
                    {title}
                  </h3>
                  <p className="text-[#43474e] text-sm leading-relaxed">
                    {desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Lines */}
      <section className="py-12 lg:py-32 bg-[#F6F5F2]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="flex items-end justify-between mb-8 lg:mb-14 pb-4 border-b border-[#e2e2e2]">
            <div>
              <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold mb-2">
                Coleções
              </p>
              <h2 className="font-serif text-[#0B1F45] text-2xl lg:text-4xl font-normal">
                Linhas em Destaque
              </h2>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/produtos"
                className="text-xs tracking-[0.1em] uppercase font-semibold text-[#74777f] hover:text-[#0B1F45] transition-colors"
              >
                Ver todos →
              </Link>
            </div>
          </div>

          {/* Mobile: compact 3-column grid — all 3 visible simultaneously */}
          <div className="grid grid-cols-3 gap-2 md:hidden">
            {featuredLines.map(({ name, subtitle, price, img, href, code }) => (
              <div key={name} className="group">
                <Link href={href} className="block cursor-pointer">
                  <div className="relative aspect-[812/988] overflow-hidden bg-[#eeeeee] mb-1.5">
                    <Image
                      src={img}
                      alt={`${name} — ${subtitle}`}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="bg-[#0B1F45] text-white text-[8px] tracking-[0.08em] uppercase font-semibold px-1.5 py-1 leading-none">
                        {name}
                      </span>
                    </div>
                  </div>
                  <p className="text-[#74777f] text-[9px] tracking-[0.08em] uppercase font-semibold leading-tight truncate">{code}</p>
                  <p className="text-[#0B1F45] text-[11px] font-medium leading-snug">{subtitle}</p>
                  <p className="text-[#2347A0] text-[10px] font-semibold">{price}</p>
                </Link>
              </div>
            ))}
          </div>

          <div className="hidden md:grid md:grid-cols-3 gap-8">
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
                        <span className="bg-[#0B1F45] text-white text-[10px] tracking-[0.15em] uppercase font-semibold px-3 py-1.5">
                          {name}
                        </span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 h-1 bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                    </div>
                    <div className="space-y-1.5 mb-4">
                      <p className="text-[#74777f] text-[10px] tracking-[0.15em] uppercase font-semibold">
                        {code}
                      </p>
                      <h3 className="font-serif text-[#0B1F45] text-xl font-medium group-hover:text-[#2347A0] transition-colors">
                        {name} — {subtitle}
                      </h3>
                      <p className="text-[#43474e] text-sm leading-relaxed">
                        {desc}
                      </p>
                      <p className="text-[#2347A0] text-sm font-semibold pt-1">
                        {price}
                      </p>
                      <p className="text-[#b0b4bb] text-[10px] tracking-[0.08em]">
                        2,9m × 1,2m × 5mm
                      </p>
                    </div>
                  </Link>
                  <a
                    href={WA(waMsg)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[10px] tracking-[0.12em] uppercase font-bold border border-[#0B1F45] text-[#0B1F45] px-5 py-2 hover:bg-[#0B1F45] hover:text-white transition-colors"
                  >
                    Tirar dúvidas →
                  </a>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-8 flex justify-center md:hidden">
            <Link
              href="/produtos"
              className="text-xs tracking-[0.1em] uppercase font-semibold text-[#0B1F45] hover:text-[#2347A0] transition-colors"
            >
              Ver todos →
            </Link>
          </div>
        </div>
      </section>

      {/* Projects Teaser */}
      <section className="py-10 lg:py-32 bg-[#0B1F45] text-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center mb-10 lg:mb-14">
            <ScrollReveal className="lg:col-span-5" direction="left">
              <p className="text-[#36A35C] text-xs tracking-[0.2em] uppercase font-semibold mb-5">
                Projetos Concluídos
              </p>
              <h2 className="font-serif text-white text-2xl lg:text-[36px] font-normal leading-[1.25] mb-6">
                Obras que falam por si.
              </h2>
              <p className="text-[#9c9faa] text-base leading-relaxed mb-8">
                Restaurantes, escritórios, residências, ambientes náuticos —
                veja como o PFB Orbital transforma cada espaço em poucas horas.
              </p>
              <Link
                href="/projetos"
                className="inline-flex items-center gap-2 text-white text-xs tracking-[0.1em] uppercase font-bold border-b border-white pb-0.5 hover:opacity-70 transition-opacity"
              >
                Ver todos os projetos
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </ScrollReveal>
            <div className="lg:col-span-7">
              <HomeProjectsGrid fallback={[
                { src: "/images/catalogue/lavabo-real.jpeg", label: "Lavabo" },
                { src: "/images/catalogue/projeto-escritorio-depois.jpeg", label: "Comercial — Restaurante" },
                { src: "/images/catalogue/projeto-varanda.jpeg", label: "Banheiro" },
                { src: "/images/catalogue/page13_img5_924x1629.jpeg", label: "Escritório" },
              ]} />
            </div>
          </div>
        </div>
      </section>

      {/* Parceiros Teaser */}
      <section className="py-10 lg:py-32 bg-white border-t border-[#eeeeee]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="flex items-end justify-between mb-10 lg:mb-14 pb-4 border-b border-[#e2e2e2]">
            <div>
              <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold mb-2">
                Para Profissionais
              </p>
              <h2 className="font-serif text-[#0B1F45] text-2xl lg:text-4xl font-normal">
                Feito para quem entrega resultados.
              </h2>
            </div>
            <Link
              href="/parcerias"
              className="hidden md:inline text-xs tracking-[0.1em] uppercase font-semibold text-[#74777f] hover:text-[#0B1F45] transition-colors"
            >
              Ver programa de parceiros →
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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
                <div className="border border-[#e2e2e2] p-4 lg:p-7 hover:border-[#0B1F45] transition-colors group h-full flex flex-col">
                  <div className="text-[#2347A0] w-10 h-10 flex items-center justify-center border border-[#e2e2e2] group-hover:bg-[#0B1F45] group-hover:text-white group-hover:border-[#0B1F45] transition-colors duration-300 mb-5">
                    {icon}
                  </div>
                  <h3 className="font-serif text-[#0B1F45] text-lg font-medium mb-2">
                    {label}
                  </h3>
                  <p className="text-[#43474e] text-sm leading-relaxed mb-6 flex-1">
                    {tagline}
                  </p>
                  <div className="flex flex-col gap-2">
                    <a
                      href={WA(waMsg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[10px] tracking-[0.12em] uppercase font-bold bg-[#0B1F45] text-white px-4 py-2.5 text-center hover:bg-[#2347A0] transition-colors"
                    >
                      Falar no WhatsApp
                    </a>
                    <Link
                      href={href}
                      className="inline-block text-[10px] tracking-[0.12em] uppercase font-bold border border-[#e2e2e2] text-[#74777f] px-4 py-2.5 text-center hover:border-[#0B1F45] hover:text-[#0B1F45] transition-colors"
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

      {/* Academia Orbital — chamada curta. O curso ainda está em desenvolvimento:
          aqui só se apresenta e leva à lista de espera. Nada de preço ou data. */}
      <section className="py-10 lg:py-16 bg-[#F6F5F2] border-t border-[#eeeeee]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <ScrollReveal direction="up">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-16">
              <div className="lg:flex-1 max-w-2xl">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
                  <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold">
                    Academia Orbital
                  </p>
                  <span className="border border-[#c4c6cf] text-[#74777f] text-[9px] tracking-[0.18em] uppercase font-bold px-2 py-0.5">
                    Em desenvolvimento
                  </span>
                </div>
                <h2 className="font-serif text-[#0B1F45] text-2xl lg:text-4xl font-normal leading-tight mb-3">
                  Capacitação técnica para instalar PFB no padrão Orbital.
                </h2>
                <p className="text-[#43474e] text-sm lg:text-base leading-relaxed">
                  Treinamento técnico para aplicadores, do preparo ao acabamento, para formar Instaladores
                  Certificados Orbital. Entre na lista de espera e saiba primeiro quando abrir.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 flex-shrink-0">
                <Link
                  href="/academia#lista-de-espera"
                  className="w-full sm:w-auto inline-flex items-center justify-center whitespace-nowrap bg-[#0B1F45] text-white text-xs tracking-[0.12em] uppercase font-bold px-8 py-4 hover:bg-[#2347A0] transition-colors"
                >
                  Entrar na lista de espera
                </Link>
                <Link
                  href="/academia"
                  className="w-full sm:w-auto inline-flex items-center justify-center whitespace-nowrap border border-[#c4c6cf] text-[#0B1F45] text-xs tracking-[0.12em] uppercase font-bold px-8 py-4 hover:border-[#0B1F45] transition-colors"
                >
                  Conhecer a Academia
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA WhatsApp */}
      <section className="py-10 lg:py-20 bg-[#0B1F45]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16 text-center">
          <ScrollReveal direction="none">
          <p className="text-[#B4BBC8] text-xs tracking-[0.2em] uppercase font-semibold mb-4">
            Pronto para transformar seu espaço?
          </p>
          <h2 className="font-serif text-white text-3xl lg:text-5xl font-normal mb-6">
            Fale com a Orbital.
          </h2>
          <p className="text-white/70 text-base mb-10 max-w-lg mx-auto">
            3 linhas exclusivas, 15 acabamentos e entrega imediata em Manaus.
            Baixe o catálogo ou entre em contato diretamente.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 lg:gap-4">
            <ContatoCta
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/40 text-white text-xs tracking-[0.12em] uppercase font-bold px-8 py-4 hover:bg-white/10 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
              Falar com um consultor
            </ContatoCta>
            <Link
              href="/produtos"
              className="w-full sm:w-auto text-center border border-white/40 text-white text-xs tracking-[0.12em] uppercase font-bold px-8 py-4 hover:bg-white/10 transition-colors"
            >
              Ver Catálogo Online
            </Link>
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 lg:py-20 bg-white border-t border-[#eeeeee]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="mb-6 lg:mb-12">
            <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold mb-2">
              Dúvidas Frequentes
            </p>
            <h2 className="font-serif text-[#0B1F45] text-2xl lg:text-4xl font-normal">
              Perguntas e Respostas
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-5 lg:gap-y-10">
            {faqs.map(({ q, a }) => (
              <div key={q} className="border-t border-[#eeeeee] pt-4 lg:pt-6">
                <h3 className="font-serif text-[#0B1F45] text-base lg:text-lg font-normal mb-2">
                  {q}
                </h3>
                <p className="text-[#43474e] text-sm leading-relaxed">
                  {a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="bg-[#F6F5F2] border-t border-[#eeeeee] py-5 text-center">
        <p className="text-[#74777f] text-xs italic">
          Imagens ilustrativas — cores podem variar. Recomendamos uma visita ao nosso showroom.
        </p>
      </div>
    </>
  );
}
