import type { Metadata } from "next";
import Image from "next/image";
import ScrollReveal from "@/components/ScrollReveal";
import ListaEsperaForm from "./ListaEsperaForm";

/**
 * Academia Orbital — lista de espera.
 *
 * O curso AINDA NÃO EXISTE. Esta página só capta interesse. Por isso não há
 * preço, duração, número de aulas, data, vagas nem nenhum CTA que sugira
 * compra ou inscrição aberta — e nada disso deve ser acrescentado sem que a
 * Orbital defina. Todo CTA leva ao formulário (#lista-de-espera).
 *
 * "Orbital primeiro, Academia depois": mesmo header/footer (vêm do layout
 * raiz), mesma paleta, mesma tipografia e os mesmos padrões de seção da
 * /parcerias e da home. Nada de estética de infoproduto.
 */

const URL_PAGINA = "https://orbitalrevestimentos.com.br/academia";

/**
 * Forma por extenso do PFB. "Painel" é a forma preferida (é o que está na
 * etiqueta física do produto); "Placa" também é aceita — ver AGENTS.md.
 */
const PFB_EXTENSO_PLURAL = "Painéis de Fibra de Bambu";

export const metadata: Metadata = {
  title: "Academia Orbital — Capacitação em Instalação de PFB",
  description:
    `Programa de capacitação técnica da Orbital Revestimentos para aplicadores: instalação de ${PFB_EXTENSO_PLURAL} (PFB) no padrão Orbital. Em desenvolvimento — entre na lista de espera.`,
  alternates: { canonical: URL_PAGINA },
  openGraph: {
    title: "Academia Orbital — Torne-se um Instalador Certificado Orbital",
    description:
      "Treinamento técnico para aplicadores que querem instalar PFB no padrão Orbital. Em desenvolvimento — entre na lista de espera.",
    url: URL_PAGINA,
  },
};

const TEMAS = [
  "Preparação e análise da superfície",
  "Planejamento, medição e paginação",
  "Corte e manuseio correto das placas",
  "Colagem, fixação e aplicação",
  "Emendas e acabamento",
  "Aplicações em paredes",
  "Aplicações em portas",
  "Aplicações em superfícies curvas",
  "Aplicações em forros e tetos",
  "Aplicações em áreas úmidas",
  "Detalhes técnicos e boas práticas de instalação",
  "Erros comuns de aplicação e como evitá-los",
];

const ETAPAS = [
  { n: "01", t: "Aprenda", d: "Os fundamentos do material e o processo completo de instalação, passo a passo." },
  { n: "02", t: "Aplique", d: "A técnica levada à prática, seguindo o padrão de aplicação da Orbital." },
  { n: "03", t: "Certifique-se", d: "Conclua o treinamento e o processo de certificação da Academia Orbital." },
];

const FAQ = [
  {
    q: "O curso já está disponível?",
    a: "Ainda não. A Academia Orbital está em desenvolvimento. A lista de espera foi criada para reunir os profissionais interessados e comunicar as novidades quando o treinamento estiver disponível.",
  },
  {
    q: "Para quem é a Academia Orbital?",
    a: "Para aplicadores e profissionais que desejam aprender tecnicamente como trabalhar com o PFB e executar sua instalação seguindo o padrão Orbital.",
  },
  {
    q: "O treinamento terá certificação?",
    a: "Sim. A proposta da Academia Orbital é capacitar o profissional para que, ao concluir o treinamento e o processo de certificação, possa se tornar um Instalador Certificado Orbital.",
  },
  {
    q: "Preciso pagar para entrar na lista de espera?",
    a: "Não. A lista de espera serve apenas para registrar o interesse no treinamento e receber informações quando a Academia Orbital for lançada.",
  },
];

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://orbitalrevestimentos.com.br" },
    { "@type": "ListItem", position: 2, name: "Academia Orbital", item: URL_PAGINA },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

