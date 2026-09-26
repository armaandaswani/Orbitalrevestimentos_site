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
 * Público: aplicador, instalador e marceneiro, lendo no celular entre um
 * serviço e outro. A primeira versão tinha ~700 palavras em tom de relatório
 * e foi reprovada por isso. Regra desta: frase curta, "você", número no lugar
 * de parágrafo, e a prova (antes/depois de um serviço real) logo no topo.
 * Impacto vem de escala e contraste — nada de neon, dourado ou selo falso.
 */

const URL_PAGINA = "https://orbitalrevestimentos.com.br/academia";

export const metadata: Metadata = {
  title: "Academia Orbital — Aprenda a instalar PFB",
  description:
    "Curso prático de instalação do Painel de Fibra de Bambu (PFB), do corte ao acabamento. Para aplicadores, instaladores e marceneiros. Entre na lista de espera.",
  alternates: { canonical: URL_PAGINA },
  openGraph: {
    title: "Academia Orbital — Seja Instalador Certificado Orbital",
    description:
      "Curso prático de instalação de PFB, do corte ao acabamento. Entre na lista e seja avisado quando abrir.",
    url: URL_PAGINA,
  },
};

const DESTAQUES = [
  { t: "Passo a passo", d: "do corte ao acabamento" },
  { t: "Certificado", d: "Instalador Orbital" },
  { t: "Compra direta", d: "com a Orbital, depois de certificado" },
];

const NUMEROS = [
  { v: "2–3h", d: "para instalar um cômodo" },
  { v: "11 kg", d: "por placa — leve na parede e no teto" },
  { v: "Sem obra", d: "sem quebra-quebra e sem poeira" },
];

const ETAPAS = [
  { n: "01", t: "Preparar e medir", d: "Superfície, medição e paginação." },
  { n: "02", t: "Cortar e colar", d: "Corte, manuseio, colagem e fixação." },
  { n: "03", t: "Acabar sem erro", d: "Emendas, acabamento e os erros que mais acontecem." },
];

const APLICACOES = ["Parede", "Teto e forro", "Porta", "Superfície curva", "Área molhada"];

