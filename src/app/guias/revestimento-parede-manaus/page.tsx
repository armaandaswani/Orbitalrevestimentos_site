import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedStat from "@/components/AnimatedStat";

const BASE_URL = "https://orbitalrevestimentos.com.br";
const WA = (msg: string) => `https://wa.me/5592988150149?text=${encodeURIComponent(msg)}`;

export const metadata: Metadata = {
  title: "Revestimento de Parede em Manaus — Guia Completo 2026",
  description:
    "Guia completo sobre revestimento de parede em Manaus: tipos, preços, vantagens e o que dura no clima do Amazonas. Compare azulejo, MDF, papel de parede e PFB.",
  keywords: ["revestimento de parede Manaus","revestimento parede sala Manaus","melhor revestimento parede Manaus","revestimento parede sem obra","PFB Manaus","Orbital Revestimentos"],
  alternates: { canonical: `${BASE_URL}/guias/revestimento-parede-manaus` },
  openGraph: {
    title: "Revestimento de Parede em Manaus — Guia Completo 2026",
    description: "Tudo sobre revestimento de parede em Manaus: do azulejo ao PFB. Qual aguenta o clima úmido, qual instala sem obra, qual dura mais de 10 anos.",
    url: `${BASE_URL}/guias/revestimento-parede-manaus`,
    images: [{ url: `/images/catalogue/aplicacao-sala.jpeg`, width: 1200, height: 800, alt: "Sala revestida com PFB Orbital em Manaus" }],
  },
};