/** Mesmo padrão de botão da /parcerias. Todo CTA vai para o formulário. */
function CtaListaEspera({ tom = "claro", texto = "Entrar na lista de espera" }: { tom?: "claro" | "escuro"; texto?: string }) {
  const cls =
    tom === "claro"
      ? "bg-white text-[#002045] hover:bg-[#f3f3f3]"
      : "bg-[#002045] text-white hover:bg-[#1a365d]";
  return (
    <a
      href="#lista-de-espera"
      className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 ${cls} text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-9 py-4 transition-colors`}
    >
      {texto} <span aria-hidden>→</span>
    </a>
  );
}

export default function AcademiaPage() {
  return (
    <div className="pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── Hero ─────────────────────────────── */}
      <section className="bg-[#002045] text-white relative overflow-hidden">
        {/* Mesma malha da /parcerias — aqui ela também lembra uma paginação. */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px)",
          }}
        />
        {/* Foto sangra até a borda direita da tela (como nos blocos da /parcerias),
            fora do contêiner de 1280px — dentro dele sobrava uma faixa navy à
            direita. Só no desktop: no celular o CTA precisa ficar logo no início. */}
        <div className="hidden lg:block absolute inset-y-0 right-0 lg:w-[36%] xl:w-[40%]">
          <Image
            // Nome novo, e não o arquivo antigo sobrescrito: com minimumCacheTTL de
            // 1 ano, uma imagem trocada sob o mesmo nome segue aparecendo antiga.
            src="/images/academia/canto-parede-teto.jpg"
            alt="Canto revestido com PFB acabamento mármore — emenda e acabamento executados em obra"
            fill
            priority
            sizes="40vw"
            className="object-cover"
          />
        </div>
        <div className="relative max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="lg:w-[60%] xl:w-[56%] py-12 lg:py-16 xl:py-24">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 mb-6">
              <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)]">
                Orbital Revestimentos · <span className="whitespace-nowrap">Academia Orbital</span>
              </p>
              <span className="border border-[#86a0cd]/40 text-[#86a0cd] text-[9px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] px-2.5 py-1">
                Em desenvolvimento
              </span>
            </div>
            <h1 className="font-serif text-[32px] leading-[1.15] lg:text-[44px] xl:text-[56px] lg:leading-[1.1] font-normal tracking-[-0.02em] mb-6">
              Domine a instalação do PFB.
              <br />
              <em className="text-[#86a0cd]">Torne-se um Instalador Certificado Orbital.</em>
            </h1>
            <p className="text-white/70 text-base lg:text-lg font-[var(--font-inter)] leading-relaxed max-w-xl mb-5">
              Treinamento técnico e completo para profissionais que querem aprender a instalar{" "}
              {PFB_EXTENSO_PLURAL} (PFB) seguindo o padrão de aplicação da Orbital.
            </p>
            <p className="text-white/50 text-sm font-[var(--font-inter)] leading-relaxed max-w-xl mb-9 border-l border-white/20 pl-4">
              O curso está em desenvolvimento. Entre na lista de espera para receber as informações de
              lançamento e ter prioridade quando as inscrições forem abertas.
            </p>
            <CtaListaEspera tom="claro" />
          </div>
        </div>
      </section>

      {/* ── O padrão Orbital ─────────────────── */}
      <section className="py-14 lg:py-28 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16 flex flex-col lg:flex-row gap-10 lg:gap-20 items-center">
          <ScrollReveal direction="up" className="lg:w-[55%]">
            <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
              A proposta
            </p>
            <h2 className="font-serif text-[#002045] text-3xl lg:text-[44px] lg:leading-[1.15] font-normal mb-8">
              Mais do que aprender a instalar.
              <br />
              <em className="text-[#1a365d]">Aprenda o padrão Orbital.</em>
            </h2>
            <div className="space-y-5 text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed max-w-xl">
              <p>
                Trabalhar com um novo sistema de revestimento exige conhecer o material a fundo: preparação,
                medição, corte, fixação, acabamento e as particularidades de cada tipo de aplicação.
              </p>
              <p>
                A Academia Orbital nasce para transformar esse conhecimento técnico em um processo estruturado
                de capacitação para aplicadores.
              </p>
              <p className="text-[#002045] font-medium">
                Não se trata de assistir a algumas aulas sobre o produto. A proposta é ensinar o processo
                completo de instalação do PFB — de forma técnica, organizada e aplicável à obra.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={120} className="w-full lg:w-[45%]">
            <div className="relative aspect-[4/5] w-full max-w-md mx-auto lg:max-w-none">
              <Image
                src="/images/academia/placa-padrao-orbital.jpg"
                alt="Placa PFB instalada com a plaqueta de identificação Orbital do modelo"
                fill
                sizes="(min-width: 1024px) 460px, (min-width: 640px) 448px, 100vw"
                className="object-cover"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Do primeiro corte ao acabamento ──── */}
      <section className="py-14 lg:py-28 bg-[#f9f9f9] border-y border-[#eeeeee]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
            <div className="lg:w-[60%]">
              <ScrollReveal direction="up">
                <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
                  Escopo do treinamento
                </p>
                <h2 className="font-serif text-[#002045] text-3xl lg:text-[44px] lg:leading-[1.15] font-normal mb-5">
                  Do primeiro corte ao acabamento final.
                </h2>
                {/* Escopo, não grade: o conteúdo ainda está sendo estruturado. */}
                <p className="text-[#74777f] text-sm font-[var(--font-inter)] leading-relaxed max-w-lg mb-10">
                  As principais áreas que o treinamento pretende abordar. O conteúdo está em estruturação — os
                  temas abaixo indicam o escopo, não a grade final.
                </p>
              </ScrollReveal>
              <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                {TEMAS.map((t, i) => (
                  <li key={t} className="flex items-baseline gap-4 border-t border-[#e2e2e2] py-4">
                    <span className="text-[#86a0cd] text-[11px] tracking-[0.1em] font-semibold font-[var(--font-inter)] tabular-nums w-5 flex-shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[#002045] text-[15px] font-[var(--font-inter)] leading-snug">{t}</span>
                  </li>
                ))}
              </ol>
            </div>
            <ScrollReveal direction="up" delay={120} className="lg:w-[40%]">
              <div className="relative aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[520px] w-full">
                <Image
                  src="/images/academia/obra-em-andamento.jpg"
                  alt="Obra em andamento: banheiro em reforma com placa amadeirada na parede e forro aberto"
                  fill
                  sizes="(min-width: 1024px) 460px, 100vw"
                  className="object-cover object-[18%_center]"
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Certificação ─────────────────────── */}
      <section className="py-14 lg:py-28 bg-[#002045] text-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <ScrollReveal direction="up">
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
              Certificação
            </p>
            <h2 className="font-serif text-3xl lg:text-5xl font-normal mb-6">
              Aprenda. Aplique. Certifique-se.
            </h2>
            <p className="text-white/65 text-base lg:text-lg font-[var(--font-inter)] leading-relaxed max-w-2xl mb-12 lg:mb-16">
              A Academia Orbital foi criada não apenas para transmitir conhecimento sobre o produto, mas para
              capacitar profissionais capazes de executar instalações dentro do padrão técnico esperado pela
              marca.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 md:divide-x md:divide-[#1a365d] border-t border-[#1a365d] pt-8 md:pt-10 mb-14 lg:mb-20">
            {ETAPAS.map(({ n, t, d }, i) => (
              <ScrollReveal key={n} direction="up" delay={i * 100} className="md:px-8 first:md:pl-0 last:md:pr-0">
                <p className="text-[#86a0cd] text-xs tracking-[0.15em] font-semibold font-[var(--font-inter)] mb-3 tabular-nums">{n}</p>
                <h3 className="font-serif text-2xl lg:text-3xl font-normal mb-3">{t}</h3>
                <p className="text-white/60 text-sm font-[var(--font-inter)] leading-relaxed max-w-xs">{d}</p>
              </ScrollReveal>
            ))}
          </div>

          {/* A certificação como consequência da capacitação — tipografia, não selo. */}
          <ScrollReveal direction="up">
            <div className="border border-[#1a365d] px-6 py-10 lg:px-14 lg:py-14 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <div>
                <p className="text-white/55 text-sm font-[var(--font-inter)] leading-relaxed mb-3 max-w-md">
                  Ao concluir o treinamento e o processo de certificação da Academia Orbital, o profissional
                  poderá se tornar um
                </p>
                <p className="font-serif text-3xl lg:text-5xl font-normal leading-tight">
                  Instalador Certificado <em className="text-[#86a0cd]">Orbital</em>
                </p>
                <p className="text-white/55 text-sm font-[var(--font-inter)] leading-relaxed mt-5 max-w-md">
                  Após a certificação, o profissional também poderá manter relacionamento direto com a Orbital
                  para aquisição do PFB.
                </p>
              </div>
              <div className="flex-shrink-0">
                <CtaListaEspera tom="claro" />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Especialização ───────────────────── */}
      <section className="py-14 lg:py-28 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16 flex flex-col-reverse lg:flex-row gap-10 lg:gap-20 items-center">
          <ScrollReveal direction="up" className="w-full lg:w-[45%]">
            <figure>
              <div className="relative aspect-square w-full max-w-md mx-auto lg:max-w-none">
                <Image
                  src="/images/academia/aplicacao-curva.jpg"
                  alt="PFB acabamento madeira aplicado no interior de uma embarcação, acompanhando superfícies curvas e porta"
                  fill
                  sizes="(min-width: 1024px) 460px, (min-width: 640px) 448px, 100vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="text-[#74777f] text-xs font-[var(--font-inter)] mt-3 max-w-md mx-auto lg:max-w-none">
                Aplicação em embarcação: superfícies curvas e portas.
              </figcaption>
            </figure>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={120} className="lg:w-[55%]">
            <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
              Para o profissional
            </p>
            <h2 className="font-serif text-[#002045] text-3xl lg:text-[44px] lg:leading-[1.15] font-normal mb-8">
              Uma nova especialização para o seu portfólio.
            </h2>
            <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed max-w-xl">
              O PFB permite ao aplicador acrescentar uma nova solução de revestimento ao seu repertório
              profissional — e aprender a trabalhar corretamente com um material que tem características
              próprias de instalação.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Lista de espera ──────────────────── */}
      <section id="lista-de-espera" className="scroll-mt-20 py-14 lg:py-24 bg-[#f5f5f3] border-y border-[#e2e2e2]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16 flex flex-col lg:flex-row gap-10 lg:gap-20 items-start">
          <div className="lg:w-[40%] lg:pt-2">
            <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
              Lista de espera
            </p>
            <h2 className="font-serif text-[#002045] text-3xl lg:text-4xl font-normal leading-tight mb-6">
              Seja um dos primeiros a saber quando a Academia Orbital abrir.
            </h2>
            <div className="space-y-4 text-[#43474e] text-sm lg:text-base font-[var(--font-inter)] leading-relaxed">
              <p>A Academia Orbital ainda está em desenvolvimento.</p>
              <p>
                Estamos formando uma lista de profissionais interessados em participar do treinamento e se
                preparar para a certificação em instalação de PFB.
              </p>
              <p>Cadastre-se para receber as informações assim que divulgarmos a abertura da Academia Orbital.</p>
            </div>
          </div>
          <div className="w-full lg:w-[60%]">
            <ListaEsperaForm />
          </div>
        </div>
      </section>

      {/* ── Perguntas frequentes ─────────────── */}
      <section className="py-14 lg:py-24 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <div className="mb-8 lg:mb-12">
            <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-2">
              Dúvidas frequentes
            </p>
            <h2 className="font-serif text-[#002045] text-2xl lg:text-4xl font-normal">
              Perguntas e respostas
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6 lg:gap-y-10">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="border-t border-[#eeeeee] pt-5 lg:pt-6">
                <h3 className="font-serif text-[#002045] text-base lg:text-lg font-normal mb-2">{q}</h3>
                <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chamada final ────────────────────── */}
      <section className="py-16 lg:py-24 bg-[#1e212a] text-white">
        <div className="max-w-[760px] mx-auto px-4 lg:px-8 text-center">
          <ScrollReveal direction="up">
            <p className="text-[#9c9faa] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-5">
              Academia Orbital
            </p>
            <h2 className="font-serif text-white text-3xl lg:text-5xl font-normal leading-tight mb-6">
              O próximo Instalador Certificado Orbital pode ser você.
            </h2>
            <p className="text-white/55 text-base font-[var(--font-inter)] leading-relaxed mb-10">
              Aprenda a trabalhar com o PFB seguindo um processo técnico, estruturado e desenvolvido por quem
              trabalha diretamente com o produto.
            </p>
            <CtaListaEspera tom="claro" />
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