const FAQ = [
  { q: "O curso já abriu?", a: "Ainda não. Está em preparação. Quem está na lista é avisado primeiro." },
  { q: "É para quem?", a: "Aplicadores, instaladores e marceneiros que querem instalar PFB do jeito certo." },
  { q: "Tem certificado?", a: "Sim. Quem concluir o curso e a certificação vira Instalador Certificado Orbital." },
  { q: "Paga para entrar na lista?", a: "Não. A lista é grátis e serve só para avisar você quando o curso abrir." },
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

/**
 * Botão verde da Academia. O verde é o da marca (está no logo) — é a energia
 * que a versão da Hotmart tinha, sem o neon. Todo CTA leva ao formulário.
 */
function Cta({ texto = "Quero entrar na lista", largo = false }: { texto?: string; largo?: boolean }) {
  return (
    <a
      href="#lista-de-espera"
      className={`${largo ? "w-full sm:w-auto" : ""} inline-flex items-center justify-center gap-2 bg-[#3b6934] text-white text-xs tracking-[0.12em] uppercase font-bold font-[var(--font-inter)] px-9 py-4 hover:bg-[#2f5529] transition-colors`}
    >
      {texto} <span aria-hidden>→</span>
    </a>
  );
}

/** Antes e depois do mesmo canto do mesmo serviço — a prova, em vez de texto. */
function AntesDepois() {
  return (
    <figure>
      <div className="grid grid-cols-2 gap-2">
        {[
          { src: "/images/academia/lavabo-consultorio-antes.jpg", r: "Antes", alt: "Lavabo de consultório antes: forro aberto e parede com faixa de pastilha" },
          { src: "/images/academia/lavabo-consultorio-depois.jpg", r: "Depois", alt: "O mesmo lavabo depois, revestido com PFB acabamento mármore" },
        ].map(({ src, r, alt }) => (
          <div key={r} className="relative aspect-[3/4] overflow-hidden">
            <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 240px, 50vw" className="object-cover" />
            <span
              className={`absolute top-2 left-2 text-[10px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] px-2 py-1 ${
                r === "Depois" ? "bg-[#3b6934] text-white" : "bg-black/60 text-white"
              }`}
            >
              {r}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="text-white/50 text-xs font-[var(--font-inter)] mt-2.5">
        Lavabo de consultório, antes e depois do PFB.
      </figcaption>
    </figure>
  );
}

export default function AcademiaPage() {
  return (
    <div className="pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── Topo: promessa, botão e a prova ── */}
      <section className="bg-[#002045] text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px)",
          }}
        />
        <div className="relative max-w-[1280px] mx-auto px-4 lg:px-16 py-10 lg:py-20 grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)]">
                Academia Orbital
              </p>
              <span className="border border-[#86a0cd]/40 text-[#86a0cd] text-[9px] tracking-[0.18em] uppercase font-bold font-[var(--font-inter)] px-2.5 py-1">
                Em preparação
              </span>
            </div>
            <h1 className="font-serif text-[40px] leading-[1.05] sm:text-5xl lg:text-[64px] lg:leading-[1.02] font-normal tracking-[-0.02em] mb-5">
              Aprenda a instalar PFB.
              <br />
              <em className="text-[#86a0cd]">Seja Instalador Certificado Orbital.</em>
            </h1>
            <p className="text-white/75 text-base lg:text-lg font-[var(--font-inter)] leading-relaxed max-w-lg mb-8">
              Curso prático do Painel de Fibra de Bambu (PFB), do corte ao acabamento. Para aplicadores,
              instaladores e marceneiros.
            </p>
            <Cta largo />
            <p className="text-white/50 text-xs font-[var(--font-inter)] mt-3">
              O curso ainda não abriu. Entrar na lista é grátis — você é avisado primeiro.
            </p>

            <dl className="grid grid-cols-3 gap-3 border-t border-white/15 mt-9 pt-6 max-w-lg">
              {DESTAQUES.map(({ t, d }) => (
                <div key={t}>
                  <dt className="text-white text-sm font-bold font-[var(--font-inter)] leading-tight">{t}</dt>
                  <dd className="text-white/50 text-[11px] font-[var(--font-inter)] leading-snug mt-1">{d}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="w-full max-w-md mx-auto lg:max-w-none">
            <AntesDepois />
          </div>
        </div>
      </section>

      {/* ── Por que PFB: número, não parágrafo ── */}
      <section className="bg-white py-12 lg:py-20 border-b border-[#eeeeee]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">
            Por que PFB
          </p>
          <h2 className="font-serif text-[#002045] text-3xl lg:text-5xl font-normal mb-10">
            Rápido, leve e limpo de instalar.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 sm:divide-x sm:divide-[#e2e2e2]">
            {NUMEROS.map(({ v, d }, i) => (
              <ScrollReveal key={v} direction="up" delay={i * 80} className="sm:px-8 first:sm:pl-0">
                <p className="font-serif text-[#002045] text-5xl lg:text-6xl font-normal leading-none mb-2">{v}</p>
                <p className="text-[#43474e] text-sm font-[var(--font-inter)]">{d}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── O que você aprende: 3 etapas + onde aplicar ── */}
      <section className="bg-[#f5f5f3] py-12 lg:py-20">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16 grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-center">
          <div>
            <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">
              No curso
            </p>
            <h2 className="font-serif text-[#002045] text-3xl lg:text-5xl font-normal mb-8">
              Do primeiro corte ao acabamento.
            </h2>
            <ol className="space-y-5 mb-8">
              {ETAPAS.map(({ n, t, d }) => (
                <li key={n} className="flex gap-5 items-baseline border-t border-[#dcdcd8] pt-5">
                  <span className="font-serif text-[#3b6934] text-3xl leading-none w-10 flex-shrink-0">{n}</span>
                  <div>
                    <h3 className="font-serif text-[#002045] text-xl lg:text-2xl font-normal leading-tight">{t}</h3>
                    <p className="text-[#43474e] text-sm font-[var(--font-inter)] mt-1">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-[#74777f] text-[11px] tracking-[0.15em] uppercase font-bold font-[var(--font-inter)] mb-3">
              Onde aplicar
            </p>
            <ul className="flex flex-wrap gap-2">
              {APLICACOES.map((a) => (
                <li key={a} className="bg-white border border-[#dcdcd8] text-[#002045] text-sm font-[var(--font-inter)] px-3 py-1.5">
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <ScrollReveal direction="up" className="w-full max-w-sm mx-auto lg:max-w-none">
            <figure>
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src="/images/academia/escadaria-residencial.jpg"
                  alt="Escadaria residencial com parede revestida em PFB acabamento madeira"
                  fill
                  sizes="(min-width: 1024px) 400px, 384px"
                  className="object-cover"
                />
              </div>
              <figcaption className="text-[#74777f] text-xs font-[var(--font-inter)] mt-2.5">
                Escadaria residencial com PFB.
              </figcaption>
            </figure>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Certificado ── */}
      <section className="bg-[#002045] text-white py-14 lg:py-24">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <ScrollReveal direction="up" className="max-w-2xl">
            <p className="text-[#a1d494] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-4">
              Certificado
            </p>
            <h2 className="font-serif text-4xl lg:text-6xl font-normal leading-[1.05] mb-6">
              Instalador Certificado <em className="text-[#86a0cd]">Orbital</em>
            </h2>
            <p className="text-white/75 text-base lg:text-lg font-[var(--font-inter)] leading-relaxed">
              Termine o curso, conclua a certificação e mostre ao seu cliente que você instala no padrão
              Orbital. Depois de certificado, você compra PFB direto com a Orbital.
            </p>
          </ScrollReveal>
          <div className="flex-shrink-0">
            <Cta largo />
          </div>
        </div>
      </section>

      {/* ── Lista de espera ── */}
      <section id="lista-de-espera" className="scroll-mt-20 py-12 lg:py-20 bg-[#f5f5f3]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16 grid lg:grid-cols-[1fr_1.5fr] gap-8 lg:gap-16 items-start">
          <div>
            <p className="text-[#74777f] text-xs tracking-[0.2em] uppercase font-semibold font-[var(--font-inter)] mb-3">
              Lista de espera
            </p>
            <h2 className="font-serif text-[#002045] text-3xl lg:text-5xl font-normal leading-tight mb-4">
              Entre na lista.
            </h2>
            <p className="text-[#43474e] text-base font-[var(--font-inter)] leading-relaxed">
              O curso ainda não abriu. Deixe seu WhatsApp e avisamos você quando abrir.
            </p>
          </div>
          <ListaEsperaForm />
        </div>
      </section>

      {/* ── Dúvidas ── */}
      <section className="py-12 lg:py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-16">
          <h2 className="font-serif text-[#002045] text-2xl lg:text-4xl font-normal mb-8">Dúvidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="border-t border-[#eeeeee] pt-5">
                <h3 className="font-serif text-[#002045] text-lg font-normal mb-1.5">{q}</h3>
                <p className="text-[#43474e] text-sm font-[var(--font-inter)] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fechamento ── */}
      <section className="py-14 lg:py-24 bg-[#002045] text-white">
        <div className="max-w-[760px] mx-auto px-4 lg:px-8 text-center">
          <ScrollReveal direction="up">
            <h2 className="font-serif text-white text-3xl lg:text-5xl font-normal leading-tight mb-8">
              O próximo Instalador Certificado Orbital pode ser você.
            </h2>
            <Cta largo />
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