const articleSchema = {
  "@context": "https://schema.org", "@type": "Article",
  headline: "Revestimento de Parede em Manaus — Guia Completo 2026",
  author: { "@type": "Organization", name: "Orbital Revestimentos" },
  publisher: { "@type": "Organization", name: "Orbital Revestimentos", logo: { "@type": "ImageObject", url: `${BASE_URL}/images/logo.png` } },
  datePublished: "2026-01-01", dateModified: "2026-06-01",
  mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/guias/revestimento-parede-manaus` },
  image: `${BASE_URL}/images/catalogue/aplicacao-sala.jpeg`,
};

const faqSchema = {
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Qual o melhor revestimento de parede para Manaus?", acceptedAnswer: { "@type": "Answer", text: "O PFB Orbital (Placa Flexível de Bambu) é o melhor revestimento de parede para o clima de Manaus. Absorve apenas 0,2% de umidade em 48h, é anti-mofo, anti-cupim, impermeável e instala em 2–3 horas sem obra. Disponível em 15 acabamentos." } },
    { "@type": "Question", name: "Quanto tempo leva para revestir uma parede em Manaus?", acceptedAnswer: { "@type": "Answer", text: "Com PFB Orbital, uma parede de cômodo padrão leva 2 a 3 horas. Não há demolição, não há espera de cura." } },
    { "@type": "Question", name: "Posso revestir parede sem obra em Manaus?", acceptedAnswer: { "@type": "Answer", text: "Sim. O PFB Orbital é colado diretamente sobre a parede existente com cola PU 40. Sem quebra, sem poeira, sem obra pesada." } },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Guias", item: `${BASE_URL}/guias` },
    { "@type": "ListItem", position: 3, name: "Revestimento de Parede em Manaus", item: `${BASE_URL}/guias/revestimento-parede-manaus` },
  ],
};

const ambientes = [
  { nome: "Sala de estar", desc: "Painel de destaque ou revestimento completo. O mármore polido da linha Brilliance cria ambientes de alto padrão sem obra.", img: "/images/catalogue/aplicacao-sala.jpeg", alt: "Sala revestida com PFB Orbital Brilliance em Manaus" },
  { nome: "Escritório e clínica", desc: "Instalação a seco sem fechar o espaço. Revestimento profissional em um único dia, sem interditar o ambiente.", img: "/images/projetos/escritorio-depois.jpeg", alt: "Escritório revestido com PFB Orbital em Manaus" },
  { nome: "Cozinha e lavabo", desc: "Impermeável, anti-gordura, anti-mofo. Indicado para toda a parede da cozinha, inclusive próximo ao fogão.", img: "/images/projetos/cozinha-depois.png", alt: "Cozinha revestida com PFB Orbital em Manaus" },
  { nome: "Restaurante e comercial", desc: "Acabamento que impressiona clientes e dura anos. Sem manutenção, sem deterioração no clima amazônico.", img: "/images/projetos/restaurante-depois.jpeg", alt: "Restaurante revestido com PFB Orbital Elegance em Manaus" },
];

const stats = [
  { value: "0,2%", label: "absorção de umidade" },
  { value: "15", label: "acabamentos disponíveis" },
  { value: "72,3", label: "MPa resistência" },
  { value: "2–3h", label: "instalação por cômodo" },
];

const faqs = [
  { q: "Qual o melhor revestimento de parede para Manaus?", a: "O PFB Orbital (Placa Flexível de Bambu). Absorve apenas 0,2% de umidade em 48h — 175× menos que o MDF. Anti-mofo, anti-cupim, impermeável. Instala em 2–3 horas sem obra. 15 acabamentos disponíveis em Manaus." },
  { q: "Posso revestir parede sem demolição?", a: "Sim. O PFB é colado diretamente sobre qualquer parede existente — reboco, tinta, cerâmica — com cola PU 40. Sem quebra, sem poeira, sem espera de cura. Ideal para residências e escritórios ocupados." },
  { q: "Quanto tempo leva para instalar?", a: "Um cômodo padrão leva 2 a 3 horas. A placa mede 1,2m × 2,9m e cobre 3,48m² por peça — com poucas emendas e instalação muito mais rápida que azulejo ou cerâmica." },
  { q: "Funciona em banheiro e cozinha?", a: "Sim. O PFB foi testado em imersão total por 48h com absorção de apenas 0,2%. Aprovado para uso em banheiros, lavabos, box, ducha e cozinha — com laudo de Engenheiro Civil (ART nº AM20260593657)." },
];

export default function GuiaParedeManaus() {
  return (
    <div className="pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ── Hero full-bleed ── */}
      <section className="relative h-[80vh] min-h-[520px] max-h-[800px] flex items-end">
        <div className="absolute inset-0">
          <Image src="/images/catalogue/aplicacao-sala.jpeg" alt="Sala revestida com PFB Orbital Brilliance — revestimento de parede em Manaus" fill className="object-cover object-center" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-[#001530]/95 via-[#001530]/55 to-[#001530]/10" />
        </div>
        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 lg:px-16 pb-14 lg:pb-24">
          <nav className="text-[#86a0cd] text-xs font-[var(--font-inter)] mb-6 flex items-center gap-2">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white/60">Guias</span>
            <span>/</span>
            <span className="text-white">Revestimento de Parede em Manaus</span>
          </nav>
          <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
            Orbital Revestimentos · Guia Completo · 2026
          </p>
          <h1 className="font-[var(--font-noto-serif)] text-white text-4xl sm:text-5xl lg:text-6xl font-normal leading-tight tracking-[-0.02em] mb-6 max-w-3xl">
            Revestimento de Parede em Manaus:<br />
            <em>Guia Completo 2026</em>
          </h1>
          <p className="text-white/70 text-base lg:text-lg font-[var(--font-inter)] leading-relaxed max-w-2xl">
            O que funciona no clima úmido do Amazonas, o que deteriora em meses, preços reais e qual instala sem obra.
          </p>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-[#002045] border-b border-[#1a365d]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center text-center py-3">
                <AnimatedStat value={value} className="text-white font-[var(--font-noto-serif)] text-2xl font-normal mb-0.5" />
                <span className="text-[#86a0cd] text-[10px] tracking-[0.15em] uppercase font-semibold font-[var(--font-inter)]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Por que Manaus é diferente ── */}
      <section className="overflow-hidden bg-white">
        <div className="flex flex-col lg:flex-row min-h-[520px]">
          <div className="lg:w-1/2 bg-[#002045] px-6 lg:px-16 py-16 lg:py-28 flex items-center">
            <ScrollReveal className="max-w-lg">
              <p className="text-[#86a0cd] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">O desafio amazônico</p>
              <h2 className="font-[var(--font-noto-serif)] text-white text-3xl lg:text-4xl font-normal leading-tight mb-6">
                Por que revestimento de parede em Manaus é diferente.
              </h2>
              <p className="text-white/65 font-[var(--font-inter)] leading-relaxed mb-6">
                Manaus tem a combinação mais exigente do Brasil: temperatura média de 27°C e umidade relativa acima de 80% o ano todo. Materiais que funcionam em São Paulo deterioram em 1 a 3 anos aqui.
              </p>
              <ul className="space-y-3">
                {["MDF incha e mofar em 6–18 meses","Papel de parede descola com vapor","Tinta regular mancha e bolha","Forro PVC amarela com o tempo"].map(item => (
                  <li key={item} className="flex items-center gap-3 text-white/55 font-[var(--font-inter)] text-sm">
                    <span className="text-red-400 font-bold flex-shrink-0">✗</span>{item}
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          </div>
          <div className="lg:w-1/2 relative min-h-[380px]">
            <Image src="/images/catalogue/hero-cover.png" alt="PFB Orbital instalado — revestimento de parede de alto padrão em Manaus" fill className="object-cover" />
          </div>
        </div>
      </section>

      {/* ── Onde aplicar ── */}
      <section className="bg-[#f5f5f3] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <ScrollReveal>
            <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">Aplicações</p>
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal leading-tight mb-12 max-w-2xl">
              Onde usar revestimento de parede em Manaus.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#e2e2e2]">
            {ambientes.map((a, i) => (
              <ScrollReveal key={a.nome} delay={i * 80} className={`flex flex-col ${i < 3 ? "border-b sm:border-b-0 sm:border-r border-[#e2e2e2]" : ""}`}>
                <div className="relative h-56 overflow-hidden">
                  <Image src={a.img} alt={a.alt} fill className="object-cover transition-transform duration-700 hover:scale-105" />
                </div>
                <div className="bg-white p-5 flex-1">
                  <h3 className="font-semibold text-[#002045] font-[var(--font-inter)] mb-2">{a.nome}</h3>
                  <p className="text-[#74777f] font-[var(--font-inter)] text-sm leading-relaxed">{a.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── O PFB full-bleed ── */}
      <section className="overflow-hidden bg-white">
        <div className="flex flex-col lg:flex-row-reverse min-h-[560px]">
          <div className="lg:w-1/2 relative min-h-[380px]">
            <Image src="/images/catalogue/product-anatomy.png" alt="Anatomia do PFB Orbital — 5 camadas do revestimento de parede" fill className="object-cover" />
          </div>
          <div className="lg:w-1/2 bg-[#f9f9f7] px-6 lg:px-16 py-16 lg:py-28 flex items-center">
            <ScrollReveal className="max-w-lg">
              <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">PFB Orbital</p>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal leading-tight mb-6">
                Feito para o clima da Amazônia.
              </h2>
              <p className="text-[#43474e] font-[var(--font-inter)] leading-relaxed mb-8">
                O PFB (Placa Flexível de Bambu) combina resistência técnica extrema com acabamento arquitetônico de alto padrão. 5 camadas, 1,2m × 2,9m, 5mm — cobre 3,48m² por placa.
              </p>
              <ul className="space-y-4">
                {[
                  { t: "Impermeável comprovado", d: "0,2% absorção em 48h de imersão — aprovado pelo INMETRO" },
                  { t: "Sem rejunte", d: "Placa inteira sem emendas que acumulem mofo" },
                  { t: "Instalação a seco", d: "Cola PU 40 direto na parede — 2 a 3 horas por cômodo" },
                  { t: "Laudo técnico", d: "ART nº AM20260593657 — Eng. Civil CREA registrado" },
                ].map(item => (
                  <li key={item.t} className="flex items-start gap-3">
                    <span className="text-[#3b6934] font-bold flex-shrink-0 mt-0.5">✓</span>
                    <div className="font-[var(--font-inter)] text-sm"><strong className="text-[#002045]">{item.t}</strong><span className="text-[#74777f]"> — {item.d}</span></div>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href="/simulador" className="bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-[#1a365d] transition-colors text-center">Simular Orçamento</Link>
                <Link href="/produtos" className="border border-[#002045] text-[#002045] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-[#002045] hover:text-white transition-colors text-center">Ver Acabamentos</Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-[#002045] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <ScrollReveal>
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">Perguntas frequentes</p>
            <h2 className="font-[var(--font-noto-serif)] text-white text-3xl lg:text-4xl font-normal leading-tight mb-12 max-w-2xl">
              Tudo sobre revestimento de parede em Manaus.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {faqs.map((faq, i) => (
              <ScrollReveal key={faq.q} delay={i * 60}>
                <div className="border border-white/10 p-6 h-full">
                  <h3 className="font-semibold text-white font-[var(--font-inter)] mb-3 text-sm">{faq.q}</h3>
                  <p className="text-white/55 font-[var(--font-inter)] text-sm leading-relaxed">{faq.a}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Guias relacionados ── */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-8">Leia também</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-[#e2e2e2]">
            {[
              { href: "/guias/mdf-manaus", label: "Por que o MDF não dura em Manaus", tag: "Guia técnico" },
              { href: "/guias/revestimento-banheiro-manaus", label: "Revestimento para banheiro em Manaus", tag: "Guia" },
              { href: "/guias/quanto-custa-revestimento-manaus", label: "Quanto custa revestir em Manaus", tag: "Preços 2026" },
            ].map((link, i) => (
              <Link key={link.href} href={link.href} className={`p-6 hover:bg-[#f5f5f3] transition-colors ${i < 2 ? "border-b sm:border-b-0 sm:border-r border-[#e2e2e2]" : ""}`}>
                <p className="text-[#74777f] text-[10px] uppercase tracking-wider font-[var(--font-inter)] mb-2">{link.tag}</p>
                <p className="text-[#002045] font-semibold font-[var(--font-inter)] text-sm leading-snug">{link.label} →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/images/catalogue/aplicacao-cozinha.jpeg" alt="Ambiente revestido com PFB Orbital em Manaus" fill className="object-cover" />
          <div className="absolute inset-0 bg-[#001530]/85" />
        </div>
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-16 py-24 lg:py-32 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-[var(--font-noto-serif)] text-white text-3xl lg:text-5xl font-normal leading-tight mb-4">Simule o custo do seu ambiente agora.</h2>
            <p className="text-white/60 font-[var(--font-inter)]">Coloque as dimensões e receba o orçamento completo — material e mão de obra estimada.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link href="/simulador" className="bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-10 py-4 hover:bg-[#f3f3f3] transition-colors text-center">Simular Grátis</Link>
            <a href={WA("Olá, gostaria de um orçamento de revestimento para minha parede.")} target="_blank" rel="noopener noreferrer" className="border border-white/50 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-10 py-4 hover:bg-white/10 transition-colors text-center">Falar no WhatsApp</a>
          </div>
        </div>
      </section>
    </div>
  );
}
