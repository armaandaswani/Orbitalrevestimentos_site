import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import TecnologiaComparison from "@/components/TecnologiaComparison";
import ARTAccordion from "@/components/ARTAccordion";

export const metadata: Metadata = {
  title: "PFB Orbital — Tecnologia, Performance e Ficha Técnica | Revestimento Manaus",
  description:
    "A tecnologia por trás das Placas Flexíveis de Bambu: 5 camadas, dados de laboratório, ART de Engenheiro Civil. Impermeável, anti-mofo, instalado em 2–3 horas. Revestimento premium para o Amazonas.",
  keywords: [
    "placa flexível de bambu tecnologia",
    "PFB ficha técnica",
    "revestimento impermeável Manaus",
    "revestimento anti-mofo Manaus",
    "revestimento para clima úmido Manaus",
    "revestimento bambu Manaus",
    "revestimento parede Manaus",
    "revestimento sem obra Manaus",
    "PFB Orbital performance",
    "revestimento com ART engenheiro civil",
    "revestimento sustentável Manaus",
    "placa flexível de bambu Amazonas",
  ],
  alternates: { canonical: "https://orbitalrevestimentos.com.br/tecnologia" },
  openGraph: {
    title: "PFB Orbital — Tecnologia, Performance e Ficha Técnica | Revestimento Manaus",
    description:
      "5 camadas, dados de laboratório, ART de Engenheiro Civil. Impermeável, anti-mofo, instalado em 2–3 horas. O revestimento premium feito para o Amazonas.",
    url: "https://orbitalrevestimentos.com.br/tecnologia",
  },
};

const layers = [
  { name: "Film Protetora UV", desc: "Proteção contra riscos, radiação UV e impactos superficiais. Mantém a cor e o brilho ao longo dos anos." },
  { name: "Film PVC", desc: "Impressão fotorrealista de alta fidelidade da textura — pedra, mármore ou madeira. Indistinguível do original." },
  { name: "Adesivo de Alta Aderência", desc: "Camada de colagem permanente e estrutural. Garante que as camadas superiores nunca descolarão." },
  { name: "Camada PVC Estrutural", desc: "Rigidez e integridade dimensional da placa. Permite grandes formatos sem empenamento." },
  { name: "Substrato de Fibra de Bambu", desc: "Núcleo ecológico e renovável. Sem formol, inodoro, anti-mofo e anti-cupim por natureza." },
];

const specs = [
  { value: "72,3", unit: "MPa", label: "Resistência à flexão", note: "Resistência certificada em laboratório" },
  { value: "0,2%", unit: "", label: "Inchamento (48h imerso)", note: "Praticamente impermeável" },
  { value: "682", unit: "kg/m³", label: "Densidade", note: "Alta resistência estrutural" },
  { value: "3,5", unit: "kg/m²", label: "Peso", note: "Ultra-leve para instalação ágil" },
  { value: "0,5%", unit: "", label: "Teor de umidade", note: "Estável no clima amazônico" },
];

