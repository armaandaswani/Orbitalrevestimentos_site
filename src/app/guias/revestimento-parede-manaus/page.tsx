import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const BASE_URL = "https://orbitalrevestimentos.com.br";
const WA = (msg: string) => `https://wa.me/5592988150149?text=${encodeURIComponent(msg)}`;

export const metadata: Metadata = {
  title: "Revestimento de Parede em Manaus — Guia Completo 2026",
  description:
    "Guia completo sobre revestimento de parede em Manaus: tipos, preços, vantagens e o que dura no clima do Amazonas. Compare azulejo, MDF, papel de parede e PFB.",
  keywords: [
    "revestimento de parede Manaus",
    "revestimento parede sala Manaus",
    "como revestir parede Manaus",
    "tipos de revestimento parede",
    "revestimento parede interno Manaus",
    "revestimento para sala Manaus",
    "revestimento quarto Manaus",
    "melhor revestimento parede Manaus",
    "revestimento parede sem obra",
    "painel decorativo parede Manaus",
    "revestimento parede mármore Manaus",
    "revestimento para escritório Manaus",
  ],
  alternates: { canonical: `${BASE_URL}/guias/revestimento-parede-manaus` },
  openGraph: {
    title: "Revestimento de Parede em Manaus — Guia Completo 2026",
    description:
      "Tudo sobre revestimento de parede em Manaus: do azulejo ao PFB. Qual aguenta o clima úmido, qual instala sem obra, qual dura mais de 10 anos.",
    url: `${BASE_URL}/guias/revestimento-parede-manaus`,
    images: [{ url: `/images/catalogue/aplicacao-sala.jpeg`, width: 1200, height: 800, alt: "Sala revestida com PFB Orbital em Manaus" }],
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Revestimento de Parede em Manaus — Guia Completo 2026",
  description: "Guia completo sobre revestimento de parede em Manaus: tipos, preços, durabilidade e comparativo técnico.",
  author: { "@type": "Organization", name: "Orbital Revestimentos" },
  publisher: {
    "@type": "Organization",
    name: "Orbital Revestimentos",
    logo: { "@type": "ImageObject", url: `${BASE_URL}/images/logo.png` },
  },
  datePublished: "2026-01-01",
  dateModified: "2026-06-01",
  mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/guias/revestimento-parede-manaus` },
  image: `${BASE_URL}/images/catalogue/aplicacao-sala.jpeg`,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Qual o melhor revestimento de parede para Manaus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O PFB Orbital (Placa Flexível de Bambu) é o melhor revestimento de parede para o clima de Manaus. Absorve apenas 0,2% de umidade em 48h, é anti-mofo, anti-cupim, impermeável e instala em 2–3 horas sem obra. Disponível em 15 acabamentos — mármore e madeira.",
      },
    },
    {
      "@type": "Question",
      name: "Quanto tempo leva para revestir uma parede em Manaus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Com PFB Orbital, uma parede de cômodo padrão leva 2 a 3 horas. Não há demolição, não há espera de cura de argamassa. O processo é: limpeza da parede, aplicação de cola PU 40 e fixação das placas.",
      },
    },
    {
      "@type": "Question",
      name: "Posso revestir parede sem obra em Manaus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim. O PFB Orbital é colado diretamente sobre a parede existente — reboco, tinta, cerâmica — com cola PU 40. Sem quebra, sem poeira, sem obra pesada. Ideal para residências ocupadas, escritórios e consultórios.",
      },
    },
    {
      "@type": "Question",
      name: "Revestimento de parede interno ou externo em Manaus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O PFB Orbital é certificado para uso interno. Para fachadas externas expostas à chuva direta, não é recomendado. Para paredes internas — sala, quarto, banheiro, cozinha, escritório — é a opção mais durável disponível em Manaus.",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Guias", item: `${BASE_URL}/guias` },
    { "@type": "ListItem", position: 3, name: "Revestimento de Parede em Manaus", item: `${BASE_URL}/guias/revestimento-parede-manaus` },
  ],
};

const ambientes = [
  { nome: "Sala de estar", desc: "Painel de destaque ou revestimento de parede completo. O mármore polido da linha Brilliance cria ambientes de alto padrão sem obra.", img: "/images/catalogue/aplicacao-sala.jpeg", alt: "Sala revestida com PFB Orbital Brilliance em Manaus" },
  { nome: "Quarto e suíte", desc: "Cabeceira em mármore ou madeira texturizada. Fácil de instalar em fim de semana. Sem poeira, sem interditar o quarto.", img: "/images/catalogue/aplicacao-cozinha.jpeg", alt: "Ambiente residencial revestido com PFB Orbital em Manaus" },
  { nome: "Escritório e clínica", desc: "Ambiente profissional sem fechar o espaço. A instalação a seco permite revestir escritório ocupado em um único dia.", img: "/images/projetos/escritorio-depois.jpeg", alt: "Escritório revestido com PFB Orbital em Manaus" },
  { nome: "Cozinha e lavabo", desc: "Impermeável, anti-gordura, anti-mofo. Não absorve vapor. Indicado para toda a parede da cozinha, inclusive próximo ao fogão.", img: "/images/projetos/cozinha-depois.png", alt: "Cozinha revestida com PFB Orbital em Manaus" },
];

export default function GuiaParedeManaus() {
  return (
    <div className="pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Hero */}
      <section className="bg-[#002045] text-white py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <nav className="text-[#86a0cd] text-xs font-[var(--font-inter)] mb-6 flex items-center gap-2">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/guias" className="hover:text-white transition-colors">Guias</Link>
            <span>/</span>
            <span className="text-white">Revestimento de Parede em Manaus</span>
          </nav>
          <div className="max-w-3xl">
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
              Orbital Revestimentos · Guia Completo · 2026
            </p>
            <h1 className="font-[var(--font-noto-serif)] text-4xl lg:text-5xl font-normal leading-tight tracking-[-0.02em] mb-6">
              Revestimento de Parede em Manaus:<br />Guia Completo 2026
            </h1>
            <p className="text-white/70 text-lg font-[var(--font-inter)] leading-relaxed">
              Tipos de revestimento, o que funciona no clima úmido do Amazonas, preços e
              qual instala sem obra. Tudo que você precisa saber antes de escolher.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">

          {/* Intro */}
          <div className="max-w-3xl mb-16">
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-4">
              Por que revestimento de parede em Manaus é diferente
            </h2>
            <p className="text-[#43474e] font-[var(--font-inter)] leading-relaxed mb-4">
              Manaus tem a combinação mais exigente do Brasil para materiais de construção:
              temperatura média de 27°C e umidade relativa acima de 80% o ano todo.
              Materiais que funcionam perfeitamente em São Paulo ou Brasília deterioram
              em 1 a 3 anos em Manaus.
            </p>
            <p className="text-[#43474e] font-[var(--font-inter)] leading-relaxed">
              O MDF incha. O papel de parede descola. A tinta regular mancha. O forro PVC amarela.
              A escolha do revestimento de parede certo em Manaus não é estética — é técnica.
            </p>
          </div>

          {/* Onde aplicar */}
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-8">
            Onde usar revestimento de parede em Manaus
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {ambientes.map((a) => (
              <div key={a.nome} className="border border-[#e2e2e2]">
                <Image src={a.img} alt={a.alt} width={400} height={300} className="w-full h-48 object-cover" />
                <div className="p-5">
                  <h3 className="font-semibold text-[#002045] font-[var(--font-inter)] mb-2">{a.nome}</h3>
                  <p className="text-[#43474e] font-[var(--font-inter)] text-sm leading-relaxed">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* O PFB */}
          <div className="bg-[#f5f8f5] border border-[#d4e8d0] p-8 lg:p-12 mb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-4">
                  O PFB Orbital: o revestimento que foi feito para Manaus
                </h2>
                <p className="text-[#43474e] font-[var(--font-inter)] leading-relaxed mb-6">
                  Desenvolvido a partir de fibra de bambu comprimida, o PFB Orbital combina
                  resistência técnica extrema com acabamento arquitetônico de alto padrão.
                  Disponível em 3 linhas e 15 acabamentos — todo em pronta-entrega em Manaus.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { dado: "0,2%", label: "absorção de umidade em 48h" },
                    { dado: "72,3 MPa", label: "resistência à flexão" },
                    { dado: "15", label: "acabamentos disponíveis" },
                    { dado: "2–3h", label: "instalação por cômodo" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white border border-[#d4e8d0] p-4">
                      <p className="font-[var(--font-noto-serif)] text-[#002045] text-2xl font-normal">{stat.dado}</p>
                      <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Image src="/images/catalogue/hero-cover.png" alt="PFB Orbital — revestimento de parede instalado em ambiente de Manaus" width={600} height={400} className="w-full object-cover" />
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-16">
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-8">Perguntas frequentes</h2>
            <div className="space-y-4">
              {faqSchema.mainEntity.map((faq) => (
                <div key={faq.name} className="border border-[#e2e2e2] p-6">
                  <h3 className="font-semibold text-[#002045] font-[var(--font-inter)] mb-2">{faq.name}</h3>
                  <p className="text-[#43474e] font-[var(--font-inter)] text-sm leading-relaxed">{faq.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-[#002045] text-white p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <h2 className="font-[var(--font-noto-serif)] text-2xl lg:text-3xl font-normal mb-2">Simule o custo do seu ambiente</h2>
              <p className="text-white/70 font-[var(--font-inter)] text-sm">Coloque as dimensões e receba o orçamento de material e mão de obra.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Link href="/simulador" className="bg-white text-[#002045] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#f3f3f3] transition-colors text-center">Simular Orçamento</Link>
              <Link href="/produtos" className="border border-white/60 text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-white/10 transition-colors text-center">Ver Acabamentos</Link>
            </div>
          </div>

          {/* Links internos */}
          <div className="mt-12">
            <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-6">Leia também</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/guias/mdf-manaus" className="border border-[#e2e2e2] p-5 hover:border-[#002045] transition-colors">
                <p className="text-[#74777f] text-[10px] uppercase tracking-wider font-[var(--font-inter)] mb-2">Guia</p>
                <p className="text-[#002045] font-semibold font-[var(--font-inter)] text-sm">Por que o MDF não dura em Manaus</p>
              </Link>
              <Link href="/guias/revestimento-banheiro-manaus" className="border border-[#e2e2e2] p-5 hover:border-[#002045] transition-colors">
                <p className="text-[#74777f] text-[10px] uppercase tracking-wider font-[var(--font-inter)] mb-2">Guia</p>
                <p className="text-[#002045] font-semibold font-[var(--font-inter)] text-sm">Revestimento para banheiro em Manaus</p>
              </Link>
              <Link href="/guias/quanto-custa-revestimento-manaus" className="border border-[#e2e2e2] p-5 hover:border-[#002045] transition-colors">
                <p className="text-[#74777f] text-[10px] uppercase tracking-wider font-[var(--font-inter)] mb-2">Guia</p>
                <p className="text-[#002045] font-semibold font-[var(--font-inter)] text-sm">Quanto custa revestir uma parede em Manaus</p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
