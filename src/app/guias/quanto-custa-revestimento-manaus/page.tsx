import type { Metadata } from "next";
import Link from "next/link";

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

const ambientesCusto = [
  { nome: "Banheiro pequeno", m2: 6, placas: 2, matMin: 1118, matMax: 1298, moMin: 100, moMax: 160 },
  { nome: "Lavabo", m2: 4, placas: 2, matMin: 1118, matMax: 1298, moMin: 100, moMax: 160 },
  { nome: "Quarto (parede principal)", m2: 10, placas: 3, matMin: 1677, matMax: 1947, moMin: 150, moMax: 240 },
  { nome: "Sala (parede destaque)", m2: 14, placas: 5, matMin: 2795, matMax: 3245, moMin: 250, moMax: 400 },
  { nome: "Sala completa", m2: 40, placas: 12, matMin: 6708, matMax: 7788, moMin: 600, moMax: 960 },
  { nome: "Escritório (parede fundo)", m2: 12, placas: 4, matMin: 2236, matMax: 2596, moMin: 200, moMax: 320 },
];

const comparativoCusto = [
  { material: "PFB Orbital", precoM2: "R$ 161–R$ 187", maoObra: "R$ 50–80/placa", total10anos: "R$ 1×", obs: "Sem substituição necessária" },
  { material: "Azulejo / Cerâmica", precoM2: "R$ 60–R$ 200", maoObra: "R$ 80–120/m²", total10anos: "R$ 1–2×", obs: "Rejunte precisa de manutenção" },
  { material: "MDF lacado", precoM2: "R$ 120–R$ 180", maoObra: "R$ 50–80/m²", total10anos: "R$ 2–4×", obs: "Troca em 1–3 anos em Manaus" },
  { material: "Papel de parede", precoM2: "R$ 40–R$ 120", maoObra: "R$ 20–40/m²", total10anos: "R$ 3–5×", obs: "Descola com umidade em Manaus" },
];

