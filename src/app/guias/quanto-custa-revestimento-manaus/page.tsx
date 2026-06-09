import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedStat from "@/components/AnimatedStat";

const BASE_URL = "https://orbitalrevestimentos.com.br";
const WA = (msg: string) => `https://wa.me/5592988150149?text=${encodeURIComponent(msg)}`;

export const metadata: Metadata = {
  title: "Quanto Custa Revestir uma Parede em Manaus? Preços 2026",
  description:
    "Preços reais de revestimento de parede em Manaus em 2026: material, mão de obra e comparativo entre PFB, azulejo, MDF e papel de parede. Simule seu orçamento grátis.",
  keywords: [
    "quanto custa revestimento parede Manaus",
    "preço revestimento parede Manaus",
    "orçamento revestimento Manaus",
    "custo revestimento parede 2026",
    "valor revestimento Manaus",
    "preço PFB Manaus",
    "custo reforma parede Manaus",
    "quanto custa revestir sala Manaus",
    "quanto custa revestir banheiro Manaus",
    "preço placa revestimento Manaus",
    "orçamento revestimento parede",
    "quanto custa reforma parede",
  ],
  alternates: { canonical: `${BASE_URL}/guias/quanto-custa-revestimento-manaus` },
  openGraph: {
    title: "Quanto Custa Revestir uma Parede em Manaus? Preços 2026",
    description:
      "Preços reais de revestimento de parede em Manaus: PFB a partir de R$ 559/placa, cobre 3,48m². Comparativo completo com azulejo, MDF e papel de parede.",
    url: `${BASE_URL}/guias/quanto-custa-revestimento-manaus`,
    images: [{ url: `/images/catalogue/aplicacao-sala.jpeg`, width: 1200, height: 800, alt: "Sala revestida com PFB Orbital em Manaus" }],
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Quanto Custa Revestir uma Parede em Manaus? Preços 2026",
  description: "Preços reais e comparativo de custo de revestimento de parede em Manaus em 2026.",
  author: { "@type": "Organization", name: "Orbital Revestimentos" },
  publisher: {
    "@type": "Organization",
    name: "Orbital Revestimentos",
    logo: { "@type": "ImageObject", url: `${BASE_URL}/images/logo.png` },
  },
  datePublished: "2026-01-01",
  dateModified: "2026-06-01",
  mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/guias/quanto-custa-revestimento-manaus` },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Quanto custa revestir uma parede em Manaus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Com PFB Orbital, o custo de material é R$ 559 a R$ 649 por placa (1,2m × 2,9m = 3,48m²). Uma sala de 20m² de parede usa aproximadamente 6 placas — R$ 3.354 a R$ 3.894 de material. A mão de obra estimada fica em torno de R$ 50 a R$ 80 por placa, totalizando R$ 3.654 a R$ 4.374 com instalação.",
      },
    },
    {
      "@type": "Question",
      name: "Qual o preço do PFB Orbital em Manaus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O PFB Orbital custa: Linha Classic R$ 559/placa, Linha Brilliance R$ 589/placa, Linha Elegance R$ 649/placa. Cada placa mede 1,2m × 2,9m e cobre 3,48m². Use o simulador gratuito em orbitalrevestimentos.com.br/simulador para calcular o custo exato do seu ambiente.",
      },
    },
    {
      "@type": "Question",
      name: "Revestimento é mais barato que azulejo em Manaus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Depende do produto. O PFB Orbital tem custo de material similar ao azulejo de qualidade, mas a mão de obra é 3–5× mais barata (2–3h de instalação vs. 1–3 dias de pedreiro). No custo total da reforma — material + mão de obra + custo de obra — o PFB geralmente sai mais barato.",
      },
    },
    {
      "@type": "Question",
      name: "Existe financiamento para revestimento em Manaus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A Orbital Revestimentos disponibiliza condições de pagamento parcelado. Entre em contato via WhatsApp pelo número (92) 98815-0149 para verificar as opções disponíveis para o seu projeto.",
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
    { "@type": "ListItem", position: 3, name: "Quanto Custa Revestimento Manaus", item: `${BASE_URL}/guias/quanto-custa-revestimento-manaus` },
  ],
};

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const linhas = [
  { linha: "Linha Classic", acabamentos: "3 acabamentos — mármore fosco", preco: 559, detalhe: "Calacatta, Bege Travertino, Terracota" },
  { linha: "Linha Brilliance", acabamentos: "8 acabamentos — mármore polido", preco: 589, detalhe: "Statuario, Calacatta, Carrara e mais" },
  { linha: "Linha Elegance", acabamentos: "4 acabamentos — madeira texturizada", preco: 649, detalhe: "Imbuia, Carvalho, Louro Freijó" },
];

const ambientesCusto = [
  { nome: "Banheiro pequeno", m2: 6, placas: 2, matMin: 1118, matMax: 1298, moMin: 100, moMax: 160 },
  { nome: "Lavabo", m2: 4, placas: 2, matMin: 1118, matMax: 1298, moMin: 100, moMax: 160 },
  { nome: "Quarto (parede principal)", m2: 10, placas: 3, matMin: 1677, matMax: 1947, moMin: 150, moMax: 240 },
  { nome: "Sala (parede destaque)", m2: 14, placas: 5, matMin: 2795, matMax: 3245, moMin: 250, moMax: 400 },
  { nome: "Sala completa", m2: 40, placas: 12, matMin: 6708, matMax: 7788, moMin: 600, moMax: 960 },
  { nome: "Escritório (parede fundo)", m2: 12, placas: 4, matMin: 2236, matMax: 2596, moMin: 200, moMax: 320 },
];

const comparativoCusto = [
  { material: "PFB Orbital", precoM2: "R$ 161–R$ 187", maoObra: "R$ 50–80/placa", total10anos: "R$ 1×", obs: "Sem substituição necessária", destaque: true },
  { material: "Azulejo / Cerâmica", precoM2: "R$ 60–R$ 200", maoObra: "R$ 80–120/m²", total10anos: "R$ 1–2×", obs: "Rejunte precisa de manutenção", destaque: false },
  { material: "MDF lacado", precoM2: "R$ 120–R$ 180", maoObra: "R$ 50–80/m²", total10anos: "R$ 2–4×", obs: "Troca em 1–3 anos em Manaus", destaque: false },
  { material: "Papel de parede", precoM2: "R$ 40–R$ 120", maoObra: "R$ 20–40/m²", total10anos: "R$ 3–5×", obs: "Descola com umidade em Manaus", destaque: false },
];

const faqs = [
  { q: "Quanto custa revestir uma parede em Manaus?", a: "Com PFB Orbital, material de R$ 559 a R$ 649 por placa (3,48m²). Uma sala de 20m² usa aproximadamente 6 placas — R$ 3.354 a R$ 3.894 de material. Com mão de obra estimada: R$ 3.654 a R$ 4.374." },
  { q: "Qual o preço do PFB Orbital por m²?", a: "Linha Classic: R$ 161/m² · Linha Brilliance: R$ 169/m² · Linha Elegance: R$ 187/m². Cada placa cobre 3,48m² — use o simulador para calcular o custo exato do seu ambiente." },
  { q: "PFB é mais barato que azulejo em Manaus?", a: "O material tem custo similar ao azulejo de qualidade, mas a mão de obra é 3–5× mais barata (2–3h vs. 1–3 dias). No custo total da reforma — material + mão de obra + obras — o PFB geralmente sai mais barato." },
  { q: "Tem financiamento disponível?", a: "Sim. A Orbital disponibiliza condições de pagamento parcelado. Entre em contato via WhatsApp (92) 98815-0149 para verificar as opções para o seu projeto." },
];

const stats = [
  { value: "R$559", label: "Linha Classic / placa" },
  { value: "3,48", label: "m² por placa" },
  { value: "R$80", label: "MO estimada / placa" },
  { value: "10–15", label: "anos de durabilidade" },
];

export default function GuiaCustoManaus() {
  return (
    <div className="pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ── Hero full-bleed ── */}
      <section className="relative h-[80vh] min-h-[520px] max-h-[800px] flex items-end">
        <div className="absolute inset-0">
          <Image
            src="/images/catalogue/aplicacao-sala.jpeg"
            alt="Sala revestida com PFB Orbital — custo de revestimento em Manaus"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#001530]/95 via-[#001530]/55 to-[#001530]/10" />
        </div>
        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 lg:px-16 pb-14 lg:pb-24">
          <nav className="text-[#86a0cd] text-xs font-[var(--font-inter)] mb-6 flex items-center gap-2">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white/60">Guias</span>
            <span>/</span>
            <span className="text-white">Quanto Custa Revestimento em Manaus</span>
          </nav>
          <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
            Orbital Revestimentos · Preços 2026 · Manaus
          </p>
          <h1 className="font-[var(--font-noto-serif)] text-white text-4xl sm:text-5xl lg:text-6xl font-normal leading-tight tracking-[-0.02em] mb-6 max-w-3xl">
            Quanto Custa Revestir uma Parede em Manaus?<br />
            <em>Preços Reais 2026</em>
          </h1>
          <p className="text-white/70 text-base lg:text-lg font-[var(--font-inter)] leading-relaxed max-w-2xl">
            Tabelas de preço por placa e por m², custo estimado por ambiente, comparativo entre materiais e simulador de orçamento gratuito.
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

      {/* ── Preço por linha ── */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <ScrollReveal>
            <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">Preço do PFB Orbital em Manaus</p>
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal leading-tight mb-4 max-w-2xl">
              Cada placa mede 1,2m × 2,9m = 3,48m². Pronta-entrega em Manaus.
            </h2>
            <p className="text-[#74777f] font-[var(--font-inter)] mb-10 text-sm">Mão de obra estimada: R$ 50–80 por placa, via instalador parceiro.</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-[#e2e2e2]">
            {linhas.map((l, i) => (
              <ScrollReveal key={l.linha} delay={i * 80} className={`p-8 flex flex-col justify-between ${i < 2 ? "border-b sm:border-b-0 sm:border-r border-[#e2e2e2]" : ""}`}>
                <div>
                  <p className="text-[#74777f] text-[10px] uppercase tracking-wider font-[var(--font-inter)] mb-2">{l.acabamentos}</p>
                  <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-2">{l.linha}</h3>
                  <p className="font-[var(--font-noto-serif)] text-[#002045] text-4xl font-normal mb-1">
                    R$ {l.preco}<span className="text-base text-[#74777f]">/placa</span>
                  </p>
                  <p className="text-[#3b6934] font-semibold font-[var(--font-inter)] text-sm mb-3">= R$ {Math.round(l.preco / 3.48)}/m²</p>
                  <p className="text-[#74777f] font-[var(--font-inter)] text-xs">{l.detalhe}</p>
                </div>
                <Link href="/simulador" className="mt-6 text-[#002045] text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] border-b border-[#002045] pb-0.5 self-start hover:text-[#3b6934] hover:border-[#3b6934] transition-colors">
                  Simular com esta linha →
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Custo por ambiente (split) ── */}
      <section className="overflow-hidden bg-[#f5f5f3]">
        <div className="flex flex-col lg:flex-row min-h-[560px]">
          <div className="lg:w-1/2 relative min-h-[380px]">
            <Image
              src="/images/catalogue/onde-aplicar-main.jpeg"
              alt="Ambiente revestido com PFB Orbital — custo por cômodo em Manaus"
              fill
              className="object-cover"
            />
          </div>
          <div className="lg:w-1/2 bg-white px-6 lg:px-16 py-16 lg:py-28 flex items-start">
            <ScrollReveal className="w-full">
              <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">Custo estimado por ambiente</p>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl lg:text-3xl font-normal leading-tight mb-6">
                Quanto custa revestir cada cômodo?
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-[var(--font-inter)] border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#002045]">
                      <th className="py-2 text-left text-[#002045] font-semibold text-xs">Ambiente</th>
                      <th className="py-2 text-center text-[#002045] font-semibold text-xs">m²</th>
                      <th className="py-2 text-center text-[#002045] font-semibold text-xs">Placas</th>
                      <th className="py-2 text-right text-[#002045] font-semibold text-xs">Total c/ MO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ambientesCusto.map((a, i) => (
                      <tr key={a.nome} className={`border-b border-[#f0f0f0] ${i % 2 === 0 ? "" : "bg-[#fafafa]"}`}>
                        <td className="py-2.5 font-semibold text-[#002045] text-xs">{a.nome}</td>
                        <td className="py-2.5 text-center text-[#74777f] text-xs">{a.m2}</td>
                        <td className="py-2.5 text-center text-[#74777f] text-xs">{a.placas}</td>
                        <td className="py-2.5 text-right font-semibold text-[#002045] text-xs whitespace-nowrap">
                          {fmt(a.matMin + a.moMin)}–{fmt(a.matMax + a.moMax)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-3">
                Valores estimados. Use o{" "}
                <Link href="/simulador" className="text-[#002045] underline">simulador gratuito</Link>{" "}
                para cálculo exato com suas dimensões reais.
              </p>
              <Link href="/simulador" className="mt-6 inline-block bg-[#002045] text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-7 py-3.5 hover:bg-[#1a365d] transition-colors">
                Simular Orçamento Grátis
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Comparativo 10 anos ── */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <ScrollReveal>
            <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">Custo total em 10 anos</p>
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal leading-tight mb-4 max-w-2xl">
              Qual revestimento realmente sai mais barato em Manaus?
            </h2>
            <p className="text-[#43474e] font-[var(--font-inter)] mb-10 max-w-2xl">
              Em Manaus, materiais que parecem baratos inicialmente custam muito mais ao longo do tempo porque precisam ser trocados em 1–3 anos. O MDF pode ser trocado 3 a 5 vezes em 10 anos.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-[var(--font-inter)] border-collapse">
                <thead>
                  <tr className="bg-[#002045] text-white">
                    <th className="px-4 py-3 text-left font-semibold">Material</th>
                    <th className="px-4 py-3 text-center font-semibold">Preço/m²</th>
                    <th className="px-4 py-3 text-center font-semibold">Mão de obra</th>
                    <th className="px-4 py-3 text-center font-semibold">Custo em 10 anos</th>
                    <th className="px-4 py-3 text-left font-semibold">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativoCusto.map((row, i) => (
                    <tr key={row.material} className={row.destaque ? "bg-[#f0f6ee]" : i % 2 === 0 ? "bg-[#fafafa]" : "bg-white"}>
                      <td className="px-4 py-3 font-semibold text-[#002045]">
                        {row.destaque && <span className="text-[#3b6934] mr-1">★</span>}
                        {row.material}
                      </td>
                      <td className="px-4 py-3 text-center text-[#43474e]">{row.precoM2}</td>
                      <td className="px-4 py-3 text-center text-[#43474e]">{row.maoObra}</td>
                      <td className="px-4 py-3 text-center font-semibold text-[#002045]">{row.total10anos}</td>
                      <td className="px-4 py-3 text-[#74777f] text-xs">{row.obs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-[#002045] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <ScrollReveal>
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">Perguntas frequentes</p>
            <h2 className="font-[var(--font-noto-serif)] text-white text-3xl lg:text-4xl font-normal leading-tight mb-12 max-w-2xl">
              Tudo sobre preços de revestimento em Manaus.
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
              { href: "/guias/revestimento-parede-manaus", label: "Guia completo de revestimento de parede em Manaus", tag: "Guia" },
            ].map((link, i) => (
              <Link key={link.href} href={link.href} className={`p-6 hover:bg-[#f5f5f3] transition-colors ${i < 2 ? "border-b sm:border-b-0 sm:border-r border-[#e2e2e2]" : ""}`}>
                <p className="text-[#74777f] text-[10px] uppercase tracking-wider font-[var(--font-inter)] mb-2">{link.tag}</p>
                <p className="text-[#002045] font-semibold font-[var(--font-inter)] text-sm leading-snug">{link.label} →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA full-bleed ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/images/catalogue/aplicacao-cozinha.jpeg" alt="Ambiente revestido com PFB Orbital em Manaus" fill className="object-cover" />
          <div className="absolute inset-0 bg-[#001530]/85" />
        </div>
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-16 py-24 lg:py-32 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-[var(--font-noto-serif)] text-white text-3xl lg:text-5xl font-normal leading-tight mb-4">
              Calcule o custo exato do seu projeto.
            </h2>
            <p className="text-white/60 font-[var(--font-inter)]">
              Simulador gratuito: insira as dimensões e receba orçamento de material + mão de obra estimada.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link href="/simulador" className="bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-10 py-4 hover:bg-[#f3f3f3] transition-colors text-center">Simular Grátis</Link>
            <a href={WA("Olá, gostaria de um orçamento de revestimento para meu projeto.")} target="_blank" rel="noopener noreferrer" className="border border-white/50 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-10 py-4 hover:bg-white/10 transition-colors text-center">Pedir Orçamento</a>
          </div>
        </div>
      </section>
    </div>
  );
}
