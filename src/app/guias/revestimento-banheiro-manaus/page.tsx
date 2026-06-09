import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

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

const comparativo = [
  { material: "PFB Orbital", umidade: "0,2%", durabilidade: "10–15 anos", obra: "Não", mofo: "Não", instalacao: "2–3h", destaque: true },
  { material: "Azulejo / Cerâmica", umidade: "Impermeável*", durabilidade: "10–20 anos", obra: "Sim", mofo: "Rejunte sim", instalacao: "1–3 dias", destaque: false },
  { material: "MDF", umidade: "35%", durabilidade: "1–3 anos", obra: "Não", mofo: "Sim", instalacao: "1 dia", destaque: false },
  { material: "Papel de parede", umidade: "Alta", durabilidade: "1–2 anos", obra: "Não", mofo: "Sim", instalacao: "4–6h", destaque: false },
  { material: "PVC / Forro", umidade: "Baixa", durabilidade: "5–8 anos", obra: "Não", mofo: "Amarela", instalacao: "1 dia", destaque: false },
];

export default function GuiaBanheiroManaus() {
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
            <span className="text-white">Revestimento para Banheiro</span>
          </nav>
          <div className="max-w-3xl">
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
              Orbital Revestimentos · Guia Técnico · Manaus
            </p>
            <h1 className="font-[var(--font-noto-serif)] text-4xl lg:text-5xl font-normal leading-tight tracking-[-0.02em] mb-6">
              Revestimento para Banheiro em Manaus:<br />O Que Realmente Funciona
            </h1>
            <p className="text-white/70 text-lg font-[var(--font-inter)] leading-relaxed">
              Banheiro úmido, clima quente, umidade relativa acima de 80% o ano todo.
              A maioria dos materiais deteriora em 1 a 3 anos. Veja o que funciona
              de verdade — sem demolição, sem obra, com laudo técnico.
            </p>
          </div>
        </div>
      </section>

      {/* Antes/depois imagem */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-16">
            <div>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-4">
                O desafio do banheiro em Manaus
              </h2>
              <p className="text-[#43474e] font-[var(--font-inter)] leading-relaxed mb-4">
                Manaus tem a maior umidade relativa média do Brasil — acima de 80% ao longo do ano inteiro.
                Para um banheiro, isso significa que qualquer material poroso ou sensível à umidade vai
                deteriorar muito mais rápido do que em outras cidades.
              </p>
              <ul className="space-y-3 text-[#43474e] font-[var(--font-inter)] text-sm">
                {[
                  "MDF incha e mofar em 6–18 meses em banheiros de Manaus",
                  "Papel de parede descola e mancha com vapor",
                  "Rejunte de cerâmica acumula mofo mesmo com limpeza regular",
                  "Forro PVC amarela com o tempo e não aceita pintura",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-[#cc3333] font-bold mt-0.5 flex-shrink-0">✗</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[#74777f] text-[10px] uppercase tracking-wider font-[var(--font-inter)] mb-2">Antes</p>
                <Image src="/images/projetos/lavabo1-antes.jpeg" alt="Lavabo antes do revestimento PFB Orbital em Manaus" width={400} height={500} className="w-full object-cover" />
              </div>
              <div>
                <p className="text-[#3b6934] text-[10px] uppercase tracking-wider font-semibold font-[var(--font-inter)] mb-2">Depois</p>
                <Image src="/images/projetos/lavabo1-depois.png" alt="Lavabo revestido com PFB Orbital Brilliance Bianco Statuario em Manaus" width={400} height={500} className="w-full object-cover" />
              </div>
            </div>
          </div>

          {/* Comparativo */}
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-8">
            Comparativo: materiais para banheiro em Manaus
          </h2>
          <div className="overflow-x-auto mb-16">
            <table className="w-full text-sm font-[var(--font-inter)] border-collapse">
              <thead>
                <tr className="bg-[#002045] text-white">
                  <th className="px-4 py-3 text-left font-semibold">Material</th>
                  <th className="px-4 py-3 text-center font-semibold">Absorção de umidade</th>
                  <th className="px-4 py-3 text-center font-semibold">Durabilidade em Manaus</th>
                  <th className="px-4 py-3 text-center font-semibold">Precisa de obra?</th>
                  <th className="px-4 py-3 text-center font-semibold">Risco de mofo</th>
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
                    <td className="px-4 py-3 text-center">{row.umidade}</td>
                    <td className="px-4 py-3 text-center">{row.durabilidade}</td>
                    <td className="px-4 py-3 text-center">{row.obra}</td>
                    <td className="px-4 py-3 text-center">{row.mofo}</td>
                    <td className="px-4 py-3 text-center">{row.instalacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-2">* Azulejo impermeável mas rejunte acumula mofo sem manutenção periódica.</p>
          </div>

          {/* Por que o PFB funciona */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-16">
            <div>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-4">
                Por que o PFB Orbital funciona no banheiro
              </h2>
              <p className="text-[#43474e] font-[var(--font-inter)] leading-relaxed mb-6">
                O PFB (Placa Flexível de Bambu) foi testado em imersão total por 48 horas no INMETRO.
                Resultado: absorção de apenas <strong>0,2%</strong> — 175 vezes menos do que o MDF.
                A estrutura de bambu comprimido não oferece substrato para crescimento de mofo.
              </p>
              <ul className="space-y-4 text-[#43474e] font-[var(--font-inter)]">
                {[
                  { titulo: "Impermeável comprovado", desc: "0,2% de absorção em 48h de imersão — aprovado para áreas úmidas pelo INMETRO." },
                  { titulo: "Sem rejunte", desc: "Placa de 1,2m × 2,9m cobre toda a parede sem emendas que acumulem mofo." },
                  { titulo: "Anti-mofo natural", desc: "A estrutura do bambu comprimido não favorece o crescimento de fungos." },
                  { titulo: "Instalação a seco", desc: "Cola PU 40 diretamente na parede existente — sem demolição, sem poeira, sem água." },
                  { titulo: "Laudo técnico", desc: "ART nº AM20260593657, assinada por Eng. Civil com CREA registrado." },
                ].map((item) => (
                  <li key={item.titulo} className="flex items-start gap-3">
                    <span className="text-[#3b6934] font-bold mt-0.5 flex-shrink-0">✓</span>
                    <div><strong>{item.titulo}</strong> — {item.desc}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Image src="/images/projetos/lavabo2-antes.jpg" alt="Lavabo antes — paredes sem revestimento de qualidade em Manaus" width={400} height={500} className="w-full object-cover" />
              <Image src="/images/projetos/lavabo2-depois.png" alt="Lavabo depois — revestido com PFB Orbital Calacatta em Manaus" width={400} height={500} className="w-full object-cover" />
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-16">
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-8">
              Perguntas frequentes
            </h2>
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
              <h2 className="font-[var(--font-noto-serif)] text-2xl lg:text-3xl font-normal mb-2">
                Simule o custo do seu banheiro agora
              </h2>
              <p className="text-white/70 font-[var(--font-inter)] text-sm">
                Coloque as dimensões e receba o orçamento completo com material e mão de obra estimada.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Link href="/simulador" className="bg-white text-[#002045] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#f3f3f3] transition-colors text-center">
                Simular Orçamento
              </Link>
              <a href={WA("Olá, tenho interesse no revestimento para banheiro. Podem me ajudar?")} target="_blank" rel="noopener noreferrer"
                className="border border-white/60 text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-white/10 transition-colors text-center">
                Falar no WhatsApp
              </a>
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
              <Link href="/guias/revestimento-parede-manaus" className="border border-[#e2e2e2] p-5 hover:border-[#002045] transition-colors">
                <p className="text-[#74777f] text-[10px] uppercase tracking-wider font-[var(--font-inter)] mb-2">Guia</p>
                <p className="text-[#002045] font-semibold font-[var(--font-inter)] text-sm">Revestimento de parede em Manaus: guia completo</p>
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