export default function TecnologiaPage() {
  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="bg-[#002045] text-white py-14 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <p className="text-[#86a0cd] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
            PFB · Placas Flexíveis de Bambu
          </p>
          <h1 className="font-[var(--font-noto-serif)] text-2xl lg:text-5xl font-normal tracking-[-0.02em] leading-tight mb-5 max-w-3xl">
            Performance &amp; Tecnologia
          </h1>
          <p className="text-white/70 text-base font-[var(--font-inter)] leading-relaxed max-w-2xl">
            A intersecção entre materiais naturais e engenharia avançada.
            Cada dado apresentado aqui é extraído de ficha técnica
            — não de marketing.
          </p>
        </div>
      </section>
      {/* Anatomy */}
      <section className="overflow-hidden bg-white pt-0">
        <div className="flex flex-row">
          {/* Left — anatomy diagram with vignette */}
          <div className="w-[38%] bg-white relative min-h-[200px] lg:min-h-[440px] flex items-center justify-center overflow-hidden py-8 lg:py-12 px-8 border-b lg:border-b-0 lg:border-r border-[#eeeeee]">
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{ background: "radial-gradient(ellipse 72% 78% at 50% 50%, transparent 42%, white 100%)" }}
            />
            <Image
              src="/images/catalogue/product-anatomy.png"
              alt="Anatomia da Placa PFB Orbital — seção transversal 5mm"
              width={732}
              height={1638}
              className="max-h-[220px] lg:max-h-[620px] w-auto relative z-[5]"
            />
          </div>

          {/* Right — content panel */}
          <div className="w-[62%] bg-[#f9f9f9] px-3 lg:px-16 xl:px-20 py-4 lg:py-24 flex items-center">
            <div className="w-full max-w-2xl">
              <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
                Anatomia da Placa
              </p>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-lg lg:text-4xl font-normal mb-4">
                5 camadas. 5mm de espessura total.
              </h2>
              <p className="hidden lg:block text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed mb-8">
                O PFB não é um simples laminado. Cada camada tem uma função
                estrutural específica — da proteção UV superficial ao núcleo
                de bambu que garante resistência e sustentabilidade.
              </p>
              <div className="space-y-1.5 lg:space-y-3 mb-6">
                {layers.map(({ name, desc }, i) => (
                  <div
                    key={name}
                    className="bg-white border border-[#e2e2e2] p-2 lg:p-4 flex gap-2 lg:gap-4 items-start hover:border-[#1a365d] transition-colors"
                  >
                    <div className="flex-shrink-0 w-5 h-5 lg:w-7 lg:h-7 bg-[#002045] text-white flex items-center justify-center text-xs font-bold font-[var(--font-inter)]">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-[#002045] font-semibold text-[10px] lg:text-sm font-[var(--font-inter)] mb-0.5">
                        {name}
                      </p>
                      <p className="hidden lg:block text-[#43474e] text-xs font-[var(--font-inter)] leading-relaxed">
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden lg:block p-5 bg-[#002045] text-white">
                <p className="text-[#86a0cd] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-2">
                  Dimensões
                </p>
                <p className="font-[var(--font-noto-serif)] text-white text-2xl font-normal mb-1">
                  1,2m × 2,9m × 5mm
                </p>
                <p className="text-white/60 text-sm font-[var(--font-inter)]">
                  3,48 m² por placa · 3,5 kg/m²
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lab Specs */}
      <section className="py-10 lg:py-20 bg-[#002045] text-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="mb-6 lg:mb-10">
            <p className="text-[#86a0cd] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-2">
              Ficha técnica
            </p>
            <h2 className="font-[var(--font-noto-serif)] text-white text-xl lg:text-3xl font-normal mb-1.5">
              Desempenho comprovado
            </h2>
            <ARTAccordion />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 lg:gap-6">
            {specs.map(({ value, unit, label, note }) => (
              <div key={label} className="border-l-2 border-[#1a365d] pl-3 lg:pl-5">
                <p className="font-[var(--font-noto-serif)] text-xl lg:text-4xl text-white font-normal mb-0.5">
                  {value}
                  {unit && (
                    <span className="text-sm lg:text-xl text-[#86a0cd] ml-1">{unit}</span>
                  )}
                </p>
                <p className="text-[#86a0cd] text-[9px] lg:text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-0.5">
                  {label}
                </p>
                {note && (
                  <p className="text-[#a1d494] text-[9px] lg:text-[10px] font-[var(--font-inter)]">
                    {note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PFB × MDF — Water Test Photos */}
      <section className="py-10 lg:py-28 bg-[#1e212a] text-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="mb-8">
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">
              PFB — Teste de Resistência à Água
            </p>
            <h2 className="font-[var(--font-noto-serif)] text-white text-xl lg:text-4xl font-normal mb-3">
              O PFB é resistente à água? SIM!
            </h2>
            <p className="text-white/50 text-sm font-[var(--font-inter)] leading-relaxed max-w-xl">
              Uma placa PFB foi submersa por 48 horas em laboratório. Resultado: 0,2% de absorção — saindo intacta, sem deformação, sem descolar.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:gap-4 mb-10 lg:max-w-[75%] lg:mx-auto">
            {[
              { src: "/images/catalogue/pfb-mdf-0h.png", time: "0h", label: "Início do teste", note: "Placa PFB submersa em água em condições controladas de laboratório." },
              { src: "/images/catalogue/pfb-mdf-24h.png", time: "24h", label: "24 horas de imersão", note: "O PFB mantém integridade estrutural total — sem deformação ou absorção visível." },
              { src: "/images/catalogue/pfb-mdf-48h.png", time: "48h", label: "48 horas de imersão", note: "O PFB sai intacto após 48h de imersão. 0,2% de absorção — praticamente impermeável." },
            ].map(({ src, time, label, note }) => (
              <div key={time} className="group flex flex-col">
                <div className="relative aspect-[1536/2752] overflow-hidden mb-3">
                  <Image
                    src={src}
                    alt={`PFB vs MDF — ${label}`}
                    fill
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                  <div className="absolute top-3 left-3 bg-white text-[#1e212a] text-sm font-bold font-[var(--font-inter)] px-3 py-1.5 tracking-[0.05em]">
                    {time}
                  </div>
                </div>
                <p className="text-white font-semibold text-xs lg:text-sm font-[var(--font-inter)] mb-1 min-h-[2.5rem] lg:min-h-[1.5rem]">{label}</p>
                <p className="text-white/50 text-[10px] lg:text-xs font-[var(--font-inter)] leading-relaxed">{note}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#002045] border border-[#1a365d] p-4 lg:p-6">
              <p className="text-[#a1d494] text-[9px] lg:text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-2">Absorção · 48h imerso</p>
              <p className="font-[var(--font-noto-serif)] text-white text-2xl lg:text-4xl font-normal mb-1">0,2%</p>
              <p className="text-white/60 text-[11px] lg:text-sm font-[var(--font-inter)] leading-snug">de inchamento — praticamente impermeável</p>
            </div>
            <div className="bg-[#002045] border border-[#1a365d] p-4 lg:p-6">
              <p className="text-[#a1d494] text-[9px] lg:text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-2">Vida útil no Amazonas</p>
              <p className="font-[var(--font-noto-serif)] text-white text-2xl lg:text-4xl font-normal mb-1">10+</p>
              <p className="text-white/60 text-[11px] lg:text-sm font-[var(--font-inter)] leading-snug">anos no clima úmido de Manaus</p>
            </div>
          </div>
        </div>
      </section>

      {/* Manaus Climate */}
      <section className="py-10 lg:py-24 bg-[#1a365d] text-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
                Desenvolvido para o Amazonas
              </p>
              <h2 className="font-[var(--font-noto-serif)] text-white text-3xl font-normal mb-6">
                O PFB foi feito para o clima de Manaus.
                <br />
                <span className="italic text-[#86a0cd]">E os dados provam isso.</span>
              </h2>
              <p className="text-white/70 text-base font-[var(--font-inter)] leading-relaxed">
                Manaus registra umidade relativa média superior a 80% ao longo
                do ano. O PFB foi desenvolvido para esse ambiente: absorve
                apenas 0,2% de umidade, não empena, não descola e mantém a
                integridade visual e estrutural por mais de 10 anos.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 lg:gap-5">
              {[
                {
                  title: "Anti-mofo",
                  desc: "O bambu não é substrato para fungos. O PFB não mofará mesmo em banheiros sem ventilação.",
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  ),
                },
                {
                  title: "Anti-cupim",
                  desc: "A fibra de bambu processada não atrai cupins. Proteção natural, sem tratamento químico adicional.",
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                  ),
                },
                {
                  title: "Resistente a ciclos térmicos",
                  desc: "Testado em congelamento e aquecimento até 80°C sem deformação relevante.",
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
                    </svg>
                  ),
                },
                {
                  title: "Estável na umidade",
                  desc: "0,5% de teor de umidade interno. Não empena, não descola, não deforma ao longo do tempo.",
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
                    </svg>
                  ),
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-[#002045] p-3 lg:p-5">
                  <div className="text-[#86a0cd] mb-1 lg:mb-3">{icon}</div>
                  <p className="text-white font-semibold text-xs lg:text-sm font-[var(--font-inter)] mb-2">{title}</p>
                  <p className="text-white/55 text-[10px] lg:text-xs font-[var(--font-inter)] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Characteristics */}
      <section className="py-10 lg:py-28 bg-[#ffffff]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4 text-center">
            Atributos-chave
          </p>
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal mb-12 text-center">
            O que torna o PFB único
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-6">
            {[
              {
                label: "Anti-mofo",
                desc: "Resistente a fungos",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                ),
              },
              {
                label: "Anti-cupim",
                desc: "Bambu não atrai pragas",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                ),
              },
              {
                label: "Pronta-entrega",
                desc: "Estoque em Manaus",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                ),
              },
              {
                label: "Resistente à umidade",
                desc: "0,2% absorção em 48h",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
                  </svg>
                ),
              },
              {
                label: "Não propaga chamas",
                desc: "Composição sem materiais inflamáveis.",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M12 9c0 1.5-1 2.5-1.5 3.5.5.5 1 1 1.5 1s1-.5 1.5-1C13 11.5 12 10.5 12 9z" />
                  </svg>
                ),
              },
              {
                label: "Instalação Rápida",
                desc: "2–3h por cômodo",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                ),
              },
            ].map(({ label, icon, desc }) => (
              <div
                key={label}
                className="flex flex-col items-center text-center gap-2 p-3 lg:p-4 border border-[#e2e2e2] hover:border-[#1a365d] transition-colors group"
              >
                <div className="w-8 h-8 bg-[#f3f3f3] flex items-center justify-center text-[#1a365d] group-hover:bg-[#002045] group-hover:text-white transition-colors duration-300 flex-shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="text-[#002045] text-[10px] tracking-[0.08em] uppercase font-semibold font-[var(--font-inter)] mb-0.5 leading-tight">
                    {label}
                  </p>
                  <p className="text-[#74777f] text-[9px] font-[var(--font-inter)] leading-snug">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table — PFB vs alternatives (accordion) */}
      <section className="py-12 lg:py-28 bg-[#f9f9f9]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
            Dados técnicos independentes
          </p>
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal mb-3">
            PFB Orbital — desempenho em 10 critérios técnicos
          </h2>
          <p className="text-[#43474e] text-sm font-[var(--font-inter)] mb-10 max-w-2xl">
            Avaliações com base em ficha técnica e condições reais de uso no clima do Amazonas. ART de Engenheiro Civil.
          </p>
          <TecnologiaComparison />
        </div>
      </section>

      {/* Environmental impact */}
      <section className="py-10 lg:py-28 bg-[#ffffff]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
                Impacto ambiental
              </p>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal mb-6">
                Bambu cresce em meses.<br />
                <span className="italic">Uma árvore leva décadas.</span>
              </h2>
              <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed mb-6">
                O bambu é uma das plantas de crescimento mais rápido do mundo —
                rebrota após o corte sem necessidade de replantio. O PFB Orbital
                não contém formol nem compostos orgânicos voláteis: é inodoro,
                seguro para ambientes habitados, clínicas e espaços com crianças.
              </p>
              <div className="space-y-4">
                {[
                  { label: "Bambu renovável", desc: "Ciclo de cultivo de meses, não décadas." },
                  { label: "Sem formol", desc: "Não emite VOCs. Seguro para ambientes com crianças, clínicas e hospitais." },
                  { label: "Inodoro", desc: "Zero odor de fábrica. Instalável em ambientes habitados." },
                  { label: "Substrato biodegradável", desc: "Núcleo de fibra natural ao final da vida útil." },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3b6934] mt-2 flex-shrink-0" />
                    <div>
                      <span className="text-[#002045] font-semibold text-sm font-[var(--font-inter)]">{label} — </span>
                      <span className="text-[#43474e] text-sm font-[var(--font-inter)]">{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="relative aspect-[1674/1982] overflow-hidden">
                <Image
                  src="/images/catalogue/onde-aplicar-main.jpeg"
                  alt="PFB Orbital — material ecológico de bambu"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="border-l-2 border-[#3b6934] px-5 py-3 mt-0 bg-[#f3f9f3]">
                <p className="text-[#3b6934] text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-1">
                  Material ecológico
                </p>
                <p className="text-[#43474e] text-sm font-[var(--font-inter)]">
                  Bambu renovável · Sem formol · Inodoro
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Installation Notes */}
      <section className="py-12 lg:py-20 bg-[#1e212a] text-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <h2 className="font-[var(--font-noto-serif)] text-white text-2xl font-normal mb-8">
            Notas de Instalação
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Preparação da base",
                desc: "Base plana, seca, sem irregularidades acima de 2mm. Paredes com reboco fino ou drywall são ideais.",
              },
              {
                title: "Adesivo recomendado",
                desc: "Cola PU de alta aderência para paredes verticais. Cola de contato para tetos e superfícies curvas.",
              },
              {
                title: "Grandes superfícies",
                desc: "Prever junta de dilatação a cada 3 metros lineares para acomodar variação térmica.",
              },
              {
                title: "Proteção de cantos",
                desc: "Proteger arestas e cantos vivos com perfil acabado. Evitar impacto direto nos bordos da placa.",
              },
            ].map(({ title, desc }) => (
              <div key={title} className="border-l border-[#333640] pl-5">
                <p className="text-white font-semibold text-sm font-[var(--font-inter)] mb-2">
                  {title}
                </p>
                <p className="text-[#9c9faa] text-sm font-[var(--font-inter)] leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[#9c9faa] text-sm font-[var(--font-inter)] italic mt-8">
            Somos fornecedores diretos — não fazemos instalação.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 lg:py-16 bg-[#f9f9f9] border-t border-[#eeeeee] text-center">
        <div className="max-w-[600px] mx-auto px-4 lg:px-8">
          <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl font-normal mb-4">
            Pronto para especificar?
          </h3>
          <p className="text-[#43474e] text-base font-[var(--font-inter)] mb-8">
            Solicite a ficha técnica completa (ART/CREA)
            e suporte para arquitetos e designers.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 lg:gap-4">
            <a
              href="https://wa.me/5592988150149?text=Olá! Gostaria de solicitar a ficha técnica completa do PFB Orbital."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto text-center bg-[#1a365d] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#002045] transition-colors"
            >
              Falar com Especialista
            </a>
            <Link
              href="/produtos"
              className="w-full sm:w-auto text-center border border-[#002045] text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#002045] hover:text-white transition-colors"
            >
              Ver Catálogo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
