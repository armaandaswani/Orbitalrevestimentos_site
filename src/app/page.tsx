import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContatoCta from "@/components/ContatoCta";
import VisaoDoArquiteto from "@/components/VisaoDoArquiteto";
import ConhecaPfb from "@/components/ConhecaPfb";
import Capitulo from "@/components/ds/Capitulo";
import HistoriaFixa from "@/components/ds/HistoriaFixa";
import ProgressoCapitulos from "@/components/ds/ProgressoCapitulos";
import Revelar from "@/components/projetos/Revelar";
import SecaoCabecalho, { Sobretitulo } from "@/components/projetos/SecaoCabecalho";
import Trilho from "@/components/projetos/Trilho";
import ProjetoCard from "@/components/projetos/ProjetoCard";
import { carregarProjetos } from "@/lib/projetos-dados";
import { REVENDA_RESERVA, nomeLugar, porDestaque, type Projeto } from "@/lib/projetos-tipos";

/**
 * Home como uma apresentação contínua: abertura com a assinatura da marca,
 * depois seis capítulos — 01 Produto · 02 Por quê · 03 Arquitetos ·
 * 04 Projetos e showrooms · 05 Simulador · 06 Contato. O ProgressoCapitulos
 * mostra onde o visitante está; cada capítulo termina apontando o próximo.
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
    "Novas possibilidades para seus projetos. Painéis Flexíveis em Fibra de Bambu (PFB) para paredes e forros em Manaus: resistentes à umidade, instalados em horas, sem obra. 3 linhas, 15 acabamentos, pronta-entrega.",
  alternates: { canonical: "https://orbitalrevestimentos.com.br" },
  keywords: [
    "Orbital Revestimentos",
    "revestimento parede Manaus",
    "revestimento de forro Manaus",
    "PFB painel flexível fibra de bambu",
    "revestimento sem obra Manaus",
    "decoração interiores Manaus",
    "showroom revestimento Manaus",
  ],
  openGraph: {
    title: "Orbital Revestimentos — Novas possibilidades para seus projetos",
    description:
      "Painéis Flexíveis em Fibra de Bambu (PFB) para paredes e forros em Manaus. Resistentes à umidade, instalados em horas, sem obra. Pronta-entrega.",
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
    a: "A Orbital Revestimentos é a fornecedora exclusiva do PFB em Manaus, com pronta-entrega. Você vê o material ao vivo nos showrooms de empresas parceiras (Dinâmica Design, Foston Home, Ornare e Sierra Móveis), na Casa do Eletricista, que tem todos os modelos em display, ou recebe a visita de um consultor com as amostras no seu escritório. O pedido é feito direto com um consultor, sem intermediários.",
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

/** 02 · Por que o PFB: a história com quadro fixo. Só méritos próprios, nada de comparação. */
const PASSOS = [
  {
    titulo: "Feito para o clima de Manaus.",
    destaque: "0,2% de absorção de água em 48 h",
    texto: "Umidade acima de 80% e calor o ano inteiro pedem um material que não incha, não descola e não mofa. O PFB foi escolhido para isso: resistente à água, protegido contra cupins e aprovado para áreas úmidas.",
    imagem: { src: "/images/academia/aplic-area-molhada.jpg", alt: "PFB aplicado em área molhada" },
  },
  {
    titulo: "Leve, flexível e em grande formato.",
    destaque: "Cerca de 11 kg por placa de 2,90 × 1,20 m",
    texto: "Uma placa de 5 mm cobre 3,48 m², acompanha curvas e colunas e vai para paredes e forros. Menos emendas, acabamento contínuo e nenhuma estrutura pesada.",
    imagem: { src: "/images/academia/aplic-curva.jpg", alt: "PFB acompanhando uma superfície curva" },
  },
  {
    titulo: "Instalado em horas. Admirado por anos.",
    destaque: "Colado sobre a superfície existente",
    texto: "O painel é fixado com cola PU direto sobre a parede ou o forro, sem demolição, sem poeira e com o ambiente em uso. Um cômodo fica pronto em duas a três horas; o acabamento fica por mais de dez anos.",
    imagem: { src: "/images/academia/lavabo-consultorio-depois.jpg", alt: "Lavabo de consultório revestido com PFB" },
  },
  {
    titulo: "Padrão Orbital, do fabricante ao projeto.",
    destaque: "Fabricado na China com padrão Orbital",
    texto: "Produzido sob a especificação da Orbital, com controle de qualidade e originalidade de cada lote: sem formol, não propaga chamas, certificado em laboratório e homologado com ART de Engenheiro Civil. Pronta-entrega em Manaus.",
    imagem: { src: "/images/academia/escadaria-residencial.jpg", alt: "Escadaria residencial com paredes em PFB" },
  },
];

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

