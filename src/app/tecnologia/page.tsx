import Image from "next/image";
import Link from "next/link";

const layers = [
  { name: "Film Protetora UV", desc: "Proteção contra riscos, radiação UV e impactos superficiais. Mantém a cor e o brilho ao longo dos anos." },
  { name: "Film PVC", desc: "Impressão fotorrealista de alta fidelidade da textura — pedra, mármore ou madeira. Indistinguível do original." },
  { name: "Adesivo de Alta Aderência", desc: "Camada de colagem permanente e estrutural. Garante que as camadas superiores nunca descolarão." },
  { name: "Camada PVC Estrutural", desc: "Rigidez e integridade dimensional da placa. Permite grandes formatos sem empenamento." },
  { name: "Substrato de Fibra de Bambu", desc: "Núcleo ecológico e renovável. Sem formol, inodoro, anti-mofo e anti-cupim por natureza." },
];

const specs = [
  { value: "72,3", unit: "MPa", label: "Resistência à flexão", note: "3× mais que MDF" },
  { value: "0,2%", unit: "", label: "Inchamento (48h imerso)", note: "MDF chega a 35%" },
  { value: "682", unit: "kg/m³", label: "Densidade", note: "Alta resistência estrutural" },
  { value: "3,5", unit: "kg/m²", label: "Peso", note: "MDF pesa 11 kg/m²" },
  { value: "0,5%", unit: "", label: "Teor de umidade", note: "Estável no clima amazônico" },
];

const comparison = [
  {
    attr: "Absorção de água (48h)",
    pfb: "0,2%",
    mdf: "Até 35%",
    pfbGood: true,
    highlight: true,
  },
  {
    attr: "Resistência ao fogo",
    pfb: "Não propaga chamas",
    mdf: "Classe C/D",
    pfbGood: true,
    highlight: false,
  },
  {
    attr: "Resistência à flexão",
    pfb: "72,3 MPa",
    mdf: "17–22 MPa",
    pfbGood: true,
    highlight: true,
  },
  {
    attr: "Flexibilidade / instalação em curvas",
    pfb: "Possível (curvável)",
    mdf: "Não recomendado",
    pfbGood: true,
    highlight: false,
  },
  {
    attr: "Vida útil (clima úmido)",
    pfb: "> 5 anos",
    mdf: "2–3 anos em Manaus",
    pfbGood: true,
    highlight: true,
  },
  {
    attr: "Anti-mofo · Anti-cupim",
    pfb: "Resistente por natureza",
    mdf: "Suscetível à umidade",
    pfbGood: true,
    highlight: false,
  },
  {
    attr: "Poeira / Resíduo na instalação",
    pfb: "Mínimo",
    mdf: "Poeira tóxica de MDF",
    pfbGood: true,
    highlight: false,
  },
  {
    attr: "Tempo de instalação",
    pfb: "2–3 horas por cômodo",
    mdf: "Dias (obra pesada)",
    pfbGood: true,
    highlight: false,
  },
  {
    attr: "Custo de mão de obra",
    pfb: "~ R$ 32/m²",
    mdf: "R$ 60–90/m²",
    pfbGood: true,
    highlight: true,
  },
  {
    attr: "Peso",
    pfb: "3,5 kg/m²",
    mdf: "11 kg/m²",
    pfbGood: true,
    highlight: false,
  },
  {
    attr: "Matéria-prima",
    pfb: "Bambu renovável · sem formol",
    mdf: "Madeira + formol",
    pfbGood: true,
    highlight: false,
  },
];

