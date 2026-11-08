import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContatoCta from "@/components/ContatoCta";
import VisaoDoArquiteto from "@/components/VisaoDoArquiteto";
import HeroAssenta from "@/components/home/HeroAssenta";
import Manifesto from "@/components/home/Manifesto";
import Jornada from "@/components/home/Jornada";
import PorQue from "@/components/home/PorQue";
import SeletorLinhas from "@/components/linhas/SeletorLinhas";
import Revelar from "@/components/projetos/Revelar";
import Trilho from "@/components/projetos/Trilho";
import ProjetoCard from "@/components/projetos/ProjetoCard";
import { carregarProjetos } from "@/lib/projetos-dados";
import { CARTAO_PDV, parceirosNaGrade } from "@/lib/cartao-pdv";
import { nomeLugar, porDestaque, type Projeto } from "@/lib/projetos-tipos";

/**
 * Home da marca, não de um produto só. A ordem conta a Orbital: abertura com
 * o slogan da marca → quem somos (frase que acende na rolagem) → o que fazemos (da
 * fábrica até a obra) → por que fazemos → nossas soluções (seletor das
 * linhas) → arquitetos → obras e onde ver → contato → perguntas.
 *
 * Os projetos e parceiros vêm do banco aqui no servidor (republica a cada
 * 5 min, como /projetos); sem banco, ficam as fotos fixas e a página nunca
 * fica vazia.
 */
export const revalidate = 300;

const ASSINATURA = "Novas possibilidades para seus projetos.";

export const metadata: Metadata = {
  title: "Orbital Revestimentos — Novas possibilidades para seus projetos",
  description:
    "Orbital Revestimentos, marca amazônica de revestimentos inovadores em Manaus. Painel Flexível em Fibra de Bambu (PFB) em pronta-entrega, TechStone, a pedra flexível de 3,5 mm, e PFB Carbon. Materiais escolhidos para o clima da Amazônia.",
  alternates: { canonical: "https://orbitalrevestimentos.com.br" },
  keywords: [
    "Orbital Revestimentos",
    "revestimento parede Manaus",
    "revestimento de forro Manaus",
    "PFB painel flexível fibra de bambu",
    "TechStone pedra flexível",
    "revestimento fachada Manaus",
    "showroom revestimento Manaus",
  ],
  openGraph: {
    title: "Orbital Revestimentos — Novas possibilidades para seus projetos",
    description:
      "Marca amazônica de revestimentos inovadores: Painel Flexível em Fibra de Bambu em pronta-entrega, TechStone e PFB Carbon. A Amazônia merece revestimentos feitos para ela.",
    url: "https://orbitalrevestimentos.com.br",
  },
};