export default async function Home() {
  const dados = await carregarProjetos();
  const vistas = new Set<string>();
  const obras = dados.projetos
    .filter((p) => !p.showroom_id)
    .sort((a, b) => Number(!!b.show_on_home) - Number(!!a.show_on_home) || porDestaque(a, b))
    .filter((p) => !vistas.has(p.image_after) && vistas.add(p.image_after))
    .slice(0, 8);
  const listaObras = obras.length >= 3 ? obras : OBRAS_RESERVA;
  const showrooms = dados.lugares.filter((l) => l.kind === "showroom");
  const revendas = dados.lugares.filter((l) => l.kind === "revenda");
  const parceiros = [...showrooms, ...(revendas.length > 0 ? revendas : REVENDA_RESERVA)];

  return (
    <>
      <ProgressoCapitulos />

      {/* ── Abertura ───────────────────────────────────────────────────────── */}
      <section className="relative h-[min(100svh,56rem)] min-h-[34rem] flex items-end lg:items-center overflow-hidden bg-[#0B1F45] ds-escuro">
        <div className="absolute inset-0 mv-parallax-topo will-change-transform">
          <Image
            src="/images/catalogue/hero-cover.png"
            alt="Ambiente com paredes revestidas em Painel Flexível em Fibra de Bambu (PFB) Orbital, em Manaus"
            fill sizes="100vw" priority fetchPriority="high"
            className="object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F45]/85 via-[#0B1F45]/35 to-transparent lg:bg-gradient-to-r lg:from-[#0B1F45]/75 lg:via-[#0B1F45]/30 lg:to-transparent" aria-hidden />
        {/* pt-20 = altura do cabeçalho fixo. */}
        <div className="relative z-10 w-full ds-wrap pt-24 pb-[clamp(2.5rem,6vh,5rem)] mv-esmaece-topo">
          <h1 className="font-serif text-white text-display font-normal tracking-[-0.02em] mb-6 max-w-[21ch] text-balance">
            <span className="sr-only">Orbital Revestimentos — revestimento de parede e forro em Manaus. </span>
            {ASSINATURA}
          </h1>
          <p className="text-white/80 text-corpo mb-8 lg:mb-10 max-w-lg text-pretty">
            O Painel Flexível em Fibra de Bambu (PFB) transforma paredes e forros com acabamento
            arquitetônico, resiste à umidade e ao calor do Amazonas e é instalado sem obra.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 lg:gap-4">
            <Link href="/produtos" className="ds-botao ds-botao-claro w-full sm:w-auto min-h-12">
              Ver os modelos
            </Link>
            <ContatoCta className="ds-botao ds-botao-linha w-full sm:w-auto min-h-12">
              Falar com um consultor
            </ContatoCta>
          </div>
        </div>
      </section>

      {/* ── 01 Produto ─────────────────────────────────────────────────────── */}
      <ConhecaPfb numero="01" />

      {/* ── 02 Por quê ─────────────────────────────────────────────────────── */}
      <Capitulo id="porque" numero="02" rotulo="Por quê" rotuladoPor="porque-titulo" className="ds-secao bg-background border-t border-surface-container-high">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="porque-titulo" numero="02" sobretitulo="Por que o PFB" titulo="Materiais inovadores, adaptados ao clima da Amazônia."
              texto="A tese da Orbital: trazer para Manaus materiais que resistem à umidade e ao calor extremo e que realmente servem ao nosso mercado. Quatro razões, uma de cada vez." />
          </Revelar>
          <HistoriaFixa passos={PASSOS} />
          <Revelar className="mt-12 lg:mt-14 border-t border-surface-container-high pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <p className="text-on-surface-variant text-corpo max-w-2xl text-pretty">
              A Orbital é uma importadora de Manaus especializada em revestimentos eco-premium. Toda a documentação técnica
              (ficha, ART, laudos) está na página de tecnologia.
            </p>
            <Link href="/tecnologia" className="ds-botao ds-botao-vazado flex-shrink-0">
              Tecnologia e ficha técnica
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="mv-seta"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </Revelar>
        </div>
      </Capitulo>

      {/* ── 03 Arquitetos ──────────────────────────────────────────────────── */}
      <VisaoDoArquiteto numero="03" />

      {/* ── 04 Projetos e showrooms ────────────────────────────────────────── */}
      <Capitulo id="projetos" numero="04" rotulo="Projetos" rotuladoPor="projetos-titulo" escuro className="ds-secao bg-[#0B1F45] text-white">
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="projetos-titulo" numero="04" escuro sobretitulo="Projetos e showrooms" titulo="Veja o PFB de perto."
              texto="Obras entregues em Manaus e ambientes nos showrooms parceiros."
              acao={
                <Link href="/projetos" className="ds-botao ds-botao-linha">
                  Todos os projetos
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="mv-seta"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              } />
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
                  <Link href={s.kind !== "revenda" || s.ambient_count > 0 ? `/projetos?showroom=${encodeURIComponent(s.slug)}` : "/projetos#revenda"}
                    className="group flex items-center justify-between gap-3 min-h-16 py-4">
                    <span>
                      <span className="block font-serif text-white text-[1.0625rem] leading-snug">{nomeLugar(s.name)}</span>
                      <span className="block text-white/55 text-sobre tracking-[0.14em] uppercase mt-1">{s.kind === "revenda" ? "Revenda" : "Showroom parceiro"}</span>
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="mv-seta text-white/60 flex-shrink-0"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                </li>
              ))}
            </ul>
          </Revelar>
        </div>
      </Capitulo>

      {/* ── 05 Simulador ───────────────────────────────────────────────────── */}
      <Capitulo id="simulador" numero="05" rotulo="Simulador" rotuladoPor="simulador-titulo" className="ds-secao bg-white">
        <div className="ds-wrap grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <Revelar className="lg:col-span-5 lg:order-1">
            <Link href="/visualizador" className="group relative block max-w-[20rem] mx-auto">
              <span className="relative block aspect-[4/5] overflow-hidden bg-surface-container">
                <Image src="/images/renders/orb014-escritorio.png" alt="Simulação gerada por inteligência artificial de um escritório com PFB" fill
                  sizes="(max-width: 1023px) 88vw, 360px" className="object-cover mv-zoom" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" aria-hidden />
                <span className="absolute bottom-3 left-3 bg-[#0B1F45]/75 text-white text-sobre tracking-[0.15em] uppercase font-semibold px-2.5 py-1">
                  Gerado por IA
                </span>
              </span>
            </Link>
          </Revelar>
          <Revelar className="lg:col-span-7 lg:order-2" ordem={1}>
            <SecaoCabecalho id="simulador-titulo" numero="05" sobretitulo="Simulador com IA" titulo="Veja como fica no seu ambiente."
              texto="Envie uma foto do seu espaço e a inteligência artificial aplica o acabamento escolhido na hora — antes de você decidir." />
            <Link href="/visualizador" className="ds-botao ds-botao-cheio min-h-12">
              Simular no meu ambiente
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="mv-seta"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </Revelar>
        </div>
      </Capitulo>

      {/* ── 06 Contato ─────────────────────────────────────────────────────── */}
      <Capitulo id="contato" numero="06" rotulo="Contato" rotuladoPor="contato-titulo" escuro className="ds-secao bg-[#0B1F45]">
        <div className="ds-wrap">
          <Revelar className="text-center max-w-3xl mx-auto">
            <Sobretitulo escuro numero="06">Pronto para transformar seu espaço?</Sobretitulo>
            <h2 id="contato-titulo" className="font-serif text-white text-t1 font-normal tracking-[-0.025em] mt-4 mb-5 text-balance">
              Fale com a Orbital.
            </h2>
            <p className="text-white/75 text-lead mb-8 max-w-xl mx-auto text-pretty">
              3 linhas, 15 acabamentos e pronta-entrega em Manaus. Um consultor responde pelo pré-contato
              e, se preferir, leva as amostras até você.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 lg:gap-4">
              <ContatoCta className="ds-botao ds-botao-claro w-full sm:w-auto min-h-12">
                Falar com um consultor
              </ContatoCta>
              <Link href="/produtos" className="ds-botao ds-botao-linha w-full sm:w-auto min-h-12">
                Ver o catálogo
              </Link>
            </div>
          </Revelar>

          {/* Para profissionais */}
          <div className="mt-14 lg:mt-20 border-t border-white/15 pt-8">
            <Revelar className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 mb-6">
              <h3 className="font-serif text-white text-t3 font-normal">Para profissionais</h3>
              <Link href="/parcerias" className="inline-flex items-center gap-2 min-h-11 text-white/75 hover:text-white text-xs tracking-[0.12em] uppercase font-semibold">
                Programa de parcerias
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="mv-seta"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </Revelar>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-6">
              {PROFISSIONAIS.map((p, i) => (
                <Revelar key={p.label} como="li" ordem={i}>
                  <h4 className="font-serif text-white text-[1.0625rem] font-normal mb-1.5">{p.label}</h4>
                  <p className="text-white/65 text-legenda leading-relaxed text-pretty">{p.tagline}</p>
                </Revelar>
              ))}
            </ul>
          </div>

          {/* Academia Orbital: a formação, sem número de vagas nem data. */}
          <Revelar className="mt-10 lg:mt-12 border-t border-white/15 pt-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <p className="text-white/75 text-corpo text-pretty">
              <span className="font-serif text-white">Academia Orbital.</span> Formação em instalação do PFB, no padrão Orbital, com certificado.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 flex-shrink-0">
              <Link href="/academia#lista-de-espera" className="inline-flex items-center gap-2 min-h-11 text-white hover:text-white/80 text-xs tracking-[0.12em] uppercase font-semibold">
                Quero participar
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="mv-seta"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
              <Link href="/academia" className="inline-flex items-center min-h-11 text-white/65 hover:text-white text-xs tracking-[0.12em] uppercase font-semibold">Conhecer a formação</Link>
            </div>
          </Revelar>
        </div>
      </Capitulo>

      {/* FAQ */}
      <section className="ds-secao bg-white border-t border-surface-container-high" aria-labelledby="faq-titulo">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
        <div className="ds-wrap">
          <Revelar>
            <SecaoCabecalho id="faq-titulo" sobretitulo="Dúvidas frequentes" titulo="Perguntas e respostas" />
          </Revelar>
          <div className="max-w-3xl border-t border-surface-container-high">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group border-b border-surface-container-high">
                <summary className="flex items-center justify-between gap-6 min-h-14 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <h3 className="font-serif text-primary text-[1.0625rem] lg:text-lg font-normal text-pretty">{q}</h3>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="text-primary/60 flex-shrink-0 transition-transform duration-300 group-open:rotate-45"><path d="M12 5v14M5 12h14" /></svg>
                </summary>
                <p className="text-on-surface-variant text-corpo leading-relaxed pb-5 max-w-[65ch]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Aviso */}
      <div className="bg-background border-t border-surface-container-high py-5 text-center ds-wrap">
        <p className="text-on-surface-variant text-legenda italic">
          Imagens ilustrativas — cores podem variar. Veja o material ao vivo em um showroom parceiro ou peça amostras a um consultor.
        </p>
      </div>
    </>
  );
}
