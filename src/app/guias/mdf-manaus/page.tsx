import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const BASE_URL = "https://orbitalrevestimentos-site.vercel.app";
const WA = (msg: string) => `https://wa.me/5592988150149?text=${encodeURIComponent(msg)}`;

export const metadata: Metadata = {
  title: "MDF em Manaus: Por Que Não Dura e Qual a Melhor Alternativa",
  description:
    "O MDF absorve até 35% de umidade e deteriora em 2–3 anos no clima de Manaus. Entenda por que o MDF falha em ambientes úmidos e qual revestimento realmente dura — com dados técnicos.",
  keywords: [
    "MDF Manaus",
    "MDF para banheiro Manaus",
    "o MDF é resistente à água",
    "MDF incha com umidade",
    "MDF em clima úmido",
    "quanto tempo MDF dura Manaus",
    "alternativa ao MDF Manaus",
    "revestimento que substitui MDF",
    "MDF deteriora umidade",
    "melhor alternativa MDF parede",
    "revestimento para clima úmido Manaus",
    "PFB alternativa MDF",
  ],
  alternates: { canonical: `${BASE_URL}/guias/mdf-manaus` },
  openGraph: {
    title: "MDF em Manaus: Por Que Não Dura e Qual a Melhor Alternativa",
    description:
      "O MDF absorve 35% de umidade e dura 2–3 anos em Manaus. Veja os dados e conheça o material que substituiu o MDF em centenas de projetos no Amazonas.",
    url: `${BASE_URL}/guias/mdf-manaus`,
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "MDF em Manaus: Por Que Não Dura e Qual a Melhor Alternativa",
  description:
    "O MDF absorve até 35% de umidade e deteriora em 2–3 anos no clima de Manaus. Entenda por que o MDF falha e qual material é a alternativa permanente.",
  author: { "@type": "Organization", name: "Orbital Revestimentos" },
  publisher: {
    "@type": "Organization",
    name: "Orbital Revestimentos",
    logo: { "@type": "ImageObject", url: `${BASE_URL}/images/logo.png` },
  },
  datePublished: "2026-01-01",
  dateModified: "2026-05-20",
  mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/guias/mdf-manaus` },
  image: `${BASE_URL}/images/catalogue/pfb-mdf-48h.png`,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "O MDF é resistente à água?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Não. O MDF absorve até 35% do seu peso em umidade em 48 horas de exposição. No clima úmido de Manaus, com umidade relativa superior a 80%, o MDF incha, empena e se deteriora em 2 a 3 anos.",
      },
    },
    {
      "@type": "Question",
      name: "Quanto tempo o MDF dura em Manaus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Em média 2 a 3 anos. O clima do Amazonas, com umidade relativa acima de 80% ao longo do ano, acelera drasticamente a absorção de umidade pelo MDF, causando inchaço, descascamento e deterioração estrutural.",
      },
    },
    {
      "@type": "Question",
      name: "Qual é a melhor alternativa ao MDF em Manaus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O PFB (Placa Flexível de Bambu) da Orbital Revestimentos. Com absorção de apenas 0,2% de umidade em 48 horas, é impermeável, anti-mofo, anti-cupim e não propaga chamas. Instalado em 2–3 horas por cômodo, com ART de Engenheiro Civil.",
      },
    },
    {
      "@type": "Question",
      name: "O MDF pode ser usado em banheiros em Manaus?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Não é recomendado. O MDF é altamente suscetível à umidade. Em banheiros de Manaus, ele absorve vapor, incha e mofar em poucos meses. A alternativa correta é o PFB Orbital, aprovado para uso em áreas úmidas com laudo técnico.",
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
    {
      "@type": "ListItem",
      position: 3,
      name: "MDF em Manaus",
      item: `${BASE_URL}/guias/mdf-manaus`,
    },
  ],
};

export default function GuiaMdfManaus() {
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
            <span>Guias</span>
            <span>/</span>
            <span className="text-white">MDF em Manaus</span>
          </nav>
          <div className="max-w-3xl">
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
              Guia técnico · Revestimentos Manaus
            </p>
            <h1 className="font-[var(--font-noto-serif)] text-4xl lg:text-5xl font-normal leading-tight tracking-[-0.02em] mb-6">
              MDF em Manaus: Por Que Não Dura e Qual a Melhor Alternativa
            </h1>
            <p className="text-white/70 text-lg font-[var(--font-inter)] leading-relaxed">
              O MDF absorve até 35% de umidade em 48 horas. No clima do Amazonas,
              com umidade relativa acima de 80%, isso significa inchamento, mofo e
              deterioração em menos de 3 anos. Veja os dados e a alternativa que
              realmente dura.
            </p>
          </div>
        </div>
      </section>

      {/* Article body */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-[800px] mx-auto px-8 lg:px-16">

          {/* Q1 */}
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-4">
            O MDF é resistente à água?
          </h2>
          <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed mb-6">
            Não. O MDF (Medium Density Fiberboard) é um painel de partículas de
            madeira comprimidas com resina de formol. Por natureza, absorve
            umidade com facilidade. Em testes padronizados de imersão em água por
            48 horas, o MDF convencional absorve <strong className="text-[#002045]">até 35% do seu peso em água</strong>.
          </p>
          <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed mb-10">
            Isso significa que uma chapa de MDF de 10 kg pode terminar o teste
            pesando 13,5 kg — completamente deformada, com as fibras separadas e
            sem integridade estrutural.
          </p>

          {/* Water test images */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            {[
              { src: "/images/catalogue/pfb-mdf-0h.png",  time: "0h",  caption: "Início — ambos os painéis em condições normais" },
              { src: "/images/catalogue/pfb-mdf-24h.png", time: "24h", caption: "24h — MDF começa a inchar e perder estrutura" },
              { src: "/images/catalogue/pfb-mdf-48h.png", time: "48h", caption: "48h — MDF deteriorado. PFB permanece intacto." },
            ].map(({ src, time, caption }) => (
              <div key={time}>
                <div className="relative aspect-[3/4] overflow-hidden mb-2">
                  <Image src={src} alt={`PFB vs MDF teste de água — ${time}`} fill className="object-cover object-top" />
                  <div className="absolute top-3 left-3 bg-white text-[#1e212a] text-xs font-bold font-[var(--font-inter)] px-2 py-1">
                    {time}
                  </div>
                </div>
                <p className="text-[#74777f] text-xs font-[var(--font-inter)] leading-snug">{caption}</p>
              </div>
            ))}
          </div>

          {/* Data callout */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            <div className="bg-[#f3f9f3] border-l-4 border-[#3b6934] px-6 py-5">
              <p className="text-[#3b6934] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">PFB Orbital</p>
              <p className="font-[var(--font-noto-serif)] text-[#002045] text-4xl font-normal mb-1">0,2%</p>
              <p className="text-[#43474e] text-sm font-[var(--font-inter)]">absorção em 48h de imersão total</p>
            </div>
            <div className="bg-[#fff3f3] border-l-4 border-[#c0392b] px-6 py-5">
              <p className="text-[#c0392b] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">MDF Convencional</p>
              <p className="font-[var(--font-noto-serif)] text-[#a03030] text-4xl font-normal mb-1">~35%</p>
              <p className="text-[#74777f] text-sm font-[var(--font-inter)]">absorção — incha, descola e perde estrutura</p>
            </div>
          </div>

          {/* Q2 */}
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-4">
            Quanto tempo o MDF dura em Manaus?
          </h2>
          <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed mb-4">
            Em média, <strong className="text-[#002045]">2 a 3 anos</strong>. Manaus registra umidade relativa média
            superior a 80% ao longo do ano inteiro — uma das mais altas do Brasil.
            Nesse ambiente, o MDF absorve umidade de forma contínua, mesmo sem
            contato direto com água.
          </p>
          <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed mb-10">
            O resultado é um ciclo repetitivo e caro: o material incha,
            descasca, mofar por dentro e precisa ser trocado. Arquitetos e
            designers de interiores em Manaus conhecem bem esse problema —
            obras que ficam bonitas por 1 ano e exigem reforma em 2.
          </p>

          {/* Q3 */}
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-4">
            O MDF pode ser usado em banheiros ou lavabos em Manaus?
          </h2>
          <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed mb-4">
            Não é recomendado. Em ambientes com vapor d'água constante —
            como banheiros, lavabos e cozinhas — o MDF acelera drasticamente
            a absorção de umidade. Além do inchaço estrutural, o MDF serve
            de substrato para fungos e mofo, criando um problema de saúde
            além do estético.
          </p>
          <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed mb-10">
            Existem versões de MDF "hidrófugo" (verde), mas mesmo elas não
            são impermeáveis — apenas retardam a absorção. No clima do
            Amazonas, essa diferença não é suficiente para garantir
            durabilidade real.
          </p>

          {/* Q4 */}
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-4">
            Qual é a melhor alternativa ao MDF para revestimento em Manaus?
          </h2>
          <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed mb-6">
            O <strong className="text-[#002045]">PFB (Placa Flexível de Bambu)</strong> da Orbital Revestimentos é a
            alternativa permanente ao MDF desenvolvida especificamente para
            climas úmidos. Com substrato de fibra de bambu e acabamento
            fotorrealista de pedra ou madeira, combina performance técnica
            superior com estética arquitetônica de alto padrão.
          </p>

          <div className="space-y-3 mb-10">
            {[
              { label: "Absorção de umidade",   pfb: "0,2% em 48h",            mdf: "Até 35% em 48h" },
              { label: "Durabilidade em Manaus", pfb: "10+ anos",               mdf: "2–3 anos" },
              { label: "Resistência ao mofo",    pfb: "Anti-mofo por natureza", mdf: "Suscetível" },
              { label: "Instalação",             pfb: "2–3h por cômodo",        mdf: "Dias (obra pesada)" },
              { label: "Peso",                   pfb: "3,5 kg/m²",              mdf: "11 kg/m²" },
              { label: "Uso em áreas úmidas",    pfb: "Aprovado com laudo",     mdf: "Não recomendado" },
            ].map(({ label, pfb, mdf }) => (
              <div key={label} className="grid grid-cols-3 gap-4 border-b border-[#eeeeee] pb-3">
                <span className="text-[#43474e] text-sm font-medium font-[var(--font-inter)]">{label}</span>
                <span className="text-[#002045] text-sm font-semibold font-[var(--font-inter)]">{pfb}</span>
                <span className="text-[#74777f] text-sm font-[var(--font-inter)]">{mdf}</span>
              </div>
            ))}
          </div>

          <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed mb-12">
            O PFB é instalado com cola PU diretamente sobre a parede ou forro
            existente — sem demolição, sem poeira, sem obra pesada. Um cômodo
            padrão fica pronto em 2 a 3 horas. Com ART de Engenheiro Civil
            (CREA), é aceito em projetos residenciais, comerciais e náuticos.
          </p>

          {/* CTA block */}
          <div className="bg-[#002045] px-8 py-10 text-center">
            <p className="text-[#86a0cd] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
              Exclusivo em Manaus
            </p>
            <h3 className="font-[var(--font-noto-serif)] text-white text-2xl font-normal mb-4">
              Conheça o PFB Orbital — a alternativa definitiva ao MDF.
            </h3>
            <p className="text-white/60 text-sm font-[var(--font-inter)] mb-8 max-w-lg mx-auto">
              3 linhas exclusivas, 15 acabamentos, pronta-entrega em Manaus.
              Veja o catálogo ou fale com a nossa equipe.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/tecnologia"
                className="bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:bg-[#f3f3f3] transition-colors"
              >
                Ver comparativo técnico completo
              </Link>
              <a
                href={WA("Olá! Li o guia sobre MDF em Manaus e gostaria de saber mais sobre o PFB Orbital.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#3b6934] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:bg-[#2d5228] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Falar no WhatsApp
              </a>
              <Link
                href="/produtos"
                className="border border-white/40 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-7 py-4 hover:bg-white/10 transition-colors"
              >
                Ver catálogo de acabamentos
              </Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
