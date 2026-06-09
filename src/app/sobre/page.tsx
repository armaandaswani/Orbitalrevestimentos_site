import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedStat from "@/components/AnimatedStat";

const BASE_URL = "https://orbitalrevestimentos.com.br";
const WA = (msg: string) => `https://wa.me/5592988150149?text=${encodeURIComponent(msg)}`;

export const metadata: Metadata = {
  title: "Sobre a Orbital Revestimentos — Manaus, AM",
  description:
    "Orbital Revestimentos nasceu para resolver um problema real da Amazônia. Somos a referência em revestimentos inovadores em Manaus — tecnicamente validados, com estoque local e suporte especializado.",
  keywords: [
    "Orbital Revestimentos",
    "Orbital Revestimentos Manaus",
    "empresa revestimentos Manaus",
    "quem é Orbital Revestimentos",
    "revestimentos inovadores Amazônia",
    "PFB Manaus empresa",
    "revestimento Manaus fundadores",
  ],
  alternates: { canonical: `${BASE_URL}/sobre` },
  openGraph: {
    title: "Sobre a Orbital Revestimentos — Manaus, AM",
    description:
      "Nascemos da inquietação. Percorremos fábricas no mundo para encontrar o que realmente resolve os desafios da Amazônia. Essa é a Orbital.",
    url: `${BASE_URL}/sobre`,
    images: [{ url: `/images/catalogue/hero-cover.png`, width: 1200, height: 630, alt: "Orbital Revestimentos — Manaus, AM" }],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Orbital Revestimentos",
  url: BASE_URL,
  logo: `${BASE_URL}/images/logo.png`,
  description: "Referência em revestimentos inovadores na Amazônia. Fornecedora exclusiva de Placas Flexíveis de Bambu (PFB) em Manaus — tecnicamente validados, estoque local, pronta-entrega.",
  foundingLocation: { "@type": "Place", name: "Manaus, AM, Brasil" },
  telephone: "+55-92-98815-0149",
  email: "orbital.revestimentos@gmail.com",
  address: { "@type": "PostalAddress", addressLocality: "Manaus", addressRegion: "AM", addressCountry: "BR" },
  sameAs: ["https://instagram.com/orbitalrevestimentos", "https://wa.me/5592988150149"],
  founders: [
    { "@type": "Person", name: "Armaan Daswani", jobTitle: "Fundador e CEO" },
    { "@type": "Person", name: "Junior Hemnani", jobTitle: "Fundador e CFO" },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Sobre", item: `${BASE_URL}/sobre` },
  ],
};

const valores = [
  "Resolver problemas reais antes de vender produtos.",
  "Buscar inovação com propósito.",
  "Excelência técnica acima de promessas comerciais.",
  "Respeito ao cliente e aos seus projetos.",
  "Agilidade e compromisso com prazos.",
  "Transparência em todas as relações.",
  "Coragem para desafiar o convencional.",
  "Mentalidade global com execução local.",
];

const numeros = [
  { valor: "20+", label: "Projetos atendidos", desc: "Residenciais, comerciais, corporativos e náuticos" },
  { valor: "15", label: "Acabamentos exclusivos", desc: "Pronta-entrega em Manaus" },
  { valor: "0,2%", label: "Absorção de umidade", desc: "Testado e validado em laboratório" },
  { valor: "ART", label: "Responsabilidade técnica", desc: "Emitida por profissional habilitado CREA" },
];

const equipe = [
  {
    nome: "Armaan Daswani",
    cargo: "Fundador & CEO",
    bio: "É o motor por trás da Orbital. Lidera a visão estratégica, o desenvolvimento de produto, a construção de marca, o marketing e a operação do dia a dia — do primeiro contato com o cliente à entrega final do projeto. Multifacetado por escolha e por necessidade, garante que cada detalhe da experiência Orbital esteja à altura do produto que entregamos.",
    foto: "/images/team/armaan.jpg",
    hasPhoto: true,
  },
  {
    nome: "Junior Hemnani",
    cargo: "Fundador & CFO",
    bio: "Responsável pela solidez financeira da Orbital. Atua diretamente na inteligência de suprimentos e na cadeia de fornecimento global — percorrendo mercados internacionais para identificar soluções que o mercado amazônico ainda não conhecia. Garante que cada placa chegue a Manaus no prazo, no custo certo e com estoque disponível para atender qualquer projeto.",
    foto: "/images/team/junior.jpg",
    hasPhoto: false,
  },
];

export default function SobrePage() {
  return (
    <div className="pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ── Hero full-bleed ── */}
      <section className="relative h-[85vh] min-h-[560px] max-h-[860px] flex items-end">
        <div className="absolute inset-0">
          <Image
            src="/images/catalogue/hero-cover.png"
            alt="Orbital Revestimentos — Manaus, Amazonas"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#001530]/95 via-[#001530]/50 to-[#001530]/15" />
        </div>
        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 lg:px-16 pb-16 lg:pb-28">
          <nav className="text-[#86a0cd] text-xs font-[var(--font-inter)] mb-6 flex items-center gap-2">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white">Sobre</span>
          </nav>
          <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
            Orbital Revestimentos · Manaus, Amazonas
          </p>
          <h1 className="font-[var(--font-noto-serif)] text-white text-4xl sm:text-5xl lg:text-7xl font-normal leading-tight tracking-[-0.02em] mb-6 max-w-3xl">
            Nascemos da<br /><em>inquietação.</em>
          </h1>
          <p className="text-white/65 text-base lg:text-xl font-[var(--font-inter)] leading-relaxed max-w-2xl">
            Somos filhos de uma tradição de importadores, mas escolhemos não seguir apenas os caminhos já conhecidos. Percorremos cidades, fábricas e fornecedores ao redor do mundo em busca de algo que realmente resolvesse um problema do nosso mercado.
          </p>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-[#002045] border-b border-[#1a365d]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {numeros.map(({ valor, label }) => (
              <div key={label} className="flex flex-col items-center text-center py-3">
                <AnimatedStat value={valor} className="text-white font-[var(--font-noto-serif)] text-2xl font-normal mb-0.5" />
                <span className="text-[#86a0cd] text-[10px] tracking-[0.15em] uppercase font-semibold font-[var(--font-inter)]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Manifesto (split) ── */}
      <section className="overflow-hidden bg-white">
        <div className="flex flex-col lg:flex-row min-h-[560px]">
          <div className="lg:w-1/2 bg-[#f9f9f7] px-6 lg:px-16 py-16 lg:py-28 flex items-center">
            <ScrollReveal className="max-w-lg">
              <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">Manifesto</p>
              <div className="space-y-5 font-[var(--font-inter)] text-[#43474e] leading-relaxed text-base">
                <p>Enquanto muitos enxergavam limitações, nós enxergávamos oportunidades.</p>
                <p>Foi assim que encontramos o PFB — um material capaz de unir design, resistência, praticidade e desempenho para enfrentar um dos ambientes mais desafiadores do mundo: a Amazônia.</p>
                <p>Mas não bastava acreditar. Era preciso comprovar. Por isso investimos em ensaios, relatórios técnicos e validações para garantir resistência à umidade, à água, ao mofo, aos cupins e comportamento seguro diante do fogo.</p>
                <p>Também entendemos que um grande produto não vale nada sem uma grande estrutura. Construímos uma cadeia logística eficiente, mantemos estoque local e desenvolvemos uma rede de profissionais aptos a transformar projetos em realidade.</p>
                <p className="font-semibold text-[#002045]">Porque acreditamos que inovação só tem valor quando chega até quem precisa dela.</p>
                <p className="text-[#3b6934] font-semibold">E estamos apenas começando.</p>
              </div>
            </ScrollReveal>
          </div>
          <div className="lg:w-1/2 relative min-h-[380px]">
            <Image
              src="/images/catalogue/aplicacao-sala.jpeg"
              alt="Projeto Orbital Revestimentos em Manaus"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Propósito / Missão / Visão ── */}
      <section className="bg-[#002045] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <ScrollReveal>
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-12">Nossa essência</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-white/10">
            {[
              {
                tag: "Propósito",
                titulo: "Por que existimos",
                texto: [
                  "Transformar a forma como os espaços são construídos e renovados na Amazônia, conectando inovação global às necessidades reais do mercado local.",
                  "Acreditamos que arquitetos, construtoras e consumidores não deveriam precisar escolher entre estética, durabilidade, praticidade e disponibilidade. Existimos para eliminar barreiras entre boas ideias e sua execução.",
                ],
              },
              {
                tag: "Missão",
                titulo: "O que fazemos",
                texto: [
                  "Oferecer revestimentos inovadores, tecnicamente validados e adaptados ao clima amazônico, garantindo pronta entrega, suporte especializado e a melhor relação entre qualidade, desempenho e custo do mercado brasileiro.",
                  "Através de uma cadeia de fornecimento eficiente, construída diretamente na origem.",
                ],
              },
              {
                tag: "Visão",
                titulo: "Para onde vamos",
                texto: [
                  "Ser a principal referência em revestimentos inovadores da Amazônia e uma das empresas mais respeitadas do Brasil na introdução de novas tecnologias para acabamento e construção.",
                ],
              },
            ].map((item, i) => (
              <ScrollReveal key={item.tag} delay={i * 80} className={`p-8 lg:p-10 ${i < 2 ? "border-b lg:border-b-0 lg:border-r border-white/10" : ""}`}>
                <p className="text-[#a1d494] text-[10px] tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">{item.tag}</p>
                <h2 className="font-[var(--font-noto-serif)] text-white text-xl font-normal mb-4">{item.titulo}</h2>
                <div className="space-y-3">
                  {item.texto.map((p, j) => (
                    <p key={j} className="text-white/55 font-[var(--font-inter)] text-sm leading-relaxed">{p}</p>
                  ))}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Valores (split) ── */}
      <section className="overflow-hidden bg-white">
        <div className="flex flex-col lg:flex-row-reverse min-h-[560px]">
          <div className="lg:w-1/2 relative min-h-[380px]">
            <Image
              src="/images/catalogue/produto-anatomy.png"
              alt="PFB Orbital — revestimento de alto padrão em Manaus"
              fill
              className="object-cover"
              onError={() => {}}
            />
            {/* fallback bg in case image is missing */}
          </div>
          <div className="lg:w-1/2 bg-[#f5f5f3] px-6 lg:px-16 py-16 lg:py-28 flex items-center">
            <ScrollReveal className="max-w-lg">
              <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">Valores</p>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal leading-tight mb-10">
                O que guia cada decisão que tomamos.
              </h2>
              <ul className="space-y-4">
                {valores.map((v, i) => (
                  <li key={v} className={`flex items-start gap-4 ${i < valores.length - 1 ? "border-b border-[#e8e8e8] pb-4" : ""}`}>
                    <span className="text-[#3b6934] font-bold text-lg flex-shrink-0 leading-none mt-0.5">—</span>
                    <p className="text-[#43474e] font-[var(--font-inter)] leading-relaxed text-sm">{v}</p>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Números detalhados ── */}
      <section className="bg-[#002045] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <ScrollReveal>
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-12">A Orbital em números</p>
          </ScrollReveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-white/10">
            {numeros.map((n, i) => (
              <ScrollReveal key={n.label} delay={i * 80} className={`p-6 lg:p-8 ${i < 3 ? "border-b lg:border-b-0 lg:border-r border-white/10" : ""}`}>
                <AnimatedStat value={n.valor} className="font-[var(--font-noto-serif)] text-white text-4xl font-normal mb-2" />
                <p className="text-white/80 text-sm font-semibold font-[var(--font-inter)] mb-1">{n.label}</p>
                <p className="text-white/40 text-xs font-[var(--font-inter)] leading-relaxed">{n.desc}</p>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal delay={200}>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-white/10 pt-10">
              {[
                "Estoque local em Manaus",
                "Fornecimento direto da origem",
                "Rede de instaladores parceiros capacitados",
                "Material desenvolvido para alta umidade",
                "Ensaios técnicos certificados INMETRO",
                "Suporte especializado em todos os projetos",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="text-[#a1d494] flex-shrink-0">✓</span>
                  <p className="text-white/60 font-[var(--font-inter)] text-sm">{item}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Fundadores ── */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-16">
          <ScrollReveal>
            <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">Fundadores</p>
            <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal leading-tight mb-14 max-w-xl">
              As pessoas por trás da Orbital.
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-[#e2e2e2] max-w-2xl">
            {equipe.map((pessoa, i) => (
              <ScrollReveal key={pessoa.nome} delay={i * 100} className={`${i === 0 ? "border-b sm:border-b-0 sm:border-r border-[#e2e2e2]" : ""}`}>
                {pessoa.hasPhoto ? (
                  <div className="relative w-full aspect-[4/5] overflow-hidden">
                    <Image
                      src={pessoa.foto}
                      alt={`${pessoa.nome} — ${pessoa.cargo} da Orbital Revestimentos`}
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[4/5] bg-[#e8ecf2] flex items-center justify-center border-b border-[#e2e2e2]">
                    <div className="text-center px-4">
                      <p className="text-[#74777f] font-[var(--font-inter)] text-xs">
                        📸 Coloque em<br />
                        <code className="text-[10px]">public/images/team/junior.jpg</code>
                      </p>
                    </div>
                  </div>
                )}
                <div className="p-6 lg:p-8">
                  <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-0.5">{pessoa.nome}</h3>
                  <p className="text-[#3b6934] text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-4">{pessoa.cargo}</p>
                  <p className="text-[#43474e] font-[var(--font-inter)] text-sm leading-relaxed">{pessoa.bio}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA full-bleed ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/images/catalogue/aplicacao-cozinha.jpeg" alt="Orbital Revestimentos — projetos em Manaus" fill className="object-cover" />
          <div className="absolute inset-0 bg-[#001530]/85" />
        </div>
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-16 py-24 lg:py-32 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-[var(--font-noto-serif)] text-white text-3xl lg:text-5xl font-normal leading-tight mb-4">
              Pronto para trabalhar com a Orbital?
            </h2>
            <p className="text-white/60 font-[var(--font-inter)]">
              Arquitetos, designers, marceneiros, construtoras ou clientes finais — atendemos com suporte técnico direto e estoque disponível em Manaus.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link href="/simulador" className="bg-white text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-10 py-4 hover:bg-[#f3f3f3] transition-colors text-center">Simular Orçamento</Link>
            <a href={WA("Olá, gostaria de falar com a equipe Orbital Revestimentos.")} target="_blank" rel="noopener noreferrer" className="border border-white/50 text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-10 py-4 hover:bg-white/10 transition-colors text-center">Falar no WhatsApp</a>
          </div>
        </div>
      </section>
    </div>
  );
}