const faqs = [
  {
    q: "O que é o PFB Orbital?",
    a: "PFB significa Painel Flexível em Fibra de Bambu — um revestimento eco-premium com substrato de fibra de bambu e acabamento fotorrealista de pedra ou madeira. Instalado diretamente sobre a parede ou forro existente, sem demolição ou obra pesada. Desenvolvido especialmente para o clima úmido do Amazonas.",
  },
  {
    q: "Quais são os diferenciais técnicos do PFB Orbital?",
    a: "O PFB é construído em 5 camadas — do núcleo de fibra de bambu até a película protetora UV — certificadas em laboratório com ART de Engenheiro Civil. Absorve apenas 0,2% de umidade em 48h de imersão total, pesa 3,2 kg/m², não propaga chamas e é anti-mofo e anti-cupim por natureza. Um cômodo fica instalado em 2 a 3 horas, sem obra e sem poeira.",
  },
  {
    q: "O PFB é uma solução permanente ou temporária?",
    a: "Permanente. O PFB é uma placa rígida de 5mm com acabamento fotorrealista premium — texturas que remetem a pedra e madeira real, impermeável e lavável. Aprovado para áreas úmidas, dura 10+ anos no clima amazônico e é instalado sem obra ou demolição. Uma transformação definitiva do ambiente.",
  },
  {
    q: "O PFB serve para revestimento de forro (teto)?",
    a: "Sim. O PFB é leve (3,2 kg/m²) e aprovado para aplicação em teto com ART de Engenheiro Civil. Já foi instalado como forro em residências, restaurantes, escritórios e embarcações náuticas em Manaus — com acabamento arquitetônico que transforma qualquer ambiente.",
  },
  {
    q: "Onde ver e comprar o PFB em Manaus?",
    a: "A Orbital Revestimentos é a fornecedora exclusiva do Painel Flexível em Fibra de Bambu (PFB) em Manaus, com pronta-entrega. Você vê o material ao vivo nos showrooms de empresas parceiras (Dinâmica Design, Foston Home, Ornare e Sierra Móveis), encontra as revendas em Manaus na página Onde comprar, ou recebe a visita de um consultor com as amostras no seu escritório.",
  },
  {
    q: "Arquitetos e designers em Manaus podem especificar o PFB?",
    a: "Sim. A Orbital tem um programa de parcerias para arquitetos, designers de interiores e engenheiros em Manaus. Fornecemos amostras grátis, fichas técnicas completas com ART/CREA, laudos laboratoriais e suporte técnico para especificação em projetos residenciais e comerciais.",
  },
  {
    q: "O PFB resiste à umidade e ao mofo?",
    a: "Sim — e os dados comprovam. Com apenas 0,2% de absorção de água em 48 horas de imersão total, o PFB é praticamente impermeável. O substrato de fibra de bambu não é habitat para fungos, então o PFB não mofará mesmo em banheiros sem ventilação. Testado em laboratório e homologado com ART de Engenheiro Civil.",
  },
  {
    q: "Qual o melhor revestimento de parede para o clima úmido de Manaus?",
    a: "O PFB (Painel Flexível em Fibra de Bambu) é o revestimento indicado para o clima amazônico. Desenvolvido para ambientes com umidade relativa acima de 80%, absorve apenas 0,2% de umidade, não empena, não descola e mantém a integridade visual e estrutural por mais de 10 anos. Aprovado em laboratório com ART de Engenheiro Civil — disponível em pronta-entrega em Manaus.",
  },
  {
    q: "O PFB é impermeável? Pode ser instalado em banheiro ou lavabo?",
    a: "Sim. O PFB é resistente à água — apenas 0,2% de absorção em 48 horas de imersão. É aprovado para áreas úmidas: banheiros, lavabos, cozinhas, fachadas internas e projetos náuticos. Anti-mofo por natureza, sem necessidade de tratamento adicional.",
  },
  {
    q: "Como é feita a instalação? Precisa de obra?",
    a: "Não precisa de obra pesada. O PFB é colado diretamente sobre a parede ou teto existente com cola PU 40 ou cola de contato — sem demolição, sem poeira, sem barulho de obra. Um cômodo padrão fica pronto em 2 a 3 horas. Pode ser instalado com o ambiente em uso, sem interromper as atividades do espaço. A Orbital fornece o material; a aplicação é feita por instaladores formados na Academia Orbital ou pelo profissional de sua confiança.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

/** Obras fixas, para a home nunca ficar vazia sem banco. */
const OBRAS_RESERVA: Projeto[] = [
  { src: "/images/catalogue/lavabo-real.jpeg", t: "Lavabo", c: "ORB-006" },
  { src: "/images/projetos/escritorio-depois.jpeg", t: "Escritório", c: "ORB-014" },
  { src: "/images/projetos/restaurante-depois.jpeg", t: "Restaurante", c: "ORB-003" },
  { src: "/images/projetos/hall-depois.png", t: "Hall de entrada", c: "ORB-002" },
  { src: "/images/projetos/nautico1-depois.png", t: "Embarcação", c: "ORB-002" },
  { src: "/images/projetos/cozinha-depois.png", t: "Cozinha", c: "ORB-012" },
].map((x, i) => ({ id: `reserva-${i}`, slug: "", title: x.t, product_code: x.c, categories: [], image_after: x.src }));

const PROFISSIONAIS = [
  { label: "Arquitetos e designers", tagline: "Especifique com dados. Amostras grátis para o moodboard e um consultor no seu escritório." },
  { label: "Marceneiros e instaladores", tagline: "Aplicação em 2–3 h, sem equipamento pesado. Formação na Academia Orbital." },
  { label: "Engenheiros", tagline: "ART · CREA · laudos laboratoriais. Aprovado para áreas úmidas e projetos navais." },
  { label: "Revendedores", tagline: "Tabela exclusiva, estoque local em Manaus e um produto que se vende pela própria obra." },
];

const seta = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="mv-seta"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
);

export default async function Home() {
  const dados = await carregarProjetos();
  const vistas = new Set<string>();
  const obras = dados.projetos
    .filter((p) => !p.showroom_id)
    // Os marcados para a home vêm primeiro e, entre si, seguem a "Ordem do destaque" do painel.
    .sort((a, b) => Number(!!b.show_on_home) - Number(!!a.show_on_home) || porDestaque(a, b)
      || (a.show_on_home && b.show_on_home ? (a.feature_order ?? 0) - (b.feature_order ?? 0) : 0))
    .filter((p) => !vistas.has(p.image_after) && vistas.add(p.image_after))
    .slice(0, 8);
  const listaObras = obras.length >= 3 ? obras : OBRAS_RESERVA;
  // Os showrooms e um cartão só, "Pontos de venda", que leva a /onde-comprar.
  const parceiros = parceirosNaGrade(dados.lugares);

  return (
    <div className="escala-contida">
      {/* ── Abertura: o slogan da marca, calma e sem enfeite ───────────────── */}
      <section className="relative h-[100svh] min-h-[34rem] flex items-center overflow-hidden bg-[#0B1F45] ds-escuro">
        <div className="absolute inset-0 mv-parallax-topo">
          <HeroAssenta>
            <Image
              src="/images/catalogue/hero-cover.png"
              alt="Ambiente com paredes revestidas em Painel Flexível em Fibra de Bambu Orbital, em Manaus"
              fill sizes="100vw" priority fetchPriority="high"
              className="object-cover object-center"
            />
          </HeroAssenta>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F45]/90 via-[#0B1F45]/30 to-[#0B1F45]/10" aria-hidden />
        {/* O texto saiu da base para o meio, onde a foto é mais clara: um véu à esquerda segura a leitura. */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1F45]/55 via-[#0B1F45]/20 to-transparent" aria-hidden />
        {/* Centrado na área visível sob o cabeçalho fixo: o 5rem de cima é a altura
            dele, então a folga até o cabeçalho e a folga até a borda de baixo ficam iguais. */}
        <div className="relative z-10 w-full ds-wrap pt-20 mv-esmaece-topo">
          <h1 className="font-serif text-white text-display font-normal tracking-[-0.025em] max-w-[20ch] text-balance">
            <span className="sr-only">Orbital Revestimentos — revestimentos para parede, forro e fachada em Manaus. </span>
            {ASSINATURA}
          </h1>
          <p className="mt-5 text-white/80 text-lead max-w-[40ch] text-pretty">
            Orbital Revestimentos · Manaus
          </p>
          <div className="mt-8">
            <Link href="#solucoes" className="ds-botao ds-botao-claro w-full sm:w-auto min-h-12">
              Conhecer as soluções
            </Link>
          </div>
        </div>
      </section>

      {/* ── Quem somos ─────────────────────────────────────────────────────── */}
      <Manifesto />

      {/* ── O que fazemos: a jornada da fábrica até a obra ─────────────────── */}
      <Jornada />

      {/* ── Por que fazemos ────────────────────────────────────────────────── */}
      <PorQue />

      {/* ── Nossas soluções ────────────────────────────────────────────────── */}
      <section id="solucoes" aria-labelledby="solucoes-titulo" className="ds-secao lg:py-8! bg-[#F6F5F2] scroll-mt-20">
        <div className="ds-wrap">
          {/* No computador a seção inteira cabe numa tela (100svh - 5rem do
              cabeçalho): título e frase lado a lado, foto de altura contida e
              os links logo abaixo. */}
          <Revelar className="mb-8 max-w-2xl lg:mb-5 lg:max-w-none lg:grid lg:grid-cols-[auto_minmax(0,34rem)] lg:items-end lg:justify-between lg:gap-x-12">
            <h2 id="solucoes-titulo" className="font-serif text-t1 text-[#0B1F45] font-normal tracking-[-0.02em] text-balance">Nossas soluções.</h2>
            <p className="mt-4 lg:mt-0 text-lead text-[#43474e] text-pretty">
              Cada linha tem o seu papel no projeto, das paredes internas à fachada. Escolha uma.
            </p>
          </Revelar>
          <SeletorLinhas />
          <div className="mt-12 lg:mt-5 flex flex-wrap gap-x-8 gap-y-2 lg:gap-y-0 border-t border-[#0B1F45]/12 pt-6 lg:pt-1">
            <Link href="/visualizador" className="inline-flex items-center gap-2 min-h-11 text-[#0B1F45] font-semibold">
              Simular no meu ambiente com IA {seta}
            </Link>
            <Link href="/produtos/pfb#ficha" className="inline-flex items-center gap-2 min-h-11 text-[#0B1F45]/75 hover:text-[#0B1F45] font-semibold">
              Ficha técnica do PFB {seta}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Arquitetos ─────────────────────────────────────────────────────── */}
      <VisaoDoArquiteto />

      {/* ── Obras e onde ver ───────────────────────────────────────────────── */}
      <section id="projetos" aria-labelledby="projetos-titulo" className="ds-secao bg-[#0B1F45] text-white ds-escuro scroll-mt-16">
        <div className="ds-wrap">
          <Revelar className="mb-10 lg:mb-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h2 id="projetos-titulo" className="font-serif text-t1 font-normal tracking-[-0.02em] text-balance">Mais de 50 obras entregues.</h2>
              <p className="mt-4 text-lead text-white/75 text-pretty">Residências, lojas, escritórios e embarcações em Manaus.</p>
            </div>
            <Link href="/projetos" className="ds-botao ds-botao-linha self-start md:self-auto">Todos os projetos {seta}</Link>
          </Revelar>
          <Revelar>
            <Trilho rotulo="Obras em destaque" escuro largura="w-[62%] sm:w-[34%] lg:w-[19%]">
              {listaObras.map((p) => (
                <ProjetoCard key={p.id} projeto={p} href={p.slug ? `/projetos?projeto=${encodeURIComponent(p.slug)}` : "/projetos"}
                  sizes="(max-width: 639px) 62vw, (max-width: 1023px) 34vw, (max-width: 1920px) 250px, 14vw" />
              ))}
            </Trilho>
          </Revelar>

          <Revelar className="mt-12 lg:mt-14">
            <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 mb-2">
              <h3 className="font-serif text-white text-t3 font-normal">Onde ver ao vivo</h3>
              <p className="text-white/65 text-legenda">Ou peça a visita de um consultor com as amostras.</p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-10 xl:grid-cols-5 xl:gap-x-0 border-t border-white/15">
              {parceiros.map((s) => (
                <li key={s.id} className="border-b border-white/15 xl:border-b-0 xl:border-r xl:last:border-r-0 xl:px-5 xl:first:pl-0 xl:last:pr-0">
                  <Link href={s.id === CARTAO_PDV.id ? "/onde-comprar" : `/projetos?showroom=${encodeURIComponent(s.slug)}`} prefetch={s.id === CARTAO_PDV.id ? false : undefined}
                    className="group flex items-center justify-between gap-3 min-h-16 py-4">
                    <span>
                      <span className="block font-serif text-white text-[1.0625rem] leading-snug">{nomeLugar(s.name)}</span>
                      <span className="block text-white/55 text-sobre tracking-[0.14em] uppercase mt-1">{s.id === CARTAO_PDV.id ? "Revendas em Manaus" : "Showroom parceiro"}</span>
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="mv-seta text-white/60 flex-shrink-0"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                </li>
              ))}
            </ul>
          </Revelar>
        </div>
      </section>

      {/* ── Contato ────────────────────────────────────────────────────────── */}
      {/* Sem mv-adiado (content-visibility): os revelares desta seção renderizariam durante a rolagem e custam quadros no celular. */}
      <section id="contato" aria-labelledby="contato-titulo" className="ds-secao bg-white scroll-mt-16">
        <div className="ds-wrap">
          <Revelar className="text-center max-w-3xl mx-auto">
            <h2 id="contato-titulo" className="font-serif text-[#0B1F45] text-t1 font-normal tracking-[-0.025em] mb-5 text-balance">
              Vamos conversar sobre o seu projeto.
            </h2>
            <p className="text-[#43474e] text-lead mb-8 max-w-xl mx-auto text-pretty">
              Um consultor responde pelo pré-contato e, se preferir, leva as amostras até você.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 lg:gap-4">
              <ContatoCta className="ds-botao ds-botao-cheio w-full sm:w-auto min-h-12">
                Falar com um consultor
              </ContatoCta>
              <Link href="/produtos" className="ds-botao ds-botao-vazado w-full sm:w-auto min-h-12">
                Ver as linhas
              </Link>
            </div>
          </Revelar>

          {/* Para profissionais */}
          <div className="mt-14 lg:mt-20 border-t border-[#0B1F45]/12 pt-8">
            <Revelar className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 mb-6">
              <h3 className="font-serif text-[#0B1F45] text-t3 font-normal">Para profissionais</h3>
              <Link href="/parcerias" className="inline-flex items-center gap-2 min-h-11 text-[#0B1F45]/75 hover:text-[#0B1F45] text-xs tracking-[0.12em] uppercase font-semibold">
                Programa de parcerias {seta}
              </Link>
            </Revelar>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-6">
              {PROFISSIONAIS.map((p, i) => (
                <Revelar key={p.label} como="li" ordem={i}>
                  <h4 className="font-serif text-[#0B1F45] text-[1.0625rem] font-normal mb-1.5">{p.label}</h4>
                  <p className="text-[#43474e] text-legenda leading-relaxed text-pretty">{p.tagline}</p>
                </Revelar>
              ))}
            </ul>
          </div>

          {/* Academia Orbital: a formação, sem número de vagas nem data. */}
          <Revelar className="mt-10 lg:mt-12 border-t border-[#0B1F45]/12 pt-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <p className="text-[#43474e] text-corpo text-pretty">
              <span className="font-serif text-[#0B1F45]">Academia Orbital.</span> Formação em instalação do PFB, no padrão Orbital, com certificado.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 flex-shrink-0">
              <Link href="/academia#lista-de-espera" className="inline-flex items-center gap-2 min-h-11 text-[#0B1F45] text-xs tracking-[0.12em] uppercase font-semibold">
                Quero participar {seta}
              </Link>
              <Link href="/academia" className="inline-flex items-center min-h-11 text-[#0B1F45]/65 hover:text-[#0B1F45] text-xs tracking-[0.12em] uppercase font-semibold">Conhecer a formação</Link>
            </div>
          </Revelar>
        </div>
      </section>

      {/* Perguntas sobre o PFB */}
      <section className="mv-adiado ds-secao bg-[#F6F5F2]" aria-labelledby="faq-titulo">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
        <div className="ds-wrap">
          <h2 id="faq-titulo" className="font-serif text-t2 text-[#0B1F45] font-normal tracking-[-0.02em] mb-8">Perguntas sobre o PFB</h2>
          <div className="max-w-3xl border-t border-[#0B1F45]/12">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group border-b border-[#0B1F45]/12">
                <summary className="flex items-center justify-between gap-6 min-h-14 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <h3 className="font-serif text-primary text-[1.0625rem] lg:text-lg font-normal text-pretty">{q}</h3>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="text-primary/60 flex-shrink-0 transition-transform duration-300 group-open:rotate-45"><path d="M12 5v14M5 12h14" /></svg>
                </summary>
                <p className="text-on-surface-variant text-corpo leading-relaxed pb-5 max-w-[65ch]">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-10 text-on-surface-variant text-legenda italic">
            Imagens ilustrativas — cores podem variar. Veja o material ao vivo em um showroom parceiro ou peça amostras a um consultor.
          </p>
        </div>
      </section>
    </div>
  );
}
