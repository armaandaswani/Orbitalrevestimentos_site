import type { Metadata } from "next";
import Image from "next/image";
import { Barlow_Condensed } from "next/font/google";
import VideoShort from "@/components/VideoShort";
import { DiferenciaisPfb } from "@/components/ConhecaPfb";
import Botao from "@/components/ds/Botao";
import Capitulo from "@/components/ds/Capitulo";
import ProgressoCapitulos from "@/components/ds/ProgressoCapitulos";
import Revelar from "@/components/projetos/Revelar";
import AntesDepois from "./AntesDepois";
import CtaFixo from "./CtaFixo";

/**
 * Academia Orbital — a formação em instalação do Painel Flexível em Fibra de
 * Bambu (PFB), como apresentação em capítulos.
 *
 * Campanha dentro da marca: tipografia condensada nos títulos, Verde Bambu
 * (#36A35C, com texto azul-tinta) na conversão. Público: aplicador,
 * instalador e marceneiro, no celular. Eles não leem parágrafo — cada seção é
 * UM título curto e UMA prova visual. Antes de acrescentar uma frase, tire
 * outra.
 *
 * Regras do dono: chamar sempre de "formação" (nunca "workshop"); NUNCA
 * mostrar número de vagas nem data; a inscrição passa pelo pré-contato
 * ("Quero participar da formação" abre a aba do consultor). Sai com
 * certificado de conclusão e compra PFB direto com a Orbital.
 *
 * Fotos: só obras reais da Orbital.
 */
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], display: "swap" });
const D = display.className;

const URL_PAGINA = "https://orbitalrevestimentos.com.br/academia";

export const metadata: Metadata = {
  title: "Academia Orbital — Formação em instalação do PFB",
  description:
    "Formação prática em instalação do Painel Flexível em Fibra de Bambu (PFB), do corte ao acabamento, no padrão Orbital. Saia com certificado e compre PFB direto com a Orbital.",
  alternates: { canonical: URL_PAGINA },
  openGraph: {
    title: "Academia Orbital — Formação em instalação do PFB",
    description: "Formação prática, no padrão Orbital. Saia com certificado e um novo serviço no portfólio.",
    url: URL_PAGINA,
  },
};

const LIMA = "#36A35C"; // Verde Bambu

const BENEFICIOS = ["Formação prática", "Padrão Orbital", "Certificado de conclusão", "Compra direta Orbital"];

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

const ETAPAS_CERT = ["Formação", "Conclusão", "Certificado", "Compra direta"];

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://orbitalrevestimentos.com.br" },
    { "@type": "ListItem", position: 2, name: "Academia Orbital", item: URL_PAGINA },
  ],
};

const CTA = "Quero participar da formação";
const H2 = `${D} text-[34px] leading-none sm:text-5xl lg:text-[60px] lg:leading-[0.98] font-bold uppercase`;

/** Todo botão abre o pré-contato: a inscrição na formação passa pelo consultor. */
function Cta({ texto = CTA, tom = "verde" }: { texto?: string; tom?: "verde" | "cheio" }) {
  return (
    <Botao contato inicial={{ conhece: "sim" }} seta largo className="min-h-14 text-sm font-extrabold" tom={tom}>
      {texto}
    </Botao>
  );
}