export default function TecnologiaPage() {
  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="bg-[#002045] text-white py-20 lg:py-24">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <p className="text-[#86a0cd] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
            PFB · Placas Flexíveis de Bambu
          </p>
          <h1 className="font-[var(--font-noto-serif)] text-5xl lg:text-6xl font-normal tracking-[-0.02em] leading-tight mb-5 max-w-3xl">
            Performance &amp; Tecnologia
          </h1>
          <p className="text-white/70 text-lg font-[var(--font-inter)] leading-relaxed max-w-2xl">
            A intersecção entre materiais naturais e engenharia avançada.
            Cada dado apresentado aqui é extraído de ficha técnica
            — não de marketing.
          </p>
        </div>
      </section>

      {/* Anatomy */}
      <section className="overflow-hidden bg-white">
        <div className="flex flex-col lg:flex-row">
          {/* Left — anatomy diagram with vignette */}
          <div className="lg:w-[38%] bg-white relative min-h-[440px] flex items-center justify-center overflow-hidden py-12 px-8 border-r border-[#eeeeee]">
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{ background: "radial-gradient(ellipse 72% 78% at 50% 50%, transparent 42%, white 100%)" }}
            />
            <Image
              src="/images/catalogue/product-anatomy.png"
              alt="Anatomia da Placa PFB Orbital — seção transversal 5mm"
              width={732}
              height={1638}
              className="max-h-[620px] w-auto relative z-[5]"
            />
          </div>

          {/* Right — content panel */}
          <div className="lg:w-[62%] bg-[#f9f9f9] px-8 lg:px-16 xl:px-20 py-16 lg:py-24 flex items-center">
            <div className="w-full max-w-2xl">
              <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
                Anatomia da Placa
              </p>
              <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal mb-4">
                5 camadas. 5mm de espessura total.
              </h2>
              <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed mb-8">
                O PFB não é um simples laminado. Cada camada tem uma função
                estrutural específica — da proteção UV superficial ao núcleo
                de bambu que garante resistência e sustentabilidade.
              </p>
              <div className="space-y-3 mb-6">
                {layers.map(({ name, desc }, i) => (
                  <div
                    key={name}
                    className="bg-white border border-[#e2e2e2] p-4 flex gap-4 items-start hover:border-[#1a365d] transition-colors"
                  >
                    <div className="flex-shrink-0 w-7 h-7 bg-[#002045] text-white flex items-center justify-center text-xs font-bold font-[var(--font-inter)]">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-[#002045] font-semibold text-sm font-[var(--font-inter)] mb-0.5">
                        {name}
                      </p>
                      <p className="text-[#43474e] text-xs font-[var(--font-inter)] leading-relaxed">
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-5 bg-[#002045] text-white">
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
      <section className="py-16 bg-[#002045] text-white">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="mb-10">
            <p className="text-[#86a0cd] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">
              Ficha técnica
            </p>
            <h2 className="font-[var(--font-noto-serif)] text-white text-3xl font-normal mb-2">
              Desempenho comprovado
            </h2>
            <p className="text-[#86a0cd] text-sm font-[var(--font-inter)]">
              ART nº AM20260593657 · Eng. Civil Werksson Sousa · CREA 042030134-8-D
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {specs.map(({ value, unit, label, note }) => (
              <div key={label} className="border-l-2 border-[#1a365d] pl-5">
                <p className="font-[var(--font-noto-serif)] text-4xl text-white font-normal mb-1">
                  {value}
                  {unit && (
                    <span className="text-xl text-[#86a0cd] ml-1">{unit}</span>
                  )}
                </p>
                <p className="text-[#86a0cd] text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-1">
                  {label}
                </p>
                {note && (
                  <p className="text-[#a1d494] text-[10px] font-[var(--font-inter)]">
                    {note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PFB × MDF — Water Test Photos */}
      <section className="py-24 bg-[#1e212a] text-white">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="mb-12">
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
              PFB × MDF — Teste de imersão real
            </p>
            <h2 className="font-[var(--font-noto-serif)] text-white text-3xl lg:text-4xl font-normal mb-4">
              Após 48 horas em contato com água, os resultados eliminam qualquer dúvida.
            </h2>
            <p className="text-white/60 text-base font-[var(--font-inter)] max-w-2xl">
              Dois painéis — PFB e MDF — submersos lado a lado. O que acontece com cada um ao longo do tempo é a melhor resposta que qualquer laudo técnico poderia dar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 max-w-[75%] mx-auto">
            {[
              { src: "/images/catalogue/pfb-mdf-0h.png", time: "0h", label: "Início do teste", note: "Ambos os painéis em condições normais, submersos simultaneamente." },
              { src: "/images/catalogue/pfb-mdf-24h.png", time: "24h", label: "24 horas de imersão", note: "O MDF começa a absorver água, inchar e perder integridade estrutural." },
              { src: "/images/catalogue/pfb-mdf-48h.png", time: "48h", label: "48 horas de imersão", note: "O MDF está deformado e se desintegrando. O PFB permanece íntegro." },
            ].map(({ src, time, label, note }) => (
              <div key={time} className="group">
                <div className="relative aspect-[3/4] overflow-hidden mb-4">
                  <Image
                    src={src}
                    alt={`PFB vs MDF — ${label}`}
                    fill
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                  <div className="absolute top-4 left-4 bg-white text-[#1e212a] text-sm font-bold font-[var(--font-inter)] px-3 py-1.5 tracking-[0.05em]">
                    {time}
                  </div>
                </div>
                <p className="text-white font-semibold text-sm font-[var(--font-inter)] mb-1">{label}</p>
                <p className="text-white/50 text-sm font-[var(--font-inter)] leading-relaxed">{note}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#002045] border border-[#1a365d] p-8">
              <p className="text-[#a1d494] text-[10px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] mb-3">PFB Orbital</p>
              <p className="font-[var(--font-noto-serif)] text-white text-4xl font-normal mb-2">0,2%</p>
              <p className="text-white/60 text-sm font-[var(--font-inter)]">de inchamento após 48h de imersão total</p>
            </div>
            <div className="bg-[#333640] border border-[#444650] p-8">
              <p className="text-[#9c9faa] text-[10px] tracking-[0.2em] uppercase font-bold font-[var(--font-inter)] mb-3">MDF Convencional</p>
              <p className="font-[var(--font-noto-serif)] text-[#9c9faa] text-4xl font-normal mb-2">~35%</p>
              <p className="text-[#9c9faa]/60 text-sm font-[var(--font-inter)]">de inchamento — degrada, descola e perde estrutura</p>
            </div>
          </div>
        </div>
      </section>

      {/* Manaus Climate */}
      <section className="py-20 bg-[#1a365d] text-white">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
                Desenvolvido para o Amazonas
              </p>
              <h2 className="font-[var(--font-noto-serif)] text-white text-3xl font-normal mb-6">
                O MDF não sobrevive ao clima de Manaus.
                <br />
                <span className="italic text-[#86a0cd]">O PFB foi feito para ele.</span>
              </h2>
              <p className="text-white/70 text-base font-[var(--font-inter)] leading-relaxed">
                Manaus registra umidade relativa média superior a 80% ao longo
                do ano. Nesse ambiente, o MDF absorve umidade continuamente,
                incha, descola e se deteriora em 2 a 3 anos — um ciclo
                frustrante e caro para o cliente final.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-5">
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
                <div key={title} className="bg-[#002045] p-5">
                  <div className="text-[#86a0cd] mb-3">{icon}</div>
                  <p className="text-white font-semibold text-sm font-[var(--font-inter)] mb-2">{title}</p>
                  <p className="text-white/55 text-xs font-[var(--font-inter)] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Characteristics */}
      <section className="py-24 bg-[#ffffff] border-b border-[#eeeeee]">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <p className="text-[#3b6934] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4 text-center">
            Atributos-chave
          </p>
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal mb-12 text-center">
            O que torna o PFB único
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
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
                className="flex flex-col items-center text-center gap-4 p-6 border border-[#e2e2e2] hover:border-[#1a365d] transition-colors group"
              >
                <div className="w-10 h-10 bg-[#f3f3f3] flex items-center justify-center text-[#1a365d] group-hover:bg-[#002045] group-hover:text-white transition-colors duration-300">
                  {icon}
                </div>
                <div>
                  <p className="text-[#002045] text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] mb-1">
                    {label}
                  </p>
                  <p className="text-[#74777f] text-[10px] font-[var(--font-inter)]">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 bg-[#f9f9f9]">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
          <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
            Comparativo técnico completo
          </p>
          <h2 className="font-[var(--font-noto-serif)] text-[#002045] text-3xl lg:text-4xl font-normal mb-3">
            PFB Orbital vs MDF Convencional
          </h2>
          <p className="text-[#43474e] text-sm font-[var(--font-inter)] mb-12 max-w-2xl">
            11 critérios avaliados com base em dados de ficha técnica
            e condições reais de uso no clima do Amazonas.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-[#e2e2e2]">
                  <th className="text-left py-5 px-4 text-xs tracking-[0.1em] uppercase font-semibold font-[var(--font-inter)] text-[#74777f]">
                    Critério
                  </th>
                  <th className="text-left py-5 px-4 font-[var(--font-noto-serif)] text-[#002045] text-xl font-normal">
                    PFB Orbital
                  </th>
                  <th className="text-left py-5 px-4 font-[var(--font-noto-serif)] text-[#74777f] text-xl font-normal">
                    MDF Convencional
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map(({ attr, pfb, mdf, pfbGood, highlight }) => (
                  <tr
                    key={attr}
                    className={`border-b border-[#eeeeee] transition-colors ${
                      highlight ? "bg-[#f3f9f3]" : "hover:bg-[#f3f3f3]"
                    }`}
                  >
                    <td className="py-4 px-4 text-sm font-medium font-[var(--font-inter)] text-[#1a1c1c]">
                      {attr}
                      {highlight && (
                        <span className="ml-2 text-[9px] tracking-[0.08em] uppercase font-bold text-[#3b6934] font-[var(--font-inter)]">
                          destaque
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`text-sm font-semibold font-[var(--font-inter)] ${
                          pfbGood ? "text-[#002045]" : "text-[#74777f]"
                        }`}
                      >
                        {pfb}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-[#74777f] font-[var(--font-inter)]">
                      {mdf}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[#74777f] text-xs font-[var(--font-inter)] italic mt-6">
            ART nº AM20260593657 · Eng. Civil Werksson Sousa, CREA 042030134-8-D. Dados sujeitos a alteração sem aviso prévio.
          </p>
        </div>
      </section>

      {/* Environmental impact */}
      <section className="py-20 bg-[#ffffff] border-b border-[#eeeeee]">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
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
                rebrota após o corte sem necessidade de replantio. Ao contrário
                do MDF, que é composto de partículas de madeira ligadas por
                resinas à base de formol (um composto VOC classificado como
                carcinogênico), o PFB Orbital é inodoro e não libera compostos
                orgânicos voláteis no ambiente.
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
              <div className="relative aspect-[4/5] overflow-hidden">
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
      <section className="py-16 bg-[#1e212a] text-white">
        <div className="max-w-[1280px] mx-auto px-8 lg:px-16">
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
      <section className="py-16 bg-[#f9f9f9] border-t border-[#eeeeee] text-center">
        <div className="max-w-[600px] mx-auto px-8">
          <h3 className="font-[var(--font-noto-serif)] text-[#002045] text-2xl font-normal mb-4">
            Pronto para especificar?
          </h3>
          <p className="text-[#43474e] text-base font-[var(--font-inter)] mb-8">
            Solicite a ficha técnica completa (ART/CREA)
            e suporte para arquitetos e designers.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://wa.me/5592988150149?text=Olá! Gostaria de solicitar a ficha técnica completa do PFB Orbital."
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#1a365d] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#002045] transition-colors"
            >
              Falar com Especialista
            </a>
            <Link
              href="/produtos"
              className="border border-[#002045] text-[#002045] text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-8 py-4 hover:bg-[#002045] hover:text-white transition-colors"
            >
              Ver Catálogo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
