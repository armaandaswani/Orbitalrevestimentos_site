import type { Metadata } from "next";
import Image from "next/image";
import ScrollReveal from "@/components/ScrollReveal";
import ListaEsperaForm from "./ListaEsperaForm";
import AntesDepois from "./AntesDepois";
import CtaFixo from "./CtaFixo";

/**
 * Academia Orbital — lista de espera.
 *
 * Campanha dentro da marca: Montserrat ExtraBold em caixa alta nos títulos,
 * Verde Bambu (#36A35C, com texto azul-tinta) na conversão.
 * Público: aplicador, instalador e marceneiro, no celular. Eles não leem
 * parágrafo — cada seção é UM título curto e UMA prova visual, com espaço em
 * volta. Versões anteriores foram reprovadas por excesso de texto; antes de
 * acrescentar uma frase aqui, tire outra.
 *
 * O formulário é o centro da página e fica no topo; todo botão volta para ele.
 *
 * O curso AINDA NÃO EXISTE: nada de preço, duração, número de aulas, data,
 * vagas, contador ou "inscrições abertas". O curso não é gratuito; gratuita é
 * só a lista.
 *
 * Fotos: só obras reais da Orbital. Os "depois" em PNG de /images/projetos são
 * imagens geradas e não entram aqui.
 */

// Títulos da campanha: Montserrat (font-sans) — o manual reserva a Noto Serif
// Display para títulos editoriais; aqui o tom é de campanha, em caixa alta.
const D = "font-sans tracking-[-0.01em]";

const URL_PAGINA = "https://orbitalrevestimentos.com.br/academia";

export const metadata: Metadata = {
  title: "Academia Orbital — Aprenda a instalar PFB",
  description:
    "Aprenda a instalar o Painel Flexível Fibra de Bambu (PFB), do corte ao acabamento, e conquiste a Certificação Orbital. Para aplicadores, instaladores e marceneiros. Entre na lista de espera.",
  alternates: { canonical: URL_PAGINA },
  openGraph: {
    title: "Academia Orbital — Aprenda a instalar PFB",
    description: "Um novo serviço para o seu portfólio. Entre na lista de espera e seja avisado primeiro.",
    url: URL_PAGINA,
  },
};

const LIMA = "#36A35C"; // Verde Bambu

const BENEFICIOS = ["Mais rapidez", "Menos retrabalho", "Novo serviço", "Certificação Orbital"];

const PARES = [
  {
    rotulo: "Lavabo de consultório",
    par: {
      antes: "/images/academia/lavabo-consultorio-antes.jpg",
      depois: "/images/academia/lavabo-consultorio-depois.jpg",
      altAntes: "Lavabo de consultório antes: forro aberto e parede com faixa de pastilha",
      altDepois: "O mesmo lavabo depois, com PFB acabamento mármore e forro amadeirado",
    },
  },
  {
    rotulo: "Banheiro com box",
    par: {
      antes: "/images/academia/banheiro-box-antes.jpg",
      depois: "/images/academia/banheiro-box-depois.jpg",
      altAntes: "Banheiro antes: azulejo branco e painel fotográfico na parede",
      altDepois: "O mesmo banheiro depois, com paredes claras e forro amadeirado em PFB",
    },
  },
];

const APLICACOES = [
  { t: "Paredes", src: "/images/academia/escadaria-residencial.jpg", alt: "Parede de escadaria revestida com PFB acabamento madeira" },
  { t: "Tetos e forros", src: "/images/academia/aplic-teto.jpg", alt: "Parede e teto revestidos com PFB acabamento mármore escuro" },
  { t: "Portas", src: "/images/academia/aplic-porta.jpg", alt: "Porta revestida com PFB, alinhada à parede de mármore" },
  { t: "Curvas", src: "/images/academia/aplic-curva.jpg", alt: "Balcão curvo de quiosque revestido com PFB acabamento madeira" },
  { t: "Colunas", src: "/images/academia/aplic-coluna.jpg", alt: "Coluna revestida com PFB acabamento mármore claro" },
  { t: "Áreas molhadas", src: "/images/academia/aplic-area-molhada.jpg", alt: "Box de banheiro com paredes e forro em PFB" },
];

const NIVEIS = ["Preparar", "Cortar", "Fixar", "Acabar", "Aplicar"];

const ETAPAS_CERT = ["Treinamento", "Conclusão", "Certificação", "Instalador Orbital"];

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://orbitalrevestimentos.com.br" },
    { "@type": "ListItem", position: 2, name: "Academia Orbital", item: URL_PAGINA },
  ],
};