export default function AcademiaPage() {
  return (
    <div className="pt-20 bg-[#0B1F45]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <ProgressoCapitulos />

      {/* ── Topo: a promessa ── */}
      <section id="academia-topo" className="bg-[#0B1F45] text-white ds-escuro">
        <div className="ds-wrap pt-10 pb-14 lg:py-20 lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:items-center">
          <div className="mb-10 lg:mb-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-6">
              <span className="text-sobre tracking-[0.22em] uppercase font-bold" style={{ color: LIMA }}>Academia Orbital</span>
              <span className="border border-white/25 text-white/70 text-sobre tracking-[0.18em] uppercase font-bold px-2 py-0.5">Formação em instalação</span>
            </div>
            <h1 className={`${D} text-[40px] leading-[0.98] sm:text-6xl lg:text-[64px] xl:text-[70px] lg:leading-[0.95] font-extrabold uppercase mb-6`}>
              Aprenda a instalar o PFB.
              <br />
              <span style={{ color: LIMA }}>Ganhe um novo serviço.</span>
            </h1>
            <p className="text-white/75 text-lead max-w-md text-pretty">
              Formação prática no Painel Flexível em Fibra de Bambu (PFB), do corte ao acabamento, no padrão Orbital. Você sai com
              certificado e compra PFB direto com a Orbital.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Cta />
              <Botao href="#prova" tom="linha" largo className="min-h-14">Ver o que você vai fazer</Botao>
            </div>
          </div>
          <div className="relative aspect-[4/5] max-h-[70svh] overflow-hidden bg-primary-container">
            <Image src="/images/academia/lavabo-consultorio-inteiro.jpg" alt="Lavabo inteiro revestido com PFB, obra real da Orbital" fill priority sizes="(max-width: 1023px) 92vw, 520px" className="object-cover" />
          </div>
        </div>
      </section>

      {/* ── Faixa: os quatro ganhos, em quatro palavras ── */}
      <section className="bg-[#F6F5F2] text-[#0D1830] border-b border-[#e2e2e2]" aria-label="O que você ganha">
        <ul className="max-w-[100rem] mx-auto grid grid-cols-2 lg:grid-cols-4">
          {BENEFICIOS.map((b, i) => (
            <li key={b} className={`px-4 lg:px-8 py-5 lg:py-6 border-[#0D1830]/15 ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b lg:border-b-0" : ""} lg:border-r lg:last:border-r-0`}>
              <span className={`${D} block text-xl lg:text-[26px] leading-none font-bold uppercase`}>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 01 A prova ── */}
      <Capitulo id="prova" numero="01" rotulo="A prova" rotuladoPor="prova-titulo" className="bg-white text-[#0D1830] ds-secao">
        <div className="ds-wrap max-w-[60rem]">
          <Revelar>
            <h2 id="prova-titulo" className={`${H2} mb-12 lg:mb-16`}>
              Você vai aprender
              <br />
              <span className="text-[#1F7A44]">a fazer isso.</span>
            </h2>
          </Revelar>
          <div className="space-y-16 lg:space-y-24">
            {PARES.map(({ rotulo, par }) => (
              <Revelar key={rotulo}>
                <AntesDepois par={par} rotulo={rotulo} />
                <p className={`${D} text-xl lg:text-2xl font-bold uppercase mt-4`}>{rotulo}</p>
              </Revelar>
            ))}
          </div>
          <div className="mt-14 lg:mt-20"><Cta /></div>
        </div>
      </Capitulo>

      {/* ── Uma frase, e só ── */}
      <section className="bg-[#0B1F45] py-20 lg:py-32">
        <Revelar className="ds-wrap">
          <p className={`${D} text-white text-[34px] leading-none sm:text-5xl lg:text-[64px] font-bold uppercase`}>
            PFB não é mais o futuro.
            <br />
            <span style={{ color: LIMA }}>Já é o presente!</span>
          </p>
        </Revelar>
      </section>

      {/* ── 02 O produto: os seis diferenciais, versão curta ── */}
      <Capitulo id="produto" numero="02" rotulo="O produto" className="relative">
        <DiferenciaisPfb tituloClassName={`${D} text-[28px] leading-none sm:text-4xl lg:text-[44px] font-bold uppercase`} />
      </Capitulo>

      {/* ── 03 Onde aplica: foto e uma palavra ── */}
      <Capitulo id="aplicacoes" numero="03" rotulo="Onde aplica" rotuladoPor="aplicacoes-titulo" className="bg-white text-[#0D1830] ds-secao">
        <div className="ds-wrap">
          <Revelar>
            <h2 id="aplicacoes-titulo" className={`${H2} mb-12 lg:mb-16`}>
              Não é <span className="text-[#1F7A44]">só parede.</span>
            </h2>
          </Revelar>
          <ul className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4">
            {APLICACOES.map(({ t, src, alt }, i) => (
              <Revelar key={t} como="li" ordem={i % 3}>
                <figure className="relative aspect-[3/4] overflow-hidden bg-[#0B1F45]">
                  <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 400px, 50vw" className="object-cover mv-desvela" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F45]/80 via-transparent to-transparent" aria-hidden />
                  <figcaption className={`${D} absolute left-3 bottom-3 lg:left-5 lg:bottom-5 text-white text-xl lg:text-2xl leading-none font-bold uppercase`}>{t}</figcaption>
                </figure>
              </Revelar>
            ))}
          </ul>
        </div>
      </Capitulo>

      {/* ── 04 O que aprende: cinco palavras, em escada ── */}
      <Capitulo id="etapas" numero="04" rotulo="O que aprende" rotuladoPor="etapas-titulo" escuro className="bg-[#0B1F45] text-white ds-secao">
        <div className="ds-wrap">
          <Revelar>
            <h2 id="etapas-titulo" className={`${H2} mb-12 lg:mb-20`}>
              Do corte
              <br />
              <span style={{ color: LIMA }}>ao acabamento.</span>
            </h2>
          </Revelar>
          <ol className="grid grid-cols-1 lg:grid-cols-5 gap-2 lg:gap-3 lg:items-end">
            {NIVEIS.map((t, i) => (
              <Revelar key={t} como="li" ordem={i}>
                <div style={{ ["--degrau" as string]: `${i * 36}px` }} className="lg:mb-[var(--degrau)] border border-white/15 px-5 py-4 lg:p-6 flex items-center gap-5 lg:block">
                  <span className={`${D} text-4xl lg:text-5xl leading-none font-extrabold text-transparent [-webkit-text-stroke:1.5px_#36A35C] w-12 lg:w-auto shrink-0`}>0{i + 1}</span>
                  <span className={`${D} block text-2xl lg:text-[28px] leading-none font-bold uppercase lg:mt-8`}>{t}</span>
                </div>
              </Revelar>
            ))}
          </ol>
          <p className="text-white/70 text-corpo mt-10 max-w-xl">Cola PU-40 nas paredes, 2 tubos por placa; cola de contato em tetos e curvas. A Orbital fornece o material; quem instala é você.</p>
        </div>
      </Capitulo>

      {/* ── 05 Quem instala, aprova ── */}
      <Capitulo id="instalador" numero="05" rotulo="Quem instala" rotuladoPor="instalador-titulo" className="bg-white text-[#0D1830] ds-secao">
        <div className="ds-wrap grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 lg:gap-24 items-center">
          <Revelar>
            <p className="text-sobre tracking-[0.22em] uppercase font-bold mb-5 text-[#1F7A44]">Opinião de instalador</p>
            <h2 id="instalador-titulo" className={`${H2} mb-10 lg:mb-12`}>
              Serviço rápido.
              <br />
              <span className="text-[#1F7A44]">Mais obras no mês.</span>
            </h2>
            <ul className="grid grid-cols-2 gap-2 lg:gap-3 mb-10 lg:mb-12 max-w-xl">
              {["Fácil de aplicar", "Leve de manusear", "Simples de cortar", "Acabamento limpo"].map((t) => (
                <li key={t} className="border border-[#0D1830]/15 px-4 py-4 lg:px-5">
                  <span className={`${D} block text-xl lg:text-2xl leading-none font-bold uppercase`}>{t}</span>
                </li>
              ))}
            </ul>
            <Cta />
          </Revelar>
          <Revelar ordem={1}>
            <VideoShort id="hpgoCY8L2PI" poster="/images/videos/opiniao-instalador-adam-werk.jpg" titulo="Opinião de instalador" className="max-w-[320px] lg:max-w-none mx-auto" />
          </Revelar>
        </div>
      </Capitulo>

      {/* ── 06 Certificação ── */}
      <Capitulo id="certificado" numero="06" rotulo="Certificado" rotuladoPor="certificado-titulo" escuro className="bg-[#0B1F45] text-white border-t border-white/10 ds-secao">
        <div className="ds-wrap">
          <Revelar>
            <p className="text-sobre tracking-[0.22em] uppercase font-bold mb-5" style={{ color: LIMA }}>Não é só uma formação</p>
            <h2 id="certificado-titulo" className={`${H2} mb-12 lg:mb-16`}>
              Saia
              <br />
              <span style={{ color: LIMA }}>certificado.</span>
            </h2>
          </Revelar>
          <ol className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mb-10 lg:mb-12">
            {ETAPAS_CERT.map((e, i) => {
              const ultima = i === ETAPAS_CERT.length - 1;
              return (
                <Revelar key={e} como="li" ordem={i} className={`p-4 lg:p-6 border ${ultima ? "border-[#36A35C] bg-[#36A35C] text-[#0D1830]" : "border-white/20"}`}>
                  <span className={`block text-sobre font-bold mb-2 ${ultima ? "opacity-70" : "text-white/50"}`}>{i + 1}</span>
                  <span className={`${D} block text-xl lg:text-[26px] leading-none font-bold uppercase`}>{e}</span>
                </Revelar>
              );
            })}
          </ol>
          <p className="text-white/75 text-lead mb-10 lg:mb-12 max-w-2xl">Com o certificado de conclusão, você compra PFB direto com a Orbital.</p>
          <Cta />
        </div>
      </Capitulo>

      {/* ── Fechamento ── */}
      <section className="bg-[#F6F5F2] text-[#0D1830] pt-16 pb-32 md:pb-20 lg:py-24">
        <div className="ds-wrap lg:flex lg:items-end lg:justify-between gap-10">
          <div className="mb-10 lg:mb-0 max-w-3xl">
            <p className={`${D} text-[34px] leading-none sm:text-5xl lg:text-[56px] font-bold uppercase`}>Formação em instalação do PFB, no padrão Orbital.</p>
            <p className="font-serif italic text-[#0B1F45]/70 text-lead mt-4">Novas possibilidades para seus projetos.</p>
          </div>
          <Cta tom="cheio" />
        </div>
      </section>

      <CtaFixo texto="Participar da formação" />
    </div>
  );
}
