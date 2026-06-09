import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedStat from "@/components/AnimatedStat";

const BASE_URL = "https://orbitalrevestimentos.com.br";
const WA = (msg: string) => `https://wa.me/5592988150149?text=${encodeURIComponent(msg)}`;

export const metadata: Metadata = {
  title: "Revestimento para Banheiro em Manaus — O Que Realmente Funciona",
  description:
    "Descubra qual revestimento de parede funciona em banheiros de Manaus: impermeável, anti-mofo, instalado em 2 horas. Comparativo técnico com azulejo, MDF e papel de parede.",
  keywords: [
    "revestimento para banheiro Manaus",
    "revestimento banheiro impermeável",
    "revestimento parede banheiro",
    "como revestir banheiro Manaus",
    "revestimento lavabo Manaus",
    "revestimento box ducha",
    "alternativa azulejo banheiro",
    "revestimento sem obra banheiro",
    "revestimento anti-mofo banheiro",
    "revestimento banheiro sem demolição",
    "PFB banheiro Manaus",
    "placa revestimento banheiro Manaus",
  ],
  alternates: { canonical: `${BASE_URL}/guias/revestimento-banheiro-manaus` },
  openGraph: {
    title: "Revestimento para Banheiro em Manaus — O Que Realmente Funciona",
    description:
      "Comparativo técnico: azulejo, MDF, papel de parede e PFB em banheiros de Manaus. Qual aguenta o clima úmido do Amazonas sem mofo, sem obra e sem demolição.",
    url: `${BASE_URL}/guias/revestimento-banheiro-manaus`,
    images: [{ url: `/images/projetos/lavabo1-depois.png`, width: 1200, height: 800, alt: "Lavabo revestido com PFB Orbital em Manaus" }],
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Revestimento para Banheiro em Manaus — O Que Realmente Funciona",
  description: "Comparativo técnico entre azulejo, MDF, papel de parede e PFB para revestimento de banheiro em Manaus.",
  author: { "@type": "Organization", name: "Orbital Revestimentos" },
  publisher: {
    "@type": "Organization",
    name: "Orbital Revestimentos",
    logo: { "@type": "ImageObject", url: `${BASE_URL}/images/logo.png` },
  },
  datePublished: "2026-01-01",
  dateModified: "2026-06-01",
  mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/guias/revestimento-banheiro-manaus` },
  image: `${BASE_URL}/images/projetos/lavabo1-depois.png`,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Qual o melhor revestimento para banheiro em Manaus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O PFB (Placa Flexível de Bambu) da Orbital Revestimentos é a melhor opção para banheiros em Manaus. Absorve apenas 0,2% de umidade em 48 horas (contra 35% do MDF), é anti-mofo, impermeável e instalado sem demolição em 2–3 horas.",
      },
    },
    {
      "@type": "Question",
      name: "Posso revestir o banheiro sem demolição em Manaus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim. O PFB Orbital é aplicado diretamente sobre a parede existente com cola PU 40, sem quebra, sem poeira e sem interditar o banheiro. A instalação de um banheiro padrão leva 2 a 3 horas.",
      },
    },
    {
      "@type": "Question",
      name: "O revestimento PFB aguenta umidade de banheiro?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim. O PFB foi testado em imersão total por 48 horas com absorção de apenas 0,2%, aprovado pelo INMETRO. É indicado para banheiros, lavabos, box e ducha — com laudo de Engenheiro Civil (ART nº AM20260593657).",
      },
    },
    {
      "@type": "Question",
      name: "Quanto custa revestir um banheiro em Manaus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O custo depende da metragem. Uma placa PFB Orbital (1,2m × 2,9m = 3,48m²) custa entre R$ 559 e R$ 649. Um banheiro pequeno de 6m² usa aproximadamente 2 placas — total de R$ 1.118 a R$ 1.298 de material. Use o simulador em orbitalrevestimentos.com.br/simulador para um orçamento exato.",
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
    { "@type": "ListItem", position: 3, name: "Revestimento para Banheiro em Manaus", item: `${BASE_URL}/guias/revestimento-banheiro-manaus` },
  ],
};

const stats = [
  { value: "0,2%", label: "absorção de umidade" },
  { value: "175×", label: "menos que MDF" },
  { value: "2–3h", label: "instalação por banheiro" },
  { value: "0", label: "demolição necessária" },
];

const comparativo = [
  { material: "PFB Orbital", umidade: "0,2%", durabilidade: "10–15 anos", obra: "Não", mofo: "Não", instalacao: "2–3h", destaque: true },
  { material: "Azulejo / Cerâmica", umidade: "Impermeável*", durabilidade: "10–20 anos", obra: "Sim", mofo: "Rejunte sim", instalacao: "1–3 dias", destaque: false },
  { material: "MDF", umidade: "35%", durabilidade: "1–3 anos", obra: "Não", mofo: "Sim", instalacao: "1 dia", destaque: false },
  { material: "Papel de parede", umidade: "Alta", durabilidade: "1–2 anos", obra: "Não", mofo: "Sim", instalacao: "4–6h", destaque: false },
  { material: "PVC / Forro", umidade: "Baixa", durabilidade: "5–8 anos", obra: "Não", mofo: "Amarela", instalacao: "1 dia", destaque: false },
];

const faqs = [
  { q: "Qual o melhor revestimento para banheiro em Manaus?", a: "O PFB Orbital (Placa Flexível de Bambu). Absorve apenas 0,2% de umidade em 48h — 175× menos que o MDF. Anti-mofo, impermeável e instalado sem demolição em 2–3 horas." },
  { q: "Posso revestir o banheiro sem demolição?", a: "Sim. O PFB é colado diretamente sobre a parede existente com cola PU 40, sem quebra, sem poeira, sem interditar o banheiro. Funciona sobre reboco, tinta, cerâmica." },
  { q: "O PFB aguenta umidade do box e ducha?", a: "Sim. Testado em imersão total por 48h com apenas 0,2% de absorção — aprovado pelo INMETRO. Com laudo de Engenheiro Civil (ART nº AM20260593657) para uso em áreas úmidas." },
  { q: "Quanto custa revestir um banheiro em Manaus?", a: "Um banheiro pequeno de 6m² usa aproximadamente 2 placas — R$ 1.118 a R$ 1.298 de material. Use o simulador gratuito para calcular o seu ambiente exato." },
];

export default function GuiaBanheiroManaus() {
  return (
    <div className="pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ── Hero full-bleed ── */}
      <section className="relative h-[80vh] min-h-[520px] max-h-[800px] flex items-end">
        <div className="absolute inset-0">
          <Image
            src="/images/catalogue/lavabo-real.jpeg"
            alt="Lavabo revestido com PFB Orbital Brilliance Bianco Statuario — banheiro em Manaus"
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
            <span className="text-white">Revestimento para Banheiro em Manaus</span>
          </nav>
          <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
            Orbital Revestimentos · Guia Técnico · Manaus
          </p>
          <h1 className="font-[var(--font-noto-serif)] text-white text-4xl sm:text-5xl lg:text-6xl font-normal leading-tight tracking-[-0.02em] mb-6 max-w-3xl">
            Revestimento para Banheiro em Manaus:<br />
            <em>O Que Realmente Funciona</em>
          </h1>
          <p className="text-white/70 text-base lg:text-lg font-[var(--font-inter)] leading-relaxed max-w-2xl">
            Banheiro úmido, clima quente, umidade acima de 80% o ano todo. A maioria dos materiais deteriora em 1–3 anos. Veja o que funciona de verdade.
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

      {/* ── Desafio do banheiro em Manaus ── */}
      <section className="overflow-hidden bg-white">
        <div className="flex flex-col lg:flex-row min-h-[520px]">
          <div className="lg:w-1/2 bg-[#002045] px-6 lg:px-16 py-16 lg:py-28 flex items-center">
            <ScrollReveal className="max-w-lg">
              <p className="text-[#86a0cd] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">O desafio amazônico</p>
              <h2 className="font-[var(--font-noto-serif)] text-white text-3xl lg:text-4xl font-normal leading-tight mb-6">
                Por que o banheiro em Manaus é o ambiente mais difícil.
              </h2>
              <p className="text-white/65 font-[var(--font-inter)] leading-relaxed mb-6">
                Manaus tem umidade relativa acima de 80% o ano inteiro. Em um banheiro — com vapor constante, água no box e temperatura elevada — qualquer material poroso ou sensível à umidade vai deteriorar muito mais rápido do que em outras cidades.
              </p>
              <ul className="space-y-3">
                {[
                  "MDF incha e mofar em 6–18 meses em banheiros",
                  "Papel de parede descola com vapor em semanas",
                  "Rejunte de cerâmica acumula mofo mesmo com limpeza",
                  "Forro PVC amarela e não aceita repintura",
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-white/55 font-[var(--font-inter)] text-sm">
                    <span className="text-red-400 font-bold flex-shrink-0">✗</span>{item}
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          </div>
          <div className="lg:w-1/2 relative min-h-[380px]">
            <Image
              src="/images/projetos/lavabo1-depois.png"
              alt="Lavabo revestido com PFB Orbital Brilliance em Manaus"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Antes e Depois ── */}
      <section className="bg-[#f5f5f3] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <ScrollReveal>
            <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">Transformação real</p>
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal leading-tight mb-12 max-w-2xl">
              Lavabos e banheiros revestidos com PFB Orbital em Manaus.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#e2e2e2]">
            {[
              { before: "/images/projetos/lavabo1-antes.jpeg", after: "/images/projetos/lavabo1-depois.png", label: "Lavabo Brilliance Bianco Statuario" },
              { before: "/images/projetos/lavabo2-antes.jpg", after: "/images/projetos/lavabo2-depois.png", label: "Lavabo Brilliance Calacatta" },
              { before: "/images/projetos/lavabo3-antes.png", after: "/images/projetos/lavabo3-depois.jpg", label: "Banheiro Classic Calacatta" },
              { before: "/images/projetos/lavabo4-antes.jpeg", after: "/images/projetos/lavabo4-depois.jpeg", label: "Lavabo Elegance Carvalho" },
            ].map((item, i) => (
              <ScrollReveal key={item.label} delay={i * 80} className={`flex flex-col ${i < 3 ? "border-b sm:border-b-0 sm:border-r border-[#e2e2e2]" : ""}`}>
                <div className="relative h-64 overflow-hidden">
                  <Image src={item.after} alt={item.label} fill className="object-cover object-top transition-transform duration-700 hover:scale-105" />
                </div>
                <div className="bg-white p-4">
                  <p className="text-[#002045] font-semibold font-[var(--font-inter)] text-sm">{item.label}</p>
                  <p className="text-[#74777f] font-[var(--font-inter)] text-xs mt-1">Instalado em Manaus · sem obra</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Por que o PFB funciona ── */}
      <section className="overflow-hidden bg-white">
        <div className="flex flex-col lg:flex-row-reverse min-h-[560px]">
          <div className="lg:w-1/2 relative min-h-[380px]">
            <Image
              src="/images/catalogue/product-anatomy.png"
              alt="Anatomia do PFB Orbital — 5 camadas impermeáveis para banheiro"
              fill
              className="object-cover"
            />
          </div>
          <div className="lg:w-1/2 bg-[#f9f9f7] px-6 lg:px-16 py-16 lg:py-28 flex items-center">
            <ScrollReveal className="max-w-lg">
              <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">PFB Orbital</p>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal leading-tight mb-6">
                Aprovado para áreas úmidas pelo INMETRO.
              </h2>
              <p className="text-[#43474e] font-[var(--font-inter)] leading-relaxed mb-8">
                O PFB foi testado em imersão total por 48 horas. Resultado: absorção de apenas <strong>0,2%</strong> — 175× menos que o MDF. A estrutura de bambu comprimido não oferece substrato para crescimento de mofo.
              </p>
              <ul className="space-y-4">
                {[
                  { t: "Impermeável comprovado", d: "0,2% absorção em 48h — aprovado para banheiros, box e ducha" },
                  { t: "Sem rejunte", d: "Placa de 3,48m² sem emendas que acumulem mofo" },
                  { t: "Anti-mofo natural", d: "Bambu comprimido não favorece crescimento de fungos" },
                  { t: "Instalação a seco", d: "Cola PU 40 direto na parede — 2 a 3 horas, sem demolição" },
                  { t: "Laudo técnico", d: "ART nº AM20260593657 — Eng. Civil CREA registrado" },
                ].map(item => (
                  <li key={item.t} className="flex items-start gap-3">
                    <span className="text-[#3b6934] font-bold flex-shrink-0 mt-0.5">✓</span>
                    <div className="font-[var(--font-inter)] text-sm">
                      <strong className="text-[#002045]">{item.t}</strong>
                      <span className="text-[#74777f]"> — {item.d}</span>
                    </div>
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

      {/* ── Comparativo ── */}
      <section className="bg-[#f5f5f3] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <ScrollReveal>
            <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">Comparativo técnico</p>
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal leading-tight mb-10 max-w-2xl">
              Materiais para banheiro em Manaus: qual aguenta o clima?
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-[var(--font-inter)] border-collapse bg-white">
                <thead>
                  <tr className="bg-[#002045] text-white">
                    <th className="px-4 py-3 text-left font-semibold">Material</th>
                    <th className="px-4 py-3 text-center font-semibold">Absorção</th>
                    <th className="px-4 py-3 text-center font-semibold">Durabilidade</th>
                    <th className="px-4 py-3 text-center font-semibold">Obra?</th>
                    <th className="px-4 py-3 text-center font-semibold">Mofo?</th>
                    <th className="px-4 py-3 text-center font-semibold">Instalação</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativo.map((row) => (
                    <tr key={row.material} className={row.destaque ? "bg-[#f0f6ee]" : "border-b border-[#f0f0f0]"}>
                      <td className="px-4 py-3 font-semibold text-[#002045]">
                        {row.destaque && <span className="text-[#3b6934] mr-1">★</span>}
                        {row.material}
                      </td>
                      <td className="px-4 py-3 text-center text-[#43474e]">{row.umidade}</td>
                      <td className="px-4 py-3 text-center text-[#43474e]">{row.durabilidade}</td>
                      <td className="px-4 py-3 text-center text-[#43474e]">{row.obra}</td>
                      <td className="px-4 py-3 text-center text-[#43474e]">{row.mofo}</td>
                      <td className="px-4 py-3 text-center text-[#43474e]">{row.instalacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-2">* Azulejo impermeável, mas rejunte acumula mofo sem manutenção periódica.</p>
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
              Tudo sobre revestimento para banheiro em Manaus.
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
              { href: "/guias/revestimento-parede-manaus", label: "Revestimento de parede em Manaus: guia completo", tag: "Guia" },
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

      {/* ── CTA full-bleed ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/images/catalogue/aplicacao-sala.jpeg" alt="Ambiente revestido com PFB Orbital em Manaus" fill className="object-cover" />
          <div className="absolute inset-0 bg-[#001530]/85" />
        </div>
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-16 py-24 lg:py-32 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-[var(--font-noto-serif)] text-white text-3xl lg:text-5xl font-normal leading-tight mb-4">
              Simule o custo do seu banheiro agora.
            </h2>
            <p className="text-white/60 font-[var(--font-inter)]">
              Coloque as dimensões e receba o orçamento completo — material e mão de obra estimada.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link href="/simulador" className="bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-10 py-4 hover:bg-[#f3f3f3] transition-colors text-center">Simular Grátis</Link>
            <a href={WA("Olá, tenho interesse no revestimento para banheiro. Podem me ajudar?")} target="_blank" rel="noopener noreferrer" className="border border-white/50 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-10 py-4 hover:bg-white/10 transition-colors text-center">Falar no WhatsApp</a>
          </div>
        </div>
      </section>
    </div>
  );
}