export default function GuiaCustoManaus() {
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
            <span className="text-white">Quanto Custa Revestimento em Manaus</span>
          </nav>
          <div className="max-w-3xl">
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
              Orbital Revestimentos · Preços 2026 · Manaus
            </p>
            <h1 className="font-[var(--font-noto-serif)] text-4xl lg:text-5xl font-normal leading-tight tracking-[-0.02em] mb-6">
              Quanto Custa Revestir uma Parede em Manaus?
            </h1>
            <p className="text-white/70 text-lg font-[var(--font-inter)] leading-relaxed">
              Preços reais de material e mão de obra para revestimento de parede em Manaus em 2026.
              Tabelas por ambiente, comparativo entre materiais e simulador de orçamento gratuito.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">

          {/* Preço por placa */}
          <div className="mb-16">
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-2">
              Preço do PFB Orbital em Manaus
            </h2>
            <p className="text-[#43474e] font-[var(--font-inter)] mb-8">Cada placa mede <strong>1,2m × 2,9m = 3,48m²</strong>. Preços em pronta-entrega em Manaus.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { linha: "Linha Classic", acabamentos: "3 acabamentos — mármore fosco", preco: 559, detalhe: "Calacatta, Bege Travertino, Terracota" },
                { linha: "Linha Brilliance", acabamentos: "8 acabamentos — mármore polido", preco: 589, detalhe: "Statuario, Calacatta, Carrara e mais" },
                { linha: "Linha Elegance", acabamentos: "4 acabamentos — madeira texturizada", preco: 649, detalhe: "Imbuia, Carvalho, Louro Freijó" },
              ].map((l) => (
                <div key={l.linha} className="border border-[#e2e2e2] p-6">
                  <p className="text-[#74777f] text-[10px] uppercase tracking-wider font-[var(--font-inter)] mb-2">{l.acabamentos}</p>
                  <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-1">{l.linha}</h3>
                  <p className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-2">R$ {l.preco}<span className="text-base text-[#74777f]">/placa</span></p>
                  <p className="text-[#74777f] font-[var(--font-inter)] text-xs">{l.detalhe}</p>
                  <p className="text-[#3b6934] font-[var(--font-inter)] text-xs mt-2 font-semibold">= R$ {Math.round(l.preco / 3.48)}/m²</p>
                </div>
              ))}
            </div>
            <p className="text-[#74777f] text-sm font-[var(--font-inter)]">
              * Mão de obra estimada: R$ 50–80 por placa (instalador parceiro em Manaus). A Orbital Revestimentos fornece o material; a instalação é realizada por profissional indicado.
            </p>
          </div>

          {/* Tabela por ambiente */}
          <div className="mb-16">
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-8">
              Custo estimado por ambiente em Manaus
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-[var(--font-inter)] border-collapse">
                <thead>
                  <tr className="bg-[#002045] text-white">
                    <th className="px-4 py-3 text-left font-semibold">Ambiente</th>
                    <th className="px-4 py-3 text-center font-semibold">Área aprox.</th>
                    <th className="px-4 py-3 text-center font-semibold">Placas</th>
                    <th className="px-4 py-3 text-center font-semibold">Material</th>
                    <th className="px-4 py-3 text-center font-semibold">Total (com MO est.)</th>
                  </tr>
                </thead>
                <tbody>
                  {ambientesCusto.map((a, i) => (
                    <tr key={a.nome} className={i % 2 === 0 ? "bg-[#fafafa]" : "bg-white"}>
                      <td className="px-4 py-3 font-semibold text-[#002045]">{a.nome}</td>
                      <td className="px-4 py-3 text-center text-[#43474e]">{a.m2} m²</td>
                      <td className="px-4 py-3 text-center text-[#43474e]">{a.placas}</td>
                      <td className="px-4 py-3 text-center text-[#43474e]">{fmt(a.matMin)} – {fmt(a.matMax)}</td>
                      <td className="px-4 py-3 text-center font-semibold text-[#002045]">{fmt(a.matMin + a.moMin)} – {fmt(a.matMax + a.moMax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[#74777f] text-xs font-[var(--font-inter)] mt-3">Valores estimados. Use o <Link href="/simulador" className="text-[#002045] underline">simulador de orçamento</Link> para cálculo exato baseado nas suas dimensões reais.</p>
          </div>

          {/* Comparativo 10 anos */}
          <div className="mb-16">
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl font-normal mb-4">
              Custo total em 10 anos: qual sai mais barato?
            </h2>
            <p className="text-[#43474e] font-[var(--font-inter)] mb-8">
              Em Manaus, materiais que parecem mais baratos inicialmente custam muito mais ao longo do tempo
              porque precisam ser trocados em 1–3 anos. O MDF, por exemplo, pode ser trocado 3 a 5 vezes
              em 10 anos — tornando seu custo real 3–5× maior do que o PFB.
            </p>
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
                    <tr key={row.material} className={i === 0 ? "bg-[#f0f6ee]" : i % 2 === 0 ? "bg-[#fafafa]" : "bg-white"}>
                      <td className="px-4 py-3 font-semibold text-[#002045]">
                        {i === 0 && <span className="text-[#3b6934] mr-1">★</span>}
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

          {/* CTA simulador */}
          <div className="bg-[#002045] text-white p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <h2 className="font-[var(--font-noto-serif)] text-2xl lg:text-3xl font-normal mb-2">Calcule o custo exato do seu projeto</h2>
              <p className="text-white/70 font-[var(--font-inter)] text-sm">Simulador gratuito: insira as dimensões e receba orçamento de material + mão de obra estimada.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Link href="/simulador" className="bg-white text-[#002045] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#f3f3f3] transition-colors text-center">Simular Grátis</Link>
              <a href={WA("Olá, gostaria de um orçamento de revestimento para meu projeto.")} target="_blank" rel="noopener noreferrer"
                className="border border-white/60 text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-white/10 transition-colors text-center">
                Pedir Orçamento
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
              <Link href="/guias/revestimento-banheiro-manaus" className="border border-[#e2e2e2] p-5 hover:border-[#002045] transition-colors">
                <p className="text-[#74777f] text-[10px] uppercase tracking-wider font-[var(--font-inter)] mb-2">Guia</p>
                <p className="text-[#002045] font-semibold font-[var(--font-inter)] text-sm">Revestimento para banheiro em Manaus</p>
              </Link>
              <Link href="/guias/revestimento-parede-manaus" className="border border-[#e2e2e2] p-5 hover:border-[#002045] transition-colors">
                <p className="text-[#74777f] text-[10px] uppercase tracking-wider font-[var(--font-inter)] mb-2">Guia</p>
                <p className="text-[#002045] font-semibold font-[var(--font-inter)] text-sm">Guia completo de revestimento de parede em Manaus</p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
