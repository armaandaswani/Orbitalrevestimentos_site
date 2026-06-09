import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

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
    bio: "Lidera a visão estratégica e o desenvolvimento de produto da Orbital. Responsável pela identificação de soluções inovadoras no mercado global e pela construção da cadeia de fornecimento direta na origem.",
    foto: "/images/team/armaan.jpg",
  },
  {
    nome: "Junior Hemnani",
    cargo: "Fundador & CFO",
    bio: "Responsável pela estrutura financeira, operacional e logística da Orbital. Garante a eficiência da cadeia de suprimentos e a disponibilidade de estoque local para atendimento imediato em Manaus.",
    foto: "/images/team/junior.jpg",
  },
];

export default function SobrePage() {
  return (
    <div className="pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Hero */}
      <section className="bg-[#002045] text-white py-24 lg:py-36">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <nav className="text-[#86a0cd] text-xs font-[var(--font-inter)] mb-8 flex items-center gap-2">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white">Sobre</span>
          </nav>
          <div className="max-w-3xl">
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
              Orbital Revestimentos · Manaus, Amazonas
            </p>
            <h1 className="font-[var(--font-noto-serif)] text-4xl lg:text-6xl font-normal leading-tight tracking-[-0.02em] mb-8">
              Nascemos da<br /><em>inquietação.</em>
            </h1>
            <p className="text-white/70 text-lg lg:text-xl font-[var(--font-inter)] leading-relaxed">
              Somos filhos de uma tradição de importadores, mas escolhemos não
              seguir apenas os caminhos já conhecidos. Percorremos cidades,
              fábricas e fornecedores ao redor do mundo em busca de algo que
              realmente resolvesse um problema do nosso mercado.
            </p>
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="bg-[#f9f9f9] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-[#002045] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">Manifesto</p>
              <div className="space-y-5 font-[var(--font-inter)] text-[#43474e] leading-relaxed text-base lg:text-lg">
                <p>Enquanto muitos enxergavam limitações, nós enxergávamos oportunidades.</p>
                <p>Foi assim que encontramos o PFB — um material capaz de unir design, resistência, praticidade e desempenho para enfrentar um dos ambientes mais desafiadores do mundo: a Amazônia.</p>
                <p>Mas não bastava acreditar. Era preciso comprovar. Por isso investimos em ensaios, relatórios técnicos e validações para garantir resistência à umidade, à água, ao mofo, aos cupins e comportamento seguro diante do fogo.</p>
                <p>Também entendemos que um grande produto não vale nada sem uma grande estrutura. Construímos uma cadeia logística eficiente, mantemos estoque local e desenvolvemos uma rede de profissionais aptos a transformar projetos em realidade.</p>
                <p className="font-semibold text-[#002045]">Porque acreditamos que inovação só tem valor quando chega até quem precisa dela. A Orbital existe para aproximar o futuro da construção do presente.</p>
                <p className="text-[#3b6934] font-semibold">E estamos apenas começando.</p>
              </div>
            </div>
            <div className="relative">
              {/* Office placeholder */}
              <div className="w-full aspect-[4/3] bg-[#e8ecf2] flex items-center justify-center border border-[#d0d8e8]">
                <div className="text-center px-6">
                  <p className="text-[#002045] font-semibold font-[var(--font-inter)] text-sm mb-1">📸 Foto do escritório / showroom</p>
                  <p className="text-[#74777f] font-[var(--font-inter)] text-xs">Coloque em <code className="bg-white px-1 py-0.5 rounded text-[10px]">public/images/sobre/escritorio.jpg</code></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Propósito / Missão / Visão */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-[#e2e2e2]">
            {[
              {
                tag: "Propósito",
                titulo: "Por que existimos",
                texto: "Transformar a forma como os espaços são construídos e renovados na Amazônia, conectando inovação global às necessidades reais do mercado local.\n\nAcreditamos que arquitetos, construtoras e consumidores não deveriam precisar escolher entre estética, durabilidade, praticidade e disponibilidade. Existimos para eliminar barreiras entre boas ideias e sua execução.",
              },
              {
                tag: "Missão",
                titulo: "O que fazemos",
                texto: "Oferecer revestimentos inovadores, tecnicamente validados e adaptados ao clima amazônico, garantindo pronta entrega, suporte especializado e a melhor relação entre qualidade, desempenho e custo do mercado brasileiro.\n\nAtravés de uma cadeia de fornecimento eficiente, construída diretamente na origem.",
              },
              {
                tag: "Visão",
                titulo: "Para onde vamos",
                texto: "Ser a principal referência em revestimentos inovadores da Amazônia e uma das empresas mais respeitadas do Brasil na introdução de novas tecnologias para acabamento e construção.",
              },
            ].map((item, i) => (
              <div
                key={item.tag}
                className={`p-8 lg:p-10 ${i < 2 ? "border-b lg:border-b-0 lg:border-r border-[#e2e2e2]" : ""}`}
              >
                <p className="text-[#3b6934] text-[10px] tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">{item.tag}</p>
                <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-4">{item.titulo}</h2>
                <div className="space-y-3">
                  {item.texto.split("\n\n").map((p, j) => (
                    <p key={j} className="text-[#43474e] font-[var(--font-inter)] text-sm leading-relaxed">{p}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Números */}
      <section className="bg-[#002045] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-12">A Orbital em números</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {numeros.map((n) => (
              <div key={n.label} className="border border-white/10 p-6">
                <p className="font-[var(--font-noto-serif)] text-white text-4xl font-normal mb-2">{n.valor}</p>
                <p className="text-white/80 text-sm font-semibold font-[var(--font-inter)] mb-1">{n.label}</p>
                <p className="text-white/45 text-xs font-[var(--font-inter)] leading-relaxed">{n.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 pt-10">
            {[
              "Estoque local em Manaus",
              "Fornecimento direto da origem",
              "Rede de instaladores parceiros capacitados",
              "Material desenvolvido para ambientes de alta umidade",
              "Ensaios técnicos de desempenho certificados",
              "Suporte especializado em todos os projetos",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="text-[#a1d494] flex-shrink-0">✓</span>
                <p className="text-white/60 font-[var(--font-inter)] text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="bg-[#f9f9f9] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-[#002045] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">Valores</p>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal leading-tight mb-10">
                O que guia cada decisão que tomamos.
              </h2>
              <ul className="space-y-4">
                {valores.map((v) => (
                  <li key={v} className="flex items-start gap-4 border-b border-[#e8e8e8] pb-4 last:border-0 last:pb-0">
                    <span className="text-[#3b6934] font-bold text-lg flex-shrink-0 leading-none mt-0.5">—</span>
                    <p className="text-[#43474e] font-[var(--font-inter)] leading-relaxed">{v}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Image
                src="/images/catalogue/hero-cover.png"
                alt="PFB Orbital instalado — revestimento de parede de alto padrão em Manaus"
                width={600}
                height={500}
                className="w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Equipe */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <p className="text-[#002045] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">Fundadores</p>
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal leading-tight mb-12 max-w-xl">
            As pessoas por trás da Orbital.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl">
            {equipe.map((pessoa) => {
              const hasPhoto = pessoa.nome === "Armaan Daswani";
              return (
                <div key={pessoa.nome}>
                  {hasPhoto ? (
                    <Image
                      src={pessoa.foto}
                      alt={`${pessoa.nome} — ${pessoa.cargo} da Orbital Revestimentos`}
                      width={400}
                      height={400}
                      className="w-full aspect-square object-cover object-top mb-5"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-[#e8ecf2] flex items-center justify-center border border-[#d0d8e8] mb-5">
                      <div className="text-center px-4">
                        <p className="text-[#74777f] font-[var(--font-inter)] text-xs">
                          📸 Coloque em<br />
                          <code className="text-[10px]">{pessoa.foto.replace("/images/", "public/images/")}</code>
                        </p>
                      </div>
                    </div>
                  )}
                  <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal mb-0.5">{pessoa.nome}</h3>
                  <p className="text-[#3b6934] text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-3">{pessoa.cargo}</p>
                  <p className="text-[#43474e] font-[var(--font-inter)] text-sm leading-relaxed">{pessoa.bio}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#002045] py-20 lg:py-24">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-[var(--font-noto-serif)] text-white text-3xl lg:text-4xl font-normal leading-tight mb-3">
              Pronto para trabalhar com a Orbital?
            </h2>
            <p className="text-white/60 font-[var(--font-inter)] leading-relaxed">
              Arquitetos, designers, marceneiros, construtoras ou clientes finais —
              atendemos com suporte técnico direto e estoque disponível em Manaus.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link
              href="/simulador"
              className="bg-white text-[#002045] text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#f3f3f3] transition-colors text-center"
            >
              Simular Orçamento
            </Link>
            <a
              href={WA("Olá, gostaria de falar com a equipe Orbital Revestimentos.")}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/40 text-white text-xs tracking-[0.1em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-white/10 transition-colors text-center"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