/** Todo botão volta para o formulário no topo. Alto: é tocado com o polegar. */
function Cta({ texto, tom = "lima" }: { texto: string; tom?: "lima" | "navy" | "verde" }) {
  const cor = {
    lima: "bg-[#36A35C] text-[#0D1830] hover:bg-[#4BB571]",
    navy: "bg-[#0B1F45] text-white hover:bg-[#2347A0]",
    verde: "bg-[#36A35C] text-[#0B1F45] hover:bg-[#4BB571]",
  }[tom];
  return (
    <a
      href="#lista-de-espera"
      className={`group w-full sm:w-auto inline-flex items-center justify-center gap-3 min-h-14 px-6 sm:px-8 py-4 text-sm tracking-[0.08em] sm:tracking-[0.12em] uppercase font-extrabold transition-colors ${cor}`}
    >
      {texto}
      <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
    </a>
  );
}

const H2 = `${D} text-[27px] leading-[1.05] sm:text-[40px] lg:text-[50px] lg:leading-[1.02] font-extrabold uppercase`;

export default function AcademiaPage() {
  return (
    <div className="pt-20 bg-[#0B1F45]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ── Topo: promessa + formulário ── */}
      <section id="academia-topo" className="bg-[#0B1F45] text-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16 pt-10 pb-14 lg:py-20 lg:grid lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:items-center">
          <div className="mb-10 lg:mb-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-6">
              <span className="text-[11px] tracking-[0.22em] uppercase font-bold" style={{ color: LIMA }}>
                Academia Orbital
              </span>
              <span className="border border-white/25 text-white/70 text-[10px] tracking-[0.18em] uppercase font-bold px-2 py-0.5">
                Em preparação
              </span>
            </div>
            <h1 className={`${D} text-[30px] leading-[1.05] sm:text-5xl lg:text-[52px] xl:text-[58px] lg:leading-[1.02] font-extrabold uppercase mb-6`}>
              Aprenda a instalar PFB.
              <br />
              <span style={{ color: LIMA }}>Ganhe um novo serviço.</span>
            </h1>
            <p className="text-white/70 text-base lg:text-lg leading-relaxed max-w-md">
              Curso prático do Painel Flexível Fibra de Bambu (PFB), do corte ao acabamento. Com Certificação Orbital.
            </p>
          </div>

          <div id="lista-de-espera" className="scroll-mt-24">
            <p className={`${D} text-2xl lg:text-[28px] leading-none font-bold uppercase mb-4`}>
              Entre na <span style={{ color: LIMA }}>lista de espera</span>
            </p>
            <ListaEsperaForm />
          </div>
        </div>
      </section>

      {/* ── Faixa: os quatro ganhos, em quatro palavras ── */}
      <section className="bg-[#F6F5F2] text-[#0D1830] border-b border-[#e2e2e2]" aria-label="O que você ganha">
        <ul className="max-w-[1280px] mx-auto grid grid-cols-2 lg:grid-cols-4">
          {BENEFICIOS.map((b, i) => (
            <li
              key={b}
              className={`px-4 lg:px-8 py-5 lg:py-6 border-[#0D1830]/15 ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b lg:border-b-0" : ""} lg:border-r lg:last:border-r-0`}
            >
              <span className={`${D} block text-xl lg:text-[26px] leading-none font-bold uppercase`}>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── A prova ── */}
      <section className="bg-white text-[#0D1830] py-20 lg:py-32">
        <div className="max-w-[1080px] mx-auto px-4 lg:px-16">
          <ScrollReveal direction="up">
            <h2 className={`${H2} mb-12 lg:mb-16`}>
              Você vai aprender
              <br />
              <span className="text-[#1F7A44]">a fazer isso.</span>
            </h2>
          </ScrollReveal>
          <div className="space-y-16 lg:space-y-24">
            {PARES.map(({ rotulo, par }) => (
              <ScrollReveal key={rotulo} direction="up">
                <div className="md:max-w-[820px]">
                  <AntesDepois par={par} rotulo={rotulo} />
                </div>
                <p className={`${D} text-xl lg:text-2xl font-bold uppercase mt-4`}>{rotulo}</p>
              </ScrollReveal>
            ))}
          </div>
          <div className="mt-14 lg:mt-20">
            <Cta texto="Quero entrar na lista" tom="verde" />
          </div>
        </div>
      </section>

      {/* ── Uma frase, e só ── */}
      <section className="bg-[#0B1F45] py-24 lg:py-36">
        <ScrollReveal direction="up" className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <p className={`${D} text-white text-[27px] leading-[1.05] sm:text-[40px] lg:text-[52px] font-extrabold uppercase`}>
            PFB não é mais o futuro.
            <br />
            <span style={{ color: LIMA }}>Já é o presente!</span>
          </p>
        </ScrollReveal>
      </section>

      {/* ── Onde aplica: foto e uma palavra ── */}
      <section className="bg-white text-[#0D1830] py-20 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <ScrollReveal direction="up">
            <h2 className={`${H2} mb-12 lg:mb-16`}>
              Não é <span className="text-[#1F7A44]">só parede.</span>
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4">
            {APLICACOES.map(({ t, src, alt }, i) => (
              <ScrollReveal key={t} direction="up" delay={(i % 3) * 80}>
                <figure className="group relative aspect-[3/4] overflow-hidden bg-[#0B1F45]">
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    sizes="(min-width: 1024px) 400px, 50vw"
                    className="object-cover transition-transform duration-700 lg:group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F45]/80 via-transparent to-transparent" />
                  <figcaption className={`${D} absolute left-3 bottom-3 lg:left-5 lg:bottom-5 text-white text-xl lg:text-2xl leading-none font-bold uppercase`}>
                    {t}
                  </figcaption>
                </figure>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── O que aprende: cinco palavras, em escada ── */}
      <section className="bg-[#0B1F45] text-white py-20 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <ScrollReveal direction="up">
            <h2 className={`${H2} mb-12 lg:mb-20`}>
              Do corte
              <br />
              <span style={{ color: LIMA }}>ao acabamento.</span>
            </h2>
          </ScrollReveal>
          <ol className="grid grid-cols-1 lg:grid-cols-5 gap-2 lg:gap-3 lg:items-end">
            {NIVEIS.map((t, i) => (
              <li key={t} style={{ ["--degrau" as string]: `${i * 36}px` }} className="lg:mb-[var(--degrau)]">
                <ScrollReveal direction="up" delay={i * 90}>
                  <div className="border border-white/15 px-5 py-4 lg:p-6 flex items-center gap-5 lg:block">
                    <span className={`${D} text-4xl lg:text-5xl leading-none font-extrabold text-transparent [-webkit-text-stroke:1.5px_#36A35C] w-12 lg:w-auto shrink-0`}>
                      0{i + 1}
                    </span>
                    <span className={`${D} block text-2xl lg:text-[28px] leading-none font-bold uppercase lg:mt-8`}>{t}</span>
                  </div>
                </ScrollReveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Certificação ── */}
      <section className="bg-[#0B1F45] text-white border-t border-white/10 py-20 lg:py-32">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <ScrollReveal direction="up">
            <p className="text-[11px] lg:text-xs tracking-[0.22em] uppercase font-bold mb-5" style={{ color: LIMA }}>
              Não é só um curso
            </p>
            <h2 className={`${H2} mb-12 lg:mb-16`}>
              Saia
              <br />
              <span style={{ color: LIMA }}>Instalador Certificado Orbital.</span>
            </h2>
          </ScrollReveal>

          <ol className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mb-10 lg:mb-12">
            {ETAPAS_CERT.map((e, i) => {
              const ultima = i === ETAPAS_CERT.length - 1;
              return (
                <li
                  key={e}
                  className={`p-4 lg:p-6 border ${ultima ? "border-[#36A35C] bg-[#36A35C] text-[#0D1830]" : "border-white/20"}`}
                >
                  <span className={`block text-[11px] font-bold mb-2 ${ultima ? "opacity-70" : "text-white/40"}`}>
                    {i + 1}
                  </span>
                  <span className={`${D} block text-xl lg:text-[26px] leading-none font-bold uppercase`}>{e}</span>
                </li>
              );
            })}
          </ol>

          <p className="text-white/70 text-base lg:text-lg mb-10 lg:mb-12">
            Certificado, você compra PFB direto com a Orbital.
          </p>
          <Cta texto="Quero fazer parte" />
        </div>
      </section>

      {/* ── Fechamento: volta para o formulário ── */}
      <section className="bg-[#F6F5F2] text-[#0D1830] pt-20 pb-32 md:pb-24 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16 lg:flex lg:items-end lg:justify-between gap-10">
          <p className={`${D} text-[27px] leading-[1.05] sm:text-[40px] lg:text-[46px] font-extrabold uppercase mb-10 lg:mb-0 max-w-3xl`}>
            Quando as portas abrirem, você vai querer estar aqui.
          </p>
          <Cta texto="Quero meu lugar na lista" tom="navy" />
        </div>
      </section>

      <CtaFixo />
    </div>
  );
}
